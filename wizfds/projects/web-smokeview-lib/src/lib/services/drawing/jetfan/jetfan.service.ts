import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { FaceRange, SceneRegistryService } from '../../babylon/scene-registry.service';

import { BabylonService } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { DerivedVent, VentService } from '../vent/vent.service';
import { SceneJetfan, SceneJetfanDirection, SceneXb } from '../scene-input';
import { jetfanDrawnBox } from './jetfan-box';
import { SceneBoundsService } from '../../scene-bounds/scene-bounds.service';

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
  public mesh: BABYLON.Mesh;
  private _meshTransparent: BABYLON.Mesh;
  public material: BABYLON.ShaderMaterial;
  public materialTransparent: BABYLON.ShaderMaterial;

  // Flow arrows
  public arrowMeshes: BABYLON.Mesh[] = [];
  public arrowMaterial: BABYLON.ShaderMaterial;

  /** Where the three clipping planes stand, in FDS metres. */
  public clipX: number;
  public clipY: number;
  public clipZ: number;

  /** What this service put in the registry, so a re-render can take it out. */
  private registeredUuids: string[] = [];

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
    this.clip();
  }

  /** Release everything tied to the scene that has just been disposed. */
  public resetSceneState(): void {
    this.mesh = null;
    this._meshTransparent = null;
    this.material = null;
    this.materialTransparent = null;
    this.arrowMeshes.length = 0;
    this.arrowMaterial = null;
    this.placed.length = 0;
    // The registry empties itself with the scene - this is only about not
    // holding on to uuids that named meshes of a scene that is gone.
    this.registeredUuids.length = 0;
  }

  /**
   * Tell the registry where a batch of jetfans ended up, now that its mesh
   * exists. The bodies share one buffer, so identity is a face range within it.
   */
  private registerFaces(mesh: BABYLON.Mesh, faces: FaceRange[]): void {
    faces.forEach(({ uuid, first, count }) => {
      this.sceneRegistry.register(uuid, { mesh: mesh, faces: { first: first, count: count } });
      this.registeredUuids.push(uuid);
    });
  }

  /**
   * Drop the entries of the previous render, together with the meshes they
   * name: a jetfan taken out of the scenario would otherwise keep answering for
   * faces of a buffer it is no longer in.
   */
  private forgetRegisteredFaces(): void {
    this.registeredUuids.forEach(uuid => this.sceneRegistry.forget(uuid));
    this.registeredUuids.length = 0;
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
   * Update jetfans vertex data (similar to obsts)
   *
   * `faces` says which triangles of each buffer belong to which jetfan. Both
   * buffers batch several jetfans into one mesh, so naming the mesh alone would
   * not say which of them was hit - and the ranges are per buffer, because a
   * face index only means anything inside the one it was counted in.
   */
  private updateJetfansVertexData() {
    let jetfansFaces: FaceRange[] = [];
    let jetfansFacesTransparent: FaceRange[] = [];

    let jetfansVertices: number[] = [];
    let jetfansIndices: number[] = [];
    let jetfansColors: number[] = [];
    let jetfansNormals: number[] = [];

    let jetfansVerticesTransparent: number[] = [];
    let jetfansIndicesTransparent: number[] = [];
    let jetfansColorsTransparent: number[] = [];
    let jetfansNormalsTransparent: number[] = [];

    let indexCount = 0;
    let indexCountTransparent = 0;

    this.placed.forEach((placed: PlacedJetfan) => {
      // A jetfan is drawn as a translucent box; its transparency is the alpha the
      // app put in the colour
      const isTransparent = placed.color[3] < 1.0;

      // Choose appropriate arrays
      const vertices = isTransparent ? jetfansVerticesTransparent : jetfansVertices;
      const indices = isTransparent ? jetfansIndicesTransparent : jetfansIndices;
      const colors = isTransparent ? jetfansColorsTransparent : jetfansColors;
      const faces = isTransparent ? jetfansFacesTransparent : jetfansFaces;

      // Read afterwards rather than computed: nothing here may assume a fixed
      // triangle count per jetfan.
      const facesBefore = indices.length / 3;

      // Generate jetfan geometry (box like obst) - using exact same pattern as obst service
      vertices.push(...this.helpersService.getVerticesFromXb(placed.xb));
      colors.push(...this.helpersService.getColors(placed.color));
      indices.push(...this.helpersService.getIndices(isTransparent ? indexCountTransparent : indexCount));
      if (isTransparent) {
        indexCountTransparent++;
      } else {
        indexCount++;
      }

      faces.push({
        uuid: placed.jetfan.uuid, first: facesBefore, count: indices.length / 3 - facesBefore
      });
    });

    // Store vertex data for both opaque and transparent jetfans
    return {
      opaque: {
        vertices: jetfansVertices,
        indices: jetfansIndices,
        colors: jetfansColors,
        normals: jetfansNormals,
        faces: jetfansFaces
      },
      transparent: {
        vertices: jetfansVerticesTransparent,
        indices: jetfansIndicesTransparent,
        colors: jetfansColorsTransparent,
        normals: jetfansNormalsTransparent,
        faces: jetfansFacesTransparent
      }
    };
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

    // Get vertex data for jetfan boxes
    const jetfanData = this.updateJetfansVertexData();

    // Dispose existing meshes, and the registry entries that named them
    this.forgetRegisteredFaces();
    if (this.mesh) {
      this.mesh.dispose();
      this.mesh = null;
    }
    if (this._meshTransparent) {
      this._meshTransparent.dispose();
      this._meshTransparent = null;
    }

    // Dispose existing arrows
    this.arrowMeshes.forEach(arrow => arrow.dispose());
    this.arrowMeshes = [];

    // Create opaque jetfans mesh
    if (jetfanData.opaque.vertices.length > 0) {
      this.mesh = new BABYLON.Mesh('jetfans', this.babylonService.scene);

      // Compute normals for opaque mesh (same as obst service)
      const computedNormals: number[] = [];
      BABYLON.VertexData.ComputeNormals(jetfanData.opaque.vertices, jetfanData.opaque.indices, computedNormals);

      const vertexData = new BABYLON.VertexData();
      vertexData.positions = jetfanData.opaque.vertices;
      vertexData.indices = jetfanData.opaque.indices;
      vertexData.colors = jetfanData.opaque.colors;
      vertexData.normals = computedNormals; // Use computed normals

      vertexData.applyToMesh(this.mesh);

      // Before the material, not after: which jetfan a face belongs to is
      // settled by the buffer, and stays true even if the shader never arrives.
      this.registerFaces(this.mesh, jetfanData.opaque.faces);

      // Create material for opaque jetfans (jetfan boxes reuse the obst shader)
      this.material = await this.babylonService.createShaderMaterial({
        name: "jetfanShader",
        shader: "obst"
      });
      this.applyClipTo(this.material);
      this.material.backFaceCulling = false;
      this.material.freeze(); // Freeze material for performance like obst service

      this.mesh.material = this.material;

      // Enable edges rendering by default (consistent with obst service)
      this.mesh.enableEdgesRendering();
      this.mesh.edgesWidth = this.sceneBounds.edgeWidth;
      this.mesh.edgesColor = new BABYLON.Color4(0.4, 0.4, 0.4, 1);
    }

    // Create transparent jetfans mesh
    if (jetfanData.transparent.vertices.length > 0) {
      this._meshTransparent = new BABYLON.Mesh('jetfansTransparent', this.babylonService.scene);

      // Compute normals for transparent mesh (same as obst service)
      const computedNormalsTransparent: number[] = [];
      BABYLON.VertexData.ComputeNormals(jetfanData.transparent.vertices, jetfanData.transparent.indices, computedNormalsTransparent);

      const vertexDataTransparent = new BABYLON.VertexData();
      vertexDataTransparent.positions = jetfanData.transparent.vertices;
      vertexDataTransparent.indices = jetfanData.transparent.indices;
      vertexDataTransparent.colors = jetfanData.transparent.colors;
      vertexDataTransparent.normals = computedNormalsTransparent; // Use computed normals

      vertexDataTransparent.applyToMesh(this._meshTransparent);

      this.registerFaces(this._meshTransparent, jetfanData.transparent.faces);

      // Create material for transparent jetfans
      this.materialTransparent = await this.babylonService.createShaderMaterial({
        name: "jetfanTransparentShader",
        shader: "obst",
        needAlphaBlending: true
      });
      this.applyClipTo(this.materialTransparent);
      this.materialTransparent.backFaceCulling = false;
      this.materialTransparent.freeze(); // Freeze material for performance like obst service

      this._meshTransparent.material = this.materialTransparent;

      // Enable edges rendering by default for transparent mesh too
      this._meshTransparent.enableEdgesRendering();
      this._meshTransparent.edgesWidth = this.sceneBounds.edgeWidth;
      this._meshTransparent.edgesColor = new BABYLON.Color4(0.4, 0.4, 0.4, 1);
    }

    // Create flow arrows for each jetfan
    this.arrowMaterial = await this.babylonService.createShaderMaterial({
      name: "arrowShader",
      shader: "arrow"
    });

    this.placed.forEach((placed: PlacedJetfan) => {
      const arrow = this.createFlowArrow(placed);
      arrow.material = this.arrowMaterial;
      this.arrowMeshes.push(arrow);
    });
  }

  /**
   * Set edges rendering for jetfans (consistent with obst service)
   */
  public setEdgesRendering(enabled: boolean) {
    // Control edges for opaque mesh
    if (this.mesh) {
      if (enabled) {
        this.mesh.enableEdgesRendering();
        this.mesh.edgesWidth = this.sceneBounds.edgeWidth;
        this.mesh.edgesColor = new BABYLON.Color4(0.4, 0.4, 0.4, 1);
      } else {
        this.mesh.disableEdgesRendering();
        this.mesh.edgesWidth = 0; // Set to 0 for button logic consistency
      }
    }

    // Control edges for transparent mesh
    if (this._meshTransparent) {
      if (enabled) {
        this._meshTransparent.enableEdgesRendering();
        this._meshTransparent.edgesWidth = this.sceneBounds.edgeWidth;
        this._meshTransparent.edgesColor = new BABYLON.Color4(0.4, 0.4, 0.4, 1);
      } else {
        this._meshTransparent.disableEdgesRendering();
        this._meshTransparent.edgesWidth = 0; // Set to 0 for button logic consistency
      }
    }

    // Note: Vents (vent_in and vent_out) are handled separately by VentService
    // and should render unchanged as requested
  }

  /**
   * Apply clipping to jetfans and their vents
   */
  public clip() {
    this.applyClipTo(this.material);
    this.applyClipTo(this.materialTransparent);

    // Apply clipping to vents as well
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
    this.forgetRegisteredFaces();
    if (this.mesh) {
      this.mesh.dispose();
      this.mesh = null;
    }
    if (this._meshTransparent) {
      this._meshTransparent.dispose();
      this._meshTransparent = null;
    }

    // Clear arrows
    this.arrowMeshes.forEach(arrow => arrow.dispose());
    this.arrowMeshes = [];

    // Clear vents
    this.ventService.clear();
  }

}
