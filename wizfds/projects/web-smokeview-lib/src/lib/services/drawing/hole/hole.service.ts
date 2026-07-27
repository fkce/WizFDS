import { Injectable, isDevMode } from '@angular/core';
import * as BABYLON from 'babylonjs';
import { IHole, IObst, IXb } from '../interfaces';
import { HelpersService } from '../../helpers/helpers.service';

@Injectable({
  providedIn: 'root'
})
export class HoleService {

  constructor(private helpersService: HelpersService) { }

  /**
   * Process obst with holes using CSG operations
   * @param obst The obst object that may contain holes
   * @param scene Babylon scene
   * @returns Processed mesh with holes cut and inner walls added
   */
  /**
   * Whether the CSG2 backend (Manifold) finished loading. Cutting is impossible
   * until it has - see BabylonService.initializeCsg2().
   */
  public isCsgReady(): boolean {
    return BABYLON.IsCSG2Ready();
  }

  public processObstWithHoles(obst: IObst, scene: BABYLON.Scene): BABYLON.Mesh | null {
    // If no holes, return null (will use standard obst rendering)
    if (!obst.holes || obst.holes.length === 0) {
      return null;
    }

    // Manifold failing to load costs the openings, not the whole scene: the
    // obst falls back to being drawn solid.
    if (!this.isCsgReady()) {
      if (isDevMode()) console.warn('[HoleService] CSG2 is not ready - drawing obst solid:', obst.id);
      return null;
    }

    try {
      // Create base obst geometry
      const obstMesh = this.createObstGeometry(obst, scene);
      // Make the obstMesh invisible during processing (it will be disposed anyway)
      obstMesh.isVisible = false;
      
      let resultMesh = obstMesh;

      // Process each hole
      obst.holes.forEach((hole, index) => {
        try {
          // Create hole geometry
          const holeMesh = this.createHoleGeometry(hole, scene);
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
      console.error('[HoleService] Error in processObstWithHoles:', error);
      return null;
    }
  }

  /**
   * Create base obst geometry mesh
   */
  private createObstGeometry(obst: IObst, scene: BABYLON.Scene): BABYLON.Mesh {
    const xb = obst.vis.xbNorm;
    const width = xb.x2 - xb.x1;
    const height = xb.y2 - xb.y1;
    const depth = xb.z2 - xb.z1;

    const mesh = BABYLON.MeshBuilder.CreateBox(`obstBase_${obst.id}`, {
      width: width,
      height: height,
      depth: depth
    }, scene);

    // Position the mesh
    mesh.position = new BABYLON.Vector3(
      xb.x1 + width / 2,
      xb.y1 + height / 2,
      xb.z1 + depth / 2
    );

    return mesh;
  }

  /**
   * Create hole geometry mesh
   */
  private createHoleGeometry(hole: IHole, scene: BABYLON.Scene): BABYLON.Mesh {
    const xb = hole.vis.xbNorm;
    const width = xb.x2 - xb.x1;
    const height = xb.y2 - xb.y1;
    const depth = xb.z2 - xb.z1;

    // For debugging, create a visible hole mesh
    const mesh = BABYLON.MeshBuilder.CreateBox(`hole_${hole.id}`, {
      width: width,
      height: height,
      depth: depth
    }, scene);

    // Position the mesh
    mesh.position = new BABYLON.Vector3(
      xb.x1 + width / 2,
      xb.y1 + height / 2,
      xb.z1 + depth / 2
    );

    return mesh;
  }

  /**
   * Create inner walls for holes to simulate material thickness
   */
  private createHoleInnerWalls(hole: IHole, parentObst: IObst, scene: BABYLON.Scene): BABYLON.Mesh[] {
    const walls: BABYLON.Mesh[] = [];
    const holeXb = hole.vis.xbNorm;
    const obstXb = parentObst.vis.xbNorm;
    
    // Wall thickness (small value to create inner surfaces)
    const wallThickness = 0.01;
    
    // Create walls for each face of the hole that intersects with obst boundaries
    
    // X-min wall (left side)
    if (holeXb.x1 > obstXb.x1) {
      walls.push(this.createWall(
        holeXb.x1, holeXb.y1, holeXb.z1,
        wallThickness, holeXb.y2 - holeXb.y1, holeXb.z2 - holeXb.z1,
        'x_min', scene, hole.id
      ));
    }
    
    // X-max wall (right side)
    if (holeXb.x2 < obstXb.x2) {
      walls.push(this.createWall(
        holeXb.x2 - wallThickness, holeXb.y1, holeXb.z1,
        wallThickness, holeXb.y2 - holeXb.y1, holeXb.z2 - holeXb.z1,
        'x_max', scene, hole.id
      ));
    }
    
    // Y-min wall (front side)
    if (holeXb.y1 > obstXb.y1) {
      walls.push(this.createWall(
        holeXb.x1, holeXb.y1, holeXb.z1,
        holeXb.x2 - holeXb.x1, wallThickness, holeXb.z2 - holeXb.z1,
        'y_min', scene, hole.id
      ));
    }
    
    // Y-max wall (back side)
    if (holeXb.y2 < obstXb.y2) {
      walls.push(this.createWall(
        holeXb.x1, holeXb.y2 - wallThickness, holeXb.z1,
        holeXb.x2 - holeXb.x1, wallThickness, holeXb.z2 - holeXb.z1,
        'y_max', scene, hole.id
      ));
    }
    
    // Z-min wall (bottom side)
    if (holeXb.z1 > obstXb.z1) {
      walls.push(this.createWall(
        holeXb.x1, holeXb.y1, holeXb.z1,
        holeXb.x2 - holeXb.x1, holeXb.y2 - holeXb.y1, wallThickness,
        'z_min', scene, hole.id
      ));
    }
    
    // Z-max wall (top side)
    if (holeXb.z2 < obstXb.z2) {
      walls.push(this.createWall(
        holeXb.x1, holeXb.y1, holeXb.z2 - wallThickness,
        holeXb.x2 - holeXb.x1, holeXb.y2 - holeXb.y1, wallThickness,
        'z_max', scene, hole.id
      ));
    }
    
    return walls;
  }
  
  /**
   * Create a single wall mesh for inner hole surfaces
   */
  private createWall(
    x: number, y: number, z: number,
    width: number, height: number, depth: number,
    face: string, scene: BABYLON.Scene, holeId: string
  ): BABYLON.Mesh {
    const wall = BABYLON.MeshBuilder.CreateBox(`wall_${face}_${holeId}`, {
      width: width,
      height: height,
      depth: depth
    }, scene);
    
    wall.position = new BABYLON.Vector3(
      x + width / 2,
      y + height / 2,
      z + depth / 2
    );
    
    return wall;
  }

  /**
   * Check if an obst can have holes
   */
  public canHaveHoles(obst: IObst): boolean {
    return obst.permit_hole === true;
  }

  /**
   * Check if a hole intersects with an obst.
   *
   * Works on raw FDS coordinates, not on vis.xbNorm: holes are assigned to obsts
   * before the obsts are normalized, so xbNorm is not populated yet at that point.
   * Normalization is a translation plus a positive scaling, so it preserves
   * intersection anyway.
   *
   * A &HOLE normally cuts all the way through a wall and overhangs its outline -
   * that is how doors and windows are written - so this is an overlap test, not a
   * containment test. Touching faces (zero shared volume) do not count.
   */
  public holeIntersectsObst(hole: IHole, obst: IObst): boolean {
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
