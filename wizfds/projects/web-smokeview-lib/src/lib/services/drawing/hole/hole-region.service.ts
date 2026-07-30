import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';

import { BabylonService } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { SceneAxis, SceneBoundsService } from '../../scene-bounds/scene-bounds.service';
import { SceneHole } from '../scene-input';
import { RegionLayer } from '../region-layer';

/**
 * Draws the &HOLEs of a scenario as translucent outlined boxes.
 *
 * A &HOLE is an absence: it is subtracted from every &OBST it overlaps, and what
 * ends up on screen is a doorway - which is to say, nothing. That is fine to look
 * at and impossible to work with. There is nothing to click, so a doorway cannot
 * be selected, moved or deleted from the 3D view, and #88 needs all three.
 *
 * So the opening is drawn as well as cut: the same translucent box an &INIT and a
 * &ZONE are drawn as, through the same RegionLayer. Turning the layer off gives
 * back the view as it was, which is what a user reviewing a model rather than
 * editing one wants.
 *
 * Separate from HoleService, which cuts holes out of obsts and knows nothing
 * about the scene: what it takes to subtract a box and what it takes to draw one
 * change for different reasons.
 */
@Injectable({
  providedIn: 'root'
})
export class HoleRegionService implements SceneScoped {

  public holes: readonly SceneHole[] = [];

  private readonly layer: RegionLayer;

  constructor(
    babylonService: BabylonService,
    helpersService: HelpersService,
    sceneBounds: SceneBoundsService,
    sceneRegistry: SceneRegistryService,
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
    this.layer = new RegionLayer(
      { poolName: 'holes', materialName: 'holeShader', type: 'hole' },
      babylonService, helpersService, sceneBounds, sceneRegistry, 'HoleRegionService');
  }

  /** The base box the &HOLEs are drawn from, once any have been. */
  public get mesh(): BABYLON.Mesh | undefined {
    return this.layer.mesh;
  }

  /** Whether the &HOLEs are drawn at all. */
  public get visible(): boolean {
    return this.layer.visible;
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
    this.layer.resetSceneState();
  }

  /** Draw the &HOLEs of the current scenario. */
  public renderHoles(): Promise<void> {
    return this.layer.render(this.holes);
  }

  /** Show or hide every &HOLE at once. */
  public toggleVisibility(): void {
    this.layer.toggleVisibility();
  }
}
