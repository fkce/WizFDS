import { Injectable } from '@angular/core';
import { BabylonService } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { forEach } from 'lodash';
import { SceneOpen } from '../scene-input';
import * as BABYLON from 'babylonjs';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { SceneBoundsService } from '../../scene-bounds/scene-bounds.service';

@Injectable({
  providedIn: 'root'
})
export class OpenService implements SceneScoped {
  opens: readonly SceneOpen[] = [];

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
    private sceneBounds: SceneBoundsService,
    private sceneRegistry: SceneRegistryService,
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
  }

  /** What this service put in the registry, so a re-render can take it out. */
  private registeredUuids: string[] = [];

  /** Release everything tied to the scene that has just been disposed. */
  public resetSceneState(): void {
    this.meshes.length = 0;
    this.material = null;
    this.vertexData = null;
    // render() does not restore this, so a stale value would leave the toggle
    // one step out of phase with what is actually drawn
    this.visibility = 1;
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
    this.registeredUuids.forEach(uuid => this.sceneRegistry.forget(uuid));
    this.registeredUuids.length = 0;

    forEach(this.meshes, (mesh: BABYLON.Mesh) => mesh.dispose());
    this.meshes.length = 0;

    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
  }

  /**
   * Render current open geometry
   *
   * Openings are drawn green - the colour is the library's own choice, an `OPEN`
   * vent has none in the FDS model - so it never crosses the boundary. Their
   * boxes need no placing: the scene is in FDS metres 1:1 (ADR-0002).
   */
  private render() {

    this.material = new BABYLON.StandardMaterial("material", this.babylonService.scene);
    this.material.ambientColor = new BABYLON.Color3(0, 1, 0);
    this.material.alpha = 0.0;
    this.material.zOffset = -0.06;

    forEach(this.opens, (open: SceneOpen, index: number) => {
      let options: any = this.helperService.getPlaneDimFromXb(open.xb);
      this.meshes.push(BABYLON.MeshBuilder.CreatePlane("plane", { height: options.height, width: options.width, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, this.babylonService.scene));
      this.meshes[index].material = this.material;
      this.meshes[index].rotate(options.rotate, Math.PI / 2);
      this.meshes[index].position = options.center;
      this.meshes[index].enableEdgesRendering();
      this.meshes[index].edgesWidth = this.sceneBounds.outlineWidth;
      this.meshes[index].edgesColor = new BABYLON.Color4(0, 1, 0, 1);
      // Preformance optimization
      this.meshes[index].convertToUnIndexedMesh();
      this.meshes[index].freezeWorldMatrix();

      // One plane per opening, so the mesh alone identifies it
      this.sceneRegistry.register(open.uuid, { mesh: this.meshes[index] });
      this.registeredUuids.push(open.uuid);
    });
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
        mesh.edgesWidth = this.sceneBounds.outlineWidth;
      });
      this.visibility = 1;
    }
    // Show edges and backface
    else if (this.visibility == 1) {
      this.material.alpha = 0.3;
      forEach(this.meshes, (mesh: BABYLON.Mesh) => {
        //mesh.material.alpha = 0.3;
        mesh.edgesWidth = this.sceneBounds.outlineWidth;
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
