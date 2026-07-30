import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';

import { BabylonService, tryCreateShaderMaterial } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { SceneVent, SceneXb } from '../scene-input';
import { SceneAxis, SceneBoundsService } from '../../scene-bounds/scene-bounds.service';
import { BatchedPlane, PlaneBatch } from '../plane-batch';
import { ClippedPlaneLayer, OutlinedMesh } from '../clipped-plane-layer';
import { isTranslucent } from '../box-instance-pool';

/**
 * A plane the library draws in its own right, rather than an element of the
 * scenario.
 *
 * The inlet and the outlet of a jetfan are derived from its box and its
 * direction: there is no &VENT behind them and nothing identifies them.
 */
export interface DerivedVent {
  readonly xb: SceneXb,
  /** The colour as a flat rgba array, ready for the vertex buffer. */
  readonly color: number[]
}

/** One colour of &VENT, and the batch drawing every vent that has it. */
interface BasicVentGroup {
  readonly batch: PlaneBatch,
  readonly edgeColor: BABYLON.Color4
}

@Injectable({
  providedIn: 'root'
})
export class VentService implements SceneScoped {

  /** The planes a jetfan blows between, as JetfanService derives them. */
  public vents: DerivedVent[] = [];
  public material: BABYLON.ShaderMaterial;
  public materialTransparent: BABYLON.ShaderMaterial;

  /** Where the clipping planes stand for the jetfan planes, in FDS metres. */
  public clipX: number;
  public clipY: number;
  public clipZ: number;

  public basicVents: readonly SceneVent[] = [];

  /**
   * The derived planes, batched the same way everything else is - opaque and
   * translucent apart, because alpha blending is a property of the material.
   */
  private opaqueBatch: PlaneBatch;
  private transparentBatch: PlaneBatch;

  /**
   * One batch per &VENT colour.
   *
   * Not one batch for all of them: the outline is a property of the mesh, and a
   * vent is outlined in its own colour. Keyed by that colour so a re-render
   * refills the batches it already has rather than building new ones.
   */
  private readonly basicGroups = new Map<string, BasicVentGroup>();

  /** The clipping, the fill and the outlines the &VENTs are drawn with. */
  private readonly basicLayer: ClippedPlaneLayer;

  /** In flight while the derived vents' shader sources are being fetched. */
  private derivedPending: Promise<void> | null = null;

  constructor(
    private babylonService: BabylonService,
    private helpersService: HelpersService,
    sceneBounds: SceneBoundsService,
    private sceneRegistry: SceneRegistryService,
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
    this.basicLayer = new ClippedPlaneLayer(
      // In front of the obst faces the vents sit on
      { materialName: 'basicVentShader', zOffset: -0.015, fillAlpha: 0.6 },
      babylonService, sceneBounds, 'VentService');
    this.resetClipping();
  }

  /** The mesh the opaque jetfan planes are drawn on. */
  public get mesh(): BABYLON.Mesh | undefined {
    return this.opaqueBatch ? this.opaqueBatch.mesh : undefined;
  }

  /** The mesh the translucent jetfan planes are drawn on. */
  public get meshTransparent(): BABYLON.Mesh | undefined {
    return this.transparentBatch ? this.transparentBatch.mesh : undefined;
  }

  /**
   * The batches the &VENTs are drawn on, one per colour, in the order the
   * colours first appeared.
   */
  public get basicMeshGroups(): OutlinedMesh[] {
    return Array.from(this.basicGroups.values())
      .map(group => ({ mesh: group.batch.mesh, edgeColor: group.edgeColor }));
  }

  /** Which of the three states the &VENT button currently shows. */
  public get basicVisibility(): number {
    return this.basicLayer.visibility;
  }

  /**
   * Pull the clipping planes back to showing the whole model - the planes are
   * coordinates, so they mean nothing once the model changes. See
   * SmokeviewApiService.render().
   */
  public resetClipping(): void {
    this.basicLayer.resetClipping();
    // The jetfan planes take their planes from the jetfan itself, which is what
    // keeps a jetfan and the planes it blows between cut at the same place
    this.clipX = this.basicLayer.clipX;
    this.clipY = this.basicLayer.clipY;
    this.clipZ = this.basicLayer.clipZ;
    this.clip();
  }

  /** Release everything tied to the scene that has just been disposed. */
  public resetSceneState(): void {
    this.opaqueBatch = null;
    this.transparentBatch = null;
    this.material = null;
    this.materialTransparent = null;
    this.derivedPending = null;

    // The registry empties itself with the scene - this is only about not
    // holding on to batches of a scene that is gone.
    this.basicGroups.clear();
    this.basicLayer.resetSceneState();
  }

  // ==========================================
  // Derived vents - the planes a jetfan blows between
  // ==========================================

  /**
   * Draw the planes derived for the jetfans.
   *
   * These are drawings, not elements of the FDS model: nothing in the scenario
   * stands behind them, so there is no identity for the registry to hold. The
   * jetfan body carries it - see JetfanService.
   *
   * They keep a layer of their own rather than joining the &VENTs': their
   * transparency is per plane, in the vertex buffer, where a &VENT's is the one
   * uniform its visibility button turns.
   */
  public async render(): Promise<void> {
    this.ensureDerivedBatches();

    const planes: BatchedPlane[] = (this.vents || [])
      .map((vent: DerivedVent) => ({ xb: vent.xb, color: vent.color }));

    this.opaqueBatch.setPlanes(planes.filter(plane => !isTranslucent(plane)));
    this.transparentBatch.setPlanes(planes.filter(plane => isTranslucent(plane)));

    await this.ensureDerivedMaterials();
  }

  private ensureDerivedBatches(): void {
    if (this.opaqueBatch) { return; }

    const scene = this.babylonService.scene;
    // The planes a jetfan's inlet and outlet are drawn as. They stand for no
    // &VENT of the scenario, so nothing in them is registered and the type they
    // are declared with never reaches a pick - see BatchedPlane.uuid.
    this.opaqueBatch = new PlaneBatch(
      'vents', 'vent', scene, this.helpersService, this.sceneRegistry);
    this.transparentBatch = new PlaneBatch(
      'ventsTransparent', 'vent', scene, this.helpersService, this.sceneRegistry);
  }

  /**
   * Build the two materials, once for the scene rather than once per render -
   * which is what used to leave a ShaderMaterial behind on every re-render.
   */
  private ensureDerivedMaterials(): Promise<void> {
    if (this.derivedPending) { return this.derivedPending; }

    this.derivedPending = Promise.all([
      tryCreateShaderMaterial(this.babylonService,
        { name: 'ventShader', shader: 'vent' }, 'VentService'),
      tryCreateShaderMaterial(this.babylonService,
        { name: 'ventTransparentShader', shader: 'vent', needAlphaBlending: true }, 'VentService')
    ]).then(([opaque, transparent]) => {
      // The scene can be gone by the time the sources arrive
      if (!this.babylonService.scene || !this.opaqueBatch) {
        [opaque, transparent].forEach(material => { if (material) { material.dispose(); } });
        return;
      }

      [opaque, transparent].forEach((material: BABYLON.ShaderMaterial) => {
        if (!material) { return; }
        material.backFaceCulling = false;
        // In front of the jetfan body, so the two do not z-fight
        material.zOffset = -0.01;
      });

      this.material = opaque;
      this.materialTransparent = transparent;
      this.clip();

      if (opaque) { this.opaqueBatch.mesh.material = opaque; }
      if (transparent) { this.transparentBatch.mesh.material = transparent; }
    });

    return this.derivedPending;
  }

  /**
   * Push the jetfan planes' clipping onto their materials.
   *
   * The values are JetfanService's - it sets them so that a jetfan and the two
   * planes drawn for it are cut at the same coordinate.
   */
  public clip(): void {
    [this.material, this.materialTransparent].forEach((material: BABYLON.ShaderMaterial) => {
      if (!material) { return; }
      material.setFloat('clipX', this.clipX);
      material.setFloat('clipY', this.clipY);
      material.setFloat('clipZ', this.clipZ);
    });
  }

  /** Take the derived planes out of the scene without waiting for a re-render. */
  public clear(): void {
    this.vents = [];
    if (this.opaqueBatch) { this.opaqueBatch.setPlanes([]); }
    if (this.transparentBatch) { this.transparentBatch.setPlanes([]); }
  }

  // ==========================================
  // Basic vents (ventilation vents from FDS)
  // ==========================================

  /**
   * Draw the &VENTs of the current scenario, one batch per colour.
   *
   * Their colours arrive resolved from the &SURF, so there is nothing to look up
   * here, and the planes stand exactly where the scenario puts them (ADR-0002).
   *
   * An empty list empties every batch rather than leaving the previous
   * scenario's vents on screen.
   */
  public async renderBasicVents(): Promise<void> {
    const grouped = new Map<string, BatchedPlane[]>();

    (this.basicVents || []).forEach((vent: SceneVent) => {
      const color = this.helpersService.toRgba(vent.color);
      const key = `${color[0].toFixed(3)},${color[1].toFixed(3)},${color[2].toFixed(3)}`;
      if (!grouped.has(key)) { grouped.set(key, []); }
      grouped.get(key).push({ uuid: vent.uuid, id: vent.id, xb: vent.xb, color: color });
    });

    // A colour nobody uses any more takes its batch - and everything that batch
    // put in the registry - with it
    Array.from(this.basicGroups.keys())
      .filter(key => !grouped.has(key))
      .forEach(key => {
        this.basicGroups.get(key).batch.dispose();
        this.basicGroups.delete(key);
      });

    grouped.forEach((planes: BatchedPlane[], key: string) => {
      this.groupFor(key, planes[0].color).batch.setPlanes(planes);
    });

    await this.basicLayer.attach(this.basicMeshGroups);
  }

  /** The batch drawing a colour, built the first time that colour appears. */
  private groupFor(key: string, color: readonly number[]): BasicVentGroup {
    const existing = this.basicGroups.get(key);
    if (existing) { return existing; }

    const group: BasicVentGroup = {
      batch: new PlaneBatch(
        `basicVents_${this.basicGroups.size}`, 'vent', this.babylonService.scene,
        this.helpersService, this.sceneRegistry),
      edgeColor: new BABYLON.Color4(color[0], color[1], color[2], 1)
    };
    this.basicGroups.set(key, group);
    return group;
  }

  /** Cycle the &VENT button: edges only → edges and fill → hidden. */
  public toogleBasicVisibility(): void {
    this.basicLayer.toggleVisibility();
  }

  /**
   * Move a clipping plane for the &VENTs
   * @param value the plane's coordinate, in FDS metres
   * @param direction x, y, z
   */
  public clipBasic(value: number, direction: SceneAxis): void {
    this.basicLayer.clip(value, direction);
  }

  /** Take the &VENTs out of the scene without waiting for a re-render. */
  public clearBasic(): void {
    this.basicVents = [];
    this.basicGroups.forEach(group => group.batch.dispose());
    this.basicGroups.clear();
  }
}
