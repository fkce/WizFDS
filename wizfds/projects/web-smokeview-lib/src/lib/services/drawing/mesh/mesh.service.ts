import { Injectable } from '@angular/core';
import { BabylonService } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { forEach, max, cloneDeep } from 'lodash';
import { IMesh } from '../interfaces';
import * as BABYLON from 'babylonjs';

@Injectable({
  providedIn: 'root'
})
export class MeshService {

  meshes: any = [];

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
    private helperService: HelpersService
  ) { }

  /**
   * Reder meshes
   */
  public renderMeshes() {

    // Prepare normalized geometry and colors
    this.normalizeMeshes();

    // Update obsts vertex data
    this.updateMeshesVertexData();

    // Render data
    this.render();
  }

  /**
   * Normalize meshes
   */
  private normalizeMeshes(): void {

    // Firstly, find minimum and maximum values for each direction x, y, z
    let xMin = this.meshes[0].xb.x1, yMin = this.meshes[0].xb.y1, zMin = this.meshes[0].xb.z1;
    let xMax = this.meshes[0].xb.x2, yMax = this.meshes[0].xb.y2, zMax = this.meshes[0].xb.z2;
    forEach(this.meshes, (mesh: IMesh) => {
      xMin = mesh.xb.x1 < xMin ? mesh.xb.x1 : xMin;
      xMax = mesh.xb.x2 > xMax ? mesh.xb.x2 : xMax;

      yMin = mesh.xb.y1 < yMin ? mesh.xb.y1 : yMin;
      yMax = mesh.xb.y2 > yMax ? mesh.xb.y2 : yMax;

      zMin = mesh.xb.z1 < zMin ? mesh.xb.z1 : zMin;
      zMax = mesh.xb.z2 > zMax ? mesh.xb.z2 : zMax;
    });

    // Get deltas per each direction ...
    let deltaX = xMax - xMin;
    let deltaY = yMax - yMin;
    let deltaZ = zMax - zMin;
    let delta = max([deltaX, deltaY, deltaZ]);

    let color = [1, 1, 1, 1];

    // Normalize ...
    forEach(this.meshes, (mesh: IMesh) => {

      // Normalize xb
      let xb = cloneDeep(mesh.xb);

      xb.x1 += (xMin < 0) ? -xMin : xMin;
      mesh.vis.xbNorm.x1 = xb.x1 / delta;

      xb.x2 += (xMin < 0) ? -xMin : xMin;
      mesh.vis.xbNorm.x2 = xb.x2 / delta;

      xb.y1 += (yMin < 0) ? -yMin : yMin;
      mesh.vis.xbNorm.y1 = xb.y1 / delta;
      xb.y2 += (yMin < 0) ? -yMin : yMin;
      mesh.vis.xbNorm.y2 = xb.y2 / delta;

      xb.z1 += (zMin < 0) ? -zMin : zMin;
      mesh.vis.xbNorm.z1 = xb.z1 / delta;
      xb.z2 += (zMin < 0) ? -zMin : zMin;
      mesh.vis.xbNorm.z2 = xb.z2 / delta;

      mesh.vis.colorNorm = [1, 0.815, 0, 0];
    });
  }

  /**
   * Update meshes vertex data
   */
  private updateMeshesVertexData(): void {

    // Clear arrays
    this.vertices.length = 0;
    this.colors.length = 0;
    this.indices.length = 0;

    forEach(this.meshes, (mesh: IMesh, index: number) => {
      this.vertices.push(...this.helperService.getVerticesFromXb(mesh.vis.xbNorm));
      this.colors.push(...this.helperService.getColors(mesh.vis.colorNorm));
      this.indices.push(...this.helperService.getIndices(index));
    });
  }

  /**
   * Render current mesh geometry
   */
  private render() {

    // Create new custom mesh and vertex data
    this.mesh = new BABYLON.Mesh("custom", this.babylonService.scene);

    // Compute normals
    BABYLON.VertexData.ComputeNormals(this.vertices, this.indices, this.normals);
    // Assign data
    this.vertexData = new BABYLON.VertexData();
    this.vertexData.positions = this.vertices;
    this.vertexData.indices = this.indices;
    this.vertexData.colors = this.colors;
    this.vertexData.normals = this.normals;
    this.vertexData.applyToMesh(this.mesh);

    // Create material with shaders
    this.material = new BABYLON.ShaderMaterial("shader", this.babylonService.scene, '/assets/shaders/mesh',
      {
        needAlphaBlending: true,
        attributes: ["position", "color", "normal"],
        uniforms: ["world", "worldView", "worldViewProjection", "view", "projection"],
      });
    this.material.setFloat("transparent", 0);
    this.material.zOffset = 0.4;

    this.mesh.material = this.material;
    this.mesh.enableEdgesRendering();
    this.mesh.edgesWidth = 0.1;
    this.mesh.edgesColor = new BABYLON.Color4(1, 0.815, 0, 1);
  }

  /**
   * Toggle mesh visibility
   */
  public toogleVisibility() {
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
