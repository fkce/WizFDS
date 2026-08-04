import * as BABYLON from 'babylonjs';

import { BabylonService } from '../babylon/babylon.service';
import { HelpersService } from '../helpers/helpers.service';
import { SceneRegistryService } from '../babylon/scene-registry.service';
import { SceneAxis, SceneBoundsService } from '../scene-bounds/scene-bounds.service';
import { SceneElementType, SceneRegion } from './scene-input';
import { BoxInstancePool, PooledBox } from './box-instance-pool';
import { ClippedMaterial } from './clipped-material';
import { EDGES_AND_FILL, EDGES_ONLY, HIDDEN } from './clipped-plane-layer';
import { SceneLayerState } from './layer-visibility.service';
import { SOLID_EDGE_COLOR } from '../../consts/drawing';

/** What tells one layer of regions apart from another in the scene. */
export interface RegionLayerStyle {
  /** Name of the base mesh the regions are instanced from. */
  readonly poolName: string,
  /** Name of the material they share, as it appears in the scene. */
  readonly materialName: string,
  /** Which kind of element the layer holds - an &INIT or a &ZONE. */
  readonly type: SceneElementType
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

  /**
   * 3-state visibility, in the plane layers' numbering.
   *
   * Filled first rather than edges first: a region has always been drawn in
   * full when a scenario loads, and staying that way is what keeps the scene
   * looking unchanged. The button then walks the same wheel as everything else.
   */
  public visibility: number = EDGES_AND_FILL;

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
    this.applyFill();
  }

  /** Whether the regions of this layer are drawn at all. */
  public get visible(): boolean {
    return this.visibility !== HIDDEN;
  }

  /** The state, in the three words the rest of the system speaks. */
  public state(): SceneLayerState {
    if (this.visibility === EDGES_ONLY) { return 'edges'; }
    return this.visibility === EDGES_AND_FILL ? 'filled' : 'hidden';
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
    this.visibility = EDGES_AND_FILL;
    this.translucent.resetSceneState();
    // The material's remembered uniforms went with the scene; the next one has
    // to start with the fill this state draws
    this.applyFill();
  }

  /**
   * Draw exactly these regions, replacing whatever was there.
   *
   * An empty list empties the pool rather than leaving the previous scenario's
   * regions on screen.
   */
  public async render(regions: readonly SceneRegion[]): Promise<void> {
    const boxes: PooledBox[] = (regions || []).map((region: SceneRegion) => ({
      uuid: region.uuid, id: region.id, xb: region.xb,
      color: this.helpersService.toRgba(region.color)
    }));

    this.ensurePool().setBoxes(boxes);
    this.applyEdges();
    await this.translucent.attach([this.pool.mesh]);
    this.applyVisibility();
  }

  /** Cycle the button: edges only → edges and fill → hidden → edges only. */
  public toggleVisibility(): void {
    this.visibility = this.visibility === EDGES_ONLY ? EDGES_AND_FILL
      : this.visibility === EDGES_AND_FILL ? HIDDEN : EDGES_ONLY;
    this.applyFill();
    this.applyVisibility();
  }

  private ensurePool(): BoxInstancePool {
    if (!this.pool) {
      this.pool = new BoxInstancePool(
        this.style.poolName, this.style.type, this.babylonService.scene,
        this.helpersService, this.sceneRegistry);
      // A region is pickable, because it is an element of the scenario like any
      // other and #121 makes every drawn type selectable. That it contains the
      // geometry it applies to is handled where a pick is resolved rather than
      // by refusing one here: a condition volume loses to anything solid behind
      // it, so the wall inside a region is still what a click reaches.
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

  /**
   * Push the current state's fill onto the material.
   *
   * A multiplier over the per-region alpha rather than an alpha of its own,
   * because each region keeps a colour the app chose - the edges state has to
   * take the fill away without forgetting it.
   */
  private applyFill(): void {
    this.translucent.setUniform('fillAlpha', this.visibility === EDGES_AND_FILL ? 1.0 : 0.0);
  }
}
