import { Injectable } from '@angular/core';
import { BabylonService } from '../../babylon/babylon.service';
import { HelpersService } from '../../helpers/helpers.service';
import { forEach, max, cloneDeep, toNumber } from 'lodash';
import { IMesh } from '../interfaces';
import * as BABYLON from 'babylonjs';

@Injectable({
  providedIn: 'root'
})
export class MeshService {

  meshes: IMesh[] = [];

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

    // If nothing valid to render, exit early
    if (!this.meshes || this.meshes.length === 0) {
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
   * Normalize meshes
   */
  private normalizeMeshes(): void {
    // Sanitize input list
    const validMeshes = (this.meshes || []).filter((m: IMesh) => m && (m as any).xb);
    if (validMeshes.length === 0) {
      this.meshes = [];
      return;
    }

    // Ensure vis/xbNorm exists on each mesh
    forEach(validMeshes, (mesh: IMesh) => {
      (mesh as any).vis = (mesh as any).vis || { xbNorm: { x1: 0, x2: 0, y1: 0, y2: 0, z1: 0, z2: 0 }, colorNorm: [1, 0.815, 0, 0] };
      (mesh as any).vis.xbNorm = (mesh as any).vis.xbNorm || { x1: 0, x2: 0, y1: 0, y2: 0, z1: 0, z2: 0 };
    });

    // Firstly, find minimum and maximum values for each direction x, y, z
    let xMin = validMeshes[0].xb.x1, yMin = validMeshes[0].xb.y1, zMin = validMeshes[0].xb.z1;
    let xMax = validMeshes[0].xb.x2, yMax = validMeshes[0].xb.y2, zMax = validMeshes[0].xb.z2;
    if (validMeshes.length > 1) {
      forEach(validMeshes, (mesh: IMesh) => {
        xMin = mesh.xb.x1 < xMin ? mesh.xb.x1 : xMin;
        xMax = mesh.xb.x2 > xMax ? mesh.xb.x2 : xMax;

        yMin = mesh.xb.y1 < yMin ? mesh.xb.y1 : yMin;
        yMax = mesh.xb.y2 > yMax ? mesh.xb.y2 : yMax;

        zMin = mesh.xb.z1 < zMin ? mesh.xb.z1 : zMin;
        zMax = mesh.xb.z2 > zMax ? mesh.xb.z2 : zMax;
      });
    }

    this.helperService.normXMin = xMin;
    this.helperService.normYMin = yMin;
    this.helperService.normZMin = zMin;

    // Get deltas per each direction ...
    let deltaX = xMax - xMin;
    let deltaY = yMax - yMin;
    let deltaZ = zMax - zMin;
    this.helperService.normDelta = max([deltaX, deltaY, deltaZ]);

    // Calculate normalized maximum values after transformation and scaling
    let normXMax = ((xMax + (xMin < 0 ? -xMin : xMin)) / this.helperService.normDelta);
    let normYMax = ((yMax + (yMin < 0 ? -yMin : yMin)) / this.helperService.normDelta);
    let normZMax = ((zMax + (zMin < 0 ? -zMin : zMin)) / this.helperService.normDelta);

    // Store the normalized maximum values for clip calculation
    this.helperService.normXMax = normXMax;
    this.helperService.normYMax = normYMax;
    this.helperService.normZMax = normZMax;

    // Normalize ...
  forEach(validMeshes, (mesh: IMesh) => {

      // Normalize xb
      let xb = cloneDeep(mesh.xb);
      forEach(xb, (o, key) => {
        xb[key] = toNumber(o);
      });

      xb.x1 += (xMin < 0) ? -xMin : xMin;
      mesh.vis.xbNorm.x1 = xb.x1 / this.helperService.normDelta;
      xb.x2 += (xMin < 0) ? -xMin : xMin;
      mesh.vis.xbNorm.x2 = xb.x2 / this.helperService.normDelta;

      xb.y1 += (yMin < 0) ? -yMin : yMin;
      mesh.vis.xbNorm.y1 = xb.y1 / this.helperService.normDelta;
      xb.y2 += (yMin < 0) ? -yMin : yMin;
      mesh.vis.xbNorm.y2 = xb.y2 / this.helperService.normDelta;

      xb.z1 += (zMin < 0) ? -zMin : zMin;
      mesh.vis.xbNorm.z1 = xb.z1 / this.helperService.normDelta;
      xb.z2 += (zMin < 0) ? -zMin : zMin;
      mesh.vis.xbNorm.z2 = xb.z2 / this.helperService.normDelta;

      mesh.vis.colorNorm = [1, 0.815, 0, 0];
    });

  // Keep only valid meshes for subsequent steps
  this.meshes = validMeshes as any;
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

    // Dispose existing mesh and material
    if (this.mesh) { this.mesh.dispose(); }
    if (this.material) { this.material.dispose(); }

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
