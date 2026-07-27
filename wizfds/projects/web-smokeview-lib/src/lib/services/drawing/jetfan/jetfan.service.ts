import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { FaceRange, SceneRegistryService } from '../../babylon/scene-registry.service';

import { BabylonService } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { DerivedVent, VentService } from '../vent/vent.service';
import { SceneJetfan, SceneJetfanDirection, SceneXb } from '../scene-input';

/**
 * A jetfan as the app gave it, paired with everything the library worked out
 * about drawing it - including the two planes it blows between, which are
 * drawings rather than elements of the scenario.
 */
interface PlacedJetfan {
  readonly jetfan: SceneJetfan,
  readonly xbNorm: SceneXb,
  /** The colour as a flat rgba array, ready for the vertex buffer. */
  readonly color: number[],
  readonly ventInXbNorm: SceneXb,
  readonly ventOutXbNorm: SceneXb
}

/**
 * The box drawn for a jetfan whose coordinates are all zero.
 *
 * A jetfan is normally placed in CAD; until it is, the scenario holds no
 * geometry for it and there is nothing to draw. Rather than a degenerate point,
 * the preview shows a stand-in box - which is how it has always behaved.
 */
const UNPLACED_JETFAN_XB: SceneXb = { x1: 2.0, x2: 8.0, y1: 3.0, y2: 5.0, z1: 1.0, z2: 3.0 };

/** The inlet plane is blue, the outlet red. Both are the library's own choice. */
const VENT_IN_COLOR: number[] = [0.0, 0.0, 1.0, 0.8];
const VENT_OUT_COLOR: number[] = [1.0, 0.0, 0.0, 0.8];

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

  // Clipping
  public clipX: number = 0;
  public clipY: number = 0;
  public clipZ: number = 0;

  /** What this service put in the registry, so a re-render can take it out. */
  private registeredUuids: string[] = [];

  /** Where each jetfan of the last render went. Built here, never written back. */
  private placed: PlacedJetfan[] = [];

  constructor(
    private babylonService: BabylonService,
    private helpersService: HelpersService,
    private ventService: VentService,
    private sceneRegistry: SceneRegistryService,
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
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
   * Place the jetfans in the scene, and with them the two planes each one blows
   * between.
   */
  private placeJetfans(): PlacedJetfan[] {
    const boxes = (this.jetfans || []).map((jetfan: SceneJetfan) => this.boxFor(jetfan));

    // A scenario with neither &MESH nor &OBST still has to be drawn somewhere
    this.helpersService.ensureBounds(boxes);

    return (this.jetfans || []).map((jetfan: SceneJetfan, index: number) => {
      const xbNorm = this.helpersService.normalizeXb(boxes[index]);
      const faces = this.ventFaces(xbNorm, jetfan.direction);
      return {
        jetfan: jetfan,
        xbNorm: xbNorm,
        color: this.helpersService.toRgba(jetfan.color),
        ventInXbNorm: faces.in,
        ventOutXbNorm: faces.out
      };
    });
  }

  /** The box to draw a jetfan as, standing in for one that was never placed. */
  private boxFor(jetfan: SceneJetfan): SceneXb {
    const xb = jetfan.xb;
    const isUnplaced = xb.x1 === xb.x2 && xb.y1 === xb.y2 && xb.z1 === xb.z2 && xb.x1 === 0;
    return isUnplaced ? UNPLACED_JETFAN_XB : xb;
  }

  /**
   * The two faces of a jetfan's box that air goes in at and comes out of.
   *
   * Both are degenerate boxes - one pair of coordinates collapsed onto the other -
   * which is exactly what HelpersService.generateVentGeometry() draws as a plane.
   */
  private ventFaces(xbNorm: SceneXb, direction: SceneJetfanDirection): { in: SceneXb, out: SceneXb } {
    switch (direction) {
      case '+x':
        return { in: { ...xbNorm, x2: xbNorm.x1 }, out: { ...xbNorm, x1: xbNorm.x2 } };
      case '-x':
        return { in: { ...xbNorm, x1: xbNorm.x2 }, out: { ...xbNorm, x2: xbNorm.x1 } };
      case '+y':
        return { in: { ...xbNorm, y2: xbNorm.y1 }, out: { ...xbNorm, y1: xbNorm.y2 } };
      case '-y':
        return { in: { ...xbNorm, y1: xbNorm.y2 }, out: { ...xbNorm, y2: xbNorm.y1 } };
      case '+z':
        return { in: { ...xbNorm, z2: xbNorm.z1 }, out: { ...xbNorm, z1: xbNorm.z2 } };
      case '-z':
        return { in: { ...xbNorm, z1: xbNorm.z2 }, out: { ...xbNorm, z2: xbNorm.z1 } };
      default:
        // The contract narrows direction to the six above; a scenario carrying
        // anything else is normalised on the way in - see the app's mapper.
        return { in: { ...xbNorm, x2: xbNorm.x1 }, out: { ...xbNorm, x1: xbNorm.x2 } };
    }
  }

  /**
   * Create flow arrow for the outlet plane
   */
  private createFlowArrow(placed: PlacedJetfan): BABYLON.Mesh {
    // Calculate arrow position at the center of the outlet plane
    const xbNorm = placed.ventOutXbNorm;
    const centerX = (xbNorm.x1 + xbNorm.x2) / 2;
    const centerY = (xbNorm.y1 + xbNorm.y2) / 2;
    const centerZ = (xbNorm.z1 + xbNorm.z2) / 2;

    const id = placed.jetfan.id;
    const direction = placed.jetfan.direction;

    // Define arrow dimensions in real units (meters)
    const realArrowLength = 0.4; // 1 meter arrow length
    const realArrowRadius = 0.05;  // 0.1 meter arrow radius
    const realOffset = 0.2;       // 2 meter offset from vent

    // Convert to normalized scale using normDelta
    const arrowLength = realArrowLength / this.helpersService.normDelta;
    const arrowRadius = realArrowRadius / this.helpersService.normDelta;
    const offset = realOffset / this.helpersService.normDelta;

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
      vertices.push(...this.helpersService.getVerticesFromXb(placed.xbNorm));
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
      derivedVents.push({ xbNorm: placed.ventInXbNorm, color: VENT_IN_COLOR });
      derivedVents.push({ xbNorm: placed.ventOutXbNorm, color: VENT_OUT_COLOR });
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
      this.material.setFloat("clipX", -1.1);  // Default clipping values like obst service
      this.material.setFloat("clipY", -1.1);
      this.material.setFloat("clipZ", 1.1);
      this.material.backFaceCulling = false;
      this.material.freeze(); // Freeze material for performance like obst service

      this.mesh.material = this.material;

      // Enable edges rendering by default (consistent with obst service)
      this.mesh.enableEdgesRendering();
      this.mesh.edgesWidth = 0.05;
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
      this.materialTransparent.setFloat("clipX", -1.1);  // Default clipping values like obst service
      this.materialTransparent.setFloat("clipY", -1.1);
      this.materialTransparent.setFloat("clipZ", 1.1);
      this.materialTransparent.backFaceCulling = false;
      this.materialTransparent.freeze(); // Freeze material for performance like obst service

      this._meshTransparent.material = this.materialTransparent;

      // Enable edges rendering by default for transparent mesh too
      this._meshTransparent.enableEdgesRendering();
      this._meshTransparent.edgesWidth = 0.05;
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
        this.mesh.edgesWidth = 0.05;
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
        this._meshTransparent.edgesWidth = 0.05;
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
    if (this.material) {
      this.material.setFloat('clipX', this.clipX);
      this.material.setFloat('clipY', this.clipY);
      this.material.setFloat('clipZ', this.clipZ);
    }

    if (this.materialTransparent) {
      this.materialTransparent.setFloat('clipX', this.clipX);
      this.materialTransparent.setFloat('clipY', this.clipY);
      this.materialTransparent.setFloat('clipZ', this.clipZ);
    }

    // Apply clipping to vents as well
    this.ventService.clipX = this.clipX;
    this.ventService.clipY = this.clipY;
    this.ventService.clipZ = this.clipZ;
    this.ventService.clip();
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
