import { Injectable, isDevMode } from '@angular/core';
import { BabylonService } from '../../babylon/babylon.service';
import * as BABYLON from 'babylonjs';
import { cloneDeep, forEach } from 'lodash';
//import { environment } from '../../../environments/environment';
import { colorbars as Colorbars } from '../../../consts/colorbars';
import { PlayerService } from '../../player/player.service';
import { Slice } from './slice';

@Injectable({
  providedIn: 'root'
})
export class SliceService {

  vertices = [];
  indices = [];
  normals = [];
  blank = [];
  isBlank: number = 1;

  slices: Slice[] = [];

  // Color index for each vertex
  tex = new Float32Array([]);
  texData = new Float32Array([]);

  mesh;
  vertexData;
  material;

  constructor(
    private babylonService: BabylonService,
    private playerService: PlayerService
  ) { }

  /**
   * Play slice ?? redefine it ... especially sliderInterval should be sliceInterval or something. Maybe put all result in one interval ...
   */
  public playSlice() {
    this.playerService.sliderInterval = setInterval(() => {
      if (this.playerService.frameCur == this.playerService.frameNo - 1) this.playerService.frameCur = 0;

      forEach(this.slices, (slice: Slice) => {
        slice.tex = slice.texData.slice(this.playerService.frameCur * slice.frameSize, (this.playerService.frameCur + 1) * slice.frameSize);
        slice.mesh.setVerticesData("texture_coordinate", slice.tex, true, 1);
      });
      this.playerService.frameCur++;

    }, 50);
  }

  /**
   * Get obsts from json file
   * @param json Object with vertices, colors, indices, normals
   */
  public getFromFile(json: any) {

    // First stop playing and set current frame to 0
    this.playerService.frameCur = 0;
    this.setTex();
    this.playerService.stop();

    // If loaded slice has less frames change frame number || current frame no is equal to 0
    if (this.playerService.frameNo > json.texData.length / (json.vertices.length / 3) || this.playerService.frameNo == 0) {
      this.playerService.frameNo = json.texData.length / (json.vertices.length / 3);
    }

    this.slices.push(new Slice(json.vertices, json.indices, json.blank, new Float32Array(json.texData), this.babylonService.scene));
  }

  /**
   * Get default slice from server
   */
  public getFromServer() {

    //this.httpManager.get(environment.host + '/api/slices').then(
    //  (result: Result) => {
    //    if (result.meta.status == 'success') {

    //      // If loaded slice has less frames change frame number || current frame no is equal to 0
    //      if (this.playerService.frameNo > result.data.texData.length / (result.data.vertices.length / 3) || this.playerService.frameNo == 0) {
    //        this.playerService.frameNo = result.data.texData.length / (result.data.vertices.length / 3);
    //      }

    //      this.slices.push(new Slice(result.data.vertices, result.data.indices, result.data.blank, new Float32Array(result.data.texData), this.babylonService.scene));
    //    }
    //  });
  }

  /**
   * Set holes in slice
   */
  public toogleBlank() {

    forEach(this.slices, (slice: Slice) => {
      slice.toogleBlank();
    });
  }

  /**
   * Set current tex data
   */
  public setTex() {

    forEach(this.slices, (slice: Slice) => {
      slice.setTex(this.playerService.frameCur);
    });
  }

}
