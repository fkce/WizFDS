import * as BABYLON from 'babylonjs';

import { HelpersService } from '../helpers/helpers.service';
import { FaceRange, SceneRegistryService } from '../babylon/scene-registry.service';
import { SceneElementType, SceneXb } from './scene-input';

/** One axis-aligned rectangle drawn out of a batch's shared buffer. */
export interface BatchedPlane {
  /**
   * Identity of the FDS element this plane stands for (ADR-0005).
   *
   * Absent for a plane the library derives rather than draws on behalf of the
   * scenario: a jetfan's inlet and outlet have no &VENT behind them, so there is
   * nothing for a pick to land on and nothing to register.
   */
  readonly uuid?: string,
  /** Its FDS `ID`. Absent alongside `uuid`, and for the same reason. */
  readonly id?: string,
  /** Where it stands, in FDS metres. */
  readonly xb: SceneXb,
  /** Its colour as a flat rgba array, every component in 0..1. */
  readonly color: readonly number[]
}

/**
 * A batch of axis-aligned rectangles drawn from one shared vertex buffer.
 *
 * The counterpart of BoxInstancePool for everything FDS models as a plane -
 * &VENT, the plane of a fire, an `OPEN` vent, a jetfan's inlet and outlet. They
 * are not instanced: a plane has no solid to instance, and the three orientations
 * a rectangle can take are different geometry rather than the same box scaled
 * (ADR-0006 records the same conclusion for &VENT).
 *
 * Identity is therefore a range of faces within the buffer, registered against
 * `uuid` (ADR-0005). The range is read off the buffer as it is filled rather
 * than derived from a triangle count, so a plane the batch could not draw does
 * not shift everything behind it.
 *
 * The mesh is built once and refilled, so a material fetched asynchronously and
 * an outline set on it survive a re-render. What it is drawn with belongs to the
 * service that owns the batch: an `OPEN` and a fire are the same geometry lit
 * two different ways.
 */
export class PlaneBatch {

  /** The mesh every plane of this batch is drawn on. */
  public readonly mesh: BABYLON.Mesh;

  /** How many planes the buffer currently holds. */
  private drawn = 0;

  constructor(
    name: string,
    /** Which kind of element this batch holds - every plane in it is one of these. */
    private readonly type: SceneElementType,
    scene: BABYLON.Scene,
    private readonly helpers: HelpersService,
    private readonly registry: SceneRegistryService
  ) {
    this.mesh = new BABYLON.Mesh(name, scene);
    this.mesh.setEnabled(false);
  }

  /** How many planes the batch currently draws. */
  public get count(): number {
    return this.drawn;
  }

  /**
   * Draw exactly these planes, in this order, replacing whatever was there.
   *
   * A plane whose box is not a rectangle is skipped: `&VENT` is a plane by
   * definition, but a scenario imported from CAD can carry one with thickness on
   * every axis, and there is no rectangle to draw for it. Skipping it rather
   * than writing its indices into the buffer is what keeps the faces of every
   * plane after it its own - those indices address vertices that were never
   * written, which is to say the next plane's.
   */
  public setPlanes(planes: readonly BatchedPlane[]): void {
    // One call rather than one forget() per plane: nothing else is drawn on this
    // mesh, and forgetting them singly costs a scan of the mesh's own list apiece
    this.registry.forgetMesh(this.mesh);

    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const faces: FaceRange[] = [];
    let vertexCount = 0;
    this.drawn = 0;

    (planes || []).forEach((plane: BatchedPlane) => {
      const geometry = this.helpers.generateVentGeometry(plane.xb);
      if (geometry.vertices.length === 0) { return; }

      // Read before and after rather than computed: nothing here may assume a
      // fixed triangle count per plane
      const facesBefore = indices.length / 3;

      positions.push(...geometry.vertices);
      normals.push(...geometry.normals);

      const rgba = [
        plane.color[0] ?? 1, plane.color[1] ?? 1, plane.color[2] ?? 1, plane.color[3] ?? 1
      ];
      for (let i = 0; i < geometry.vertices.length / 3; i++) { colors.push(...rgba); }

      geometry.indices.forEach((index: number) => indices.push(index + vertexCount));
      vertexCount += geometry.vertices.length / 3;
      this.drawn++;

      if (plane.uuid !== undefined) {
        faces.push({
          uuid: plane.uuid, id: plane.id ?? '', xb: plane.xb,
          first: facesBefore, count: indices.length / 3 - facesBefore
        });
      }
    });

    // An empty buffer is not applied at all - Babylon has nothing to make a
    // geometry out of, and the mesh keeps whatever it last drew, unseen
    this.mesh.setEnabled(positions.length > 0);
    if (positions.length === 0) { return; }

    const vertexData = new BABYLON.VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.colors = colors;
    vertexData.normals = normals;
    vertexData.applyToMesh(this.mesh);

    // After the buffer, not before: which plane a face belongs to is settled by
    // what actually went into it
    faces.forEach(({ uuid, id, xb, first, count }) => {
      this.registry.register(uuid, {
        mesh: this.mesh, type: this.type, id: id, xb: xb,
        faces: { first: first, count: count }
      });
    });
  }

  /** Release the mesh and everything this batch put in the registry. */
  public dispose(): void {
    this.registry.forgetMesh(this.mesh);
    this.drawn = 0;
    this.mesh.dispose();
  }
}
