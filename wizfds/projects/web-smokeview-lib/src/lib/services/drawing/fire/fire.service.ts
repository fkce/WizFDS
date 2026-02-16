import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';
import { forEach, cloneDeep, toNumber } from 'lodash';

import { BabylonService } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { IFire } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class FireService {

  public fires: IFire[] = [];
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
    private helpersService: HelpersService
  ) { }

  /**
   * Normalize fire coordinates and colors using shared mesh bounds
   */
  private normalizeFires(): void {
    let delta = this.helpersService.normDelta;
    let xMin = this.helpersService.normXMin;
    let yMin = this.helpersService.normYMin;
    let zMin = this.helpersService.normZMin;

    forEach(this.fires, (fire: IFire) => {
      // Normalize xb
      let xb = cloneDeep(fire.xb);
      forEach(xb, (o, key) => {
        xb[key] = toNumber(o);
      });

      xb.x1 += (xMin < 0) ? -xMin : xMin;
      fire.vis.xbNorm.x1 = xb.x1 / delta;
      xb.x2 += (xMin < 0) ? -xMin : xMin;
      fire.vis.xbNorm.x2 = xb.x2 / delta;

      xb.y1 += (yMin < 0) ? -yMin : yMin;
      fire.vis.xbNorm.y1 = xb.y1 / delta;
      xb.y2 += (yMin < 0) ? -yMin : yMin;
      fire.vis.xbNorm.y2 = xb.y2 / delta;

      xb.z1 += (zMin < 0) ? -zMin : zMin;
      fire.vis.xbNorm.z1 = xb.z1 / delta;
      xb.z2 += (zMin < 0) ? -zMin : zMin;
      fire.vis.xbNorm.z2 = xb.z2 / delta;

      // Normalize color (RGB 0-255 → 0-1), fallback red
      const rgb = (fire.color && fire.color.rgb && fire.color.rgb.length >= 3)
        ? fire.color.rgb
        : [255, 0, 0];
      fire.vis.colorNorm = [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, 1];
    });
  }

  /**
   * Build batched vertex data for all fires using vent geometry (planes)
   */
  private updateFiresVertexData() {
    let vertices: number[] = [];
    let indices: number[] = [];
    let colors: number[] = [];
    let normals: number[] = [];
    let indexCount = 0;

    this.fires.forEach((fire) => {
      if (fire.vis && fire.vis.xbNorm) {
        const geom = this.helpersService.generateVentGeometry(fire.vis.xbNorm);

        vertices.push(...geom.vertices);
        normals.push(...geom.normals);

        const fireColor = [
          fire.vis.colorNorm[0],
          fire.vis.colorNorm[1],
          fire.vis.colorNorm[2],
          1.0
        ];
        for (let i = 0; i < geom.vertices.length / 3; i++) {
          colors.push(...fireColor);
        }

        for (let i = 0; i < geom.indices.length; i++) {
          indices.push(geom.indices[i] + indexCount);
        }
        indexCount += geom.vertices.length / 3;
      }
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

    // Normalize coordinates using shared mesh bounds
    this.normalizeFires();

    // Build vertex data
    const data = this.updateFiresVertexData();

    if (data.vertices.length === 0) {
      return;
    }

    // Dispose existing mesh
    if (this.mesh) {
      this.mesh.dispose();
      this.mesh = null;
    }

    this.mesh = new BABYLON.Mesh('fires', this.babylonService.scene);

    const vertexData = new BABYLON.VertexData();
    vertexData.positions = data.vertices;
    vertexData.indices = data.indices;
    vertexData.colors = data.colors;
    vertexData.normals = data.normals;
    vertexData.applyToMesh(this.mesh);

    // Load fire shaders
    const sources = await this.babylonService.loadShaderSources('fire');
    const isWGSL = sources.shaderLanguage === ((BABYLON as any).ShaderLanguage?.WGSL ?? 1);
    const uniformsList = isWGSL
      ? ["clipX", "clipY", "clipZ", "transparent"]
      : ["world", "worldView", "worldViewProjection", "view", "projection", "clipX", "clipY", "clipZ", "transparent"];

    this.material = new (BABYLON as any).ShaderMaterial(
      "fireShader",
      this.babylonService.scene,
      { vertexSource: sources.vertexSource, fragmentSource: sources.fragmentSource },
      {
        needAlphaBlending: true,
        attributes: ["position", "normal", "color"],
        uniforms: uniformsList,
        uniformBuffers: isWGSL ? ["Scene", "Mesh"] : [],
        shaderLanguage: sources.shaderLanguage,
        entryPoint: { vertex: 'main', fragment: 'main' }
      }
    );

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
