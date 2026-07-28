import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';

import { BabylonService, tryCreateShaderMaterial } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { SceneOpen } from '../scene-input';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { SceneAxis, SceneBoundsService } from '../../scene-bounds/scene-bounds.service';
import { PlaneBatch } from '../plane-batch';

/**
 * Openings are drawn green. The colour is the library's own choice - an `OPEN`
 * vent has none in the FDS model - so it never crosses the boundary.
 */
const OPEN_COLOR: number[] = [0, 1, 0, 1];

/** The outline colour, as the edges renderer wants it. */
const OPEN_EDGE_COLOR = new BABYLON.Color4(0, 1, 0, 1);

/** How solid the fill is in the state that shows one. */
const OPEN_FILL_ALPHA = 0.3;

@Injectable({
  providedIn: 'root'
})
export class OpenService implements SceneScoped {

  opens: readonly SceneOpen[] = [];

  material: BABYLON.ShaderMaterial;

  /** 3-state visibility toggle: 1 = edges only, 2 = edges + fill, 0 = hidden. */
  visibility: number = 1;

  /** Where the three clipping planes stand, in FDS metres. */
  clipX: number;
  clipY: number;
  clipZ: number;

  /**
   * Every opening is a rectangle, so they share one buffer with their identity
   * held as a range of faces - the same representation the &VENTs use (ADR-0006).
   */
  private batch: PlaneBatch;

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
    this.resetClipping();
  }

  /** The mesh every opening is drawn on, once there is a scene to draw into. */
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

  /**
   * Push the planes onto a material. The sliders are live from the first frame,
   * while the material is still being fetched, so a material built afterwards
   * reads them back rather than starting from the shader's defaults.
   */
  private applyClipTo(material: BABYLON.ShaderMaterial): void {
    if (!material) { return; }
    material.setFloat('clipX', this.clipX);
    material.setFloat('clipY', this.clipY);
    material.setFloat('clipZ', this.clipZ);
  }

  /** Release everything tied to the scene that has just been disposed. */
  public resetSceneState(): void {
    this.batch = null;
    this.material = null;
    this.materialPending = null;
    // renderOpens() does not restore this, so a stale value would leave the
    // toggle one step out of phase with what is actually drawn
    this.visibility = 1;
  }

  /**
   * Draw the `OPEN` vents of the current scenario.
   *
   * An empty list empties the batch rather than leaving the previous scenario's
   * openings on screen. Their boxes need no placing: the scene is in FDS metres
   * 1:1 (ADR-0002).
   */
  public async renderOpens(): Promise<void> {
    if (!this.batch) {
      this.batch = new PlaneBatch(
        'opens', this.babylonService.scene, this.helperService, this.sceneRegistry);
    }

    this.batch.setPlanes((this.opens || []).map((open: SceneOpen) => ({
      uuid: open.uuid, xb: open.xb, color: OPEN_COLOR
    })));

    // After the buffer, not before: the edges renderer reads the geometry it is
    // given at the moment it is enabled
    this.applyEdges();

    await this.ensureMaterial();
  }

  /**
   * Build the shader material, once for the scene: it does not depend on what is
   * being drawn, and rebuilding it per render left orphans behind.
   *
   * Openings borrow the fire shader - it clips in metres and carries the
   * `transparent` uniform the visibility toggle turns.
   */
  private ensureMaterial(): Promise<void> {
    if (this.materialPending) { return this.materialPending; }

    this.materialPending = tryCreateShaderMaterial(this.babylonService, {
      name: 'openShader', shader: 'fire', needAlphaBlending: true
    }, 'OpenService').then((material: BABYLON.ShaderMaterial) => {
      // The scene can be gone by the time the sources arrive
      if (!material) { return; }
      if (!this.babylonService.scene || !this.batch) { material.dispose(); return; }

      this.material = material;
      this.material.backFaceCulling = false;
      this.material.zOffset = -0.06;
      this.applyClipTo(this.material);
      this.applyFill();
      this.batch.mesh.material = this.material;
    });

    return this.materialPending;
  }

  /**
   * Toggle open visibility (3 states):
   * 1 → edges only
   * 2 → edges + semi-transparent fill
   * 0 → hidden
   */
  public toogleVisibility(): void {
    // The button is live from the first frame, before anything is rendered
    if (!this.batch) { return; }

    this.visibility = this.visibility === 1 ? 2 : this.visibility === 2 ? 0 : 1;
    this.applyFill();
    this.applyEdges();
  }

  /** Push the current state's fill onto the material, if it has arrived. */
  private applyFill(): void {
    if (!this.material) { return; }
    this.material.setFloat('transparent', this.visibility === 2 ? OPEN_FILL_ALPHA : 0.0);
  }

  /** Outline every opening, except in the state that hides them. */
  private applyEdges(): void {
    if (!this.batch) { return; }

    const mesh = this.batch.mesh;
    mesh.enableEdgesRendering();
    mesh.edgesWidth = this.visibility === 0 ? 0 : this.sceneBounds.outlineWidth;
    mesh.edgesColor = OPEN_EDGE_COLOR;
  }
}
