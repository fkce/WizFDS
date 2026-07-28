import * as BABYLON from 'babylonjs';

import { HelpersService } from '../helpers/helpers.service';
import { SceneRegistryService } from '../babylon/scene-registry.service';
import { SceneXb } from './scene-input';

/** One axis-aligned body drawn from the shared base box. */
export interface PooledBox {
  /** Identity of the FDS element this box stands for (ADR-0005). */
  readonly uuid: string,
  /** Where it stands, in FDS metres. */
  readonly xb: SceneXb,
  /** Its colour as a flat rgba array, every component in 0..1. */
  readonly color: readonly number[]
}

/**
 * The thinnest side a box is drawn with, in metres.
 *
 * An &OBST may be written as a sheet - `x1` equal to `x2` - and scaling the base
 * box by zero gives a matrix that cannot be inverted. Inverting it is exactly
 * how a pick reaches a thin instance, so such an obst would be undrawable to the
 * mouse. A tenth of a micrometre is far below what a float32 vertex can tell
 * apart at building coordinates, so the sheet still renders flat.
 */
const MIN_SIDE = 1e-7;

/**
 * A pool of axis-aligned boxes drawn as thin instances of one base mesh.
 *
 * Every &OBST, &MESH and jetfan body in FDS is a box, identical to all the
 * others up to scale and position - the case instancing exists for. One base
 * mesh, one draw call, a matrix and a colour per instance (ADR-0006).
 *
 * Identity is the slot a box occupies, registered against `uuid` (ADR-0005).
 * That is what a pick resolves through: every instance draws the same twelve
 * faces of the same box, so a face index says nothing at all here.
 *
 * The geometry is built through HelpersService, the same call the shared vertex
 * buffers use, so a box drawn from the pool and a box built into a buffer are
 * wound the same way. The back cap draws one facing only, and mixed winding
 * shows up as red exterior walls.
 */
export class BoxInstancePool {

  /** The base box every instance is drawn from. This is what a pick lands on. */
  public readonly mesh: BABYLON.Mesh;

  /** Meshes drawing the same instances through a different shader - see createTwin(). */
  private readonly twins: BABYLON.Mesh[] = [];

  /** What the pool currently holds, in slot order. */
  private readonly boxes: PooledBox[] = [];

  /** Per-instance matrices, 16 floats apiece. Longer than `boxes` after a removal. */
  private matrixData = new Float32Array(0);

  /** Per-instance colours, rgba. Babylon binds this as `instanceColor`. */
  private colorData = new Float32Array(0);

  constructor(
    name: string,
    private readonly scene: BABYLON.Scene,
    private readonly helpers: HelpersService,
    private readonly registry: SceneRegistryService
  ) {
    this.mesh = this.buildBaseMesh(name);
    // Without this a pick stops at the base mesh and cannot say which of the
    // thousands of boxes drawn from it was hit
    this.mesh.thinInstanceEnablePicking = true;
    this.mesh.setEnabled(false);
  }

  /** How many boxes the pool currently draws. */
  public get count(): number {
    return this.boxes.length;
  }

  /** The box standing in a slot, or undefined when nothing does. */
  public boxAt(index: number): PooledBox | undefined {
    return this.boxes[index];
  }

  /**
   * The box drawn for an element, or undefined when this pool does not hold it.
   * Which slot it occupies is the pool's business, not its caller's.
   */
  public boxFor(uuid: string): PooledBox | undefined {
    return this.boxes.find(box => box.uuid === uuid);
  }

  /**
   * Draw exactly these boxes, in this order, replacing whatever was there.
   *
   * A whole-pool rebuild - what a re-render of the scenario is. Singling one box
   * out is remove()/add() instead, which leaves the rest of the buffer alone.
   */
  public setBoxes(boxes: readonly PooledBox[]): void {
    this.forgetAll();
    this.boxes.length = 0;
    this.boxes.push(...boxes);

    this.matrixData = new Float32Array(this.boxes.length * 16);
    this.colorData = new Float32Array(this.boxes.length * 4);
    this.boxes.forEach((box, index) => this.writeInstance(index, box));

    this.assignBuffers();
    this.registerFrom(0);
  }

  /**
   * Take one box out of the pool, for instance because it is being edited on a
   * mesh of its own.
   *
   * The gap is closed by moving the last box into the freed slot rather than by
   * rebuilding the buffer: at ten thousand obsts, singling one out must not cost
   * a pass over all the others. Nothing moves on screen - the box that changes
   * slot keeps its own matrix and colour.
   *
   * @returns whether the pool held it
   */
  public remove(uuid: string): boolean {
    const index = this.boxes.findIndex(box => box.uuid === uuid);
    if (index < 0) { return false; }

    const last = this.boxes.length - 1;
    this.registry.forget(uuid);

    if (index !== last) {
      this.matrixData.copyWithin(index * 16, last * 16, (last + 1) * 16);
      this.colorData.copyWithin(index * 4, last * 4, (last + 1) * 4);
      this.boxes[index] = this.boxes[last];
    }
    this.boxes.length = last;

    this.syncBuffers();
    // Only the moved box changed address; everything before it is untouched
    if (index !== last) { this.registerFrom(index, index + 1); }
    return true;
  }

  /**
   * Put a box back into the pool, at the end.
   *
   * @returns the slot it went into
   */
  public add(box: PooledBox): number {
    const index = this.boxes.length;
    const grown = (index + 1) * 16 > this.matrixData.length;
    if (grown) {
      this.matrixData = growTo(this.matrixData, (index + 1) * 16);
      this.colorData = growTo(this.colorData, (index + 1) * 4);
    }

    this.boxes.push(box);
    this.writeInstance(index, box);

    // A longer array is a different buffer, so Babylon has to be handed it
    if (grown) { this.assignBuffers(); } else { this.syncBuffers(); }

    this.registerFrom(index);
    return index;
  }

  /**
   * A second mesh drawing the same instances through a different shader.
   *
   * The back cap is this: the same boxes in the same places, filled red where a
   * clipping plane cuts through them. It never answers a pick - the pool itself
   * is what identifies the box.
   */
  public createTwin(name: string): BABYLON.Mesh {
    const twin = this.buildBaseMesh(name);
    twin.isPickable = false;
    this.twins.push(twin);
    this.assignBuffersTo(twin);
    return twin;
  }

  /** Release the meshes and everything this pool put in the registry. */
  public dispose(): void {
    this.forgetAll();
    this.boxes.length = 0;
    this.twins.forEach(twin => twin.dispose());
    this.twins.length = 0;
    this.mesh.dispose();
    this.matrixData = new Float32Array(0);
    this.colorData = new Float32Array(0);
  }

  /** The base box, one metre a side and centred on the origin. */
  private buildBaseMesh(name: string): BABYLON.Mesh {
    const mesh = new BABYLON.Mesh(name, this.scene);

    const positions = this.helpers.getVerticesFromXb({
      x1: -0.5, x2: 0.5, y1: -0.5, y2: 0.5, z1: -0.5, z2: 0.5
    });
    const indices = this.helpers.getIndices(0);
    const normals: number[] = new Array(positions.length).fill(0);
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);

    const vertexData = new BABYLON.VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.applyToMesh(mesh);

    // The instances carry the transforms; the mesh itself never moves
    mesh.freezeWorldMatrix();
    return mesh;
  }

  /** Fill one slot of the raw buffers from a box. */
  private writeInstance(index: number, box: PooledBox): void {
    const xb = box.xb;
    const scale = new BABYLON.Vector3(
      Math.max(Math.abs(xb.x2 - xb.x1), MIN_SIDE),
      Math.max(Math.abs(xb.y2 - xb.y1), MIN_SIDE),
      Math.max(Math.abs(xb.z2 - xb.z1), MIN_SIDE)
    );
    const centre = new BABYLON.Vector3(
      (xb.x1 + xb.x2) / 2, (xb.y1 + xb.y2) / 2, (xb.z1 + xb.z2) / 2
    );

    BABYLON.Matrix.Compose(scale, BABYLON.Quaternion.Identity(), centre)
      .copyToArray(this.matrixData, index * 16);

    const color = box.color;
    this.colorData[index * 4] = color[0] ?? 1;
    this.colorData[index * 4 + 1] = color[1] ?? 1;
    this.colorData[index * 4 + 2] = color[2] ?? 1;
    this.colorData[index * 4 + 3] = color[3] ?? 1;
  }

  /** Hand the raw buffers to Babylon, on the base mesh and on every twin. */
  private assignBuffers(): void {
    this.assignBuffersTo(this.mesh);
    this.twins.forEach(twin => this.assignBuffersTo(twin));
  }

  private assignBuffersTo(mesh: BABYLON.Mesh): void {
    // An empty pool declares no instance attributes, and the instanced shader
    // reads nothing else - so there is nothing for it to draw either.
    mesh.setEnabled(this.boxes.length > 0);
    if (this.boxes.length === 0) {
      mesh.thinInstanceSetBuffer('matrix', null);
      mesh.thinInstanceSetBuffer('color', null, 4);
      return;
    }

    // Not static: remove() and add() write into these arrays in place, and a
    // static buffer would keep showing what it was created with.
    mesh.thinInstanceSetBuffer('matrix', this.matrixData, 16, false);
    mesh.thinInstanceSetBuffer('color', this.colorData, 4, false);
    mesh.thinInstanceCount = this.boxes.length;
  }

  /**
   * Push an in-place edit of the raw buffers through to the GPU, along with how
   * many of them the pool now draws.
   */
  private syncBuffers(): void {
    [this.mesh, ...this.twins].forEach(mesh => {
      mesh.setEnabled(this.boxes.length > 0);
      mesh.thinInstanceCount = this.boxes.length;
      if (this.boxes.length === 0) { return; }
      mesh.thinInstanceBufferUpdated('matrix');
      mesh.thinInstanceBufferUpdated('color');
      // The buffer changed shape, and a pick starts at the bounding box
      mesh.thinInstanceRefreshBoundingInfo();
    });
  }

  /** Tell the registry which box stands in each slot from `from` on. */
  private registerFrom(from: number, to: number = this.boxes.length): void {
    for (let index = from; index < to; index++) {
      this.registry.register(this.boxes[index].uuid, { mesh: this.mesh, instance: index });
    }
  }

  /**
   * Forget every box this pool drew.
   *
   * In one call rather than one per box: nothing else is ever drawn on the base
   * mesh, and forgetting them singly costs a scan of the mesh's own list apiece.
   */
  private forgetAll(): void {
    this.registry.forgetMesh(this.mesh);
  }
}

/** A longer copy of a buffer, keeping what was in it. */
function growTo(buffer: Float32Array, length: number): Float32Array {
  const grown = new Float32Array(length);
  grown.set(buffer, 0);
  return grown;
}
