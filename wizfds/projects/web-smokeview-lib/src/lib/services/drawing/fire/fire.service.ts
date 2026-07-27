import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';

import { BabylonService } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { SceneFire, SceneXb } from '../scene-input';

/** A fire as the app gave it, paired with where the library puts it. */
interface PlacedFire {
  readonly fire: SceneFire,
  readonly xbNorm: SceneXb,
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

  // Clipping
  public clipX: number = 0;
  public clipY: number = 0;
  public clipZ: number = 100;
  private clipXNorm: number = -1.1;
  private clipYNorm: number = -1.1;
  private clipZNorm: number = 1.1;

  // 3-state visibility toggle: 0=edges only, 1=edges+semi-transparent, 2=hidden
  public visibility: number = 0;

  constructor(
    private babylonService: BabylonService,
    private helpersService: HelpersService,
    private sceneRegistry: SceneRegistryService,
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
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
   * Place the fires in the scene, against the bounds the meshes established.
   *
   * A fire is drawn as the plane of its &VENT in the colour of its &SURF; both
   * arrive resolved, so there is nothing to look up here.
   */
  private placeFires(): PlacedFire[] {
    return (this.fires || []).map((fire: SceneFire) => ({
      fire: fire,
      xbNorm: this.helpersService.normalizeXb(fire.xb),
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
      const geom = this.helpersService.generateVentGeometry(placedFire.xbNorm);

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
    this.material.setFloat("clipX", this.clipXNorm);
    this.material.setFloat("clipY", this.clipYNorm);
    this.material.setFloat("clipZ", this.clipZNorm);
    // Initial state: edges only (transparent=0.0)
    this.material.setFloat("transparent", 0.0);

    this.mesh.material = this.material;

    // Red edges
    this.mesh.enableEdgesRendering();
    this.mesh.edgesWidth = 0.1;
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
      this.mesh.edgesWidth = 0.1;
      this.visibility = 1;
    } else if (this.visibility == 1) {
      // Hide all
      this.material.setFloat('transparent', 0.0);
      this.mesh.edgesWidth = 0.0;
      this.visibility = 2;
    } else if (this.visibility == 2) {
      // Show edges only
      this.material.setFloat('transparent', 0.0);
      this.mesh.edgesWidth = 0.1;
      this.visibility = 0;
    }
  }

  /**
   * Clip fire mesh
   * @param value percentage 0-100
   * @param direction x, y, z
   */
  public clip(value: number, direction: string) {
    if (!this.material) return;

    const globalBounds = {
      x: this.helpersService.normXMax || 1,
      y: this.helpersService.normYMax || 1,
      z: this.helpersService.normZMax || 1
    };

    if (direction == 'x') {
      this.clipX = value;
      let clip = (value == 100) ? 1.1 : globalBounds.x * (value / 100);
      clip = (value == 0) ? -1.1 : clip;
      this.material.setFloat("clipX", clip);
      this.clipXNorm = clip;
    } else if (direction == 'y') {
      this.clipY = value;
      let clip = (value == 100) ? 1.1 : globalBounds.y * (value / 100);
      clip = (value == 0) ? -1.1 : clip;
      this.material.setFloat("clipY", clip);
      this.clipYNorm = clip;
    } else if (direction == 'z') {
      this.clipZ = value;
      let clip = (value == 100) ? 1.1 : globalBounds.z * (value / 100);
      clip = (value == 0) ? -1.1 : clip;
      this.material.setFloat("clipZ", clip);
      this.clipZNorm = clip;
    }
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
