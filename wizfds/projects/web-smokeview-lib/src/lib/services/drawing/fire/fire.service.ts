import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';

import { BabylonService } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { SceneFire } from '../scene-input';
import { SceneAxis, SceneBoundsService } from '../../scene-bounds/scene-bounds.service';

/** A fire as the app gave it, paired with the colour it is drawn in. */
interface PlacedFire {
  readonly fire: SceneFire,
  /** The colour as a flat rgba array, ready for the vertex buffer. */
  readonly color: number[]
}

@Injectable({
  providedIn: 'root'
})
export class FireService implements SceneScoped {

  public fires: readonly SceneFire[] = [];
  public mesh: BABYLON.Mesh;
  public material: BABYLON.ShaderMaterial;

  /** Where the three clipping planes stand, in FDS metres. */
  public clipX: number;
  public clipY: number;
  public clipZ: number;

  // 3-state visibility toggle: 0=edges only, 1=edges+semi-transparent, 2=hidden
  public visibility: number = 0;

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

  /**
   * Pull the clipping planes back to showing the whole model - the planes are
   * coordinates, so they mean nothing once the model changes. See
   * SmokeviewApiService.render().
   */
  public resetClipping(): void {
    this.clipX = this.sceneBounds.openClipAt('x');
    this.clipY = this.sceneBounds.openClipAt('y');
    this.clipZ = this.sceneBounds.openClipAt('z');
    this.applyClipTo(this.material);
  }

  /**
   * Push the planes onto a material. The sliders are live from the first frame,
   * while the material is still being fetched, so a material built afterwards
   * reads them back rather than starting from the shader's defaults.
   */
  private applyClipTo(material: BABYLON.ShaderMaterial): void {
    if (!material) { return; }
    material.setFloat("clipX", this.clipX);
    material.setFloat("clipY", this.clipY);
    material.setFloat("clipZ", this.clipZ);
  }

  /** Face ranges collected while building the buffer, registered in renderFires(). */
  private readonly pendingRegistrations: { uuid: string, first: number, count: number }[] = [];

  /** What this service put in the registry, so a re-render can take it out. */
  private registeredUuids: string[] = [];

  /** Release everything tied to the scene that has just been disposed. */
  public resetSceneState(): void {
    this.mesh = null;
    this.material = null;
    this.visibility = 0;
  }

  /**
   * Work out how each fire is drawn.
   *
   * A fire is drawn as the plane of its &VENT in the colour of its &SURF; both
   * arrive resolved, so there is nothing to look up here, and the plane stands
   * exactly where the scenario puts it (ADR-0002).
   */
  private placeFires(): PlacedFire[] {
    return (this.fires || []).map((fire: SceneFire) => ({
      fire: fire,
      color: this.helpersService.toRgba(fire.color)
    }));
  }

  /**
   * Build batched vertex data for all fires using vent geometry (planes)
   */
  private updateFiresVertexData(placed: readonly PlacedFire[]) {
    let vertices: number[] = [];
    let indices: number[] = [];
    let colors: number[] = [];
    let normals: number[] = [];
    let indexCount = 0;

    this.pendingRegistrations.length = 0;

    placed.forEach((placedFire: PlacedFire) => {
      const facesBefore = indices.length / 3;
      const geom = this.helpersService.generateVentGeometry(placedFire.fire.xb);

      vertices.push(...geom.vertices);
      normals.push(...geom.normals);

      // Fires are always drawn opaque, whatever the &SURF says
      const fireColor = [placedFire.color[0], placedFire.color[1], placedFire.color[2], 1.0];
      for (let i = 0; i < geom.vertices.length / 3; i++) {
        colors.push(...fireColor);
      }

      for (let i = 0; i < geom.indices.length; i++) {
        indices.push(geom.indices[i] + indexCount);
      }
      indexCount += geom.vertices.length / 3;

      this.pendingRegistrations.push({
        uuid: placedFire.fire.uuid, first: facesBefore, count: indices.length / 3 - facesBefore
      });
    });

    return { vertices, indices, colors, normals };
  }

  /**
   * Render fires
   */
  public async renderFires() {
    if (!this.fires || this.fires.length === 0) {
      return;
    }

    // Place them against the bounds the meshes established
    const placed = this.placeFires();

    // Build vertex data
    const data = this.updateFiresVertexData(placed);

    if (data.vertices.length === 0) {
      return;
    }

    // Dispose existing mesh
    if (this.mesh) {
      this.mesh.dispose();
      this.mesh = null;
    }

    this.mesh = new BABYLON.Mesh('fires', this.babylonService.scene);

    // All fires share this buffer, so identity is a face range within it
    this.registeredUuids.forEach(uuid => this.sceneRegistry.forget(uuid));
    this.registeredUuids = [];
    this.pendingRegistrations.forEach(({ uuid, first, count }) => {
      this.sceneRegistry.register(uuid, { mesh: this.mesh, faces: { first: first, count: count } });
      this.registeredUuids.push(uuid);
    });

    const vertexData = new BABYLON.VertexData();
    vertexData.positions = data.vertices;
    vertexData.indices = data.indices;
    vertexData.colors = data.colors;
    vertexData.normals = data.normals;
    vertexData.applyToMesh(this.mesh);

    this.material = await this.babylonService.createShaderMaterial({
      name: "fireShader",
      shader: "fire",
      needAlphaBlending: true
    });

    this.material.backFaceCulling = false;
    this.material.zOffset = -0.02;
    this.applyClipTo(this.material);
    // Initial state: edges only (transparent=0.0)
    this.material.setFloat("transparent", 0.0);

    this.mesh.material = this.material;

    // Red edges
    this.mesh.enableEdgesRendering();
    this.mesh.edgesWidth = this.sceneBounds.outlineWidth;
    this.mesh.edgesColor = new BABYLON.Color4(1, 0, 0, 1);

    this.mesh.freezeWorldMatrix();

    // Reset visibility state
    this.visibility = 0;
  }

  /**
   * Toggle fire visibility (3 states):
   * 0 → edges only
   * 1 → edges + semi-transparent fill
   * 2 → hidden
   */
  public toogleVisibility() {
    if (!this.mesh || !this.material) return;

    if (this.visibility == 0) {
      // Show edges + semi-transparent fill
      this.material.setFloat('transparent', 0.6);
      this.mesh.edgesWidth = this.sceneBounds.outlineWidth;
      this.visibility = 1;
    } else if (this.visibility == 1) {
      // Hide all
      this.material.setFloat('transparent', 0.0);
      this.mesh.edgesWidth = 0.0;
      this.visibility = 2;
    } else if (this.visibility == 2) {
      // Show edges only
      this.material.setFloat('transparent', 0.0);
      this.mesh.edgesWidth = this.sceneBounds.outlineWidth;
      this.visibility = 0;
    }
  }

  /**
   * Move a clipping plane
   * @param value the plane's coordinate, in FDS metres
   * @param direction x, y, z
   */
  public clip(value: number, direction: SceneAxis) {
    if (direction == 'x') { this.clipX = value; }
    else if (direction == 'y') { this.clipY = value; }
    else { this.clipZ = value; }

    this.applyClipTo(this.material);
  }

  /**
   * Clear fires
   */
  public clear() {
    this.fires = [];
    if (this.mesh) {
      this.mesh.dispose();
      this.mesh = null;
    }
  }
}
