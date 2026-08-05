import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';

import { BabylonService } from '../babylon/babylon.service';
import { SceneLifecycleService, SceneScoped } from '../babylon/scene-lifecycle.service';
import { ScenePick } from '../babylon/scene-registry.service';
import { SceneXb } from '../drawing/scene-input';
import { PickService } from '../picking/pick.service';
import { DimensionLabel, dimensionLabelsFor } from './dimension-labels';
import { SceneDelta } from './edit-command';
import { GestureView, GizmoService } from './gizmo.service';
import { SnapService } from './snap.service';

/** How tall a label is drawn on screen, in pixels - constant at every zoom. */
const LABEL_HEIGHT_PIXELS = 16;

/** The texture the text is painted into; the plane keeps its aspect. */
const TEXTURE_WIDTH = 256;
const TEXTURE_HEIGHT = 64;

/** The number in the bar's own mono face, big enough to downscale cleanly. */
const LABEL_FONT = `bold 40px 'Fira Code', Consolas, monospace`;

/** A millimetre, like the dynamic input - the precision a user verifies at. */
const LABEL_DECIMALS = 3;

/** One label on screen: the plane, what paints it, and what it currently says. */
interface DrawnLabel {
    mesh: BABYLON.Mesh,
    texture: BABYLON.DynamicTexture,
    material: BABYLON.StandardMaterial,
    text: string
}

/**
 * The extent labels of the selection (#127): width, depth and height, read
 * straight off each selected element's `XB`.
 *
 * Purely presentational state (ADR-0004): FDS has no dimension entity, so the
 * labels exist on screen and nowhere else - they are drawn from the selection
 * the library already holds and vanish with it. A toggle on the ribbon's
 * Measure tab turns them on, because they are noise when they are not wanted.
 *
 * The labels follow a gesture the way the selection outlines do: the gizmo's
 * gesture stream carries the deltas of a move and the dragged coordinate of a
 * resize, and the end of the gesture re-emits the selection with the committed
 * boxes - so the labels re-anchor on the real geometry for free.
 */
@Injectable({
    providedIn: 'root'
})
export class DimensionLabelService implements SceneScoped {

    /** Whether the extents of the selection are being shown. */
    public get enabled(): boolean {
        return this.on;
    }

    private on = false;

    /** The selection as last drawn - the boxes the labels stand on. */
    private selection: readonly ScenePick[] = [];

    /** Three labels per selected element, element-major, axes in x-y-z order. */
    private drawnLabels: DrawnLabel[] = [];

    /** Keeps every label the same size on screen, whatever the zoom. */
    private frameObserver: BABYLON.Observer<BABYLON.Scene> | null = null;

    constructor(
        private babylonService: BabylonService,
        private snapService: SnapService,
        pickService: PickService,
        gizmo: GizmoService,
        sceneLifecycle: SceneLifecycleService
    ) {
        sceneLifecycle.register(this);

        pickService.selection$.subscribe(selected => {
            this.selection = selected;
            if (this.on) { this.rebuild(); }
        });

        gizmo.gesture$.subscribe(view => this.follow(view));
    }

    /** Flip the toggle - what the Dimensions button does. */
    public toggle(): void {
        this.setEnabled(!this.on);
    }

    public setEnabled(on: boolean): void {
        if (this.on === on) { return; }

        this.on = on;
        if (on) { this.rebuild(); } else { this.clear(); }
    }

    // ==========================================
    // Following a gesture
    // ==========================================

    /**
     * Move the labels where the gesture currently has the selection.
     *
     * From the gesture view rather than from the preview meshes: the view
     * already carries the deltas of a move and the dragged coordinate of a
     * resize, which is everything the boxes need. A draw gesture has no
     * selection to label, and the end of any gesture is answered by the
     * selection re-emitting with the committed boxes.
     */
    private follow(view: GestureView | null): void {
        if (!this.on || !view || this.drawnLabels.length === 0) { return; }

        if (view.kind === 'move') {
            const delta: SceneDelta = {
                dx: valueOf(view, 'dx'), dy: valueOf(view, 'dy'), dz: valueOf(view, 'dz')
            };
            this.place(this.selection.map(pick => shifted(pick.xb, delta)));
            return;
        }

        if (view.kind === 'resize') {
            // A resize is one element and one face by construction
            if (this.selection.length !== 1 || view.fields.length !== 1) { return; }

            const field = view.fields[0];
            this.place([{ ...this.selection[0].xb, [field.key]: field.value } as SceneXb]);
        }
    }

    // ==========================================
    // Drawing
    // ==========================================

    /** Draw the labels afresh for the selection as it stands. */
    private rebuild(): void {
        this.clear();

        const scene = this.babylonService.scene;
        if (!scene || this.selection.length === 0) { return; }

        this.selection.forEach((pick, index) =>
            dimensionLabelsFor(pick.xb).forEach(label =>
                this.drawnLabels.push(
                    this.create(scene, label, `dimLabel_${index}_${label.axis}`))));

        this.ensureObserver(scene);
    }

    /** Put the existing labels on these boxes - one box per selected element. */
    private place(boxes: readonly SceneXb[]): void {
        boxes.forEach((xb, index) =>
            dimensionLabelsFor(xb).forEach((label, axis) => {
                const slot = this.drawnLabels[index * 3 + axis];
                if (!slot) { return; }

                slot.mesh.position.set(label.at.x, label.at.y, label.at.z);

                const text = formatLength(label.length);
                if (text !== slot.text) { this.paint(slot, text); }
            }));
    }

    /** One label: a billboard plane with the number painted into a texture. */
    private create(
        scene: BABYLON.Scene, label: DimensionLabel, name: string
    ): DrawnLabel {
        const texture = new BABYLON.DynamicTexture(
            `${name}_texture`, { width: TEXTURE_WIDTH, height: TEXTURE_HEIGHT }, scene, true);
        texture.hasAlpha = true;

        const material = new BABYLON.StandardMaterial(`${name}_material`, scene);
        material.diffuseTexture = texture;
        material.emissiveColor = BABYLON.Color3.White();
        material.disableLighting = true;
        material.useAlphaFromDiffuseTexture = true;
        material.backFaceCulling = false;

        const mesh = BABYLON.MeshBuilder.CreatePlane(name, {
            width: TEXTURE_WIDTH / TEXTURE_HEIGHT, height: 1
        }, scene);
        mesh.material = material;
        mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        mesh.isPickable = false;
        mesh.position.set(label.at.x, label.at.y, label.at.z);
        this.rescale(mesh);

        const drawn: DrawnLabel = { mesh: mesh, texture: texture, material: material, text: '' };
        this.paint(drawn, formatLength(label.length));
        return drawn;
    }

    /** Paint the number: a dark tag behind white digits, readable on anything. */
    private paint(label: DrawnLabel, text: string): void {
        label.text = text;

        const context = label.texture.getContext() as CanvasRenderingContext2D;
        context.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

        context.fillStyle = 'rgba(18, 18, 18, 0.75)';
        roundedRect(context, 2, 2, TEXTURE_WIDTH - 4, TEXTURE_HEIGHT - 4, 12);
        context.fill();

        context.font = LABEL_FONT;
        context.fillStyle = '#e3e3e3';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, TEXTURE_WIDTH / 2, TEXTURE_HEIGHT / 2);

        label.texture.update();
    }

    /**
     * Hold every label at the same height on screen, as the gizmo holds its
     * handles: a label a fixed size in metres is a speck on a tunnel and fills
     * the view of a cupboard.
     */
    private ensureObserver(scene: BABYLON.Scene): void {
        if (this.frameObserver) { return; }

        this.frameObserver = scene.onBeforeRenderObservable.add(() =>
            this.drawnLabels.forEach(label => this.rescale(label.mesh)));
    }

    private rescale(mesh: BABYLON.Mesh): void {
        const size = LABEL_HEIGHT_PIXELS * this.snapService.metresPerPixelAt({
            x: mesh.position.x, y: mesh.position.y, z: mesh.position.z
        });
        if (size > 0) { mesh.scaling.setAll(size); }
    }

    /** Take every label off the screen. */
    private clear(): void {
        this.drawnLabels.forEach(label => {
            label.mesh.dispose();
            label.material.dispose();
            label.texture.dispose();
        });
        this.drawnLabels = [];

        const scene = this.babylonService.scene;
        if (scene && this.frameObserver) {
            scene.onBeforeRenderObservable.remove(this.frameObserver);
        }
        this.frameObserver = null;
    }

    /** The scene is gone, and every label went with it. The toggle survives. */
    public resetSceneState(): void {
        this.drawnLabels = [];
        this.frameObserver = null;
        this.selection = [];
    }
}

/** The number a field of the gesture view currently holds. */
function valueOf(view: GestureView, key: string): number {
    const field = view.fields.find(candidate => candidate.key === key);
    return field ? field.value : 0;
}

/** The same box, moved. */
function shifted(xb: SceneXb, delta: SceneDelta): SceneXb {
    return {
        x1: xb.x1 + delta.dx, x2: xb.x2 + delta.dx,
        y1: xb.y1 + delta.dy, y2: xb.y2 + delta.dy,
        z1: xb.z1 + delta.dz, z2: xb.z2 + delta.dz
    };
}

/** To the millimetre, like the dynamic input's fields. */
function formatLength(length: number): string {
    return `${length.toFixed(LABEL_DECIMALS)} m`;
}

/** A rounded rectangle path - the tag the number sits on. */
function roundedRect(
    context: CanvasRenderingContext2D,
    x: number, y: number, width: number, height: number, radius: number
): void {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
}
