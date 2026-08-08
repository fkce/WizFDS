import * as BABYLON from 'babylonjs';
import { BoundaryBuild } from './boundary-build';
import { frameAt, NO_FRAME } from '../../timeline/frame-at';

/**
 * The painted surfaces of one `.bf` file: every patch of one FDS mesh, in one
 * Babylon mesh.
 *
 * One mesh rather than one per patch, because a real model writes hundreds to
 * thousands of patches per mesh and each would otherwise cost a draw call and a
 * buffer write every frame. The patches are laid out in the order the file
 * writes them, so showing a frame is one contiguous copy - see buildBoundary().
 * What it costs: a single patch cannot be switched off, which nothing asks for.
 *
 * Everything asynchronous happened before this constructor - the material is
 * built and configured by BndfService per quantity group, the geometry and the
 * values are ready - so what is left is strictly synchronous assembly. The same
 * shape as Slice, and for the same reason (#149).
 */
export class BoundarySurface {

    public readonly mesh: BABYLON.Mesh;

    private readonly frameCount: number;
    private frame = -1;

    constructor(
        material: BABYLON.ShaderMaterial,
        build: BoundaryBuild,
        /** All frames, `pointsPerFrame` apart, in vertex order. */
        private readonly values: Float32Array,
        /** Simulation seconds of each frame, ascending, as the solver wrote them. */
        private readonly times: Float32Array,
        private readonly pointsPerFrame: number,
        scene: BABYLON.Scene
    ) {
        this.frameCount = pointsPerFrame > 0 ? Math.floor(values.length / pointsPerFrame) : 0;

        this.mesh = new BABYLON.Mesh('boundary', scene);
        const vertexData = new BABYLON.VertexData();
        vertexData.positions = build.positions;
        vertexData.indices = build.indices;
        vertexData.applyToMesh(this.mesh, false);

        // Updatable: showAt() rewrites it for as long as the surface lives.
        this.mesh.setVerticesData('boundary_value', new Float32Array(pointsPerFrame), true, 1);
        this.mesh.material = material;

        // Nothing until the timeline says when: the buffer holds zeros, which
        // are a value like any other and must not be shown as one.
        this.mesh.setEnabled(false);
    }

    /**
     * Show the state at `time` - the last frame at or before it.
     *
     * Before its first frame the file leaves the screen: the step function has
     * no answer there, and standing in the first frame early would state a
     * surface the solver had not computed yet ("Oś czasu", CONTEXT.md). After
     * the last frame it holds that frame, which is the function itself rather
     * than extrapolation - and is what lets a truncated file wait for the rest.
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
        this.mesh.updateVerticesData('boundary_value',
            this.values.subarray(index * this.pointsPerFrame, (index + 1) * this.pointsPerFrame));
    }
}
