import { Injectable, isDevMode } from '@angular/core';
import * as BABYLON from 'babylonjs';
import { SceneHole, SceneObst, SceneXb } from '../scene-input';

@Injectable({
  providedIn: 'root'
})
export class HoleService {

  constructor() { }

  /**
   * Whether the CSG2 backend (Manifold) finished loading. Cutting is impossible
   * until it has - see BabylonService.initializeCsg2().
   */
  public isCsgReady(): boolean {
    return BABYLON.IsCSG2Ready();
  }

  /**
   * Cut a set of openings out of an obst and return the resulting mesh.
   *
   * Everything here is in FDS metres, which is what the scene is drawn in
   * (ADR-0002). The caller passes the boxes rather than the elements: they belong
   * to the app and are never written to (ADR-0004).
   *
   * @param id the obst's FDS name, used to name the temporary meshes
   * @param obstXb the obst's box, in metres
   * @param holeXbs the boxes to subtract from it, in metres
   * @returns the cut mesh, or null when the obst should be drawn solid instead
   */
  public cutHoles(
    id: string, obstXb: SceneXb, holeXbs: readonly SceneXb[], scene: BABYLON.Scene
  ): BABYLON.Mesh | null {
    // If no holes, return null (will use standard obst rendering)
    if (!holeXbs || holeXbs.length === 0) {
      return null;
    }

    // Manifold failing to load costs the openings, not the whole scene: the
    // obst falls back to being drawn solid.
    if (!this.isCsgReady()) {
      if (isDevMode()) console.warn('[HoleService] CSG2 is not ready - drawing obst solid:', id);
      return null;
    }

    try {
      // Create base obst geometry
      const obstMesh = this.createBox(`obstBase_${id}`, obstXb, scene);
      // Make the obstMesh invisible during processing (it will be disposed anyway)
      obstMesh.isVisible = false;

      let resultMesh = obstMesh;

      // Process each hole
      holeXbs.forEach((holeXb, index) => {
        try {
          // Create hole geometry
          const holeMesh = this.createBox(`hole_${id}_${index}`, holeXb, scene);
          // Make hole mesh invisible (it's only used for CSG, not rendering)
          holeMesh.isVisible = false;

          // Perform CSG subtraction to cut the hole
          const obstCSG = BABYLON.CSG2.FromMesh(resultMesh);
          const holeCSG = BABYLON.CSG2.FromMesh(holeMesh);
          const subtractedCSG = obstCSG.subtract(holeCSG);

          // Clean up intermediate meshes
          if (resultMesh !== obstMesh) {
            resultMesh.dispose();
          }
          holeMesh.dispose();

          // Create new mesh from CSG result
          // centerMesh defaults to true and would move the cut geometry to the
          // origin; obst positions are already baked into the vertices.
          resultMesh = subtractedCSG.toMesh(`obstWithHole_${index}`, scene, {
            centerMesh: false,
            materialToUse: obstMesh.material
          });

          obstCSG.dispose();
          holeCSG.dispose();
          subtractedCSG.dispose();

          // Force mesh update
          resultMesh.refreshBoundingInfo();
          resultMesh.computeWorldMatrix(true);

        } catch (error) {
          console.error('[HoleService] Error processing hole:', error);
        }
      });

      // Clean up original obstMesh if we created a new result mesh
      if (resultMesh !== obstMesh) {
        obstMesh.dispose();
      }

      return resultMesh;

    } catch (error) {
      console.error('[HoleService] Error in cutHoles:', error);
      return null;
    }
  }

  /** A box standing exactly where its FDS coordinates put it. */
  private createBox(name: string, xb: SceneXb, scene: BABYLON.Scene): BABYLON.Mesh {
    const width = xb.x2 - xb.x1;
    const height = xb.y2 - xb.y1;
    const depth = xb.z2 - xb.z1;

    const mesh = BABYLON.MeshBuilder.CreateBox(name, {
      width: width,
      height: height,
      depth: depth
    }, scene);

    mesh.position = new BABYLON.Vector3(
      xb.x1 + width / 2,
      xb.y1 + height / 2,
      xb.z1 + depth / 2
    );

    return mesh;
  }

  /**
   * Check if an obst can have holes
   */
  public canHaveHoles(obst: SceneObst): boolean {
    return obst.permitHole === true;
  }

  /**
   * Which of the scenario's openings cut into a given obst.
   *
   * A &HOLE is not owned by an obst in the FDS model - it is a box, and every
   * obst it overlaps gets cut. Matching them used to write the result onto the
   * obst itself; it is returned instead, so the scenario stays untouched.
   *
   * `PERMIT_HOLE` is deliberately not consulted here: whether an obst refuses to
   * be cut is a drawing decision, and the caller says so in its own log.
   */
  public holesFor(obst: SceneObst, holes: readonly SceneHole[]): SceneHole[] {
    if (!obst || !holes) { return []; }
    return holes.filter((hole: SceneHole) => this.holeIntersectsObst(hole, obst));
  }

  /**
   * Check if a hole intersects with an obst.
   *
   * A &HOLE normally cuts all the way through a wall and overhangs its outline -
   * that is how doors and windows are written - so this is an overlap test, not a
   * containment test. Touching faces (zero shared volume) do not count.
   */
  public holeIntersectsObst(hole: SceneHole, obst: SceneObst): boolean {
    if (!hole || !hole.xb || !obst || !obst.xb) {
      return false;
    }

    const hXb = hole.xb;
    const oXb = obst.xb;

    return !(hXb.x2 <= oXb.x1 || hXb.x1 >= oXb.x2 ||
             hXb.y2 <= oXb.y1 || hXb.y1 >= oXb.y2 ||
             hXb.z2 <= oXb.z1 || hXb.z1 >= oXb.z2);
  }
}
