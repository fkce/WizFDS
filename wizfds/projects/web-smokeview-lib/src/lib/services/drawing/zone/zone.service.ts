import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';

import { BabylonService } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { SceneAxis, SceneBoundsService } from '../../scene-bounds/scene-bounds.service';
import { SceneZone } from '../scene-input';
import { RegionLayer } from '../region-layer';

/**
 * Draws the &ZONEs of a scenario - the sealed pressure zones.
 *
 * A lift shaft, a stairwell, a room the smoke has to be kept out of. A zone
 * contains the geometry it applies to by design, so it is drawn as a translucent
 * outlined box through the same RegionLayer as an &INIT, in a colour of its own.
 */
@Injectable({
  providedIn: 'root'
})
export class ZoneService implements SceneScoped {

  public zones: readonly SceneZone[] = [];

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
      { poolName: 'zones', materialName: 'zoneShader', type: 'zone' },
      babylonService, helpersService, sceneBounds, sceneRegistry, 'ZoneService');
  }

  /** The base box the &ZONEs are drawn from, once any have been. */
  public get mesh(): BABYLON.Mesh | undefined {
    return this.layer.mesh;
  }

  /** Whether the &ZONEs are drawn at all. */
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

  /** Draw the &ZONEs of the current scenario. */
  public renderZones(): Promise<void> {
    return this.layer.render(this.zones);
  }

  /** Show or hide every &ZONE at once. */
  public toggleVisibility(): void {
    this.layer.toggleVisibility();
  }
}
