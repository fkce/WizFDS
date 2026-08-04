import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';

import { BabylonService, tryCreateShaderMaterial } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { DerivedVent, VentService } from '../vent/vent.service';
import { SceneJetfan, SceneJetfanDirection, SceneXb } from '../scene-input';
import { jetfanDrawnBox } from './jetfan-box';
import { SceneAxis, SceneBoundsService } from '../../scene-bounds/scene-bounds.service';
import { PooledBox } from '../box-instance-pool';
import { BoxPoolPair } from '../box-pool-pair';
import { SOLID_EDGE_COLOR } from '../../../consts/drawing';

/**
 * A jetfan as the app gave it, paired with everything the library worked out
 * about drawing it - including the two planes it blows between, which are
 * drawings rather than elements of the scenario.
 */
interface PlacedJetfan {
  readonly jetfan: SceneJetfan,
  /** The box it is actually drawn as - see jetfanDrawnBox(). */
  readonly xb: SceneXb,
  /** The colour as a flat rgba array, ready for the vertex buffer. */
  readonly color: number[],
  readonly ventInXb: SceneXb,
  readonly ventOutXb: SceneXb
}

/** The inlet plane is blue, the outlet red. Both are the library's own choice. */
const VENT_IN_COLOR: number[] = [0.0, 0.0, 1.0, 0.8];
const VENT_OUT_COLOR: number[] = [1.0, 0.0, 0.0, 0.8];

/**
 * The flow arrow, in metres.
 *
 * Physical sizes rather than fractions of the model: a jetfan is a piece of
 * equipment of a known size, and its arrow reads as part of it. They used to be
 * divided by the normalisation factor to reach the same result the long way
 * round.
 */
const ARROW_LENGTH = 0.4;
const ARROW_RADIUS = 0.05;
/** How far outside the outlet plane the arrow stands. */
const ARROW_OFFSET = 0.2;

@Injectable({
  providedIn: 'root'
})
export class JetfanService implements SceneScoped {

  // Babylon.js objects
  public jetfans: readonly SceneJetfan[] = [];
  public material: BABYLON.ShaderMaterial;
  public materialTransparent: BABYLON.ShaderMaterial;

  /**
   * A jetfan body is a box, so the bodies are drawn as thin instances of one -
   * the same representation, and the same pair of pools, as the obsts
   * (ADR-0006).
   */
  private pool: BoxPoolPair;

  /** In flight while the shader sources are being fetched. */
  private materialsPending: Promise<void> | null = null;

  // Flow arrows
  public arrowMeshes: BABYLON.Mesh[] = [];
  public arrowMaterial: BABYLON.ShaderMaterial;

  /** Where the three clipping planes stand, in FDS metres. */
  public clipX: number;
  public clipY: number;
  public clipZ: number;

  /** Whether jetfan outlines are drawn. Meshes come and go; this does not. */
  private edgesOn = true;

  /** Whether outlines are on, for whoever draws the switch that turns them off. */
  public get outlined(): boolean { return this.edgesOn; }

  /** Where each jetfan of the last render went. Built here, never written back. */
  private placed: PlacedJetfan[] = [];

  constructor(
    private babylonService: BabylonService,
    private helpersService: HelpersService,
    private ventService: VentService,
    private sceneBounds: SceneBoundsService,
    private sceneRegistry: SceneRegistryService,
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
    this.resetClipping();
  }

  /**
   * Pull the clipping planes back to showing the whole model - the planes are
   * coordinates, so they mean nothing once the model changes. See
   * SmokeviewApiService.render().
   */
  public resetClipping(): void {
    this.clipX = this.sceneBounds.openClipAt('x');
    this.clipY = this.sceneBounds.openClipAt('y');
    this.clipZ = this.sceneBounds.openClipAt('z');
    this.pushClipToMaterials();
  }

  /** The base box the fully opaque jetfan bodies are drawn from. */
  public get mesh(): BABYLON.Mesh | undefined {
    return this.pool ? this.pool.opaque.mesh : undefined;
  }

  /** The base box the translucent jetfan bodies are drawn from. */
  public get meshTransparent(): BABYLON.Mesh | undefined {
    return this.pool ? this.pool.transparent.mesh : undefined;
  }

  /** Release everything tied to the scene that has just been disposed. */
  public resetSceneState(): void {
    this.pool = null;
    this.material = null;
    this.materialTransparent = null;
    this.materialsPending = null;
    this.arrowMeshes.length = 0;
    this.arrowMaterial = null;
    this.placed.length = 0;
  }

  /**
   * Work out how each jetfan is drawn, and with it the two planes it blows
   * between. The boxes are FDS metres, which is what the scene is in (ADR-0002).
   */
  private placeJetfans(): PlacedJetfan[] {
    return (this.jetfans || []).map((jetfan: SceneJetfan) => {
      const xb = jetfanDrawnBox(jetfan);
      const faces = this.ventFaces(xb, jetfan.direction);
      return {
        jetfan: jetfan,
        xb: xb,
        color: this.helpersService.toRgba(jetfan.color),
        ventInXb: faces.in,
        ventOutXb: faces.out
      };
    });
  }

  /**
   * The two faces of a jetfan's box that air goes in at and comes out of.
   *
   * Both are degenerate boxes - one pair of coordinates collapsed onto the other -
   * which is exactly what HelpersService.generateVentGeometry() draws as a plane.
   */
  private ventFaces(xb: SceneXb, direction: SceneJetfanDirection): { in: SceneXb, out: SceneXb } {
    switch (direction) {
      case '+x':
        return { in: { ...xb, x2: xb.x1 }, out: { ...xb, x1: xb.x2 } };
      case '-x':
        return { in: { ...xb, x1: xb.x2 }, out: { ...xb, x2: xb.x1 } };
      case '+y':
        return { in: { ...xb, y2: xb.y1 }, out: { ...xb, y1: xb.y2 } };
      case '-y':
        return { in: { ...xb, y1: xb.y2 }, out: { ...xb, y2: xb.y1 } };
      case '+z':
        return { in: { ...xb, z2: xb.z1 }, out: { ...xb, z1: xb.z2 } };
      case '-z':
        return { in: { ...xb, z1: xb.z2 }, out: { ...xb, z2: xb.z1 } };
      default:
        // The contract narrows direction to the six above; a scenario carrying
        // anything else is normalised on the way in - see the app's mapper.
        return { in: { ...xb, x2: xb.x1 }, out: { ...xb, x1: xb.x2 } };
    }
  }

  /**
   * Create flow arrow for the outlet plane
   */
  private createFlowArrow(placed: PlacedJetfan): BABYLON.Mesh {
    // Calculate arrow position at the center of the outlet plane
    const xb = placed.ventOutXb;
    const centerX = (xb.x1 + xb.x2) / 2;
    const centerY = (xb.y1 + xb.y2) / 2;
    const centerZ = (xb.z1 + xb.z2) / 2;

    const id = placed.jetfan.id;
    const direction = placed.jetfan.direction;

    // Metres, straight into the scene - it is drawn 1:1 (ADR-0002)
    const arrowLength = ARROW_LENGTH;
    const arrowRadius = ARROW_RADIUS;
    const offset = ARROW_OFFSET;

    // Create arrow shaft (cylinder)
    const shaft = BABYLON.MeshBuilder.CreateCylinder(
      `arrow_shaft_${id}`,
      { height: arrowLength * 0.7, diameter: arrowRadius },
      this.babylonService.scene
    );

    // Create arrow head (cone)
    const head = BABYLON.MeshBuilder.CreateCylinder(
      `arrow_head_${id}`,
      { height: arrowLength * 0.3, diameterTop: 0, diameterBottom: arrowRadius * 2 },
      this.babylonService.scene
    );

    // Position arrow head at the tip
    switch (direction) {
      case '+x':
        shaft.rotation.z = -Math.PI / 2;
        head.rotation.z = -Math.PI / 2;
        head.position.x = arrowLength * 0.35;
        break;
      case '-x':
        shaft.rotation.z = Math.PI / 2;
        head.rotation.z = Math.PI / 2;
        head.position.x = -arrowLength * 0.35;
        break;
      case '+y':
        // Default orientation - no rotation needed (cylinder is already along Y axis)
        head.position.y = arrowLength * 0.35;
        break;
      case '-y':
        shaft.rotation.z = Math.PI;
        head.rotation.z = Math.PI;
        head.position.y = -arrowLength * 0.35;
        break;
      case '+z':
        shaft.rotation.x = -Math.PI / 2;
        head.rotation.x = Math.PI / 2;
        head.position.z = arrowLength * 0.35;
        break;
      case '-z':
        shaft.rotation.x = Math.PI / 2;
        head.rotation.x = -Math.PI / 2;
        head.position.z = -arrowLength * 0.35;
        break;
    }

    // Merge shaft and head into single mesh
    const arrow = BABYLON.Mesh.MergeMeshes([shaft, head], true, true, undefined, false, true);
    arrow.name = `flow_arrow_${id}`;

    // Position arrow at the outlet centre with offset
    arrow.position.set(centerX, centerY, centerZ);

    // Offset arrow outside the vent using normalized offset
    switch (direction) {
      case '+x':
        arrow.position.x += offset;
        break;
      case '-x':
        arrow.position.x -= offset;
        break;
      case '+y':
        arrow.position.y += offset;
        break;
      case '-y':
        arrow.position.y -= offset;
        break;
      case '+z':
        arrow.position.z += offset;
        break;
      case '-z':
        arrow.position.z -= offset;
        break;
    }

    return arrow;
  }

  /**
   * Render jetfans with their vents and flow arrows
   */
  public async render() {
    // Place the boxes and derive the planes air moves between
    this.placed = this.placeJetfans();

    // Hand the derived planes to the vent service. They carry no identity - the
    // jetfan body is what a pick resolves to.
    const derivedVents: DerivedVent[] = [];
    this.placed.forEach((placed: PlacedJetfan) => {
      derivedVents.push({ xb: placed.ventInXb, color: VENT_IN_COLOR });
      derivedVents.push({ xb: placed.ventOutXb, color: VENT_OUT_COLOR });
    });
    this.ventService.vents = derivedVents;
    await this.ventService.render();

    this.ensurePools();

    // A jetfan is drawn as a box; its transparency is the alpha the app put in
    // the colour, and the pair is what turns that into a choice of pool.
    const boxes: PooledBox[] = this.placed.map((placed: PlacedJetfan) => ({
      uuid: placed.jetfan.uuid, id: placed.jetfan.id, xb: placed.xb, color: placed.color
    }));

    this.pool.setBoxes(boxes);

    // Dispose existing arrows
    this.arrowMeshes.forEach(arrow => arrow.dispose());
    this.arrowMeshes = [];

    await this.ensureMaterials();
    this.applyEdges();

    this.placed.forEach((placed: PlacedJetfan) => {
      const arrow = this.createFlowArrow(placed);
      if (this.arrowMaterial) { arrow.material = this.arrowMaterial; }
      this.arrowMeshes.push(arrow);
    });
  }

  /** Build the two pools, once per scene. */
  private ensurePools(): void {
    if (this.pool) { return; }

    this.pool = new BoxPoolPair(
      'jetfans', 'jetfansTransparent', 'jetfan',
      this.babylonService.scene, this.helpersService, this.sceneRegistry);
  }

  /**
   * Build the shader materials, once for the scene rather than once per render.
   *
   * The jetfan bodies borrow the obst shaders - a box lit and clipped the same
   * way - but with clipping planes of their own, so they need materials of their
   * own rather than the obst service's.
   */
  private ensureMaterials(): Promise<void> {
    if (this.materialsPending) { return this.materialsPending; }

    const build = (name: string, shader: string, fragmentShader: string, alpha = false) =>
      tryCreateShaderMaterial(this.babylonService, {
        name: name, shader: shader, fragmentShader: fragmentShader, needAlphaBlending: alpha
      }, 'JetfanService');

    this.materialsPending = Promise.all([
      build('jetfanShader', 'obstInstanced', 'obst'),
      build('jetfanTransparentShader', 'obstInstanced', 'obst', true),
      build('arrowShader', 'arrow', 'arrow')
    ]).then(([material, materialTransparent, arrowMaterial]) => {
      if (!this.babylonService.scene) {
        [material, materialTransparent, arrowMaterial]
          .forEach(m => { if (m) { m.dispose(); } });
        return;
      }

      this.material = material;
      this.materialTransparent = materialTransparent;
      this.arrowMaterial = arrowMaterial;

      [material, materialTransparent].forEach(m => {
        if (!m) { return; }
        m.backFaceCulling = false;
        // The obst fragment multiplies by fillAlpha for the region layers'
        // edges state; unwritten it reads as zero and would draw no jetfan
        m.setFloat('fillAlpha', 1.0);
        m.freeze();
      });
      this.pushClipToMaterials();

      if (this.pool && material) { this.pool.opaque.mesh.material = material; }
      if (this.pool && materialTransparent) {
        this.pool.transparent.mesh.material = materialTransparent;
      }
      if (arrowMaterial) {
        this.arrowMeshes.forEach(arrow => { arrow.material = arrowMaterial; });
      }
    });

    return this.materialsPending;
  }

  /**
   * Set edges rendering for jetfans (consistent with obst service).
   *
   * Babylon's edges renderer binds world0..world3 off the base mesh and draws
   * one outline per thin instance, so one call covers the whole pool.
   */
  public setEdgesRendering(enabled: boolean) {
    this.edgesOn = enabled;
    this.applyEdges();

    // Note: Vents (vent_in and vent_out) are handled separately by VentService
    // and should render unchanged as requested
  }

  private applyEdges(): void {
    (this.pool ? this.pool.meshes : []).forEach((mesh: BABYLON.Mesh) => {
      if (this.edgesOn) {
        mesh.enableEdgesRendering();
        mesh.edgesWidth = this.sceneBounds.edgeWidth;
        mesh.edgesColor = SOLID_EDGE_COLOR;
      } else {
        mesh.disableEdgesRendering();
        mesh.edgesWidth = 0; // Set to 0 for button logic consistency
      }
    });

  }

  /**
   * Move a clipping plane
   * @param value the plane's coordinate, in FDS metres
   * @param direction x, y, z
   */
  public clip(value: number, direction: SceneAxis): void {
    if (direction == 'x') { this.clipX = value; }
    else if (direction == 'y') { this.clipY = value; }
    else { this.clipZ = value; }

    this.pushClipToMaterials();
  }

  /**
   * Push the planes onto the jetfan materials, and onto the planes drawn for
   * them: a jetfan and the two planes it blows between are one thing on screen,
   * so a slider dragged past the body has to take them with it.
   */
  private pushClipToMaterials(): void {
    this.applyClipTo(this.material);
    this.applyClipTo(this.materialTransparent);

    this.ventService.clipX = this.clipX;
    this.ventService.clipY = this.clipY;
    this.ventService.clipZ = this.clipZ;
    this.ventService.clip();
  }

  /**
   * Push the clipping planes onto a material.
   *
   * A material built while the planes sat where they are has to start out
   * agreeing with them, which is why this runs on creation too - otherwise it
   * would start from the shader's own defaults and clip half the model away.
   */
  private applyClipTo(material: BABYLON.ShaderMaterial): void {
    if (!material) { return; }
    material.setFloat('clipX', this.clipX);
    material.setFloat('clipY', this.clipY);
    material.setFloat('clipZ', this.clipZ);
  }

  /**
   * Clear jetfans
   */
  public clear() {
    this.jetfans = [];
    this.placed.length = 0;
    // Emptying the pools takes their registry entries with them
    if (this.pool) { this.pool.setBoxes([]); }

    // Clear arrows
    this.arrowMeshes.forEach(arrow => arrow.dispose());
    this.arrowMeshes = [];

    // Clear vents
    this.ventService.clear();
  }

}
