import { Injectable, isDevMode } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import * as BABYLON from 'babylonjs';

import { BabylonService } from '../babylon/babylon.service';
import { SceneLifecycleService, SceneScoped } from '../babylon/scene-lifecycle.service';
import { ScenePick } from '../babylon/scene-registry.service';
import { SceneRegistryService } from '../babylon/scene-registry.service';
import { SceneAxis, ScenePoint } from '../scene-bounds/scene-bounds.service';
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
    /**
     * Where to put the panel: at the cursor, in canvas-local CSS pixels.
     *
     * The cursor and not the gesture's own position - a slab spans half the
     * model, and a panel anchored to its centre wanders across the screen
     * while the hand stays put. AutoCAD's dynamic input rides the crosshair
     * for the same reason.
     */
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

/**
 * How far a grip's base stands clear of the face it drags, in metres.
 *
 * Not zero, because a grip centred on its face reaches half its length into
 * the element - and on an element one cell across, the two opposing grips met
 * in the middle and read as one mark. Held off the wall, they point away from
 * each other and cannot meet however thin the element is.
 */
const GRIP_CLEARANCE = 0.1;

/**
 * Half the grip triangle's own length: the tip sits this far ahead of its
 * centre, the base this far behind (see triangleHandle). What placeHandles()
 * multiplies by the on-screen scale to stand the *base* at the clearance
 * distance, not the centre.
 */
const GRIP_HALF = 0.65;

/**
 * How big the plan square is drawn, in screen pixels - the same 12 as the face
 * handles, so the two manipulators read as one family.
 */
const MOVE_SQUARE_PIXELS = 12;

/**
 * How long an axis arrow is, in screen pixels.
 *
 * About a quarter of what Babylon's triad subtended here: long enough to say
 * which way it drags and to give the eye a track to run along, short enough
 * that it stops covering the element it stands on
 * (docs/research/move-gizmo-design.md).
 */
const MOVE_ARROW_PIXELS = 45;

/** The daylight between the square's edge and the start of an arrow, in pixels. */
const MOVE_GAP_PIXELS = 8;

/**
 * The arrow's proportions, in units of its own length.
 *
 * The drawing is a hairline - the grabbing is the collider's job, the same
 * split AutoCAD makes between grip size and aperture, and the one Babylon
 * itself quietly made under the old triad.
 */
const ARROW_LINE_HALF = 0.017;  // half the shaft's width - about a pixel and a half
const ARROW_HEAD_AT = 0.78;     // where the shaft ends and the head begins
const ARROW_HEAD_HALF = 0.11;   // half the head's width - about ten pixels
const ARROW_HIT_GIRTH = 0.36;   // the collider's girth - about sixteen pixels
const ARROW_HIT_LENGTH = 1.1;   // the collider's length - a whisker past the head

/** The plan square's collider, in units of the square's side - about 22 px. */
const SQUARE_HIT_DIAMETER = 1.8;

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
    /** Whether it has already been settled by the keyboard. */
    finished: boolean
}

/**
 * Picking an element up, moving it, and resizing it.
 *
 * Two manipulators, because an &OBST is always axis-aligned and the two
 * gestures are not the same shape (#124):
 *
 * - **move** is a square on the selection's base that slides it in plan, and
 *   one arrow per horizontal axis - the height is typed, not dragged, which is
 *   where it comes from anyway. Our own grips rather than Babylon's
 *   `PositionGizmo`, whose triad spoke a game editor's language and covered a
 *   small element whole (docs/research/move-gizmo-design.md);
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
    private readonly handles = new Map<SceneFace, BABYLON.Mesh>();
    private readonly moveHandles = new Map<MoveHandle, BABYLON.Mesh>();

    /** Every mesh the pointer may land on, mapped to the handle it belongs to. */
    private readonly hitTargets = new Map<BABYLON.AbstractMesh, BABYLON.Mesh>();

    /** One material for every handle, and a brighter one for the hovered one. */
    private handleMaterial: BABYLON.StandardMaterial | null = null;
    private hoverMaterial: BABYLON.StandardMaterial | null = null;

    /**
     * The pointer's own accumulated movement, with no snap corrections in it.
     *
     * Babylon delivers a drag as increments of the pointer. Summed raw, they
     * are where the hand is; folded into the snapped preview instead, a catch
     * would consume the pointer's progress frame by frame, and a slow drag
     * could never build up the distance to escape it.
     */
    private readonly rawDragDelta = BABYLON.Vector3.Zero();

    /** How far a face handle has been dragged along its axis, in metres. */
    private handleReach = 0;

    /** The box the face handles stand on - the element's, or the drag's preview. */
    private handleBox: SceneXb | null = null;

    /** Where the move handles stand while no gesture shifts them - the union base. */
    private moveBase: ScenePoint | null = null;

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
        return !!this.current;
    }

    /**
     * Whether the pointer is over a manipulator.
     *
     * What keeps a press on an arrow from selecting whatever stands behind it,
     * and a release on one from dropping the selection the gesture is about.
     */
    public get isPointerOnGizmo(): boolean {
        return !!this.pickedHandle();
    }

    /**
     * The handle under the pointer, apertures included, or null.
     *
     * Where the pointer is comes from the scene the canvas belongs to; what
     * it might have hit is in the layer drawn over it. The apertures too:
     * a press the drag will claim must not read as a press in the scene.
     */
    private pickedHandle(): BABYLON.Mesh | null {
        const scene = this.babylonService.scene;
        if (this.hitTargets.size === 0 || !this.layer || !scene) { return null; }

        const pick = this.layer.utilityLayerScene.pick(
            scene.pointerX, scene.pointerY, (mesh) => this.hitTargets.has(mesh));

        return pick?.hit ? this.hitTargets.get(pick.pickedMesh) : null;
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

        this.snapService.showMarker(snapped.hit);
        this.pickService.previewMove(this.resolvedDelta(gesture));
        this.placeMoveHandles();
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
        const box = dragFace(base, face, dragged.coordinate, this.minimumThickness(base, face));

        // A snap the clamp overruled is no snap: its marker would stand on a
        // point the face was not allowed to reach.
        const clamped = box[face] !== dragged.coordinate;
        gesture.hit = !clamped && dragged.hit ? dragged.hit.mode : null;
        gesture.input.setLive({ [face]: box[face] });

        this.snapService.showMarker(clamped ? null : dragged.hit);
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
            input: kind === 'move'
                ? GestureInput.forMove()
                : GestureInput.forFace(face, boxes.get(uuids[0])[face]),
            hit: null,
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
            base, gesture.face, gesture.input.resolved[gesture.face] ?? base[gesture.face],
            this.minimumThickness(base, gesture.face));
    }

    /**
     * The thinnest a resize may leave the element along the dragged axis: one
     * cell of the grid in force, so `x1` stops a cell short of `x2` and never
     * reaches it - an &OBST pressed flat is one FDS only warns about.
     *
     * An element already thinner than a cell keeps its own thickness as the
     * floor instead - a flat &VENT is the ordinary case, and a minimum that
     * *grew* the box would have the first inch of a drag jump it a whole cell
     * open. With no &MESH there is no cell, and flat is where the clamp stops.
     */
    private minimumThickness(base: SceneXb, face: SceneFace): number {
        const grid = this.snapService.gridAt(faceCentre(base, face));
        if (!grid) { return 0; }

        const axis = faceAxis(face);
        const step = axis === 'x' ? grid.cell.i : axis === 'y' ? grid.cell.j : grid.cell.k;
        const thickness = base[`${axis}2`] - base[`${axis}1`];

        return Math.max(0, Math.min(step, thickness));
    }

    /** Redraw the preview after the keyboard has changed a number. */
    private redrawPreview(gesture: Gesture): void {
        if (gesture.kind === 'move') {
            this.pickService.previewMove(this.resolvedDelta(gesture));
            this.placeMoveHandles();
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

        // The hover outline was drawn over where the element STOOD, and
        // hover() holds its answer while the pointer stays on the same uuid -
        // a gesture that relocated the selection takes the stale outline with
        // it, and the next pointer move draws an honest one.
        this.pickService.clearHover();

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
            at: this.pointerOnCanvas(),
            snap: gesture.hit
        };
    }

    /**
     * Where the pointer is over the canvas, in CSS pixels.
     *
     * Babylon keeps it in exactly that space - `clientX` minus the canvas rect
     * (InputManager._updatePointerPosition) - which is also the space a DOM
     * overlay inside the canvas's container is positioned in. No projection
     * and no devicePixelRatio arithmetic, so it cannot drift from the hand.
     */
    private pointerOnCanvas(): { x: number, y: number } {
        const scene = this.babylonService.scene;
        return scene ? { x: scene.pointerX, y: scene.pointerY } : { x: 0, y: 0 };
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
                this.showMoveHandles();
                this.clearHandles();
            } else if (this.canResize) {
                this.showHandles();
                this.clearMoveHandles();
            } else {
                this.clearHandles();
                this.clearMoveHandles();
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

        // Pinned to the camera the model is drawn with, because this scene has
        // two: the view cube renders through a second one into a corner of the
        // canvas, and the scene's `activeCamera` is left on whichever went last.
        // A utility layer following that would size the gizmo against a camera
        // three metres from the origin - and against one the gizmo stands
        // *behind*, which comes out as a negative scale, flips the winding of
        // every triangle and hands the whole manipulator to backface culling.
        this.layer.setRenderCamera(this.babylonService.camera);

        // Placed and sized every frame, as PositionGizmo did with its arrows:
        // how many metres a pixel covers changes with every turn of the wheel,
        // and the hover has to follow a pointer that moves between redraws.
        // Registered once per layer; it dies with the utility scene.
        this.layer.utilityLayerScene.onBeforeRenderObservable.add(() => {
            this.placeHandles();
            this.placeMoveHandles();
            this.updateHover();
        });
    }

    /** The plan square and the two axis arrows, on the base of the selection. */
    private showMoveHandles(): void {
        const boxes = this.selection
            .map(element => this.sceneRegistry.entryFor(element.uuid))
            .filter(entry => !!entry)
            .map(entry => entry.xb);
        if (boxes.length === 0) { this.clearMoveHandles(); return; }

        if (this.moveHandles.size === 0) { this.buildMoveHandles(); }
        this.moveBase = moveAnchorOf(boxes);
        this.placeMoveHandles();
    }

    private buildMoveHandles(): void {
        const utility = this.layer.utilityLayerScene;
        const material = this.handleMaterialFor(utility);

        MOVE_HANDLES.forEach(kind => {
            const handle = kind === 'plan'
                ? this.squareHandle(utility)
                : this.arrowHandle(kind, utility);
            handle.material = material;

            // The same aperture trick as the face handles: what the pointer
            // catches is an invisible volume around the drawing, so a hairline
            // is grabbed with no more care than the old fat arrows were.
            const aperture = kind === 'plan'
                ? BABYLON.MeshBuilder.CreateSphere(
                    'moveHandleHit_plan',
                    { diameter: SQUARE_HIT_DIAMETER, segments: 6 }, utility)
                : BABYLON.MeshBuilder.CreateBox(`moveHandleHit_${kind}`, {
                    width: kind === 'x' ? ARROW_HIT_LENGTH : ARROW_HIT_GIRTH,
                    height: kind === 'y' ? ARROW_HIT_LENGTH : ARROW_HIT_GIRTH,
                    depth: ARROW_HIT_GIRTH
                }, utility);
            if (kind !== 'plan') {
                // Centred on the arrow's own middle, which its mesh is not -
                // the mesh runs 0..1 from the anchor out
                aperture.position.set(
                    kind === 'x' ? ARROW_HIT_LENGTH / 2 : 0,
                    kind === 'y' ? ARROW_HIT_LENGTH / 2 : 0, 0);
            }
            aperture.parent = handle;
            aperture.visibility = 0;

            const behavior = new BABYLON.PointerDragBehavior(kind === 'plan'
                ? { dragPlaneNormal: new BABYLON.Vector3(0, 0, 1) }
                : {
                    dragAxis: new BABYLON.Vector3(
                        kind === 'x' ? 1 : 0, kind === 'y' ? 1 : 0, 0)
                });

            // The same contract as the face handles: where the handles stand is
            // this service's answer, and the axes are WORLD axes (#124)
            behavior.moveAttached = false;
            behavior.useObjectOrientationForDragging = false;

            behavior.onDragStartObservable.add(() => this.onMoveDragStart());
            behavior.onDragObservable.add(event => this.onMoveDrag(kind, event.delta));
            behavior.onDragEndObservable.add(() => this.onMoveDragEnd());

            handle.addBehavior(behavior);
            this.moveHandles.set(kind, handle);
        });

        this.rebuildHitTargets();
    }

    /**
     * The plan grip: a unit square lying flat on the base, centred on the
     * anchor - AutoCAD's base grip, which is also how PyroSim marks the point
     * an object is taken hold of by.
     */
    private squareHandle(utility: BABYLON.Scene): BABYLON.Mesh {
        const handle = new BABYLON.Mesh('moveHandle_plan', utility);

        const shape = new BABYLON.VertexData();
        shape.positions = [
            -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0
        ];
        shape.indices = [0, 1, 2, 0, 2, 3];
        shape.normals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
        shape.applyToMesh(handle);

        return handle;
    }

    /**
     * One axis arrow: a hairline shaft and a small head, a unit long from the
     * anchor outward, lying flat in the plane of the base like the square it
     * belongs to.
     *
     * Built along its own axis by swapping coordinates rather than rotating,
     * for the same reason the stretch grips never turn (see gripOrientation):
     * these are things of the model, and they hold still.
     */
    private arrowHandle(axis: 'x' | 'y', utility: BABYLON.Scene): BABYLON.Mesh {
        const handle = new BABYLON.Mesh(`moveHandle_${axis}`, utility);

        const at = (along: number, across: number): number[] =>
            axis === 'x' ? [along, across, 0] : [across, along, 0];

        const shape = new BABYLON.VertexData();
        shape.positions = [
            ...at(0, -ARROW_LINE_HALF), ...at(ARROW_HEAD_AT, -ARROW_LINE_HALF),
            ...at(ARROW_HEAD_AT, ARROW_LINE_HALF), ...at(0, ARROW_LINE_HALF),
            ...at(ARROW_HEAD_AT, -ARROW_HEAD_HALF), ...at(ARROW_HEAD_AT, ARROW_HEAD_HALF),
            ...at(1, 0)
        ];
        shape.indices = [0, 1, 2, 0, 2, 3, 4, 5, 6];
        shape.normals = Array(7).fill([0, 0, 1]).flat();
        shape.applyToMesh(handle);

        return handle;
    }

    /**
     * Hold the move handles at the same size on screen, on the union's base -
     * shifted by however far the running gesture has got, so they travel with
     * the preview rather than staying on the box the selection is leaving.
     */
    private placeMoveHandles(): void {
        const base = this.moveBase;
        if (this.moveHandles.size === 0 || !base) { return; }

        const gesture = this.current;
        const delta = gesture && gesture.kind === 'move'
            ? this.resolvedDelta(gesture)
            : { dx: 0, dy: 0, dz: 0 };
        const anchor = {
            x: base.x + delta.dx, y: base.y + delta.dy, z: base.z + delta.dz
        };

        const metresPerPixel = this.snapService.metresPerPixelAt(anchor);
        const square = Math.max(MOVE_SQUARE_PIXELS * metresPerPixel, 1e-4);
        const arrow = Math.max(MOVE_ARROW_PIXELS * metresPerPixel, 1e-4);
        const offset = (MOVE_SQUARE_PIXELS / 2 + MOVE_GAP_PIXELS) * metresPerPixel;

        this.moveHandles.forEach((handle, kind) => {
            const size = kind === 'plan' ? square : arrow;
            handle.scaling.set(size, size, size);
            handle.position.set(
                anchor.x + (kind === 'x' ? offset : 0),
                anchor.y + (kind === 'y' ? offset : 0),
                anchor.z);
        });
    }

    private onMoveDragStart(): void {
        this.rawDragDelta.setAll(0);
        this.beginMove();
    }

    private onMoveDrag(handle: MoveHandle, delta: BABYLON.Vector3): void {
        if (!this.current) { return; }

        this.rawDragDelta.addInPlace(delta);

        // Masked to the handle's own axes: whatever component the pointer ray
        // produced off them is not the gesture's to spend. The height in
        // particular only ever moves by being typed.
        const axes = MOVE_AXES[handle];
        this.trackMove({
            dx: axes.includes('x') ? this.rawDragDelta.x : 0,
            dy: axes.includes('y') ? this.rawDragDelta.y : 0,
            dz: 0
        }, axes);
    }

    private onMoveDragEnd(): void {
        this.commit();
    }

    private clearMoveHandles(): void {
        this.moveHandles.forEach(handle => handle.dispose());
        this.moveHandles.clear();
        this.moveBase = null;
        this.rebuildHitTargets();
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
        const material = this.handleMaterialFor(utility);

        RESIZE_FACES.forEach(face => {
            const handle = this.triangleHandle(`faceHandle_${face}`, utility);
            handle.material = material;

            // Set once and never turned - see gripOrientation
            const basis = gripOrientation(face);
            handle.rotationQuaternion = BABYLON.Quaternion.RotationQuaternionFromAxis(
                basis.right, basis.up, basis.forward);

            // What the pointer actually catches. A flat grip seen at an angle
            // foreshortens to a few pixels - honest to look at, hopeless to
            // click - so an invisible sphere around it takes the hit from any
            // direction, the way AutoCAD's grip aperture is wider than the
            // grip. A child of the handle: it inherits the position and the
            // screen-size scaling, and PointerDragBehavior accepts a press on
            // any descendant of the node it drives.
            const aperture = BABYLON.MeshBuilder.CreateSphere(
                `faceHandleHit_${face}`, { diameter: 1.6, segments: 6 }, utility);
            aperture.parent = handle;
            aperture.visibility = 0;

            const axis = faceAxis(face);
            const behavior = new BABYLON.PointerDragBehavior({
                dragAxis: new BABYLON.Vector3(
                    axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0)
            });

            // Babylon must not move the handle: where a face may go is this
            // service's answer, and the handles are put on the previewed box
            // after every frame (see updateHandles). Left on, the two write to
            // the same position in the same tick and pin the handle where it
            // started.
            behavior.moveAttached = false;

            // The drag axis is a WORLD axis. Left at the default, Babylon
            // rotates it into the handle's own frame - harmless while the
            // handles were unrotated boxes, but a grip that turns to face the
            // camera each frame would drag along wherever its local axis
            // happens to point, not along the face's.
            behavior.useObjectOrientationForDragging = false;

            behavior.onDragStartObservable.add(() => {
                this.handleReach = 0;
                this.beginResize(face);
            });
            behavior.onDragObservable.add(event => this.onHandleDrag(face, event));
            behavior.onDragEndObservable.add(() => this.commit());

            handle.addBehavior(behavior);
            this.handles.set(face, handle);
        });

        this.rebuildHitTargets();
    }

    /**
     * Hold the handles at the same size on screen, each one's base standing
     * GRIP_CLEARANCE off the face it drags.
     *
     * Size and position together, because they are one sum: the centre stands
     * at the clearance plus half the triangle's length, and that length is in
     * screen pixels - it changes with every turn of the wheel. Orientation
     * alone is fixed at build and never turns (see gripOrientation).
     */
    private placeHandles(): void {
        const xb = this.handleBox;
        if (!xb) { return; }

        this.handles.forEach((handle, face) => {
            const centre = faceCentre(xb, face);
            const size = Math.max(
                HANDLE_PIXELS * this.snapService.metresPerPixelAt(centre), 1e-4);
            const reach = GRIP_CLEARANCE + GRIP_HALF * size;
            const outward = faceOutward(face);

            handle.scaling.set(size, size, size);
            handle.position.set(
                centre.x + outward.x * reach,
                centre.y + outward.y * reach,
                centre.z + outward.z * reach);
        });
    }

    /**
     * One stretch grip: a flat triangle, tip on local +x, about a unit across,
     * centred on the point it grips - as AutoCAD centres its own.
     */
    private triangleHandle(name: string, utility: BABYLON.Scene): BABYLON.Mesh {
        const handle = new BABYLON.Mesh(name, utility);

        const shape = new BABYLON.VertexData();
        shape.positions = [
            GRIP_HALF, 0, 0,        // the tip - what points the way
            -GRIP_HALF, 0.5, 0,
            -GRIP_HALF, -0.5, 0
        ];
        shape.indices = [0, 1, 2];
        shape.normals = [0, 0, 1, 0, 0, 1, 0, 0, 1];
        shape.applyToMesh(handle);

        return handle;
    }

    /**
     * How far the pointer has taken a face handle, and where that puts it.
     *
     * Accumulated from the drag events rather than read off the handle: the
     * handle is drawn wherever the *previewed* box says, which is not where the
     * pointer would have put it once a snap or the flat-face clamp has had a
     * say. Reading the mesh back would feed that answer in as the next input.
     */
    private onHandleDrag(face: SceneFace, event: { delta: BABYLON.Vector3 }): void {
        const gesture = this.current;
        if (!gesture || gesture.kind !== 'resize') { return; }

        this.handleReach += event.delta[faceAxis(face)];
        this.trackResize(gesture.boxes.get(gesture.uuids[0])[face] + this.handleReach);
    }

    /** Put the handles on the faces of a box - the element's, or a preview's. */
    private updateHandles(xb: SceneXb): void {
        if (this.handles.size === 0) { return; }

        this.handleBox = xb;
        this.placeHandles();
    }

    private clearHandles(): void {
        this.handles.forEach(handle => handle.dispose());
        this.handles.clear();
        this.handleBox = null;
        this.rebuildHitTargets();
    }

    // ==========================================
    // What every handle shares
    // ==========================================

    /** The pointer's map of the manipulators: every mesh, to its handle. */
    private rebuildHitTargets(): void {
        this.hitTargets.clear();

        const collect = (handle: BABYLON.Mesh) => {
            this.hitTargets.set(handle, handle);
            handle.getChildMeshes().forEach(child => this.hitTargets.set(child, handle));
        };
        this.handles.forEach(collect);
        this.moveHandles.forEach(collect);
    }

    /**
     * Brighten the handle under the pointer, and only that one.
     *
     * The confirmation a small grip owes the hand: you will hit what you are
     * about to press. PyroSim answers with a colour change too, and it is what
     * lets the drawing stay a hairline (docs/research/move-gizmo-design.md).
     * Not while a gesture runs - the hand is already committed.
     */
    private updateHover(): void {
        if (this.current || this.hitTargets.size === 0 || !this.layer) { return; }

        const utility = this.layer.utilityLayerScene;
        const hovered = this.pickedHandle();

        const normal = this.handleMaterialFor(utility);
        const hover = this.hoverMaterialFor(utility);
        this.hitTargets.forEach(handle => {
            handle.material = handle === hovered ? hover : normal;
        });
    }

    /** Azure, flat and unlit - the colour this product does its editing in. */
    private handleMaterialFor(utility: BABYLON.Scene): BABYLON.StandardMaterial {
        this.handleMaterial ??= gripMaterial('gizmoHandle', ACCENT_COLOR, utility);
        return this.handleMaterial;
    }

    /** The same azure, brightened - the one handle the pointer is over. */
    private hoverMaterialFor(utility: BABYLON.Scene): BABYLON.StandardMaterial {
        this.hoverMaterial ??= gripMaterial('gizmoHandleHover',
            BABYLON.Color3.Lerp(ACCENT_COLOR, BABYLON.Color3.White(), 0.35), utility);
        return this.hoverMaterial;
    }

    private teardown(): void {
        this.clearHandles();
        this.clearMoveHandles();
    }

    /** Nothing here may outlive the scene it was drawn in. */
    public resetSceneState(): void {
        this.current = null;
        this.selection = [];
        this.handles.clear();
        this.moveHandles.clear();
        this.hitTargets.clear();
        this.handleBox = null;
        this.moveBase = null;
        this.handleMaterial = null;
        this.hoverMaterial = null;
        this.layer = null;
        this.publish();
    }
}

/**
 * The faces that get a stretch grip: every one but the bottom.
 *
 * One z grip, pointing up. The floor of an element is where it stands - what
 * gets pulled is the top - and a second triangle at the base of a thin slab
 * only collided with the first. The bottom stays reachable through the
 * properties palette.
 */
export const RESIZE_FACES: readonly SceneFace[] =
    SCENE_FACES.filter(face => face !== 'z1');

/**
 * Which way a face's stretch grip points: out of the box, along its own axis.
 *
 * The direction a user pulls to grow the element - the promise the triangle's
 * tip makes.
 */
export function faceOutward(face: SceneFace): BABYLON.Vector3 {
    const axis = faceAxis(face);
    const sign = face.endsWith('1') ? -1 : 1;
    return new BABYLON.Vector3(
        axis === 'x' ? sign : 0, axis === 'y' ? sign : 0, axis === 'z' ? sign : 0);
}

/**
 * The fixed orientation of one grip. It never turns.
 *
 * `right` is the tip - the face's outward axis. `forward` is the triangle's
 * plane normal: straight up for the x and y grips, which lie flat on the
 * floor, and horizontal for the z grip, which stands perpendicular to it. A
 * fixed orientation over a camera-following one, because a grip that turns
 * reads as a thing of the screen, and these are things of the model - the
 * same reason AutoCAD's stretch grips lie in the plane of the drawing.
 *
 * The z grip's own plane has to face some way; the XZ plane is as arbitrary
 * as any, and constant.
 */
export function gripOrientation(
    face: SceneFace
): { right: BABYLON.Vector3, up: BABYLON.Vector3, forward: BABYLON.Vector3 } {
    const right = faceOutward(face);

    const forward = faceAxis(face) === 'z'
        ? new BABYLON.Vector3(0, -1, 0)
        : new BABYLON.Vector3(0, 0, 1);

    return { right: right, up: BABYLON.Vector3.Cross(forward, right), forward: forward };
}

/** The box that encloses all of them. */
function unionOf(boxes: readonly SceneXb[]): SceneXb {
    return {
        x1: Math.min(...boxes.map(box => box.x1)), x2: Math.max(...boxes.map(box => box.x2)),
        y1: Math.min(...boxes.map(box => box.y1)), y2: Math.max(...boxes.map(box => box.y2)),
        z1: Math.min(...boxes.map(box => box.z1)), z2: Math.max(...boxes.map(box => box.z2))
    };
}

/** Flat, unlit, double-sided - what every grip is drawn with. */
function gripMaterial(
    name: string, color: BABYLON.Color3, utility: BABYLON.Scene
): BABYLON.StandardMaterial {
    const material = new BABYLON.StandardMaterial(name, utility);
    material.emissiveColor = color;
    material.disableLighting = true;
    // A flat grip has a back, and the camera can be on either side of it - the
    // drawing has to read from both
    material.backFaceCulling = false;
    return material;
}

/** Whether two boxes are the same to the millimetre a coordinate is shown at. */
function sameBox(one: SceneXb, other: SceneXb): boolean {
    return (Object.keys(one) as (keyof SceneXb)[])
        .every(key => Math.abs(one[key] - other[key]) < 0.0005);
}

/**
 * The move handles: the plan square, and one arrow per horizontal axis.
 *
 * No z handle. The height of an FDS element comes from the storey, not from
 * the eye, and the dynamic input's dz field is where it goes in - a vertical
 * arrow would only ever stand over the element it belongs to.
 */
export type MoveHandle = 'plan' | 'x' | 'y';

const MOVE_HANDLES: readonly MoveHandle[] = ['plan', 'x', 'y'];

/**
 * Which axes each move handle frees - what the snap is confined to, and what
 * the pointer's delta is allowed to spend.
 */
export const MOVE_AXES: Record<MoveHandle, readonly SceneAxis[]> = {
    plan: ['x', 'y'], x: ['x'], y: ['y']
};

/**
 * Where the move handles stand: the middle of the union's base.
 *
 * The base and not the centre, because a plan move is the footprint sliding
 * over the floor - and the centre is the one point of the selection the user
 * is most likely to be looking at (docs/research/move-gizmo-design.md).
 */
export function moveAnchorOf(boxes: readonly SceneXb[]): ScenePoint {
    const union = unionOf(boxes);
    return { x: (union.x1 + union.x2) / 2, y: (union.y1 + union.y2) / 2, z: union.z1 };
}
