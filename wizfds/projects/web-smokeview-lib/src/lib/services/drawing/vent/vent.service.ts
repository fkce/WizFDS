import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';

import { BabylonService, tryCreateShaderMaterial } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { SceneVent, SceneXb } from '../scene-input';
import { SceneAxis, SceneBoundsService } from '../../scene-bounds/scene-bounds.service';
import { BatchedPlane, PlaneBatch } from '../plane-batch';
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

/** How solid a &VENT's fill is in the state that shows one. */
const BASIC_FILL_ALPHA = 0.6;

/** One colour of &VENT, and the batch drawing every vent that has it. */
interface BasicVentGroup {
  readonly batch: PlaneBatch,
  readonly edgeColor: BABYLON.Color4
}

@Injectable({
  providedIn: 'root'
})
export class VentService implements SceneScoped {

  // The planes drawn for a jetfan, split by whether they need alpha blending
  public vents: DerivedVent[] = [];
  public material: BABYLON.ShaderMaterial;
  public materialTransparent: BABYLON.ShaderMaterial;

  /** Where the clipping planes stand for the jetfan planes, in FDS metres. */
  public clipX: number;
  public clipY: number;
  public clipZ: number;

  // Basic vents (separate from jetfan vents)
  public basicVents: readonly SceneVent[] = [];
  public basicVisibility: number = 0; // 0=edges only, 1=edges+semi-transparent, 2=hidden

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

  /**
   * Shared by every colour group: they differ in how they are outlined, which
   * the mesh carries, and in nothing the shader sees.
   */
  private basicMaterial: BABYLON.ShaderMaterial;

  /** In flight while the shader sources are being fetched. */
  private derivedPending: Promise<void> | null = null;
  private basicPending: Promise<void> | null = null;

  /** Where the three clipping planes stand for the &VENTs, in FDS metres. */
  private basicClipX: number;
  private basicClipY: number;
  private basicClipZ: number;

  constructor(
    private babylonService: BabylonService,
    private helpersService: HelpersService,
    private sceneBounds: SceneBoundsService,
    private sceneRegistry: SceneRegistryService,
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
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
  public get basicMeshGroups(): { mesh: BABYLON.Mesh, edgeColor: BABYLON.Color4 }[] {
    return Array.from(this.basicGroups.values())
      .map(group => ({ mesh: group.batch.mesh, edgeColor: group.edgeColor }));
  }

  /**
   * Pull the clipping planes back to showing the whole model - the planes are
   * coordinates, so they mean nothing once the model changes. See
   * SmokeviewApiService.render().
   */
  public resetClipping(): void {
    this.clipX = this.basicClipX = this.sceneBounds.openClipAt('x');
    this.clipY = this.basicClipY = this.sceneBounds.openClipAt('y');
    this.clipZ = this.basicClipZ = this.sceneBounds.openClipAt('z');
    this.clip();
    this.pushBasicClipToMaterials();
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
    this.basicMaterial = null;
    this.basicPending = null;
    this.basicVisibility = 0;
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
    this.opaqueBatch = new PlaneBatch('vents', scene, this.helpersService, this.sceneRegistry);
    this.transparentBatch = new PlaneBatch(
      'ventsTransparent', scene, this.helpersService, this.sceneRegistry);
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

  /** Apply the clipping planes to the jetfan planes. */
  public clip(): void {
    [this.material, this.materialTransparent].forEach((material: BABYLON.ShaderMaterial) => {
      if (!material) { return; }
      material.setFloat('clipX', this.clipX);
      material.setFloat('clipY', this.clipY);
      material.setFloat('clipZ', this.clipZ);
    });
  }

  /** Clear the derived vents. */
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
      grouped.get(key).push({ uuid: vent.uuid, xb: vent.xb, color: color });
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
      const group = this.groupFor(key, planes[0].color);
      group.batch.setPlanes(planes);
    });

    this.applyBasicEdges();

    await this.ensureBasicMaterial();
  }

  /** The batch drawing a colour, built the first time that colour appears. */
  private groupFor(key: string, color: readonly number[]): BasicVentGroup {
    const existing = this.basicGroups.get(key);
    if (existing) { return existing; }

    const group: BasicVentGroup = {
      batch: new PlaneBatch(
        `basicVents_${this.basicGroups.size}`, this.babylonService.scene,
        this.helpersService, this.sceneRegistry),
      edgeColor: new BABYLON.Color4(color[0], color[1], color[2], 1)
    };
    if (this.basicMaterial) { group.batch.mesh.material = this.basicMaterial; }
    this.basicGroups.set(key, group);
    return group;
  }

  /**
   * Build the material every colour group shares, once for the scene.
   *
   * &VENTs borrow the fire shader - it clips in metres and carries the
   * `transparent` uniform the visibility toggle turns.
   */
  private ensureBasicMaterial(): Promise<void> {
    if (this.basicPending) { return this.basicPending; }

    this.basicPending = tryCreateShaderMaterial(this.babylonService, {
      name: 'basicVentShader', shader: 'fire', needAlphaBlending: true
    }, 'VentService').then((material: BABYLON.ShaderMaterial) => {
      if (!material) { return; }
      if (!this.babylonService.scene) { material.dispose(); return; }

      this.basicMaterial = material;
      material.backFaceCulling = false;
      material.zOffset = -0.015;
      this.pushBasicClipToMaterials();
      this.applyBasicFill();

      this.basicGroups.forEach(group => { group.batch.mesh.material = material; });
    });

    return this.basicPending;
  }

  /**
   * Toggle basic vent visibility (3 states):
   * 0 → edges only
   * 1 → edges + semi-transparent fill
   * 2 → hidden
   */
  public toogleBasicVisibility(): void {
    if (this.basicGroups.size === 0) { return; }

    this.basicVisibility = this.basicVisibility === 0 ? 1 : this.basicVisibility === 1 ? 2 : 0;
    this.applyBasicFill();
    this.applyBasicEdges();
  }

  /** Push the current state's fill onto the shared material, if it has arrived. */
  private applyBasicFill(): void {
    if (!this.basicMaterial) { return; }
    this.basicMaterial.setFloat(
      'transparent', this.basicVisibility === 1 ? BASIC_FILL_ALPHA : 0.0);
  }

  /** Outline every vent in its own colour, except in the state that hides them. */
  private applyBasicEdges(): void {
    const width = this.basicVisibility === 2 ? 0 : this.sceneBounds.outlineWidth;
    this.basicGroups.forEach(group => {
      group.batch.mesh.enableEdgesRendering();
      group.batch.mesh.edgesWidth = width;
      group.batch.mesh.edgesColor = group.edgeColor;
    });
  }

  /**
   * Move a clipping plane for the &VENTs
   * @param value the plane's coordinate, in FDS metres
   * @param direction x, y, z
   */
  public clipBasic(value: number, direction: SceneAxis): void {
    if (direction == 'x') { this.basicClipX = value; }
    else if (direction == 'y') { this.basicClipY = value; }
    else { this.basicClipZ = value; }

    this.pushBasicClipToMaterials();
  }

  /**
   * Push the planes onto the material, if it exists. The slider is live before
   * anything is drawn; ensureBasicMaterial() reads them back when it builds it.
   */
  private pushBasicClipToMaterials(): void {
    if (!this.basicMaterial) { return; }
    this.basicMaterial.setFloat('clipX', this.basicClipX);
    this.basicMaterial.setFloat('clipY', this.basicClipY);
    this.basicMaterial.setFloat('clipZ', this.basicClipZ);
  }

  /** Clear basic vents */
  public clearBasic(): void {
    this.basicVents = [];
    this.basicGroups.forEach(group => group.batch.dispose());
    this.basicGroups.clear();
  }
}
