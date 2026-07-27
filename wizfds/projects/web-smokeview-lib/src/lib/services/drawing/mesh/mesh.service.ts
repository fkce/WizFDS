import { Injectable } from '@angular/core';
import { BabylonService } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { forEach } from 'lodash';
import { SceneMesh, SceneXb } from '../scene-input';
import * as BABYLON from 'babylonjs';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';

/** A mesh as the app gave it, paired with where the library puts it. */
interface PlacedMesh {
  readonly mesh: SceneMesh,
  readonly xbNorm: SceneXb
}

/**
 * Meshes are drawn as yellow outlines. The colour is the library's own choice -
 * a &MESH has none in the FDS model - so it never crosses the boundary.
 */
const MESH_COLOR: number[] = [1, 0.815, 0, 0];

@Injectable({
  providedIn: 'root'
})
export class MeshService implements SceneScoped {

  meshes: readonly SceneMesh[] = [];

  vertices: number[] = [];
  normals: number[] = [];
  colors: number[] = [];
  indices: number[] = [];

  mesh;
  vertexData: BABYLON.VertexData;
  material: BABYLON.ShaderMaterial;

  visibility: number = 1;

  constructor(
    private babylonService: BabylonService,
    private helperService: HelpersService,
    private sceneRegistry: SceneRegistryService,
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
  }

  /** Where each mesh of the last render went. Built here, never written back. */
  private placed: PlacedMesh[] = [];

  /** Face ranges collected while building the buffer, registered in render(). */
  private readonly pendingRegistrations: { uuid: string, first: number, count: number }[] = [];

  /** What this service put in the registry, so a re-render can take it out. */
  private registeredUuids: string[] = [];

  /** Release everything tied to the scene that has just been disposed. */
  public resetSceneState(): void {
    this.mesh = null;
    this.material = null;
    this.vertexData = null;
    // renderMeshes() does not restore this, so a stale value would leave the
    // toggle one step out of phase with what is actually drawn
    this.visibility = 1;
    this.vertices.length = 0;
    this.normals.length = 0;
    this.colors.length = 0;
    this.indices.length = 0;
    this.placed.length = 0;
  }

  /**
   * Reder meshes
   */
  public renderMeshes() {
    // Work out where every mesh goes
    this.placed = this.placeMeshes();

    // If nothing valid to render, exit early
    if (this.placed.length === 0) {
      return;
    }

    // Update obsts vertex data
    this.updateMeshesVertexData();

    // If no geometry, skip render
    if (!this.vertices.length || !this.indices.length) {
      return;
    }

    // Render data
    this.render();
  }

  /**
   * Place the meshes in the scene.
   *
   * The meshes span the whole model, so they are what the scene bounds are taken
   * from - which is why this has to run before any other element type is placed.
   */
  private placeMeshes(): PlacedMesh[] {
    if (!this.meshes || this.meshes.length === 0) {
      return [];
    }

    this.helperService.setBoundsFrom(this.meshes.map((mesh: SceneMesh) => mesh.xb));

    return this.meshes.map((mesh: SceneMesh) => ({
      mesh: mesh,
      xbNorm: this.helperService.normalizeXb(mesh.xb)
    }));
  }

  /**
   * Update meshes vertex data
   */
  private updateMeshesVertexData(): void {

    // Clear arrays
    this.vertices.length = 0;
    this.normals.length = 0;
    this.colors.length = 0;
    this.indices.length = 0;

    this.pendingRegistrations.length = 0;

    forEach(this.placed, (placed: PlacedMesh, index: number) => {
      const facesBefore = this.indices.length / 3;
      this.vertices.push(...this.helperService.getVerticesFromXb(placed.xbNorm));
      this.colors.push(...this.helperService.getColors(MESH_COLOR));
      this.indices.push(...this.helperService.getIndices(index));
      this.pendingRegistrations.push({
        uuid: placed.mesh.uuid, first: facesBefore, count: this.indices.length / 3 - facesBefore
      });
    });
  }

  /**
   * Render current mesh geometry
   */
  private render() {

    // Dispose existing mesh and material
    if (this.mesh) { this.mesh.dispose(); }
    if (this.material) { this.material.dispose(); }

    // Create new custom mesh and vertex data
    this.mesh = new BABYLON.Mesh("custom", this.babylonService.scene);

    // All meshes share this one buffer, so identity is a face range within it
    this.registeredUuids.forEach(uuid => this.sceneRegistry.forget(uuid));
    this.registeredUuids = [];
    this.pendingRegistrations.forEach(({ uuid, first, count }) => {
      this.sceneRegistry.register(uuid, { mesh: this.mesh, faces: { first: first, count: count } });
      this.registeredUuids.push(uuid);
    });

    // Compute normals
    BABYLON.VertexData.ComputeNormals(this.vertices, this.indices, this.normals);
    // Assign data
    this.vertexData = new BABYLON.VertexData();
    this.vertexData.positions = this.vertices;
    this.vertexData.indices = this.indices;
    this.vertexData.colors = this.colors;
    this.vertexData.normals = this.normals;
    this.vertexData.applyToMesh(this.mesh);

    this.babylonService.createShaderMaterial({ name: "shader", shader: "mesh", needAlphaBlending: true })
      .then((material) => {
        this.material = material;
        this.material.setFloat("transparent", 0.0);
        this.material.zOffset = 0.04;
        this.material.freeze();
        this.mesh.material = this.material;
      })
      .catch((e) => {
        console.error('[MeshService] Failed to create the mesh shader material', e);
      });
  this.mesh.enableEdgesRendering();
    this.mesh.edgesWidth = 0.1;
    this.mesh.edgesColor = new BABYLON.Color4(1, 0.815, 0, 1);

    // Preformance optimization
    this.mesh.convertToUnIndexedMesh();
    this.mesh.freezeWorldMatrix();
  }

  /**
   * Toggle mesh visibility
   */
  public toogleVisibility() {
    // The button is live from the first frame, while the material is still
    // being fetched - same guard FireService carries.
    if (!this.mesh || !this.material) return;

    // Show only edges;
    if (this.visibility == 0) {
      this.material.setFloat('transparent', 0.0);
      this.mesh.edgesWidth = 0.1;
      this.visibility = 1;
    }
    // Show edges and backface
    else if (this.visibility == 1) {
      this.material.setFloat('transparent', 1.0);
      this.mesh.edgesWidth = 0.1;
      this.visibility = 2;
    }
    // Hide all
    else if (this.visibility == 2) {
      this.material.setFloat('transparent', 0.0);
      this.mesh.edgesWidth = 0.0;
      this.visibility = 0;
    }
  }
}
