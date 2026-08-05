import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import * as BABYLON from 'babylonjs';

import { BabylonService } from '../babylon/babylon.service';
import { SceneLifecycleService, SceneScoped } from '../babylon/scene-lifecycle.service';
import { SceneBoundsService, SceneAxis, ScenePoint } from '../scene-bounds/scene-bounds.service';
import { SceneXb } from '../drawing/scene-input';
import { PickService } from '../picking/pick.service';
import { ACCENT_COLOR, ACCENT_EDGE_COLOR } from '../../consts/drawing';
import { EditStreamService } from './edit-stream.service';
import { SceneCreateCommand } from './edit-command';
import { GestureInput, GestureKey, GestureValues } from './gesture';
import { GestureView, GizmoService } from './gizmo.service';
import { SnapMode } from './snap';
import { SnapService } from './snap.service';
import {
    boxBetween, DrawKind, DrawRay, DrawStep, extruded, floorUnder, heightAlong,
    inPlaneAxes, landedAxis, rayPlane
} from './draw';

/** How solid the preview box is - enough to read as a body, not enough to hide one. */
const PREVIEW_ALPHA = 0.25;

/** One draw operation, from the first corner to the emitted command. */
interface DrawGesture {
    readonly kind: DrawKind,
    /** The current &SURF from the ribbon's selector, or nothing for INERT. */
    surfId?: string,
    step: DrawStep,
    /**
     * The axis the surface under the cursor is flat on, as of the last track -
     * what decides a &VENT's plane at the moment of the first click.
     */
    landingAxis: SceneAxis,
    /**
     * Whether the last track actually landed anywhere. A click into a void -
     * no surface, no &MESH floor, a ray running along the floors - must not
     * quietly put the corner at wherever the numbers happen to stand.
     */
    landed: boolean,
    /** The axis the base is flat on. Meaningful once the first corner is placed. */
    planeAxis: SceneAxis,
    first: ScenePoint | null,
    second: ScenePoint | null,
    input: GestureInput,
    /** What has caught the pointer, as of the last track. */
    hit: SnapMode | null
}

/**
 * Drawing a new element in the browser - AutoCAD's `BOX`, in three steps (#125).
 *
 * A corner, the opposite corner of the base, a height; a &VENT is flat and
 * finishes at step two, in the plane of the surface its first corner landed on.
 * The first corner lands on the surface under the cursor - the face of an
 * existing obst, or a floor - and where there is nothing under the cursor, on
 * the floor of the nearest &MESH.
 *
 * The lifecycle mirrors GizmoService: `start` from the ribbon, `track` per
 * pointer move, `click`/`commit` to advance, `cancel` for Escape - and one
 * `SceneCreateCommand` emitted when the gesture completes (ADR-0004, ADR-0009).
 * The geometry itself is in draw.ts; this service is the state machine and the
 * scene-facing adapter around it.
 *
 * The tool switches itself off after finishing or on Escape (ADR-0010) - there
 * is no drawing mode, only a gesture in progress.
 */
@Injectable({
    providedIn: 'root'
})
export class DrawToolService implements SceneScoped {

    /** What is being drawn, or null when the pointer is an ordinary pointer. */
    public get active(): DrawKind | null {
        return this.current ? this.current.kind : null;
    }

    /** The same, as a stream - what keeps the ribbon's buttons honest. */
    public readonly active$: Observable<DrawKind | null>;

    /** What the dynamic input draws. Null when no draw gesture is running. */
    public gesture: GestureView | null = null;

    /** The same, as a stream, for the overlay - see GizmoService.gesture$. */
    public readonly gesture$: Observable<GestureView | null>;

    private readonly activeSubject = new BehaviorSubject<DrawKind | null>(null);
    private readonly gestureSubject = new BehaviorSubject<GestureView | null>(null);

    private current: DrawGesture | null = null;

    /** The box drawn where the gesture currently has the element. */
    private previewMesh: BABYLON.Mesh | null = null;
    private previewMaterial: BABYLON.StandardMaterial | null = null;

    constructor(
        private babylonService: BabylonService,
        private sceneBounds: SceneBoundsService,
        private pickService: PickService,
        private snapService: SnapService,
        private editStream: EditStreamService,
        private gizmo: GizmoService,
        sceneLifecycle: SceneLifecycleService
    ) {
        sceneLifecycle.register(this);
        this.active$ = this.activeSubject.asObservable();
        this.gesture$ = this.gestureSubject.asObservable();
    }

    // ==========================================
    // The lifecycle - what the ribbon and the pointer drive
    // ==========================================

    /**
     * Begin drawing one element - what a Draw button does.
     *
     * Pressing another Draw button mid-gesture abandons the gesture and starts
     * the new element's; pressing the same one again is how a second wall is
     * begun. A gizmo gesture in flight is abandoned too - two gestures cannot
     * share one pointer.
     */
    public start(kind: DrawKind, surfId?: string): void {
        this.gizmo.cancel();
        // The selection goes too, as it does when an AutoCAD draw command
        // starts: its grips are Babylon drag behaviours, and a first corner
        // aimed near one would start a move instead of landing a corner
        this.pickService.dropSelection();
        this.dropGesture();

        this.current = {
            kind: kind,
            surfId: surfId,
            step: 'corner',
            landingAxis: 'z',
            landed: false,
            planeAxis: 'z',
            first: null,
            second: null,
            input: GestureInput.forPoint(),
            hit: null
        };

        this.activeSubject.next(kind);
        this.setCursor('crosshair');
        this.publish();
    }

    /**
     * Change the current &SURF under a gesture already in flight.
     *
     * The selector is the current layer (#125), and AutoCAD lets the layer be
     * changed mid-command - the element takes the one in force when it is
     * committed.
     */
    public setSurf(surfId?: string): void {
        if (this.current) { this.current.surfId = surfId; }
    }

    /** Abandon the whole operation - Escape, at whichever step it is. */
    public cancel(): void {
        if (!this.current) { return; }
        this.end(null);
    }

    /**
     * Follow the pointer - called on every pointer move while the tool is on.
     *
     * Nothing is emitted from here (ADR-0004): tracking moves the preview, the
     * marker and the dynamic input, and only an advance changes the gesture.
     */
    public track(ray: BABYLON.Ray): void {
        const gesture = this.current;
        if (!gesture) { return; }

        if (gesture.step === 'corner') { this.trackCorner(gesture, ray); }
        else if (gesture.step === 'base') { this.trackBase(gesture, ray); }
        else { this.trackHeight(gesture, ray); }

        this.publish();
    }

    /** One click of the gesture: land where the pointer is, and advance. */
    public click(ray: BABYLON.Ray): void {
        if (!this.current) { return; }
        this.track(ray);
        this.advance();
    }

    /** Enter: settle the step on the numbers in force, typed ones included. */
    public commit(): void {
        if (!this.current) { return; }
        this.advance();
    }

    /** Take a field over from the mouse - the dynamic input's typing. */
    public type(key: GestureKey, text: string): void {
        const gesture = this.current;
        if (!gesture) { return; }

        gesture.input.type(key, text);
        this.redrawPreview(gesture);
        this.publish();
    }

    /** Move the keyboard on to the next field - Tab. */
    public nextField(): void {
        if (!this.current) { return; }
        this.current.input.next();
        this.publish();
    }

    /**
     * Suspend snapping for the rest of the gesture, or ask for it back.
     *
     * The same latch as the gizmo's (ADR-0011): releasing ctrl mid-operation
     * does not bring snapping back - the choice is spent on the gesture.
     */
    public setSnapSuspended(suspended: boolean): void {
        if (!suspended && this.current) { return; }
        this.snapService.suspended = suspended;
    }

    // ==========================================
    // Tracking each step
    // ==========================================

    /**
     * The first corner rides the surface under the cursor - an obst's face, a
     * floor - and where there is nothing, the floor of the nearest &MESH. The
     * snap is confined to the surface's own plane, so a catch cannot pull the
     * corner off what it landed on.
     */
    private trackCorner(gesture: DrawGesture, ray: BABYLON.Ray): void {
        const landing = this.landingFor(ray);
        if (!landing) {
            gesture.landed = false;
            gesture.hit = null;
            this.snapService.hideMarker();
            return;
        }

        gesture.landingAxis = landing.axis;
        gesture.landed = true;
        const hit = this.snapService.snap(landing.point, { axes: inPlaneAxes(landing.axis) });
        const point = hit ? hit.point : landing.point;

        gesture.hit = hit ? hit.mode : null;
        gesture.input.setLive({ x: point.x, y: point.y, z: point.z });
        this.snapService.showMarker(hit);
    }

    /**
     * The opposite corner of the base, in the plane the first corner chose.
     * Free on two axes; the snap is confined to them for the same reason the
     * corner's was.
     */
    private trackBase(gesture: DrawGesture, ray: BABYLON.Ray): void {
        const at = rayPlane(toDrawRay(ray), gesture.planeAxis, gesture.first[gesture.planeAxis]);
        if (!at) { return; }

        const axes = inPlaneAxes(gesture.planeAxis);
        const hit = this.snapService.snap(at, { axes: axes });
        const point = hit ? hit.point : at;

        gesture.hit = hit ? hit.mode : null;
        gesture.input.setLive({
            [`d${axes[0]}`]: point[axes[0]] - gesture.first[axes[0]],
            [`d${axes[1]}`]: point[axes[1]] - gesture.first[axes[1]]
        } as GestureValues);
        this.snapService.showMarker(hit);
        this.redrawPreview(gesture);
    }

    /**
     * The height, read off the vertical line through the base's far corner -
     * the same aiming AutoCAD's `BOX` asks for at its third step.
     */
    private trackHeight(gesture: DrawGesture, ray: BABYLON.Ray): void {
        const z = heightAlong(toDrawRay(ray), gesture.second);
        if (z === null) { return; }

        const target = { x: gesture.second.x, y: gesture.second.y, z: z };
        const hit = this.snapService.snap(target, { axes: ['z'] });
        const at = hit ? hit.point.z : z;

        gesture.hit = hit ? hit.mode : null;
        gesture.input.setLive({ dz: at - gesture.first.z });
        this.snapService.showMarker(hit);
        this.redrawPreview(gesture);
    }

    /**
     * Where the first corner would land: the surface under the cursor first,
     * the floor of the nearest &MESH second, nothing where there is neither.
     */
    private landingFor(ray: BABYLON.Ray): { point: ScenePoint, axis: SceneAxis } | null {
        const surface = this.pickService.surfaceUnder(ray);
        if (surface) {
            return { point: surface.point, axis: landedAxis(surface.element.xb, surface.point) };
        }

        const floor = floorUnder(toDrawRay(ray), this.snapService.meshes);
        return floor ? { point: floor, axis: 'z' } : null;
    }

    // ==========================================
    // Advancing, and finishing
    // ==========================================

    /** One step forward - a click, or Enter on the typed numbers. */
    private advance(): void {
        const gesture = this.current;

        if (gesture.step === 'corner') {
            // Landed by the mouse, or stated by the keyboard - a click into a
            // void is neither, and asks for nothing (spec: the corner lands on
            // a surface or a floor, never at wherever the numbers stand)
            const typed = gesture.input.fields.some(field => field.typed);
            if (!gesture.landed && !typed) { return; }

            const values = gesture.input.resolved;
            gesture.first = { x: values.x ?? 0, y: values.y ?? 0, z: values.z ?? 0 };
            // The base is horizontal for a solid - AutoCAD's BOX - and in the
            // landed surface's own plane for a &VENT, which has to lie on one
            gesture.planeAxis = gesture.kind === 'vent' ? gesture.landingAxis : 'z';
            gesture.step = 'base';
            gesture.input = GestureInput.forAxes(inPlaneAxes(gesture.planeAxis));
            gesture.hit = null;
            this.snapService.hideMarker();
            this.publish();
            return;
        }

        if (gesture.step === 'base') {
            gesture.second = this.resolvedSecond(gesture);

            if (gesture.kind === 'vent') {
                this.end(this.commandFor(gesture));
                return;
            }

            gesture.step = 'height';
            gesture.input = GestureInput.forAxes(['z']);
            gesture.hit = null;
            this.snapService.hideMarker();
            this.publish();
            return;
        }

        this.end(this.commandFor(gesture));
    }

    /** The base's far corner, typed values included, held to the base plane. */
    private resolvedSecond(gesture: DrawGesture): ScenePoint {
        const values = gesture.input.resolved;
        const second: Record<SceneAxis, number> = { ...gesture.first };
        inPlaneAxes(gesture.planeAxis).forEach(axis =>
            second[axis] = gesture.first[axis] + (values[`d${axis}` as GestureKey] ?? 0));
        return second;
    }

    /**
     * What the finished gesture is asking for - or null when the base never
     * opened up. A gesture whose base is a single point asks for nothing, the
     * same way a move that never moved does (GizmoService.commandFor): a
     * degenerate element on the undo stack helps nobody. A base flattened to a
     * line, or a zero height, goes through - FDS warns about those, it does
     * not forbid them (ADR-0009).
     */
    private commandFor(gesture: DrawGesture): SceneCreateCommand | null {
        const axes = inPlaneAxes(gesture.planeAxis);
        const opened = axes.some(axis => gesture.second[axis] !== gesture.first[axis]);
        if (!opened) { return null; }

        return {
            kind: 'create' as const,
            type: gesture.kind,
            xb: this.boxSoFar(gesture),
            surfId: gesture.surfId
        };
    }

    /** The box the gesture describes right now, typed values included. */
    private boxSoFar(gesture: DrawGesture): SceneXb {
        const second = gesture.step === 'base' ? this.resolvedSecond(gesture) : gesture.second;
        const base = boxBetween(gesture.first, second, gesture.planeAxis);

        return gesture.step === 'height'
            ? extruded(base, 'z', gesture.input.resolved.dz ?? 0)
            : base;
    }

    /** Finish the operation: clean the scene up, emit if there is anything to. */
    private end(command: SceneCreateCommand | null): void {
        this.dropGesture();
        this.activeSubject.next(null);
        this.setCursor('');
        this.publish();

        if (command) { this.editStream.emit(command); }
    }

    /** Take the gesture and everything it drew off the scene. */
    private dropGesture(): void {
        this.current = null;
        this.disposePreview();
        this.snapService.hideMarker();
        this.snapService.suspended = false;
    }

    // ==========================================
    // The preview, the overlay, and the scene lifecycle
    // ==========================================

    /** Redraw the preview box after the mouse or the keyboard moved a number. */
    private redrawPreview(gesture: DrawGesture): void {
        if (gesture.step === 'corner') { return; }
        this.showPreview(this.boxSoFar(gesture));
    }

    /**
     * The box the gesture has so far, in the accent colour.
     *
     * Presentation-only, like the gizmo's preview outlines (ADR-0004): the
     * element does not exist until the app answers the command. Rebuilt per
     * change rather than scaled, exactly as PickService.previewBox does - a
     * box is cheap and a stretched one distorts its edge rendering.
     */
    private showPreview(xb: SceneXb): void {
        const scene = this.babylonService.scene;
        if (!scene) { return; }

        this.disposePreview();

        // A flat box still has to have a body for Babylon to build
        const mesh = BABYLON.MeshBuilder.CreateBox('drawPreview', {
            width: Math.max(xb.x2 - xb.x1, 1e-4),
            height: Math.max(xb.y2 - xb.y1, 1e-4),
            depth: Math.max(xb.z2 - xb.z1, 1e-4)
        }, scene);

        mesh.isPickable = false;
        mesh.material = this.previewMaterialFor(scene);
        mesh.enableEdgesRendering();
        mesh.edgesWidth = this.sceneBounds.outlineWidth;
        mesh.edgesColor = ACCENT_EDGE_COLOR;
        mesh.position = new BABYLON.Vector3(
            (xb.x1 + xb.x2) / 2, (xb.y1 + xb.y2) / 2, (xb.z1 + xb.z2) / 2);

        this.previewMesh = mesh;
    }

    private disposePreview(): void {
        if (this.previewMesh) {
            this.previewMesh.dispose();
            this.previewMesh = null;
        }
    }

    /** Azure and translucent - "the tool is doing something", not yet a body. */
    private previewMaterialFor(scene: BABYLON.Scene): BABYLON.StandardMaterial {
        if (this.previewMaterial) { return this.previewMaterial; }

        const material = new BABYLON.StandardMaterial('drawPreviewMaterial', scene);
        material.emissiveColor = ACCENT_COLOR;
        material.disableLighting = true;
        material.alpha = PREVIEW_ALPHA;
        this.previewMaterial = material;
        return material;
    }

    private publish(): void {
        this.gesture = this.viewOf(this.current);
        this.gestureSubject.next(this.gesture);
    }

    /** The gesture as the overlay draws it - the same panel the gizmo feeds. */
    private viewOf(gesture: DrawGesture | null): GestureView | null {
        if (!gesture) { return null; }

        return {
            kind: 'draw',
            fields: gesture.input.fields,
            activeKey: gesture.input.activeKey,
            at: this.pointerOnCanvas(),
            snap: gesture.hit
        };
    }

    /** Where the pointer is over the canvas - see GizmoService.pointerOnCanvas. */
    private pointerOnCanvas(): { x: number, y: number } {
        const scene = this.babylonService.scene;
        return scene ? { x: scene.pointerX, y: scene.pointerY } : { x: 0, y: 0 };
    }

    /** The crosshair says the next click draws; its absence says it selects. */
    private setCursor(cursor: string): void {
        const canvas = this.babylonService.canvas;
        if (canvas) { canvas.style.cursor = cursor; }
    }

    /** The scene is gone, and the preview and marker went with it. */
    public resetSceneState(): void {
        this.previewMesh = null;
        this.previewMaterial = null;
        this.current = null;
        this.activeSubject.next(null);
        this.publish();
    }
}

/** A Babylon ray, as the plain numbers draw.ts reasons over. */
export function toDrawRay(ray: BABYLON.Ray): DrawRay {
    return {
        origin: { x: ray.origin.x, y: ray.origin.y, z: ray.origin.z },
        direction: { x: ray.direction.x, y: ray.direction.y, z: ray.direction.z }
    };
}
