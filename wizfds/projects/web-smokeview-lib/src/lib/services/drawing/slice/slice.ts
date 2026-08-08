import * as BABYLON from 'babylonjs';
import { SliceGeometry } from './slice-geometry';
import { frameAt, NO_FRAME } from '../../timeline/frame-at';

/**
 * One slice plane on screen: the mesh of one `.sf` file on one FDS mesh.
 *
 * Everything asynchronous happened before this constructor: the material is
 * built and configured by SliceService per quantity group, the geometry and
 * blank are computed, the values parsed. What is left is strictly synchronous
 * mesh assembly - which is the fix for the old slice.ts, whose constructor
 * raced its own material against the first setInt (#149).
 *
 * The file answers the timeline for itself, from its own frame times (#150):
 * a group whose meshes disagree - an interrupted run leaves one file short -
 * resolves per file rather than through one shared index.
 */
export class Slice {

    public readonly mesh: BABYLON.Mesh;

    private readonly frameCount: number;
    private frame = -1;

    constructor(
        material: BABYLON.ShaderMaterial,
        geometry: SliceGeometry,
        blank: Float32Array,
        /** All frames, `pointsPerFrame` apart, in vertex order. */
        private readonly values: Float32Array,
        /** Simulation seconds of each frame, ascending, as the solver wrote them. */
        private readonly times: Float32Array,
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
        // Updatable: showAt() rewrites it for as long as the slice lives.
        this.mesh.setVerticesData('slice_value', new Float32Array(pointsPerFrame), true, 1);
        this.mesh.material = material;

        // Nothing until the timeline says when: the buffer holds zeros, which
        // are a value like any other and must not be shown as one.
        this.mesh.setEnabled(false);
    }

    /**
     * Show the state at `time` - the last frame at or before it.
     *
     * Before its first frame the file leaves the screen. The step function has
     * no answer there, and standing in the first frame early would state a
     * field the solver had not computed yet ("Oś czasu", CONTEXT.md). After the
     * last frame it holds that frame, which is not extrapolation but the
     * function itself - and is what lets a truncated file wait for the others.
     */
    public showAt(time: number): void {
        const index = frameAt(this.times, time);
        if (index === NO_FRAME || this.frameCount === 0) {
            this.mesh.setEnabled(false);
            return;
        }

        this.setFrame(Math.min(index, this.frameCount - 1));
        this.mesh.setEnabled(true);
    }

    public dispose(): void {
        this.mesh.dispose();
    }

    private setFrame(index: number): void {
        if (index === this.frame) { return; }
        this.frame = index;
        this.mesh.updateVerticesData('slice_value',
            this.values.subarray(index * this.pointsPerFrame, (index + 1) * this.pointsPerFrame));
    }
}
