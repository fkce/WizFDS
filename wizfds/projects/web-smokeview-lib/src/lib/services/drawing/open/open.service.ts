import { Injectable } from '@angular/core';
import { BabylonService } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { forEach, max, cloneDeep, toNumber } from 'lodash';
import { IMesh, IOpen } from '../interfaces';
import * as BABYLON from 'babylonjs';
import { MeshService } from '../mesh/mesh.service';
import { Vector3 } from 'babylonjs';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';

@Injectable({
  providedIn: 'root'
})
export class OpenService implements SceneScoped {
  opens: IOpen[] = [];

  vertices: number[] = [];
  normals: number[] = [];
  colors: number[] = [];
  indices: number[] = [];

  meshes: BABYLON.Mesh[] = [];
  vertexData: BABYLON.VertexData;
  material: BABYLON.StandardMaterial;

  visibility: number = 1;

  constructor(
    private babylonService: BabylonService,
    private helperService: HelpersService,
    private meshService: MeshService,
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
  }

  /** Release everything tied to the scene that has just been disposed. */
  public resetSceneState(): void {
    this.meshes.length = 0;
    this.material = null;
    this.vertexData = null;
    this.vertices.length = 0;
    this.normals.length = 0;
    this.colors.length = 0;
    this.indices.length = 0;
  }

  /**
   * Reder opens
   */
  public renderOpens() {

    this.disposePreviousOpens();

    // Prepare normalized geometry and colors
    this.normalizeOpens();

    // Render data
    this.render();
  }

  /**
   * Release what the previous render put in the scene.
   *
   * One StandardMaterial is shared by every open plane, so it is disposed once
   * rather than per mesh.
   */
  private disposePreviousOpens(): void {
    forEach(this.meshes, (mesh: BABYLON.Mesh) => mesh.dispose());
    this.meshes.length = 0;

    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
  }

  /**
   * Normalize opens
   */
  private normalizeOpens(): void {

    let delta = this.helperService.normDelta;
    let xMin = this.helperService.normXMin;
    let yMin = this.helperService.normYMin;
    let zMin = this.helperService.normZMin;

    // Normalize ...
    forEach(this.opens, (open: IOpen) => {

      // Normalize xb
      let xb = cloneDeep(open.xb);
      forEach(xb, (o, key) => {
        xb[key] = toNumber(o);
      });

      xb.x1 += (xMin < 0) ? -xMin : xMin;
      open.vis.xbNorm.x1 = xb.x1 / delta;

      xb.x2 += (xMin < 0) ? -xMin : xMin;
      open.vis.xbNorm.x2 = xb.x2 / delta;

      xb.y1 += (yMin < 0) ? -yMin : yMin;
      open.vis.xbNorm.y1 = xb.y1 / delta;
      xb.y2 += (yMin < 0) ? -yMin : yMin;
      open.vis.xbNorm.y2 = xb.y2 / delta;

      xb.z1 += (zMin < 0) ? -zMin : zMin;
      open.vis.xbNorm.z1 = xb.z1 / delta;
      xb.z2 += (zMin < 0) ? -zMin : zMin;
      open.vis.xbNorm.z2 = xb.z2 / delta;

      open.vis.colorNorm = [0.04, 0.811, 0.04, 1.0];
    });
  }

  /**
   * Render current open geometry
   */
  private render() {

    this.material = new BABYLON.StandardMaterial("material", this.babylonService.scene);
    this.material.ambientColor = new BABYLON.Color3(0, 1, 0);
    this.material.alpha = 0.0;
    this.material.zOffset = -0.06;

    if (this.opens && this.opens.length > 0) {
      forEach(this.opens, (open, index: number) => {
        let options: any = this.helperService.getPlaneDimFromXb(open.vis.xbNorm);
        this.meshes.push(BABYLON.MeshBuilder.CreatePlane("plane", { height: options.height, width: options.width, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, this.babylonService.scene));
        this.meshes[index].material = this.material;
        this.meshes[index].rotate(options.rotate, Math.PI / 2);
        this.meshes[index].position = options.center;
        this.meshes[index].enableEdgesRendering();
        this.meshes[index].edgesWidth = 0.1;
        this.meshes[index].edgesColor = new BABYLON.Color4(0, 1, 0, 1);
        // Preformance optimization
        this.meshes[index].convertToUnIndexedMesh();
        this.meshes[index].freezeWorldMatrix();
      });
    }
  }

  /**
   * Toggle open visibility
   */
  public toogleVisibility() {
    // The button is live from the first frame, before anything is rendered
    if (!this.material) return;

    // Show only edges;
    if (this.visibility == 0) {
      this.material.alpha = 0.0;
      forEach(this.meshes, (mesh: BABYLON.Mesh) => {
        //mesh.material.alpha = 0.0;
        mesh.edgesWidth = 0.1;
      });
      this.visibility = 1;
    }
    // Show edges and backface
    else if (this.visibility == 1) {
      this.material.alpha = 0.3;
      forEach(this.meshes, (mesh: BABYLON.Mesh) => {
        //mesh.material.alpha = 0.3;
        mesh.edgesWidth = 0.1;
      });
      this.visibility = 2;
    }
    // Hide all
    else if (this.visibility == 2) {
      this.material.alpha = 0.0;
      forEach(this.meshes, (mesh: BABYLON.Mesh) => {
        //mesh.material.alpha = 0.0;
        mesh.edgesWidth = 0.0;
      });
      this.visibility = 0;
    }
  }
}
