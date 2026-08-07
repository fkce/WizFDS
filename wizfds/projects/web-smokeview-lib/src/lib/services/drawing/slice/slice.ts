import * as BABYLON from 'babylonjs';
import { SliceGeometry } from './slice-geometry';

/**
 * One slice plane on screen: the mesh of one `.sf` file on one FDS mesh.
 *
 * Everything asynchronous happened before this constructor: the material is
 * built and configured by SliceService per quantity group, the geometry and
 * blank are computed, the values parsed. What is left is strictly synchronous
 * mesh assembly - which is the fix for the old slice.ts, whose constructor
 * raced its own material against the first setInt (#149).
 */
export class Slice {

    public readonly mesh: BABYLON.Mesh;
    public readonly frameCount: number;

    private frame = -1;

    constructor(
        material: BABYLON.ShaderMaterial,
        geometry: SliceGeometry,
        blank: Float32Array,
        /** All frames, `pointsPerFrame` apart, in vertex order. */
        private readonly values: Float32Array,
        private readonly pointsPerFrame: number,
        scene: BABYLON.Scene
    ) {
        this.frameCount = pointsPerFrame > 0 ? Math.floor(values.length / pointsPerFrame) : 0;

        this.mesh = new BABYLON.Mesh('slice', scene);
        const vertexData = new BABYLON.VertexData();
        vertexData.positions = geometry.positions;
        vertexData.indices = geometry.indices;
        vertexData.applyToMesh(this.mesh, false);

        this.mesh.setVerticesData('blank', blank, false, 1);
        // Updatable: setFrame() rewrites it for as long as the slice lives.
        this.mesh.setVerticesData('slice_value', new Float32Array(pointsPerFrame), true, 1);
        this.mesh.material = material;

        this.setFrame(0);
    }

    /**
     * Show frame `index`, clamped to this file's last frame - a shorter file
     * of the group holds its last known state rather than vanishing, the
     * step-function semantics "Oś czasu" in CONTEXT.md asks for (#149).
     */
    public setFrame(index: number): void {
        const clamped = Math.min(Math.max(index, 0), this.frameCount - 1);
        if (clamped === this.frame || clamped < 0) return;
        this.frame = clamped;
        this.mesh.updateVerticesData('slice_value',
            this.values.subarray(clamped * this.pointsPerFrame, (clamped + 1) * this.pointsPerFrame));
    }

    public dispose(): void {
        this.mesh.dispose();
    }
}
