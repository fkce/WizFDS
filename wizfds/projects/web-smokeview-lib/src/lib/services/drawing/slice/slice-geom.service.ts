import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SliceGeomService {

  frameSize = 24;

  // slice geom file triangles
  vertices = [
    0.75, 0.125, 0.30, 1.00, 0.125, 0.30, 1.00, 0.375, 0.30, 0.75, 0.375, 0.30,
    0.75, 0.125, 0.65, 1.00, 0.125, 0.65, 1.00, 0.375, 0.65, 0.75, 0.375, 0.65,
    0.75, 0.125, 0.30, 0.75, 0.375, 0.30, 0.75, 0.375, 0.65, 0.75, 0.125, 0.65,
    1.00, 0.125, 0.30, 1.00, 0.375, 0.30, 1.00, 0.375, 0.65, 1.00, 0.125, 0.65,
    0.75, 0.125, 0.30, 0.75, 0.125, 0.65, 1.00, 0.125, 0.65, 1.00, 0.125, 0.30,
    0.75, 0.375, 0.30, 0.75, 0.375, 0.65, 1.00, 0.375, 0.65, 1.00, 0.375, 0.30
  ];

  texData = new Uint8Array([
    0, 0, 0, 0,
    38, 38, 38, 38,
    76, 76, 76, 76,
    115, 115, 115, 115,
    153, 153, 153, 153,
    191, 191, 191, 191,
    191, 191, 191, 191,
    0, 0, 0, 0,
    38, 38, 38, 38,
    76, 76, 76, 76,
    115, 115, 115, 115,
    153, 153, 153, 153,
  ]);

  tex = new Float32Array([
    0.0, 0.0, 0.0, 0.0,
    0.0, 0.0, 0.0, 0.0,
    0.0, 0.0, 0.0, 0.0,
    0.0, 0.0, 0.0, 0.0,
    0.0, 0.0, 0.0, 0.0,
    0.0, 0.0, 0.0, 0.0
  ]);

  indices = [
    0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7,
    8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15,
    16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23
  ];

  //scene: THREE.Scene = null;
  mesh = null;

  geometry = null;
  material = null;

  xMinPlane = null
  yMinPlane = null
  zMinPlane = null

  clipX: number = 0.0;
  clipY: number = 0.0;
  clipZ: number = 100.0;

  constructor() {

    /*
    this.scene = new THREE.Scene();
    this.xMinPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), this.clipX);
    this.yMinPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), this.clipY);
    this.zMinPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), this.clipZ);

    let uniform = {
      texture_colorbar_sampler: this.threeService.textureColorbarData
    }

    this.material = new THREE.MeshBasicMaterial({
      color: 0xFF0000,
      side: THREE.DoubleSide,
    });

    //this.material = new THREE.RawShaderMaterial({
    //  vertexColors: THREE.VertexColors,
    //  side: THREE.DoubleSide,
    //  uniforms: uniform,
    //  //clipping: true,
    //  //clippingPlanes: [this.xMinPlane, this.yMinPlane, this.zMinPlane],
    //  //clipShadows: true,
    //  vertexShader: Shaders.vertCode_slice_geom,
    //  fragmentShader: Shaders.fragCode_slice_geom
    //});
    */
  }


  /*
  public render() {

    if (this.geometry == null) {
      this.geometry = new THREE.BufferGeometry();
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.vertices), 3));
    //this.geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(this.normals), 3));
    //this.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.colors), 3));
    this.geometry.setIndex(this.indices);

    if (this.mesh == null) {
      this.mesh = new THREE.Mesh(this.geometry, this.material);
      this.threeService.scene.add(this.mesh);
    }
    else {
      this.mesh.geometry.needsUpdate = true;
    }
  }




  private get_slice_geom_frame(frame) {
    var i;

    for (i = 0; i < this.frameSize; i++) {
      //if (this.geom_file_ready) {
      this.tex[i] = this.texData[this.frameSize * frame + i] / 255.0;
      //}
      //else {
      //  this.textures_geom[i] = 128 / 255.0;
      //}
    }
  }
  */

}
