import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import * as BABYLON from 'babylonjs';

import { BabylonService } from '../babylon/babylon.service';
import { SceneLifecycleService, SceneScoped } from '../babylon/scene-lifecycle.service';
import { ScenePoint } from '../scene-bounds/scene-bounds.service';
import { PickService } from '../picking/pick.service';
import { ACCENT_COLOR } from '../../consts/drawing';
import { floorUnder } from './draw';
import { GestureKey } from './gesture';
import { GizmoService } from './gizmo.service';
import { DrawToolService, toDrawRay } from './draw-tool.service';
import { measurementBetween, SceneMeasurement } from './measure';
import { SnapHit, SnapMode } from './snap';
import { SnapService } from './snap.service';

/** The distance shows the millimetre, like the dynamic input's fields. */
const LABEL_DECIMALS = 3;

/** What the canvas overlay draws while the second point is being chosen. */
export interface MeasureLabel {
    /** The distance so far, formatted with its unit. */
    readonly text: string,
    /** What caught the point, if anything did - named beside the cursor. */
    readonly snap: SnapMode | null,
    /** Where to put the label: at the cursor, in canvas-local CSS pixels. */
    readonly at: { x: number, y: number }
}

/**
 * Measuring a distance: two points, picked with snapping, and nothing changed
 * (#127).
 *
 * The lifecycle mirrors DrawToolService - `start` from the ribbon, `track` per
 * pointer move, `click` to land a point, `cancel` for Escape - but unlike
 * drawing, measuring is done in runs: the tool stays on after each answer and
 * ends on Escape, which is what the issue asks of it. What it draws - the
 * rubber band, the measured line, the label - is presentational state and
 * nothing else (ADR-0004): FDS has no dimension entity, so nothing here is
 * persisted anywhere, and no command is ever emitted.
 */
@Injectable({
    providedIn: 'root'
})
export class MeasureToolService implements SceneScoped {

    /** Whether the pointer currently measures instead of selecting. */
    public get active(): boolean {
        return this.running;
    }

    /** The same, as a stream - what keeps the ribbon's button honest. */
    public readonly active$: Observable<boolean>;

    /** The label riding the cursor between the two points, or null. */
    public get label(): MeasureLabel | null {
        return this.labelSubject.value;
    }

    /** The same, as a stream, for the canvas overlay. */
    public readonly label$: Observable<MeasureLabel | null>;

    /**
     * What the status bar reads out: live while the second point is chosen,
     * settled once it is clicked, null when there is nothing measured.
     */
    public readonly measurement$: Observable<SceneMeasurement | null>;

    private readonly activeSubject = new BehaviorSubject<boolean>(false);
    private readonly labelSubject = new BehaviorSubject<MeasureLabel | null>(null);
    private readonly measurementSubject = new BehaviorSubject<SceneMeasurement | null>(null);

    private running = false;

    /** The first point of the pair being measured, once it is clicked. */
    private first: ScenePoint | null = null;

    /** The line drawn between the points - the rubber band, then the answer. */
    private lineMesh: BABYLON.LinesMesh | null = null;

    constructor(
        private babylonService: BabylonService,
        private pickService: PickService,
        private snapService: SnapService,
        private gizmo: GizmoService,
        private drawTool: DrawToolService,
        sceneLifecycle: SceneLifecycleService
    ) {
        sceneLifecycle.register(this);
        this.active$ = this.activeSubject.asObservable();
        this.label$ = this.labelSubject.asObservable();
        this.measurement$ = this.measurementSubject.asObservable();
    }

    // ==========================================
    // The lifecycle - what the ribbon and the pointer drive
    // ==========================================

    /**
     * Begin measuring - what the Distance button does.
     *
     * The selection goes, as it does when the draw tool starts: the gizmo's
     * grips are Babylon drag behaviours, and a point aimed near one would
     * start a move instead of landing a point. A draw gesture in flight is
     * abandoned too - two tools cannot share one pointer.
     */
    public start(): void {
        this.gizmo.cancel();
        this.drawTool.cancel();
        this.pickService.dropSelection();
        this.dropMeasurement();

        this.running = true;
        this.activeSubject.next(true);
        this.setCursor('crosshair');
    }

    /** End the tool - Escape. The measurement disappears with it (#127). */
    public cancel(): void {
        if (!this.running) { return; }

        this.running = false;
        this.dropMeasurement();
        this.snapService.suspended = false;
        this.activeSubject.next(false);
        this.setCursor('');
    }

    /**
     * Follow the pointer - called on every pointer move while the tool is on.
     *
     * Before the first point there is only the snap marker to move; between
     * the points the rubber band, the label and the status bar readout all
     * follow the cursor.
     */
    public track(ray: BABYLON.Ray): void {
        if (!this.running) { return; }

        const landing = this.landingFor(ray);
        if (!landing) {
            this.snapService.hideMarker();
            // Mid-pair, a cursor over nothing has nothing measured under it:
            // the rubber band and both readouts go, as the cursor segment
            // dashes over empty space. A settled answer (first is null) stays.
            if (this.first) {
                this.disposeLine();
                this.labelSubject.next(null);
                this.measurementSubject.next(null);
            }
            return;
        }

        this.snapService.showMarker(landing.hit);
        if (!this.first) { return; }

        const measurement = measurementBetween(this.first, landing.point);
        this.measurementSubject.next(measurement);
        this.drawLine(this.first, landing.point);
        this.labelSubject.next({
            text: `${measurement.distance.toFixed(LABEL_DECIMALS)} m`,
            snap: landing.hit ? landing.hit.mode : null,
            at: this.pointerOnCanvas()
        });
    }

    /** One click: land a point. Two of them are a measurement. */
    public click(ray: BABYLON.Ray): void {
        if (!this.running) { return; }

        const landing = this.landingFor(ray);
        // A click into a void places no point - there is nothing under it to
        // measure from, the same contract as the draw tool's first corner
        if (!landing) { return; }

        if (!this.first) {
            // The previous answer would otherwise read as part of this question
            this.dropMeasurement();
            this.first = landing.point;
            return;
        }

        const measurement = measurementBetween(this.first, landing.point);
        this.measurementSubject.next(measurement);
        this.drawLine(this.first, landing.point);
        this.first = null;
        this.labelSubject.next(null);
        this.snapService.hideMarker();
        // The pair is over, and the ctrl latch was spent on it (ADR-0011)
        this.snapService.suspended = false;
    }

    /**
     * Suspend snapping for the rest of the tool's run, or ask for it back.
     * The same latch as the draw tool's (ADR-0011).
     */
    public setSnapSuspended(suspended: boolean): void {
        if (!suspended && this.running) { return; }
        this.snapService.suspended = suspended;
    }

    // ==========================================
    // The keyboard - the canvas routes one keyboard to whichever tool runs
    // ==========================================

    /** A measurement has no fields to type into - the mouse is the whole of it. */
    public type(key: GestureKey, text: string): void { }

    /** Nor a field for Tab to move to. */
    public nextField(): void { }

    /** Nor anything for Enter to settle - a click is what lands a point. */
    public commit(): void { }

    // ==========================================
    // Where a point lands
    // ==========================================

    /**
     * The point a click would measure: the surface under the cursor first, the
     * floor of the nearest &MESH second, nothing where there is neither - and
     * then the snap, free in all three axes, because a corner-to-corner
     * measurement has to be exact (#127).
     */
    private landingFor(ray: BABYLON.Ray): { point: ScenePoint, hit: SnapHit | null } | null {
        const surface = this.pickService.surfaceUnder(ray);
        const candidate = surface
            ? surface.point
            : floorUnder(toDrawRay(ray), this.snapService.meshes);
        if (!candidate) { return null; }

        const hit = this.snapService.snap(candidate);
        return { point: hit ? hit.point : candidate, hit: hit };
    }

    // ==========================================
    // What is drawn, and the scene lifecycle
    // ==========================================

    /** The line between the points, in the accent colour. Presentation only. */
    private drawLine(from: ScenePoint, to: ScenePoint): void {
        const scene = this.babylonService.scene;
        if (!scene) { return; }

        this.disposeLine();
        this.lineMesh = BABYLON.MeshBuilder.CreateLines('measureLine', {
            points: [
                new BABYLON.Vector3(from.x, from.y, from.z),
                new BABYLON.Vector3(to.x, to.y, to.z)
            ]
        }, scene);
        this.lineMesh.color = ACCENT_COLOR;
        this.lineMesh.isPickable = false;
    }

    private disposeLine(): void {
        if (this.lineMesh) {
            this.lineMesh.dispose();
            this.lineMesh = null;
        }
    }

    /** Take the pair, the line and both readouts down. */
    private dropMeasurement(): void {
        this.first = null;
        this.disposeLine();
        this.snapService.hideMarker();
        this.labelSubject.next(null);
        this.measurementSubject.next(null);
    }

    /** Where the pointer is over the canvas - see GizmoService.pointerOnCanvas. */
    private pointerOnCanvas(): { x: number, y: number } {
        const scene = this.babylonService.scene;
        return scene ? { x: scene.pointerX, y: scene.pointerY } : { x: 0, y: 0 };
    }

    /** The crosshair says the next click measures; its absence, that it selects. */
    private setCursor(cursor: string): void {
        const canvas = this.babylonService.canvas;
        if (canvas) { canvas.style.cursor = cursor; }
    }

    /** The scene is gone, and the line went with it. */
    public resetSceneState(): void {
        this.lineMesh = null;
        this.first = null;
        this.running = false;
        this.activeSubject.next(false);
        this.labelSubject.next(null);
        this.measurementSubject.next(null);
    }
}
