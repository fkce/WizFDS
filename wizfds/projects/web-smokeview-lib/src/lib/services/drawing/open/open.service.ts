import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';

import { BabylonService } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { SceneOpen } from '../scene-input';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { SceneAxis, SceneBoundsService } from '../../scene-bounds/scene-bounds.service';
import { PlaneBatch } from '../plane-batch';
import { ClippedPlaneLayer } from '../clipped-plane-layer';
import { LayerVisibilityService } from '../layer-visibility.service';

/**
 * Openings are drawn green. The colour is the library's own choice - an `OPEN`
 * vent has none in the FDS model - so it never crosses the boundary.
 */
const OPEN_COLOR: readonly number[] = [0, 1, 0, 1];

/** The outline colour, as the edges renderer wants it. */
const OPEN_EDGE_COLOR = new BABYLON.Color4(0, 1, 0, 1);

@Injectable({
  providedIn: 'root'
})
export class OpenService implements SceneScoped {

  opens: readonly SceneOpen[] = [];

  /**
   * Every opening is a rectangle, so they share one buffer with their identity
   * held as a range of faces - the same representation the &VENTs use
   * (ADR-0006).
   */
  private batch: PlaneBatch;

  /** The clipping, the fill and the outline every opening is drawn with. */
  private readonly layer: ClippedPlaneLayer;

  constructor(
    private babylonService: BabylonService,
    private helperService: HelpersService,
    sceneBounds: SceneBoundsService,
    private sceneRegistry: SceneRegistryService,
    sceneLifecycle: SceneLifecycleService,
    layerVisibility: LayerVisibilityService
  ) {
    sceneLifecycle.register(this);
    this.layer = new ClippedPlaneLayer(
      // In front of the walls the openings are cut into
      { materialName: 'openShader', zOffset: -0.06, fillAlpha: 0.3 },
      babylonService, sceneBounds, 'OpenService');
    layerVisibility.bind('open', () => this.layer.state());
  }

  /** The mesh every opening is drawn on, once there is a scene to draw into. */
  public get mesh(): BABYLON.Mesh | undefined {
    return this.batch ? this.batch.mesh : undefined;
  }

  public get material(): BABYLON.ShaderMaterial {
    return this.layer.material;
  }

  /** Which of the three states the button currently shows. */
  public get visibility(): number {
    return this.layer.visibility;
  }

  /** Pull the clipping planes back to showing the whole model. */
  public resetClipping(): void {
    this.layer.resetClipping();
  }

  /**
   * Move a clipping plane
   * @param value the plane's coordinate, in FDS metres
   * @param direction x, y, z
   */
  public clip(value: number, direction: SceneAxis): void {
    this.layer.clip(value, direction);
  }

  /** Release everything tied to the scene that has just been disposed. */
  public resetSceneState(): void {
    this.batch = null;
    this.layer.resetSceneState();
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
        'opens', 'open', this.babylonService.scene, this.helperService, this.sceneRegistry);
    }

    this.batch.setPlanes((this.opens || []).map((open: SceneOpen) => ({
      uuid: open.uuid, id: open.id, xb: open.xb, color: OPEN_COLOR
    })));

    await this.layer.attach([{ mesh: this.batch.mesh, edgeColor: OPEN_EDGE_COLOR }]);
  }

  /** Cycle the button: edges only → edges and fill → hidden. */
  public toogleVisibility(): void {
    this.layer.toggleVisibility();
  }
}
