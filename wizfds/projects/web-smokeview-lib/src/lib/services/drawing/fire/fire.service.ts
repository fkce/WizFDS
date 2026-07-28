import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';

import { BabylonService, tryCreateShaderMaterial } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { SceneFire } from '../scene-input';
import { SceneAxis, SceneBoundsService } from '../../scene-bounds/scene-bounds.service';
import { PlaneBatch } from '../plane-batch';

/** Fires are outlined in red - the library's own choice, not the &SURF's. */
const FIRE_EDGE_COLOR = new BABYLON.Color4(1, 0, 0, 1);

/** How solid the fill is in the state that shows one. */
const FIRE_FILL_ALPHA = 0.6;

@Injectable({
  providedIn: 'root'
})
export class FireService implements SceneScoped {

  public fires: readonly SceneFire[] = [];
  public material: BABYLON.ShaderMaterial;

  /** Where the three clipping planes stand, in FDS metres. */
  public clipX: number;
  public clipY: number;
  public clipZ: number;

  // 3-state visibility toggle: 0=edges only, 1=edges+semi-transparent, 2=hidden
  public visibility: number = 0;

  /**
   * A fire is drawn as the plane of its &VENT, so the fires share one buffer
   * with their identity held as a range of faces (ADR-0006).
   */
  private batch: PlaneBatch;

  /** In flight while the shader sources are being fetched. */
  private materialPending: Promise<void> | null = null;

  constructor(
    private babylonService: BabylonService,
    private helpersService: HelpersService,
    private sceneBounds: SceneBoundsService,
    private sceneRegistry: SceneRegistryService,
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
    this.resetClipping();
  }

  /** The mesh every fire is drawn on, once there is a scene to draw into. */
  public get mesh(): BABYLON.Mesh | undefined {
    return this.batch ? this.batch.mesh : undefined;
  }

  /**
   * Pull the clipping planes back to showing the whole model - the planes are
   * coordinates, so they mean nothing once the model changes. See
   * SmokeviewApiService.render().
   */
  public resetClipping(): void {
    this.clipX = this.sceneBounds.openClipAt('x');
    this.clipY = this.sceneBounds.openClipAt('y');
    this.clipZ = this.sceneBounds.openClipAt('z');
    this.applyClipTo(this.material);
  }

  /**
   * Push the planes onto a material. The sliders are live from the first frame,
   * while the material is still being fetched, so a material built afterwards
   * reads them back rather than starting from the shader's defaults.
   */
  private applyClipTo(material: BABYLON.ShaderMaterial): void {
    if (!material) { return; }
    material.setFloat("clipX", this.clipX);
    material.setFloat("clipY", this.clipY);
    material.setFloat("clipZ", this.clipZ);
  }

  /** Release everything tied to the scene that has just been disposed. */
  public resetSceneState(): void {
    this.batch = null;
    this.material = null;
    this.materialPending = null;
    this.visibility = 0;
  }

  /**
   * Draw the fires of the current scenario.
   *
   * A fire is drawn as the plane of its &VENT in the colour of its &SURF; both
   * arrive resolved, so there is nothing to look up here, and the plane stands
   * exactly where the scenario puts it (ADR-0002).
   *
   * An empty list empties the batch rather than leaving the previous scenario's
   * fires on screen.
   */
  public async renderFires(): Promise<void> {
    if (!this.batch) {
      this.batch = new PlaneBatch(
        'fires', this.babylonService.scene, this.helpersService, this.sceneRegistry);
    }

    this.batch.setPlanes((this.fires || []).map((fire: SceneFire) => {
      const color = this.helpersService.toRgba(fire.color);
      // Fires are always drawn opaque, whatever the &SURF says
      return { uuid: fire.uuid, xb: fire.xb, color: [color[0], color[1], color[2], 1.0] };
    }));

    // After the buffer, not before: the edges renderer reads the geometry it is
    // given at the moment it is enabled
    this.applyEdges();

    await this.ensureMaterial();
  }

  /**
   * Build the shader material, once for the scene: it does not depend on what is
   * being drawn, and rebuilding it per render orphaned one ShaderMaterial per
   * re-render of the scenario.
   */
  private ensureMaterial(): Promise<void> {
    if (this.materialPending) { return this.materialPending; }

    this.materialPending = tryCreateShaderMaterial(this.babylonService, {
      name: 'fireShader', shader: 'fire', needAlphaBlending: true
    }, 'FireService').then((material: BABYLON.ShaderMaterial) => {
      // The scene can be gone by the time the sources arrive
      if (!material) { return; }
      if (!this.babylonService.scene || !this.batch) { material.dispose(); return; }

      this.material = material;
      this.material.backFaceCulling = false;
      this.material.zOffset = -0.02;
      this.applyClipTo(this.material);
      this.applyFill();
      this.batch.mesh.material = this.material;
    });

    return this.materialPending;
  }

  /**
   * Toggle fire visibility (3 states):
   * 0 → edges only
   * 1 → edges + semi-transparent fill
   * 2 → hidden
   */
  public toogleVisibility(): void {
    // The button is live from the first frame, before anything is rendered
    if (!this.batch) { return; }

    this.visibility = this.visibility === 0 ? 1 : this.visibility === 1 ? 2 : 0;
    this.applyFill();
    this.applyEdges();
  }

  /** Push the current state's fill onto the material, if it has arrived. */
  private applyFill(): void {
    if (!this.material) { return; }
    this.material.setFloat('transparent', this.visibility === 1 ? FIRE_FILL_ALPHA : 0.0);
  }

  /** Outline every fire, except in the state that hides them. */
  private applyEdges(): void {
    if (!this.batch) { return; }

    const mesh = this.batch.mesh;
    mesh.enableEdgesRendering();
    mesh.edgesWidth = this.visibility === 2 ? 0 : this.sceneBounds.outlineWidth;
    mesh.edgesColor = FIRE_EDGE_COLOR;
  }

  /**
   * Move a clipping plane
   * @param value the plane's coordinate, in FDS metres
   * @param direction x, y, z
   */
  public clip(value: number, direction: SceneAxis): void {
    if (direction == 'x') { this.clipX = value; }
    else if (direction == 'y') { this.clipY = value; }
    else { this.clipZ = value; }

    this.applyClipTo(this.material);
  }

  /** Clear fires */
  public clear(): void {
    this.fires = [];
    if (this.batch) { this.batch.setPlanes([]); }
  }
}
