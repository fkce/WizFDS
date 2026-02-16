import { Injectable, isDevMode } from '@angular/core';
import * as BABYLON from 'babylonjs';
import { forEach, cloneDeep, toNumber } from 'lodash';

import { BabylonService } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { IVent, IXb } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class VentService {

  // Babylon.js objects (jetfan vents)
  public vents: IVent[] = [];
  public mesh: BABYLON.Mesh;
  private _meshTransparent: BABYLON.Mesh;
  public material: BABYLON.ShaderMaterial;
  public materialTransparent: BABYLON.ShaderMaterial;

  // Clipping (jetfan vents)
  public clipX: number = 0;
  public clipY: number = 0;
  public clipZ: number = 0;

  // Basic vents (separate from jetfan vents)
  public basicVents: IVent[] = [];
  public basicMeshGroups: { mesh: BABYLON.Mesh, material: BABYLON.ShaderMaterial, edgeColor: BABYLON.Color4 }[] = [];
  public basicVisibility: number = 0; // 0=edges only, 1=edges+semi-transparent, 2=hidden
  private basicClipXNorm: number = -1.1;
  private basicClipYNorm: number = -1.1;
  private basicClipZNorm: number = 1.1;

  constructor(
    private babylonService: BabylonService,
    private helpersService: HelpersService
  ) { }

  /**
   * Update vents vertex data
   */
  public updateVentsVertexData() {
    let ventsVertices: number[] = [];
    let ventsIndices: number[] = [];
    let ventsColors: number[] = [];
    let ventsNormals: number[] = [];

    let ventsVerticesTransparent: number[] = [];
    let ventsIndicesTransparent: number[] = [];
    let ventsColorsTransparent: number[] = [];
    let ventsNormalsTransparent: number[] = [];

    let indexCount = 0;
    let indexCountTransparent = 0;

    this.vents.forEach((vent) => {
      if (vent.vis && vent.vis.colorNorm && vent.vis.xbNorm) {
        
        // Determine if vent is transparent
        const alpha = vent.color.rgb.length > 3 ? vent.color.rgb[3] : 1.0;
        const isTransparent = alpha < 1.0;
        
        // Choose appropriate arrays
        const vertices = isTransparent ? ventsVerticesTransparent : ventsVertices;
        const indices = isTransparent ? ventsIndicesTransparent : ventsIndices;
        const colors = isTransparent ? ventsColorsTransparent : ventsColors;
        const normals = isTransparent ? ventsNormalsTransparent : ventsNormals;
        const currentIndexCount = isTransparent ? indexCountTransparent : indexCount;

        // Generate vent geometry (plane)
        const ventGeometry = this.helpersService.generateVentGeometry(vent.vis.xbNorm);
        
        // Add vertices
        vertices.push(...ventGeometry.vertices);
        
        // Add normals
        normals.push(...ventGeometry.normals);
        
        // Add colors with alpha
        const ventColor = [
          vent.vis.colorNorm[0],
          vent.vis.colorNorm[1], 
          vent.vis.colorNorm[2],
          alpha
        ];
        
        for (let i = 0; i < ventGeometry.vertices.length / 3; i++) {
          colors.push(...ventColor);
        }
        
        // Add indices (offset by current vertex count)
        for (let i = 0; i < ventGeometry.indices.length; i++) {
          indices.push(ventGeometry.indices[i] + currentIndexCount);
        }
        
        // Update index counts
        if (isTransparent) {
          indexCountTransparent += ventGeometry.vertices.length / 3;
        } else {
          indexCount += ventGeometry.vertices.length / 3;
        }
      }
    });

    // Store vertex data for both opaque and transparent vents
    return {
      opaque: {
        vertices: ventsVertices,
        indices: ventsIndices,
        colors: ventsColors,
        normals: ventsNormals
      },
      transparent: {
        vertices: ventsVerticesTransparent,
        indices: ventsIndicesTransparent,
        colors: ventsColorsTransparent,
        normals: ventsNormalsTransparent
      }
    };
  }

  /**
   * Render vents
   */
  public async render() {
    if (isDevMode()) console.log('Rendering vents...', this.vents.length);

    // Get vertex data for both opaque and transparent vents
    const ventData = this.updateVentsVertexData();

    // Dispose existing meshes
    if (this.mesh) {
      this.mesh.dispose();
      this.mesh = null;
    }
    if (this._meshTransparent) {
      this._meshTransparent.dispose();
      this._meshTransparent = null;
    }

    // Load shader sources
    const sources = await this.babylonService.loadShaderSources('vent');
    const isWGSL = sources.shaderLanguage === ((BABYLON as any).ShaderLanguage?.WGSL ?? 1);
    const uniformsList = isWGSL ? ["clipX", "clipY", "clipZ"] : ["world", "worldView", "worldViewProjection", "view", "projection", "clipX", "clipY", "clipZ"];

    // Create opaque vents mesh
    if (ventData.opaque.vertices.length > 0) {
      this.mesh = new BABYLON.Mesh('vents', this.babylonService.scene);
      
      const vertexData = new BABYLON.VertexData();
      vertexData.positions = ventData.opaque.vertices;
      vertexData.indices = ventData.opaque.indices;
      vertexData.colors = ventData.opaque.colors;
      vertexData.normals = ventData.opaque.normals;
      
      vertexData.applyToMesh(this.mesh);
      
      // Create material for opaque vents
      this.material = new (BABYLON as any).ShaderMaterial(
        "ventShader",
        this.babylonService.scene,
        { vertexSource: sources.vertexSource, fragmentSource: sources.fragmentSource },
        {
          needAlphaBlending: false,
          attributes: ["position", "normal", "color"],
          uniforms: uniformsList,
          uniformBuffers: isWGSL ? ["Scene", "Mesh"] : [],
          shaderLanguage: sources.shaderLanguage,
          entryPoint: { vertex: 'main', fragment: 'main' }
        }
      );
      this.material.backFaceCulling = false;
      this.material.zOffset = -0.01; // Render vents in front of jetfan to prevent z-fighting
      
      this.mesh.material = this.material;
    }

    // Create transparent vents mesh
    if (ventData.transparent.vertices.length > 0) {
      this._meshTransparent = new BABYLON.Mesh('ventsTransparent', this.babylonService.scene);
      
      const vertexDataTransparent = new BABYLON.VertexData();
      vertexDataTransparent.positions = ventData.transparent.vertices;
      vertexDataTransparent.indices = ventData.transparent.indices;
      vertexDataTransparent.colors = ventData.transparent.colors;
      vertexDataTransparent.normals = ventData.transparent.normals;
      
      vertexDataTransparent.applyToMesh(this._meshTransparent);
      
      // Create material for transparent vents
      this.materialTransparent = new (BABYLON as any).ShaderMaterial(
        "ventTransparentShader",
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
      this.materialTransparent.backFaceCulling = false;
      this.materialTransparent.zOffset = -0.01; // Render transparent vents in front of jetfan to prevent z-fighting
      
      this._meshTransparent.material = this.materialTransparent;
    }

    if (isDevMode()) console.log('Vents rendered successfully');
  }

  /**
   * Set edges rendering for vents
   */
  public setEdgesRendering(show: boolean) {
    if (this.mesh) {
      if (show) {
        this.mesh.enableEdgesRendering();
        this.mesh.edgesWidth = 2;
        this.mesh.edgesColor = BABYLON.Color4.FromInts(0, 0, 0, 255);
      } else {
        this.mesh.disableEdgesRendering();
      }
    }
    
    if (this._meshTransparent) {
      if (show) {
        this._meshTransparent.enableEdgesRendering();
        this._meshTransparent.edgesWidth = 2;
        this._meshTransparent.edgesColor = BABYLON.Color4.FromInts(0, 0, 0, 255);
      } else {
        this._meshTransparent.disableEdgesRendering();
      }
    }
  }

  /**
   * Apply clipping to vents
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
  }

  /**
   * Clear vents
   */
  public clear() {
    this.vents = [];
    if (this.mesh) {
      this.mesh.dispose();
      this.mesh = null;
    }
    if (this._meshTransparent) {
      this._meshTransparent.dispose();
      this._meshTransparent = null;
    }
  }

  // ==========================================
  // Basic vents (ventilation vents from FDS)
  // ==========================================

  /**
   * Normalize basic vent coordinates and colors using shared mesh bounds
   */
  private normalizeBasicVents(): void {
    let delta = this.helpersService.normDelta;
    let xMin = this.helpersService.normXMin;
    let yMin = this.helpersService.normYMin;
    let zMin = this.helpersService.normZMin;

    forEach(this.basicVents, (vent: IVent) => {
      let xb = cloneDeep(vent.xb);
      forEach(xb, (o, key) => {
        xb[key] = toNumber(o);
      });

      xb.x1 += (xMin < 0) ? -xMin : xMin;
      vent.vis.xbNorm.x1 = xb.x1 / delta;
      xb.x2 += (xMin < 0) ? -xMin : xMin;
      vent.vis.xbNorm.x2 = xb.x2 / delta;

      xb.y1 += (yMin < 0) ? -yMin : yMin;
      vent.vis.xbNorm.y1 = xb.y1 / delta;
      xb.y2 += (yMin < 0) ? -yMin : yMin;
      vent.vis.xbNorm.y2 = xb.y2 / delta;

      xb.z1 += (zMin < 0) ? -zMin : zMin;
      vent.vis.xbNorm.z1 = xb.z1 / delta;
      xb.z2 += (zMin < 0) ? -zMin : zMin;
      vent.vis.xbNorm.z2 = xb.z2 / delta;

      // Normalize color (RGB 0-255 → 0-1), fallback blue
      const rgb = (vent.color && vent.color.rgb && vent.color.rgb.length >= 3)
        ? vent.color.rgb
        : [0, 0, 255];
      const alpha = (vent.color.rgb.length > 3) ? vent.color.rgb[3] : 1;
      vent.vis.colorNorm = [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, alpha];
    });
  }

  /**
   * Build batched vertex data for a group of basic vents
   */
  private buildBasicVentsVertexData(vents: IVent[]) {
    let vertices: number[] = [];
    let indices: number[] = [];
    let colors: number[] = [];
    let normals: number[] = [];
    let indexCount = 0;

    vents.forEach((vent) => {
      if (vent.vis && vent.vis.xbNorm) {
        const geom = this.helpersService.generateVentGeometry(vent.vis.xbNorm);

        vertices.push(...geom.vertices);
        normals.push(...geom.normals);

        const ventColor = [
          vent.vis.colorNorm[0],
          vent.vis.colorNorm[1],
          vent.vis.colorNorm[2],
          vent.vis.colorNorm[3] ?? 1.0
        ];
        for (let i = 0; i < geom.vertices.length / 3; i++) {
          colors.push(...ventColor);
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
   * Render basic vents — grouped by edge color so each group gets correct edgesColor
   */
  public async renderBasicVents() {
    if (!this.basicVents || this.basicVents.length === 0) {
      return;
    }

    this.normalizeBasicVents();

    // Dispose existing mesh groups
    this.disposeBasicMeshGroups();

    // Group vents by edge color (colorNorm RGB rounded to 3 decimals)
    const colorGroups = new Map<string, IVent[]>();
    this.basicVents.forEach(vent => {
      const cn = vent.vis.colorNorm;
      const key = `${cn[0].toFixed(3)},${cn[1].toFixed(3)},${cn[2].toFixed(3)}`;
      if (!colorGroups.has(key)) {
        colorGroups.set(key, []);
      }
      colorGroups.get(key).push(vent);
    });

    // Load fire shaders (have clipping + transparent uniform)
    const sources = await this.babylonService.loadShaderSources('fire');
    const isWGSL = sources.shaderLanguage === ((BABYLON as any).ShaderLanguage?.WGSL ?? 1);
    const uniformsList = isWGSL
      ? ["clipX", "clipY", "clipZ", "transparent"]
      : ["world", "worldView", "worldViewProjection", "view", "projection", "clipX", "clipY", "clipZ", "transparent"];

    let groupIndex = 0;
    for (const [, groupVents] of colorGroups) {
      const data = this.buildBasicVentsVertexData(groupVents);
      if (data.vertices.length === 0) continue;

      const mesh = new BABYLON.Mesh(`basicVents_${groupIndex}`, this.babylonService.scene);

      const vertexData = new BABYLON.VertexData();
      vertexData.positions = data.vertices;
      vertexData.indices = data.indices;
      vertexData.colors = data.colors;
      vertexData.normals = data.normals;
      vertexData.applyToMesh(mesh);

      const material = new (BABYLON as any).ShaderMaterial(
        `basicVentShader_${groupIndex}`,
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

      material.backFaceCulling = false;
      material.zOffset = -0.015;
      material.setFloat("clipX", this.basicClipXNorm);
      material.setFloat("clipY", this.basicClipYNorm);
      material.setFloat("clipZ", this.basicClipZNorm);
      material.setFloat("transparent", 0.0);

      mesh.material = material;

      // Edge color from this group's vent color
      const cn = groupVents[0].vis.colorNorm;
      const edgeColor = new BABYLON.Color4(cn[0], cn[1], cn[2], 1);

      mesh.enableEdgesRendering();
      mesh.edgesWidth = 0.1;
      mesh.edgesColor = edgeColor;

      mesh.freezeWorldMatrix();

      this.basicMeshGroups.push({ mesh, material, edgeColor });
      groupIndex++;
    }

    // Reset visibility state
    this.basicVisibility = 0;
  }

  /**
   * Toggle basic vent visibility (3 states):
   * 0 → edges only
   * 1 → edges + semi-transparent fill
   * 2 → hidden
   */
  public toogleBasicVisibility() {
    if (this.basicMeshGroups.length === 0) return;

    if (this.basicVisibility == 0) {
      this.basicMeshGroups.forEach(g => {
        g.material.setFloat('transparent', 0.6);
        g.mesh.edgesWidth = 0.1;
      });
      this.basicVisibility = 1;
    } else if (this.basicVisibility == 1) {
      this.basicMeshGroups.forEach(g => {
        g.material.setFloat('transparent', 0.0);
        g.mesh.edgesWidth = 0.0;
      });
      this.basicVisibility = 2;
    } else if (this.basicVisibility == 2) {
      this.basicMeshGroups.forEach(g => {
        g.material.setFloat('transparent', 0.0);
        g.mesh.edgesWidth = 0.1;
      });
      this.basicVisibility = 0;
    }
  }

  /**
   * Clip basic vent meshes
   * @param value percentage 0-100
   * @param direction x, y, z
   */
  public clipBasic(value: number, direction: string) {
    if (this.basicMeshGroups.length === 0) return;

    const globalBounds = {
      x: this.helpersService.normXMax || 1,
      y: this.helpersService.normYMax || 1,
      z: this.helpersService.normZMax || 1
    };

    let clip: number;
    let uniform: string;

    if (direction == 'x') {
      clip = (value == 100) ? 1.1 : globalBounds.x * (value / 100);
      clip = (value == 0) ? -1.1 : clip;
      uniform = "clipX";
      this.basicClipXNorm = clip;
    } else if (direction == 'y') {
      clip = (value == 100) ? 1.1 : globalBounds.y * (value / 100);
      clip = (value == 0) ? -1.1 : clip;
      uniform = "clipY";
      this.basicClipYNorm = clip;
    } else if (direction == 'z') {
      clip = (value == 100) ? 1.1 : globalBounds.z * (value / 100);
      clip = (value == 0) ? -1.1 : clip;
      uniform = "clipZ";
      this.basicClipZNorm = clip;
    }

    this.basicMeshGroups.forEach(g => {
      g.material.setFloat(uniform, clip);
    });
  }

  /**
   * Dispose all basic mesh groups
   */
  private disposeBasicMeshGroups() {
    this.basicMeshGroups.forEach(g => {
      g.mesh.dispose();
    });
    this.basicMeshGroups = [];
  }

  /**
   * Clear basic vents
   */
  public clearBasic() {
    this.basicVents = [];
    this.disposeBasicMeshGroups();
  }
}
