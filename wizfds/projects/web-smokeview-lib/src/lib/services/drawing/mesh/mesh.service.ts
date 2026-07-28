import { Injectable, isDevMode } from '@angular/core';
import { BabylonService } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { SceneMesh } from '../scene-input';
import * as BABYLON from 'babylonjs';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { SceneBoundsService } from '../../scene-bounds/scene-bounds.service';
import { BoxInstancePool } from '../box-instance-pool';

/**
 * Meshes are drawn as yellow outlines. The colour is the library's own choice -
 * a &MESH has none in the FDS model - so it never crosses the boundary.
 */
const MESH_COLOR: number[] = [1, 0.815, 0, 0];

/** The outline colour, as the edges renderer wants it. */
const MESH_EDGE_COLOR = new BABYLON.Color4(1, 0.815, 0, 1);

@Injectable({
  providedIn: 'root'
})
export class MeshService implements SceneScoped {

  meshes: readonly SceneMesh[] = [];

  material: BABYLON.ShaderMaterial;

  visibility: number = 1;

  /**
   * Every &MESH is a box, so they are drawn as thin instances of one - the same
   * representation the obsts use (ADR-0006).
   */
  private pool: BoxInstancePool;

  /** In flight while the shader sources are being fetched. */
  private materialPending: Promise<void> | null = null;

  constructor(
    private babylonService: BabylonService,
    private helperService: HelpersService,
    private sceneBounds: SceneBoundsService,
    private sceneRegistry: SceneRegistryService,
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
  }

  /** The base box every &MESH outline is drawn from. */
  public get mesh(): BABYLON.Mesh | undefined {
    return this.pool ? this.pool.mesh : undefined;
  }

  /** Release everything tied to the scene that has just been disposed. */
  public resetSceneState(): void {
    this.pool = null;
    this.material = null;
    this.materialPending = null;
    // renderMeshes() does not restore this, so a stale value would leave the
    // toggle one step out of phase with what is actually drawn
    this.visibility = 1;
  }

  /**
   * Draw the &MESHes of the current scenario.
   *
   * An empty list empties the pool rather than leaving the previous scenario's
   * meshes on screen.
   */
  public renderMeshes(): void {
    if (!this.pool) {
      this.pool = new BoxInstancePool(
        'meshes', this.babylonService.scene, this.helperService, this.sceneRegistry);
    }

    this.pool.setBoxes((this.meshes || []).map((mesh: SceneMesh) => ({
      uuid: mesh.uuid, xb: mesh.xb, color: MESH_COLOR
    })));

    this.ensureMaterial();

    // Babylon's edges renderer binds world0..world3 off the base mesh and draws
    // one outline per thin instance, so this covers every &MESH in the scenario.
    this.pool.mesh.enableEdgesRendering();
    this.pool.mesh.edgesWidth = this.sceneBounds.outlineWidth;
    this.pool.mesh.edgesColor = MESH_EDGE_COLOR;
  }

  /**
   * Build the shader material, once for the scene: it does not depend on what is
   * being drawn, and rebuilding it per render left orphans behind.
   */
  private ensureMaterial(): void {
    if (this.materialPending) { return; }

    this.materialPending = this.babylonService
      .createShaderMaterial({
        name: 'meshShader', shader: 'meshInstanced', fragmentShader: 'mesh',
        needAlphaBlending: true
      })
      .then((material) => {
        if (!this.babylonService.scene) { material.dispose(); return; }
        this.material = material;
        this.material.setFloat('transparent', this.visibility === 2 ? 1.0 : 0.0);
        this.material.zOffset = 0.04;
        this.material.freeze();
        if (this.pool) { this.pool.mesh.material = this.material; }
      })
      .catch((e) => {
        console.error('[MeshService] Failed to create the mesh shader material', e);
      });
  }

  /**
   * Toggle mesh visibility
   */
  public toogleVisibility() {
    // The button is live from the first frame, while the material is still
    // being fetched - same guard FireService carries.
    if (!this.mesh || !this.material) return;

    // Show only edges;
    if (this.visibility == 0) {
      this.material.setFloat('transparent', 0.0);
      this.mesh.edgesWidth = this.sceneBounds.outlineWidth;
      this.visibility = 1;
    }
    // Show edges and backface
    else if (this.visibility == 1) {
      this.material.setFloat('transparent', 1.0);
      this.mesh.edgesWidth = this.sceneBounds.outlineWidth;
      this.visibility = 2;
    }
    // Hide all
    else if (this.visibility == 2) {
      this.material.setFloat('transparent', 0.0);
      this.mesh.edgesWidth = 0.0;
      this.visibility = 0;
    }

    if (isDevMode()) { try { console.debug('[MeshService] visibility', this.visibility); } catch { } }
  }
}
