import * as BABYLON from 'babylonjs';

import { BabylonService } from '../babylon/babylon.service';
import { HelpersService } from '../helpers/helpers.service';
import { SceneRegistryService } from '../babylon/scene-registry.service';
import { SceneAxis, SceneBoundsService } from '../scene-bounds/scene-bounds.service';
import { SceneRegion } from './scene-input';
import { BoxInstancePool, PooledBox } from './box-instance-pool';
import { ClippedMaterial } from './clipped-material';
import { SOLID_EDGE_COLOR } from '../../consts/drawing';

/** What tells one layer of regions apart from another in the scene. */
export interface RegionLayerStyle {
  /** Name of the base mesh the regions are instanced from. */
  readonly poolName: string,
  /** Name of the material they share, as it appears in the scene. */
  readonly materialName: string
}

/**
 * One kind of condition region, drawn as translucent outlined boxes.
 *
 * An &INIT and a &ZONE are the same drawing: a box that says something about the
 * space inside it rather than filling it. Both are therefore instanced out of
 * one pool apiece (ADR-0006) and lit through the obst shaders with alpha
 * blending on, which is what keeps a region from hiding the wall it contains.
 *
 * A layer rather than a service, so that the two kinds share the drawing while
 * keeping a colour, a mesh and a visibility button of their own - the same split
 * ClippedPlaneLayer makes for everything drawn as a plane.
 */
export class RegionLayer {

  /** Whether the regions of this layer are drawn at all. */
  public visible = true;

  /** The pool they are instanced from, built the first time one is drawn. */
  private pool: BoxInstancePool;

  /** The material and the clipping planes, built once for the scene. */
  private readonly translucent: ClippedMaterial;

  constructor(
    private readonly style: RegionLayerStyle,
    private readonly babylonService: BabylonService,
    private readonly helpersService: HelpersService,
    private readonly sceneBounds: SceneBoundsService,
    private readonly sceneRegistry: SceneRegistryService,
    /** Named in the log when the shader cannot be built. */
    owner: string
  ) {
    this.translucent = new ClippedMaterial({
      materialName: style.materialName, shader: 'obstInstanced', fragmentShader: 'obst',
      // Every region is translucent by the colour the app gives it, so there is
      // no opaque pool to pair this with - see BoxPoolPair, which exists for the
      // element types whose alpha is the user's to choose.
      needAlphaBlending: true,
      // A region is drawn against faces it is coplanar with by construction - a
      // warm layer stops at the ceiling, a pressure zone runs along the shaft
      // walls - and at equal depth the two speckle. The same offset the plane
      // layers take, and for the same reason.
      zOffset: -0.03
    }, babylonService, sceneBounds, owner);
  }

  /** The base box the regions are drawn from, once any have been. */
  public get mesh(): BABYLON.Mesh | undefined {
    return this.pool ? this.pool.mesh : undefined;
  }

  /** Where a clipping plane currently stands, in FDS metres. */
  public get clipX(): number { return this.translucent.clipX; }
  public get clipY(): number { return this.translucent.clipY; }
  public get clipZ(): number { return this.translucent.clipZ; }

  /** Pull the clipping planes back to showing the whole model. */
  public resetClipping(): void {
    this.translucent.resetClipping();
  }

  /**
   * Move a clipping plane
   * @param value the plane's coordinate, in FDS metres
   * @param axis x, y, z
   */
  public clip(value: number, axis: SceneAxis): void {
    this.translucent.clip(value, axis);
  }

  /** Release everything tied to the scene that has just been disposed. */
  public resetSceneState(): void {
    this.pool = null;
    this.visible = true;
    this.translucent.resetSceneState();
  }

  /**
   * Draw exactly these regions, replacing whatever was there.
   *
   * An empty list empties the pool rather than leaving the previous scenario's
   * regions on screen.
   */
  public async render(regions: readonly SceneRegion[]): Promise<void> {
    const boxes: PooledBox[] = (regions || []).map((region: SceneRegion) => ({
      uuid: region.uuid, xb: region.xb, color: this.helpersService.toRgba(region.color)
    }));

    this.ensurePool().setBoxes(boxes);
    this.applyEdges();
    await this.translucent.attach([this.pool.mesh]);
    this.applyVisibility();
  }

  /** Show or hide every region of this layer at once. */
  public toggleVisibility(): void {
    this.visible = !this.visible;
    this.applyVisibility();
  }

  private ensurePool(): BoxInstancePool {
    if (!this.pool) {
      this.pool = new BoxInstancePool(
        this.style.poolName, this.babylonService.scene,
        this.helpersService, this.sceneRegistry);
      // A region is a condition, not a thing to edit in place: an &OBST is
      // selectable because it is a thing you edit where it stands (ADR-0005),
      // and the wall inside a region is what a ctrl+click has to reach.
      this.pool.mesh.isPickable = false;
    }
    return this.pool;
  }

  /**
   * Outline the boxes, so a region reads as a region rather than a block.
   *
   * Babylon's edges renderer binds world0..world3 off the base mesh and draws
   * one outline per thin instance, so one call covers the whole layer.
   */
  private applyEdges(): void {
    this.pool.mesh.enableEdgesRendering();
    this.pool.mesh.edgesWidth = this.sceneBounds.edgeWidth;
    this.pool.mesh.edgesColor = SOLID_EDGE_COLOR;
  }

  /**
   * Show or hide what the pool holds. An empty pool is off screen either way -
   * an instanced mesh with no instances declares no attributes to draw from.
   */
  private applyVisibility(): void {
    if (!this.pool) { return; }
    this.pool.mesh.setEnabled(this.visible && this.pool.count > 0);
  }
}
