import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';

import { BabylonService } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { SceneAxis, SceneBoundsService } from '../../scene-bounds/scene-bounds.service';
import { SceneDevc, SceneDevcMarker, SceneXb, SCENE_DEVC_MARKERS } from '../scene-input';
import { BoxInstancePool, PooledBox } from '../box-instance-pool';
import { PlaneBatch } from '../plane-batch';
import { ClippedPlaneLayer, EDGES_AND_FILL } from '../clipped-plane-layer';
import { ClippedMaterial } from '../clipped-material';
import { DEVC_MARKER_SHAPES } from './devc-markers';
import { SOLID_EDGE_COLOR } from '../../../consts/drawing';

/**
 * How thin a linear device may be drawn, as a fraction of a marker.
 *
 * A thermocouple tree is a line: two of its three sides have no extent at all.
 * Drawn at that, it is a beam nobody can see and nothing can pick, so the two
 * short sides are opened out to this while its own length is left alone.
 */
const BEAM_THICKNESS_RATIO = 0.35;

@Injectable({
  providedIn: 'root'
})
export class DevcService implements SceneScoped {

  public devcs: readonly SceneDevc[] = [];

  /**
   * One pool per kind of device.
   *
   * A marker is the same shape at every device that has it, up to where it
   * stands - the case instancing exists for (ADR-0006). One pool rather than one
   * mesh apiece keeps a scenario with a thousand sprinklers to one draw call.
   */
  private readonly markerPools = new Map<SceneDevcMarker, BoxInstancePool>();

  /**
   * The devices that take up space: a volume as the box it measures, a line as a
   * beam along it. Both are boxes, so both come out of one pool.
   */
  private extentPool: BoxInstancePool;

  /** The devices that are a plane. */
  private planeBatch: PlaneBatch;

  /** The clipping, the fill and the outline the plane devices are drawn with. */
  private readonly planeLayer: ClippedPlaneLayer;

  /**
   * The material the instanced paths share.
   *
   * Devices borrow the obst shaders: a marker is a lit solid that a clipping
   * plane cuts, which is what those already are.
   */
  private readonly solid: ClippedMaterial;

  /** Whether the devices are drawn at all. */
  public visible = true;

  constructor(
    private babylonService: BabylonService,
    private helpersService: HelpersService,
    private sceneBounds: SceneBoundsService,
    private sceneRegistry: SceneRegistryService,
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
    this.solid = new ClippedMaterial({
      materialName: 'devcShader', shader: 'obstInstanced', fragmentShader: 'obst'
    }, babylonService, sceneBounds, 'DevcService');
    this.planeLayer = new ClippedPlaneLayer(
      { materialName: 'devcPlaneShader', zOffset: -0.03, fillAlpha: 0.4 },
      babylonService, sceneBounds, 'DevcService');
    // A device button says drawn or not drawn; the region a plane device
    // measures is always drawn filled when it is drawn at all
    this.planeLayer.setVisibility(EDGES_AND_FILL);
  }

  /** Where a clipping plane currently stands, in FDS metres. */
  public get clipX(): number { return this.solid.clipX; }
  public get clipY(): number { return this.solid.clipY; }
  public get clipZ(): number { return this.solid.clipZ; }

  /** The shape a kind of device is drawn from, once one has been drawn. */
  public markerMesh(marker: SceneDevcMarker): BABYLON.Mesh | undefined {
    const pool = this.markerPools.get(marker);
    return pool ? pool.mesh : undefined;
  }

  /** The mesh the devices that take up space are drawn from. */
  public get extentMesh(): BABYLON.Mesh | undefined {
    return this.extentPool ? this.extentPool.mesh : undefined;
  }

  /** The mesh the plane devices are drawn on. */
  public get planeMesh(): BABYLON.Mesh | undefined {
    return this.planeBatch ? this.planeBatch.mesh : undefined;
  }

  /** Pull the clipping planes back to showing the whole model. */
  public resetClipping(): void {
    this.solid.resetClipping();
    this.planeLayer.resetClipping();
  }

  /**
   * Move a clipping plane
   * @param value the plane's coordinate, in FDS metres
   * @param direction x, y, z
   */
  public clip(value: number, direction: SceneAxis): void {
    this.solid.clip(value, direction);
    this.planeLayer.clip(value, direction);
  }

  /** Release everything tied to the scene that has just been disposed. */
  public resetSceneState(): void {
    this.markerPools.clear();
    this.extentPool = null;
    this.planeBatch = null;
    this.visible = true;
    this.solid.resetSceneState();
    this.planeLayer.resetSceneState();
    this.planeLayer.setVisibility(EDGES_AND_FILL);
  }

  /**
   * Draw the &DEVCs of the current scenario.
   *
   * Three paths, because FDS lets a device occupy space in ways that are
   * different drawings rather than one drawing at different sizes: a marker for
   * a point, a box for a line or a volume, a rectangle for a plane. An empty
   * list empties all three.
   */
  public async renderDevcs(): Promise<void> {
    const markers = new Map<SceneDevcMarker, PooledBox[]>();
    const bodies: PooledBox[] = [];
    const planes: { uuid: string, id: string, xb: SceneXb, color: readonly number[] }[] = [];

    (this.devcs || []).forEach((devc: SceneDevc) => {
      const color = this.helpersService.toRgba(devc.color);

      if (devc.extent === 'plane') {
        planes.push({ uuid: devc.uuid, id: devc.id, xb: devc.xb, color: color });
        return;
      }
      if (devc.extent === 'point') {
        const marker = DEVC_MARKER_SHAPES[devc.marker] ? devc.marker : 'sensor';
        if (!markers.has(marker)) { markers.set(marker, []); }
        markers.get(marker).push({
          uuid: devc.uuid, id: devc.id, xb: this.markerBox(devc.xb), color: color
        });
        return;
      }
      bodies.push({
        uuid: devc.uuid,
        id: devc.id,
        xb: devc.extent === 'linear' ? this.beamBox(devc.xb) : devc.xb,
        color: color
      });
    });

    // Every kind gets its pool refilled, including the kinds nothing is left in:
    // a device whose quantity changed must not go on being drawn as what it was
    SCENE_DEVC_MARKERS.forEach((marker: SceneDevcMarker) => {
      const boxes = markers.get(marker);
      if (!boxes && !this.markerPools.has(marker)) { return; }
      this.poolFor(marker).setBoxes(boxes ?? []);
    });

    this.ensureExtentPool().setBoxes(bodies);
    this.ensurePlaneBatch().setPlanes(planes);

    this.applyEdges();
    await Promise.all([
      this.solid.attach(this.instancedMeshes()),
      this.planeLayer.attach([{ mesh: this.planeBatch.mesh, edgeColor: SOLID_EDGE_COLOR }])
    ]);
    this.applyVisibility();
  }

  /** The meshes drawn through the instanced material - the markers and bodies. */
  private instancedMeshes(): BABYLON.Mesh[] {
    const meshes: BABYLON.Mesh[] = [];
    this.markerPools.forEach(pool => meshes.push(pool.mesh));
    if (this.extentPool) { meshes.push(this.extentPool.mesh); }
    return meshes;
  }

  /** The box a marker is drawn in: a cube of the scene's marker size. */
  private markerBox(xb: SceneXb): SceneXb {
    const half = this.sceneBounds.markerSize / 2;
    const x = (xb.x1 + xb.x2) / 2, y = (xb.y1 + xb.y2) / 2, z = (xb.z1 + xb.z2) / 2;
    return {
      x1: x - half, x2: x + half,
      y1: y - half, y2: y + half,
      z1: z - half, z2: z + half
    };
  }

  /** A line opened out into a beam, its own length untouched. */
  private beamBox(xb: SceneXb): SceneXb {
    const thickness = BEAM_THICKNESS_RATIO * this.sceneBounds.markerSize;
    const open = (low: number, high: number) => {
      if (Math.abs(high - low) >= thickness) { return { low: low, high: high }; }
      const centre = (low + high) / 2;
      return { low: centre - thickness / 2, high: centre + thickness / 2 };
    };

    const x = open(xb.x1, xb.x2), y = open(xb.y1, xb.y2), z = open(xb.z1, xb.z2);
    return { x1: x.low, x2: x.high, y1: y.low, y2: y.high, z1: z.low, z2: z.high };
  }

  /** The pool a kind of device is drawn from, built the first time one is. */
  private poolFor(marker: SceneDevcMarker): BoxInstancePool {
    const existing = this.markerPools.get(marker);
    if (existing) { return existing; }

    // The material follows on the next attach(), which every render ends with
    const pool = new BoxInstancePool(
      `devc_${marker.replace(/\s+/g, '_')}`, 'devc', this.babylonService.scene,
      this.helpersService, this.sceneRegistry, DEVC_MARKER_SHAPES[marker]);
    this.markerPools.set(marker, pool);
    return pool;
  }

  private ensureExtentPool(): BoxInstancePool {
    if (!this.extentPool) {
      this.extentPool = new BoxInstancePool(
        'devcBodies', 'devc', this.babylonService.scene,
        this.helpersService, this.sceneRegistry);
    }
    return this.extentPool;
  }

  private ensurePlaneBatch(): PlaneBatch {
    if (!this.planeBatch) {
      this.planeBatch = new PlaneBatch(
        'devcPlanes', 'devc', this.babylonService.scene,
        this.helpersService, this.sceneRegistry);
    }
    return this.planeBatch;
  }

  /** Outline the bodies, so a volume device reads as a region rather than a block. */
  private applyEdges(): void {
    if (!this.extentPool) { return; }

    this.extentPool.mesh.enableEdgesRendering();
    this.extentPool.mesh.edgesWidth = this.sceneBounds.edgeWidth;
    this.extentPool.mesh.edgesColor = SOLID_EDGE_COLOR;
  }

  /** Show or hide every device at once. */
  public toggleVisibility(): void {
    this.visible = !this.visible;
    this.applyVisibility();
  }

  /**
   * A pool draws nothing when it holds nothing, so hiding is only ever a matter
   * of taking what it does hold off screen.
   */
  private applyVisibility(): void {
    this.markerPools.forEach(pool => {
      pool.mesh.setEnabled(this.visible && pool.count > 0);
    });
    if (this.extentPool) {
      this.extentPool.mesh.setEnabled(this.visible && this.extentPool.count > 0);
    }
    if (this.planeBatch) {
      this.planeBatch.mesh.setEnabled(this.visible && this.planeBatch.count > 0);
    }
  }
}
