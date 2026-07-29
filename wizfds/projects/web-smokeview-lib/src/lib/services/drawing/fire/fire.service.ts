import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';

import { BabylonService } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { SceneFire } from '../scene-input';
import { SceneAxis, SceneBoundsService } from '../../scene-bounds/scene-bounds.service';
import { PlaneBatch } from '../plane-batch';
import { ClippedPlaneLayer } from '../clipped-plane-layer';

/** Fires are outlined in red - the library's own choice, not the &SURF's. */
const FIRE_EDGE_COLOR = new BABYLON.Color4(1, 0, 0, 1);

@Injectable({
  providedIn: 'root'
})
export class FireService implements SceneScoped {

  public fires: readonly SceneFire[] = [];

  /**
   * A fire is drawn as the plane of its &VENT, so the fires share one buffer
   * with their identity held as a range of faces (ADR-0006).
   */
  private batch: PlaneBatch;

  /** The clipping, the fill and the outline every fire is drawn with. */
  private readonly layer: ClippedPlaneLayer;

  constructor(
    private babylonService: BabylonService,
    private helpersService: HelpersService,
    sceneBounds: SceneBoundsService,
    private sceneRegistry: SceneRegistryService,
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
    this.layer = new ClippedPlaneLayer(
      // In front of the floor the fire stands on
      { materialName: 'fireShader', zOffset: -0.02, fillAlpha: 0.6 },
      babylonService, sceneBounds, 'FireService');
  }

  /** The mesh every fire is drawn on, once there is a scene to draw into. */
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

    await this.layer.attach([{ mesh: this.batch.mesh, edgeColor: FIRE_EDGE_COLOR }]);
  }

  /** Cycle the button: edges only → edges and fill → hidden. */
  public toogleVisibility(): void {
    this.layer.toggleVisibility();
  }

  /** Take the fires out of the scene without waiting for a re-render. */
  public clear(): void {
    this.fires = [];
    if (this.batch) { this.batch.setPlanes([]); }
  }
}
