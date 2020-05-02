import { Injectable, isDevMode } from '@angular/core';
import { BabylonService } from '../../babylon/babylon.service';
import * as BABYLON from 'babylonjs';
import { forEach, max, find, cloneDeep, sortBy, toNumber } from 'lodash';
import { HelpersService } from '../../helpers/helpers.service';
import { IObst } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class ObstService {

  obsts: any = [];
  surfs: any = [];

  pickedObst: IObst;
  pickedObstMesh;
  pickedObstMaterial: BABYLON.StandardMaterial;

  vertices: number[] = [];
  normals: number[] = [];
  colors: number[] = [];
  indices: number[] = [];
  positions: BABYLON.Vector3[] = [];

  mesh;
  meshBackCap;
  vertexData: BABYLON.VertexData;
  material: BABYLON.ShaderMaterial;
  materialBackCap: BABYLON.ShaderMaterial;

  clipX: number = 0.0;
  clipY: number = 0.0;
  clipZ: number = 100.0;
  clipXNorm: number = -0.001;
  clipYNorm: number = -0.001;
  clipZNorm: number = 1.001;

  constructor(
    private babylonService: BabylonService,
    private helperService: HelpersService
  ) {
  }

  /**
   * Clip obst mesh
   * @param value percentage
   * @param direction x, y, z direction
   */
  public clip(value: number, direction: string) {

    let boundingMax = this.mesh.getBoundingInfo().maximum;
    if (direction == 'x') {
      this.clipX = value;
      let clip = (value == 100) ? 1.1 : boundingMax.x * (value / 100);
      clip = (value == 0) ? -0.1 : clip;
      this.mesh.material.setFloat("clipX", clip);
      this.meshBackCap.material.setFloat("clipX", clip);
      this.clipXNorm = clip;

    }
    else if (direction == 'y') {
      this.clipY = value;
      let clip = (value == 100) ? 1.1 : boundingMax.y * (value / 100);
      clip = (value == 0) ? -0.1 : clip;
      this.mesh.material.setFloat("clipY", clip);
      this.meshBackCap.material.setFloat("clipY", clip);
      this.clipYNorm = clip;
    }
    else if (direction == 'z') {
      this.clipZ = value;
      let clip = (value == 100) ? 1.1 : boundingMax.z * (value / 100);
      clip = (value == 0) ? -0.1 : clip;
      this.mesh.material.setFloat("clipZ", clip);
      this.meshBackCap.material.setFloat("clipZ", clip);
      this.clipZNorm = clip;
    }
  }

  /**
   * Render geometry from json data
   * @param data 
   */
  public renderJson(data: any) {

    // Clear arrays
    this.vertices.length = 0;
    this.colors.length = 0;
    this.indices.length = 0;
    this.positions.length = 0;

    // Assign data
    this.vertices = data.vertices;
    this.colors = data.colors;
    this.indices = data.indices;

    // Generate positions
    for (let i = 0; i < this.vertices.length; i += 3) {
      this.positions.push(new BABYLON.Vector3(this.vertices[i], this.vertices[i + 1], this.vertices[i + 2]));
    }

    // Render geometry
    this.render();
  }

  public renderWiz() {

  }

  public renderFds() {
    // upload fds file ... 

  }

  /**
   * Reder obsts
   */
  public renderObsts() {

    // Prepare normalized geometry and colors
    this.normalizeObsts();

    // Update obsts vertex data
    this.updateObstsVertexData();

    // Render data
    this.render();

    // Set camera
    let bounding = cloneDeep(this.mesh.getBoundingInfo().boundingSphere);
    this.babylonService.camera.setPosition(new BABYLON.Vector3(bounding.centerWorld.x, bounding.centerWorld.y, bounding.centerWorld.z + 2));
    this.babylonService.camera.setTarget(bounding.centerWorld);
  }

  /**
   * Normalize obsts
   */
  private normalizeObsts(): void {

    let delta = this.helperService.normDelta;
    let xMin = this.helperService.normXMin;
    let yMin = this.helperService.normYMin;
    let zMin = this.helperService.normZMin;

    let color = [1, 1, 1, 1];

    // Normalize ...
    forEach(this.obsts, (obst: IObst) => {

      // Normalize xb
      let xb = cloneDeep(obst.xb);
      forEach(xb, (o, key) => {
        xb[key] = toNumber(o);
      });

      xb.x1 += (xMin < 0) ? -xMin : xMin;
      obst.vis.xbNorm.x1 = xb.x1 / delta;

      xb.x2 += (xMin < 0) ? -xMin : xMin;
      obst.vis.xbNorm.x2 = xb.x2 / delta;

      xb.y1 += (yMin < 0) ? -yMin : yMin;
      obst.vis.xbNorm.y1 = xb.y1 / delta;
      xb.y2 += (yMin < 0) ? -yMin : yMin;
      obst.vis.xbNorm.y2 = xb.y2 / delta;

      xb.z1 += (zMin < 0) ? -zMin : zMin;
      obst.vis.xbNorm.z1 = xb.z1 / delta;
      xb.z2 += (zMin < 0) ? -zMin : zMin;
      obst.vis.xbNorm.z2 = xb.z2 / delta;

      // Normalize color
      let surf = find(this.surfs, (surf: any) => {
        return surf.id == obst.surf.surf_id.id;
      });
      color = [surf.color.rgb[0] / 255, surf.color.rgb[1] / 255, surf.color.rgb[2] / 255].concat([surf.transparency]);
      obst.vis.colorNorm = color;

    });
  }

  /**
   * Update obsts vertex data
   */
  public updateObstsVertexData(): void {

    // Clear arrays
    this.vertices.length = 0;
    this.colors.length = 0;
    this.indices.length = 0;
    this.positions.length = 0;

    forEach(this.obsts, (obst: IObst, index: number) => {
      this.vertices.push(...this.helperService.getVerticesFromXb(obst.vis.xbNorm));
      this.colors.push(...this.helperService.getColors(obst.vis.colorNorm));
      this.indices.push(...this.helperService.getIndices(index));
    });

    // Generate positions
    for (let i = 0; i < this.vertices.length; i += 3) {
      this.positions.push(new BABYLON.Vector3(this.vertices[i], this.vertices[i + 1], this.vertices[i + 2]));
    }
  }

  /**
   * Render current obst geometry
   */
  public render() {

    // Create new custom mesh and vertex data
    if (this.mesh) { this.mesh.dispose(); }
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

    // Set flag updatable to true for opacity
    //this.vertexData.applyToMesh(this.mesh, true);

    // Create material with shaders
    this.material = new BABYLON.ShaderMaterial("shader", this.babylonService.scene, './assets/shaders/obst',
      {
        //needAlphaBlending: true, // set when opacity
        attributes: ["position", "color", "normal"],
        uniforms: ["world", "worldView", "worldViewProjection", "view", "projection"],
      });
    this.material.setFloat("clipX", this.clipXNorm);
    this.material.setFloat("clipY", this.clipYNorm);
    this.material.setFloat("clipZ", this.clipZNorm);
    this.material.backFaceCulling = false;
    this.material.freeze();
    //this.material.zOffset = -1;
    //this.material.useLogarithmicDepth = true;

    this.mesh.material = this.material;
    this.mesh.enableEdgesRendering();
    this.mesh.edgesWidth = 0.05;
    this.mesh.edgesColor = new BABYLON.Color4(0.4, 0.4, 0.4, 1);

    // Preformance optimization
    this.mesh.freezeWorldMatrix();

    // Crate back cap mesh
    if (this.meshBackCap) { this.meshBackCap.dispose(); }
    this.meshBackCap = new BABYLON.Mesh("custom", this.babylonService.scene);
    this.vertexData.applyToMesh(this.meshBackCap);

    // Create material with shaders
    this.materialBackCap = new BABYLON.ShaderMaterial("shader", this.babylonService.scene, './assets/shaders/obstBackCap',
      {
        //needAlphaBlending: true, // set when opacity
        attributes: ["position", "color", "normal"],
        uniforms: ["world", "worldView", "worldViewProjection", "view", "projection"],
      });
    this.materialBackCap.setFloat("clipX", this.clipXNorm);
    this.materialBackCap.setFloat("clipY", this.clipYNorm);
    this.materialBackCap.setFloat("clipZ", this.clipZNorm);
    this.materialBackCap.zOffset = -0.01;
    this.materialBackCap.freeze();

    this.meshBackCap.material = this.materialBackCap;
    this.meshBackCap.freezeWorldMatrix();

    // Put somewhere else ...
    this.babylonService.scene.freeActiveMeshes();

    // Uncomment when opacity - not working properly
    //this.mesh.material.needDepthPrePass = true;
    //this.mesh.mustDepthSortFacets = true;
    //this.babylonService.scene.registerBeforeRender(() => {
    //  this.mesh.updateFacetData();
    //});
  }

  /**
   * Select and highlight picked obst
   * @param ray ray from camera to pick point
   */
  public selectObst(ray: BABYLON.Ray) {

    // Find all intersecting triangles
    let intersectInfo = [];
    let faceId = -1;

    for (let i = 0; i < this.indices.length; i += 3) {
      faceId += 1;
      let p0 = this.positions[this.indices[i]];
      let p1 = this.positions[this.indices[i + 1]];
      let p2 = this.positions[this.indices[i + 2]];

      var currentIntersectInfo = ray.intersectsTriangle(p0, p1, p2);

      // Test if ray cross only visible triangles
      if (currentIntersectInfo
        &&
        (
          (p0.x >= this.clipXNorm &&
            p0.y >= this.clipYNorm &&
            p0.z <= this.clipZNorm)
          ||
          (p1.x >= this.clipXNorm &&
            p1.y >= this.clipYNorm &&
            p1.z <= this.clipZNorm)
          ||
          (p2.x >= this.clipXNorm &&
            p2.y >= this.clipYNorm &&
            p2.z <= this.clipZNorm)
        )
      ) {
        currentIntersectInfo.faceId = faceId;
        intersectInfo.push(currentIntersectInfo);
      }
    }

    if (intersectInfo.length > 0) {
      // Find clicked obst - sort triangles by distance
      intersectInfo = sortBy(intersectInfo, ['distance']);
      this.pickedObst = this.obsts[Math.floor(intersectInfo[0].faceId / 12)];

      // Draw temporary obst
      // Delete previous object
      if (this.pickedObstMesh) this.pickedObstMesh.dispose();

      // Create box
      let options = {
        width: this.pickedObst.vis.xbNorm.x2 - this.pickedObst.vis.xbNorm.x1,
        height: this.pickedObst.vis.xbNorm.y2 - this.pickedObst.vis.xbNorm.y1,
        depth: this.pickedObst.vis.xbNorm.z2 - this.pickedObst.vis.xbNorm.z1
      }
      this.pickedObstMesh = BABYLON.MeshBuilder.CreateBox("pickedObst", options, this.babylonService.scene);
      this.pickedObstMaterial = new BABYLON.StandardMaterial("myMaterial", this.babylonService.scene);
      this.pickedObstMaterial.ambientColor = new BABYLON.Color3(1, 1, 1);
      this.pickedObstMaterial.alpha = 0.4;
      this.pickedObstMaterial.zOffset = -0.05;
      this.pickedObstMesh.material = this.pickedObstMaterial;
      this.pickedObstMesh.enableEdgesRendering();
      this.pickedObstMesh.edgesWidth = 0.1;
      this.pickedObstMesh.edgesColor = new BABYLON.Color4(0.09, 0.49, 0.99, 1);
      this.pickedObstMesh.position = new BABYLON.Vector3((this.pickedObst.vis.xbNorm.x1 + (this.pickedObst.vis.xbNorm.x2 - this.pickedObst.vis.xbNorm.x1) / 2), this.pickedObst.vis.xbNorm.y1 + ((this.pickedObst.vis.xbNorm.y2 - this.pickedObst.vis.xbNorm.y1) / 2), this.pickedObst.vis.xbNorm.z1 + ((this.pickedObst.vis.xbNorm.z2 - this.pickedObst.vis.xbNorm.z1) / 2));

      if (isDevMode()) console.log(this.pickedObstMesh);
    }
  }

}
