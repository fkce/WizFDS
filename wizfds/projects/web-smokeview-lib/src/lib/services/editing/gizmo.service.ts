import { Injectable, isDevMode } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import * as BABYLON from 'babylonjs';

import { BabylonService } from '../babylon/babylon.service';
import { SceneLifecycleService, SceneScoped } from '../babylon/scene-lifecycle.service';
import { ScenePick } from '../babylon/scene-registry.service';
import { SceneRegistryService } from '../babylon/scene-registry.service';
import { SceneAxis } from '../scene-bounds/scene-bounds.service';
import { PickService } from '../picking/pick.service';
import { SceneXb } from '../drawing/scene-input';
import { EditStreamService } from './edit-stream.service';
import { SceneDelta, SceneEditCommand } from './edit-command';
import { dragFace, faceAxis, faceCentre, SCENE_FACES, SceneFace } from './face-drag';
import { GestureField, GestureInput, GestureKey } from './gesture';
import { SnapMode } from './snap';
import { ACCENT_COLOR } from '../../consts/drawing';
import { SnapService } from './snap.service';

/** Which manipulator is on screen - the ribbon's Move and Resize. */
export type GizmoMode = 'move' | 'resize';

/**
 * What the dynamic input draws while a gesture is running.
 *
 * A snapshot rather than the machinery: the overlay reads numbers and a
 * position and knows nothing about drag behaviours or snap candidates.
 */
export interface GestureView {
    readonly kind: GizmoMode,
    readonly fields: readonly GestureField[],
    /** Which field the keyboard is in - what the panel focuses. */
    readonly activeKey: GestureKey,
    /** Where to put the panel, in canvas pixels. */
    readonly at: { x: number, y: number },
    /** What caught the gesture, if anything did - named beside the cursor. */
    readonly snap: SnapMode | null
}

/**
 * How big a face handle is drawn, in screen pixels.
 *
 * On screen and not in metres, as `PositionGizmo`'s arrows are: a handle a
 * fixed size in metres is a speck on a tunnel and fills the view of a cupboard.
 */
const HANDLE_PIXELS = 12;

/** One gesture, while it is happening. */
interface Gesture {
    readonly kind: GizmoMode,
    /** What is being edited, by uuid. */
    readonly uuids: readonly string[],
    /** Where each of them stood when the gesture began. */
    readonly boxes: ReadonlyMap<string, SceneXb>,
    /** The box the whole selection occupied - what a translate snaps with. */
    readonly union: SceneXb,
    /** The face being dragged, for a resize. */
    readonly face?: SceneFace,
    readonly input: GestureInput,
    /** What has caught it, as of the last frame. */
    hit: SnapMode | null,
    /** Where the gesture currently is, snapped, in metres. */
    at: BABYLON.Vector3,
    /** Whether it has already been settled by the keyboard. */
    finished: boolean
}

/**
 * Picking an element up, moving it, and resizing it.
 *
 * Two manipulators, because an &OBST is always axis-aligned and the two
 * gestures are not the same shape (#124):
 *
 * - **move** is Babylon's `PositionGizmo` - three axis arrows and three plane
 *   handles, a constant size on screen, and a drag projection that has been
 *   tested by everyone who uses Babylon;
 * - **resize** is six face handles of our own, because each face is exactly one
 *   `XB` coordinate. A `BoundingBoxGizmo` corner moves two or three faces at
 *   once and works by scaling about the centre, which would have to be
 *   translated back into `XB` afterwards - and a snap to the grid would stop
 *   being obvious.
 *
 * The gesture is previewed here and one command is emitted when it ends
 * (ADR-0004): the round trip through the app cannot fit inside a frame, and one
 * gesture has to be one entry in the history however many elements it touched
 * (ADR-0009).
 *
 * The lifecycle below - `beginMove`, `trackMove`, `commit`, `cancel` - is the
 * whole of what a gesture is. The Babylon drag events are an adapter over it,
 * and so is the dynamic input: typing a number and dragging the mouse are two
 * ways of saying the same thing.
 */
@Injectable({
    providedIn: 'root'
})
export class GizmoService implements SceneScoped {

    /**
     * Whether this scene is editable at all.
     *
     * Off unless a host says otherwise, and only `wizfds` does. The standalone
     * viewer has no `Fds` to apply a command to and nothing subscribed to the
     * command stream, so a gizmo there would move an outline that snapped back
     * the moment the pointer came up - and editing in the standalone viewer is
     * deliberately out of scope (#88). The same switch, and the same reason, as
     * `PickService.applyOwnPicks`.
     */
    public get enabled(): boolean {
        return this.editable;
    }

    public set enabled(editable: boolean) {
        if (this.editable === editable) { return; }

        this.editable = editable;
        if (!editable) { this.cancel(); }
        this.rebuild();
    }

    private editable = false;

    /** Which manipulator the ribbon has asked for. */
    public mode: GizmoMode = 'move';

    /** What the dynamic input draws. Null when no gesture is running. */
    public gesture: GestureView | null = null;

    /**
     * The same, as a stream.
     *
     * A drag arrives from Babylon's own pointer handling, and the overlay has
     * to be redrawn on each frame of it whether or not that turn of the loop
     * happened to run change detection.
     */
    public readonly gesture$: Observable<GestureView | null>;

    private readonly gestureSubject = new BehaviorSubject<GestureView | null>(null);

    private selection: readonly ScenePick[] = [];
    private current: Gesture | null = null;

    /** The layer the manipulators are drawn in, over everything else. */
    private layer: BABYLON.UtilityLayerRenderer | null = null;
    private positionGizmo: BABYLON.PositionGizmo | null = null;
    private anchor: BABYLON.TransformNode | null = null;
    private readonly handles = new Map<SceneFace, BABYLON.Mesh>();

    /** What holds the handles at a constant size on screen - see buildHandles. */
    private handleSizing: BABYLON.Observer<BABYLON.Scene> | null = null;

    /** Where the anchor stood when the current translate began. */
    private anchorAtStart: BABYLON.Vector3 | null = null;

    constructor(
        private babylonService: BabylonService,
        private pickService: PickService,
        private sceneRegistry: SceneRegistryService,
        private snapService: SnapService,
        private editStream: EditStreamService,
        sceneLifecycle: SceneLifecycleService
    ) {
        sceneLifecycle.register(this);
        this.gesture$ = this.gestureSubject.asObservable();

        // The manipulator stands on the selection, so it follows it - including
        // the redraw that follows an edit, which is what keeps it from staying
        // behind on the box the element used to occupy.
        this.pickService.selection$.subscribe(selected => this.onSelectionChanged(selected));
    }

    // ==========================================
    // What is on screen
    // ==========================================

    /**
     * Whether the six face handles have anything to act on.
     *
     * One element only: which face of which element a drag would be is not a
     * question six handles can answer for a multiple selection, and the honest
     * answer is to offer Move instead.
     */
    public get canResize(): boolean {
        return this.editable && this.selection.length === 1;
    }

    /** Show a different manipulator - what the ribbon's Modify panel does. */
    public setMode(mode: GizmoMode): void {
        if (this.mode === mode) { return; }
        this.cancel();
        this.mode = mode;
        this.rebuild();
    }

    /** Whether a drag is in progress, so a click is not also a selection. */
    public get isDragging(): boolean {
        return !!this.current || !!this.positionGizmo?.isDragging;
    }

    /**
     * Whether the pointer is over a manipulator.
     *
     * What keeps a press on an arrow from selecting whatever stands behind it,
     * and a release on one from dropping the selection the gesture is about.
     */
    public get isPointerOnGizmo(): boolean {
        if (this.positionGizmo?.isHovered) { return true; }

        const scene = this.babylonService.scene;
        if (this.handles.size === 0 || !this.layer || !scene) { return false; }

        // Where the pointer is comes from the scene the canvas belongs to; what
        // it might have hit is in the layer drawn over it.
        const meshes = new Set<BABYLON.AbstractMesh>(this.handles.values());
        const pick = this.layer.utilityLayerScene.pick(
            scene.pointerX, scene.pointerY, (mesh) => meshes.has(mesh));

        return !!pick?.hit;
    }

    /**
     * Suspend snapping for the rest of the gesture - ctrl is down.
     *
     * The way past a grid that will not let the user put something where they
     * mean to, and the same key AutoCAD uses for the same purpose.
     *
     * It latches: pressed at any point in a drag, snapping stays off until the
     * gesture ends (see end()). Releasing ctrl half way through a drag must not
     * pull the element back onto the grid it was just freed from - and a keyup
     * arrives for every other key too, including the digits being typed into the
     * dynamic input. The latch is armed afresh by each press on the canvas, so
     * it never carries into the next gesture.
     */
    public setSnapSuspended(suspended: boolean): void {
        if (!suspended && this.current) { return; }
        this.snapService.suspended = suspended;
    }

    // ==========================================
    // The gesture
    // ==========================================

    /** Start a translate of everything selected. */
    public beginMove(): void {
        this.begin('move');
    }

    /** Start a drag of one face of the one selected element. */
    public beginResize(face: SceneFace): void {
        this.begin('resize', face);
    }

    /**
     * Where the mouse currently has a translate.
     *
     * @param axes the axes the handle allows - one for an arrow, two for a
     *             plane. A snap is confined to them.
     */
    public trackMove(delta: SceneDelta, axes: readonly SceneAxis[]): void {
        const gesture = this.current;
        if (!gesture || gesture.kind !== 'move' || gesture.finished) { return; }

        const snapped = this.snapService.snapMove(
            gesture.union, delta, axes, new Set(gesture.uuids));

        gesture.hit = snapped.hit ? snapped.hit.mode : null;
        gesture.input.setLive({
            dx: snapped.delta.dx, dy: snapped.delta.dy, dz: snapped.delta.dz
        });
        gesture.at = new BABYLON.Vector3(
            (gesture.union.x1 + gesture.union.x2) / 2 + snapped.delta.dx,
            (gesture.union.y1 + gesture.union.y2) / 2 + snapped.delta.dy,
            (gesture.union.z1 + gesture.union.z2) / 2 + snapped.delta.dz
        );

        this.snapService.showMarker(snapped.hit);
        this.pickService.previewMove(this.resolvedDelta(gesture));
        this.publish();
    }

    /** Where the mouse currently has a face handle, along its own axis. */
    public trackResize(coordinate: number): void {
        const gesture = this.current;
        if (!gesture || gesture.kind !== 'resize' || gesture.finished) { return; }

        const face = gesture.face;
        const base = gesture.boxes.get(gesture.uuids[0]);

        // Aimed with the face's corners rather than its middle: the middle of a
        // ten-metre wall is five metres from anything it could catch on.
        const dragged = this.snapService.snapFace(
            base, face, coordinate, new Set(gesture.uuids));
        const box = dragFace(base, face, dragged.coordinate);

        const centre = faceCentre(box, face);
        gesture.hit = dragged.hit ? dragged.hit.mode : null;
        gesture.input.setLive({ [face]: box[face] });
        gesture.at = new BABYLON.Vector3(centre.x, centre.y, centre.z);

        this.snapService.showMarker(dragged.hit);
        this.pickService.previewBox(gesture.uuids[0], box);
        this.updateHandles(box);
        this.publish();
    }

    /**
     * Take a field over from the mouse.
     *
     * The dynamic input's whole purpose: state the dimension that matters and
     * go on aiming the rest.
     */
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
     * Settle the gesture and ask for the edit.
     *
     * One command for the whole gesture, whether it touched one element or a
     * hundred. A gesture that ended where it began asks for nothing: an edit
     * that changes nothing would still take a place on the undo stack.
     */
    public commit(): void {
        const gesture = this.current;
        if (!gesture) { return; }

        gesture.finished = true;
        const command = this.commandFor(gesture);
        this.end();

        if (command) { this.editStream.emit(command); }
    }

    /** Abandon it - Escape, or the selection going out from under it. */
    public cancel(): void {
        if (!this.current) { return; }

        this.current.finished = true;
        this.end();
    }

    // ==========================================
    // Building a gesture, and finishing one
    // ==========================================

    private begin(kind: GizmoMode, face?: SceneFace): void {
        this.cancel();
        if (!this.editable) { return; }

        const uuids = this.selection.map(element => element.uuid);
        if (uuids.length === 0) { return; }
        if (kind === 'resize' && (!face || uuids.length !== 1)) { return; }

        const boxes = new Map<string, SceneXb>();
        uuids.forEach(uuid => {
            const entry = this.sceneRegistry.entryFor(uuid);
            if (entry) { boxes.set(uuid, { ...entry.xb }); }
        });
        if (boxes.size === 0) { return; }

        this.current = {
            kind: kind,
            uuids: Array.from(boxes.keys()),
            boxes: boxes,
            union: unionOf(Array.from(boxes.values())),
            face: face,
            input: kind === 'move' ? GestureInput.forMove() : GestureInput.forFace(face),
            hit: null,
            at: BABYLON.Vector3.Zero(),
            finished: false
        };

        this.publish();
    }

    /** What the gesture is asking for, or null if it is asking for nothing. */
    private commandFor(gesture: Gesture): SceneEditCommand | null {
        if (gesture.kind === 'move') {
            const delta = this.resolvedDelta(gesture);
            if (delta.dx === 0 && delta.dy === 0 && delta.dz === 0) { return null; }
            return { kind: 'move' as const, uuids: gesture.uuids, delta: delta };
        }

        const uuid = gesture.uuids[0];
        const box = this.resolvedBox(gesture);
        if (sameBox(box, gesture.boxes.get(uuid))) { return null; }

        return { kind: 'setXb' as const, uuid: uuid, xb: box };
    }

    /** Where the translate has got to, keyboard included. */
    private resolvedDelta(gesture: Gesture): SceneDelta {
        const values = gesture.input.resolved;
        return { dx: values.dx ?? 0, dy: values.dy ?? 0, dz: values.dz ?? 0 };
    }

    /** The box the face drag has produced, keyboard included. */
    private resolvedBox(gesture: Gesture): SceneXb {
        const base = gesture.boxes.get(gesture.uuids[0]);
        // The face's own key is always among the resolved values - it is the
        // only one a face gesture has - but the map is partial by type
        return dragFace(
            base, gesture.face, gesture.input.resolved[gesture.face] ?? base[gesture.face]);
    }

    /** Redraw the preview after the keyboard has changed a number. */
    private redrawPreview(gesture: Gesture): void {
        if (gesture.kind === 'move') {
            this.pickService.previewMove(this.resolvedDelta(gesture));
            return;
        }

        const box = this.resolvedBox(gesture);
        this.pickService.previewBox(gesture.uuids[0], box);
        this.updateHandles(box);
    }

    /**
     * Put everything the gesture disturbed back.
     *
     * The preview goes back to what the scenario says - which, for a committed
     * gesture, is about to become what the command made of it, and for an
     * abandoned one is where the element never stopped being.
     */
    private end(): void {
        this.current = null;
        this.snapService.hideMarker();
        this.snapService.suspended = false;
        this.pickService.endPreview();
        this.rebuild();
        this.publish();
    }

    private publish(): void {
        this.gesture = this.viewOf(this.current);
        this.gestureSubject.next(this.gesture);
    }

    /** The gesture as the overlay needs it, or null when there is none. */
    private viewOf(gesture: Gesture | null): GestureView | null {
        if (!gesture) { return null; }

        return {
            kind: gesture.kind,
            fields: gesture.input.fields,
            activeKey: gesture.input.activeKey,
            at: this.screenOf(gesture.at),
            snap: gesture.hit
        };
    }

    /** Where a point in the model falls on the canvas, in pixels. */
    private screenOf(point: BABYLON.Vector3): { x: number, y: number } {
        const scene = this.babylonService.scene;
        const engine = this.babylonService.engine;
        const camera = this.babylonService.camera;
        // Before the first frame there is no viewport to project into, and the
        // panel has nowhere to be
        if (!scene || !engine || !camera?.viewport) { return { x: 0, y: 0 }; }

        const projected = BABYLON.Vector3.Project(
            point,
            BABYLON.Matrix.Identity(),
            scene.getTransformMatrix(),
            camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
        );

        return { x: projected.x, y: projected.y };
    }

    // ==========================================
    // The manipulators themselves
    // ==========================================

    private onSelectionChanged(selected: readonly ScenePick[]): void {
        this.selection = selected;

        // A gesture whose elements have gone - deleted, or a scenario switched
        // under it - has nothing left to be about
        if (this.current && selected.length === 0) { this.cancel(); return; }

        // Rebuilding puts the manipulator back on what the *model* says, which
        // mid-gesture would take it out from under the hand dragging it. The
        // gesture puts it where it belongs when it ends - see end().
        if (this.current) { return; }

        this.rebuild();
    }

    /** Put the manipulator where the selection now is, or take it away. */
    private rebuild(): void {
        const scene = this.babylonService.scene;
        if (!this.editable || !scene || this.selection.length === 0) { this.teardown(); return; }

        try {
            this.ensureLayer(scene);
            if (this.mode === 'move') {
                this.showPositionGizmo();
                this.clearHandles();
            } else if (this.canResize) {
                this.showHandles();
                this.hidePositionGizmo();
            } else {
                this.clearHandles();
                this.hidePositionGizmo();
            }
        } catch (e) {
            if (isDevMode()) { try { console.error('[GizmoService] Could not build the manipulator', e); } catch { } }
        }
    }

    private ensureLayer(scene: BABYLON.Scene): void {
        if (this.layer) { return; }
        // One of our own rather than the shared default, which outlives the
        // scene it was made for and would be handed to the next one
        this.layer = new BABYLON.UtilityLayerRenderer(scene);
    }

    /** The three arrows and the three plane handles, over the selection. */
    private showPositionGizmo(): void {
        const centre = this.selectionCentre();

        if (!this.positionGizmo) {
            this.anchor = new BABYLON.TransformNode('gizmoAnchor', this.layer.originalScene);

            const gizmo = new BABYLON.PositionGizmo(this.layer);
            gizmo.planarGizmoEnabled = true;
            gizmo.updateGizmoRotationToMatchAttachedMesh = false;

            gizmo.onDragStartObservable.add(() => this.onGizmoDragStart());
            gizmo.onDragObservable.add(() => this.onGizmoDrag());
            gizmo.onDragEndObservable.add(() => this.onGizmoDragEnd());

            this.positionGizmo = gizmo;
        }

        this.anchor.position = centre;
        this.positionGizmo.attachedNode = this.anchor;
    }

    private hidePositionGizmo(): void {
        if (this.positionGizmo) { this.positionGizmo.attachedNode = null; }
    }

    private onGizmoDragStart(): void {
        this.anchorAtStart = this.anchor.position.clone();
        this.beginMove();
    }

    private onGizmoDrag(): void {
        if (!this.current || !this.anchorAtStart) { return; }

        const moved = this.anchor.position.subtract(this.anchorAtStart);
        this.trackMove(
            { dx: moved.x, dy: moved.y, dz: moved.z },
            axesMoved(this.positionGizmo));

        // Put the arrows where the snap decided the gesture is, not where the
        // pointer would have had it - otherwise the gizmo and the outline part
        // company as soon as anything catches.
        const delta = this.resolvedDelta(this.current);
        this.anchor.position = this.anchorAtStart.add(
            new BABYLON.Vector3(delta.dx, delta.dy, delta.dz));
    }

    private onGizmoDragEnd(): void {
        this.anchorAtStart = null;
        this.commit();
    }

    /** The six face handles, on the one selected element. */
    private showHandles(): void {
        const entry = this.sceneRegistry.entryFor(this.selection[0].uuid);
        if (!entry) { this.clearHandles(); return; }

        if (this.handles.size === 0) { this.buildHandles(); }
        this.updateHandles(entry.xb);
    }

    private buildHandles(): void {
        const utility = this.layer.utilityLayerScene;

        const material = new BABYLON.StandardMaterial('faceHandle', utility);
        material.emissiveColor = ACCENT_COLOR;
        material.disableLighting = true;

        SCENE_FACES.forEach(face => {
            const handle = BABYLON.MeshBuilder.CreateBox(`faceHandle_${face}`, { size: 1 }, utility);
            handle.material = material;

            const axis = faceAxis(face);
            const behavior = new BABYLON.PointerDragBehavior({
                dragAxis: new BABYLON.Vector3(
                    axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0)
            });
            // Babylon moves the handle; where it may go is this service's answer
            behavior.moveAttached = true;
            behavior.onDragStartObservable.add(() => this.beginResize(face));
            behavior.onDragObservable.add(() => this.onHandleDrag(face, handle));
            behavior.onDragEndObservable.add(() => this.commit());

            handle.addBehavior(behavior);
            this.handles.set(face, handle);
        });

        // Resized every frame, as PositionGizmo does with its arrows: how many
        // metres a pixel covers changes with every turn of the wheel, and a
        // handle that does not follow stops being clickable at one end of the
        // zoom and hides the wall at the other.
        this.handleSizing = utility.onBeforeRenderObservable.add(() => this.resizeHandles());
    }

    /** Hold the handles at the same size on screen, wherever the camera is. */
    private resizeHandles(): void {
        this.handles.forEach(handle => {
            const size = Math.max(
                HANDLE_PIXELS * this.snapService.metresPerPixelAt(handle.position), 1e-4);
            handle.scaling.set(size, size, size);
        });
    }

    private onHandleDrag(face: SceneFace, handle: BABYLON.Mesh): void {
        this.trackResize(handle.position[faceAxis(face)]);
    }

    /** Put the handles on the faces of a box - the element's, or a preview's. */
    private updateHandles(xb: SceneXb): void {
        if (this.handles.size === 0) { return; }

        this.handles.forEach((handle, face) => {
            const centre = faceCentre(xb, face);
            handle.position.set(centre.x, centre.y, centre.z);
        });
        this.resizeHandles();
    }

    private clearHandles(): void {
        if (this.handleSizing && this.layer) {
            this.layer.utilityLayerScene.onBeforeRenderObservable.remove(this.handleSizing);
        }
        this.handleSizing = null;

        this.handles.forEach(handle => handle.dispose());
        this.handles.clear();
    }

    /** The middle of everything selected, which is where the arrows stand. */
    private selectionCentre(): BABYLON.Vector3 {
        const boxes = this.selection
            .map(element => this.sceneRegistry.entryFor(element.uuid))
            .filter(entry => !!entry)
            .map(entry => entry.xb);

        const union = unionOf(boxes.length > 0 ? boxes : [this.selection[0].xb]);
        return new BABYLON.Vector3(
            (union.x1 + union.x2) / 2, (union.y1 + union.y2) / 2, (union.z1 + union.z2) / 2);
    }

    private teardown(): void {
        this.clearHandles();
        this.hidePositionGizmo();
    }

    /** Nothing here may outlive the scene it was drawn in. */
    public resetSceneState(): void {
        this.current = null;
        this.selection = [];
        this.handles.clear();
        this.positionGizmo = null;
        this.anchor = null;
        this.anchorAtStart = null;
        this.layer = null;
        this.publish();
    }
}

/** The box that encloses all of them. */
function unionOf(boxes: readonly SceneXb[]): SceneXb {
    return {
        x1: Math.min(...boxes.map(box => box.x1)), x2: Math.max(...boxes.map(box => box.x2)),
        y1: Math.min(...boxes.map(box => box.y1)), y2: Math.max(...boxes.map(box => box.y2)),
        z1: Math.min(...boxes.map(box => box.z1)), z2: Math.max(...boxes.map(box => box.z2))
    };
}

/** Whether two boxes are the same to the millimetre a coordinate is shown at. */
function sameBox(one: SceneXb, other: SceneXb): boolean {
    return (Object.keys(one) as (keyof SceneXb)[])
        .every(key => Math.abs(one[key] - other[key]) < 0.0005);
}

/**
 * Which axes the handle the user grabbed leaves free.
 *
 * An arrow is one, a plane handle is the two its plane spans, and a plane
 * gizmo is named after the axis it is *normal* to - `xPlaneGizmo` is the yz
 * plane. Nothing dragging at all answers with all three, which is what a
 * gesture driven from the keyboard alone is.
 */
function axesMoved(gizmo: BABYLON.PositionGizmo | null): readonly SceneAxis[] {
    if (!gizmo) { return ['x', 'y', 'z']; }

    if (gizmo.xGizmo?.dragBehavior?.dragging) { return ['x']; }
    if (gizmo.yGizmo?.dragBehavior?.dragging) { return ['y']; }
    if (gizmo.zGizmo?.dragBehavior?.dragging) { return ['z']; }
    if (gizmo.xPlaneGizmo?.dragBehavior?.dragging) { return ['y', 'z']; }
    if (gizmo.yPlaneGizmo?.dragBehavior?.dragging) { return ['x', 'z']; }
    if (gizmo.zPlaneGizmo?.dragBehavior?.dragging) { return ['x', 'y']; }

    return ['x', 'y', 'z'];
}
