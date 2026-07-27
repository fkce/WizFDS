import { Injectable, isDevMode } from '@angular/core';
import * as BABYLON from 'babylonjs';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { FaceRange, SceneRegistryService } from '../../babylon/scene-registry.service';
import { forEach, cloneDeep, toNumber } from 'lodash';

import { BabylonService } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { IVent, IXb } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class VentService implements SceneScoped {

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

  /** What this service put in the registry, so a re-render can take it out. */
  private registeredBasicUuids: string[] = [];

  constructor(
    private babylonService: BabylonService,
    private helpersService: HelpersService,
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
    this.basicMeshGroups.length = 0;
    this.basicVisibility = 0;
    // The registry empties itself with the scene - this is only about not
    // holding on to uuids that named meshes of a scene that is gone.
    this.registeredBasicUuids.length = 0;
  }

  /**
   * Tell the registry where a batch of basic vents ended up, now that its mesh
   * exists. A colour group shares one buffer, so identity is a face range
   * within it.
   */
  private registerBasicFaces(mesh: BABYLON.Mesh, faces: FaceRange[]): void {
    faces.forEach(({ uuid, first, count }) => {
      this.sceneRegistry.register(uuid, { mesh: mesh, faces: { first: first, count: count } });
      this.registeredBasicUuids.push(uuid);
    });
  }

  /**
   * Drop the entries of the previous render, together with the meshes they
   * name: a vent taken out of the scenario would otherwise keep answering for
   * faces of a buffer it is no longer in.
   */
  private forgetRegisteredBasicFaces(): void {
    this.registeredBasicUuids.forEach(uuid => this.sceneRegistry.forget(uuid));
    this.registeredBasicUuids.length = 0;
  }

  /**
   * Update vents vertex data
   *
   * These are the inlet and outlet planes drawn for a jetfan, not vents from
   * the FDS model: their uuids are made up from the jetfan's, so there is no
   * element for the registry to name. The jetfan body carries that identity -
   * see JetfanService.
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
      this.material = await this.babylonService.createShaderMaterial({
        name: "ventShader",
        shader: "vent"
      });
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
      this.materialTransparent = await this.babylonService.createShaderMaterial({
        name: "ventTransparentShader",
        shader: "vent",
        needAlphaBlending: true
      });
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
   *
   * `faces` says which triangles of this buffer belong to which vent. The whole
   * group shares one mesh, so naming the mesh alone would not say which vent
   * was hit - and the ranges are per group, because a face index only means
   * anything inside the buffer it was counted in.
   */
  private buildBasicVentsVertexData(vents: IVent[]): {
    vertices: number[], indices: number[], colors: number[], normals: number[], faces: FaceRange[]
  } {
    let vertices: number[] = [];
    let indices: number[] = [];
    let colors: number[] = [];
    let normals: number[] = [];
    let indexCount = 0;
    const faces: FaceRange[] = [];

    vents.forEach((vent) => {
      if (vent.vis && vent.vis.xbNorm) {
        // Read afterwards rather than computed: nothing here may assume a fixed
        // triangle count per vent.
        const facesBefore = indices.length / 3;
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

        faces.push({
          uuid: vent.uuid, first: facesBefore, count: indices.length / 3 - facesBefore
        });
      }
    });

    return { vertices, indices, colors, normals, faces };
  }

  /**
   * Render basic vents — grouped by edge color so each group gets correct edgesColor
   */
  public async renderBasicVents() {
    // Dispose before the empty check, not after: deleting the last vent of a
    // scenario arrives here as an empty list, and the meshes drawn for the
    // previous one - along with the registry entries naming them - have to go
    // with it rather than outlive the vents they stand for.
    this.disposeBasicMeshGroups();

    if (!this.basicVents || this.basicVents.length === 0) {
      return;
    }

    this.normalizeBasicVents();

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

      // Before the material, not after: which vent a face belongs to is settled
      // by the buffer, and stays true even if the shader never arrives.
      this.registerBasicFaces(mesh, data.faces);

      // Basic vents borrow the fire shader - it has clipping plus a transparent uniform
      const material = await this.babylonService.createShaderMaterial({
        name: `basicVentShader_${groupIndex}`,
        shader: "fire",
        needAlphaBlending: true
      });

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
   *
   * The registry entries go with them: a vent left registered against a
   * disposed mesh would keep answering for faces that no longer exist.
   */
  private disposeBasicMeshGroups() {
    this.forgetRegisteredBasicFaces();

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
