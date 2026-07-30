import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';

import { BabylonService } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { SceneAxis, SceneBoundsService } from '../../scene-bounds/scene-bounds.service';
import { SceneInit } from '../scene-input';
import { RegionLayer } from '../region-layer';

/**
 * Draws the &INITs of a scenario - the regions that start in a state other than
 * ambient.
 *
 * A warm layer under a ceiling, a volume already full of smoke. It is drawn as a
 * translucent outlined box, because that is what it is: a region that says what
 * the air inside it begins as, over the top of the geometry it applies to. The
 * drawing itself is RegionLayer, which the &ZONEs share.
 */
@Injectable({
  providedIn: 'root'
})
export class InitService implements SceneScoped {

  public inits: readonly SceneInit[] = [];

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
      { poolName: 'inits', materialName: 'initShader' },
      babylonService, helpersService, sceneBounds, sceneRegistry, 'InitService');
  }

  /** The base box the &INITs are drawn from, once any have been. */
  public get mesh(): BABYLON.Mesh | undefined {
    return this.layer.mesh;
  }

  /** Whether the &INITs are drawn at all. */
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

  /** Draw the &INITs of the current scenario. */
  public renderInits(): Promise<void> {
    return this.layer.render(this.inits);
  }

  /** Show or hide every &INIT at once. */
  public toggleVisibility(): void {
    this.layer.toggleVisibility();
  }
}
