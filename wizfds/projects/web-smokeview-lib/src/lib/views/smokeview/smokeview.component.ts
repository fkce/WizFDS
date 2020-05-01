import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { ObstService } from '../../services/drawing/obst/obst.service';
import { SliceGeomService } from '../../services/drawing/slice/slice-geom.service';
import { BabylonService } from '../../services/babylon/babylon.service';
import { SliceService } from '../../services/drawing/slice/slice.service';
import { PlayerService } from '../../services/player/player.service';
import { InputService } from '../../services/input/input.service';
import { forEach, startsWith, toLower, trim, toNumber, minBy, min, maxBy, max, sortBy } from 'lodash';
import { ViewCubeService } from '../../services/babylon/viewCube/view-cube.service';
import * as BABYLON from 'babylonjs';
import { IObst } from '../../services/drawing/interfaces';
import { MeshService } from '../../services/drawing/mesh/mesh.service';
import { OpenService } from '../../services/drawing/open/open.service';

@Component({
  selector: 'lib-smokeview',
  templateUrl: './smokeview.component.html',
  styleUrls: ['./smokeview.component.scss']
})
export class SmokeviewComponent implements OnInit {

  @ViewChild('rendererCanvas', { static: true }) rendererCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('mainContainer', { static: true }) mainContainer: ElementRef<HTMLCanvasElement>;

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {

    // Control camera
    let pickInfoViewCube = this.babylonService.scene.pick(this.babylonService.scene.pointerX, this.babylonService.scene.pointerY, null, null, this.viewCubeService.cameraViewCube);
    if (pickInfoViewCube.hit) { this.viewCubeService.zoomToSide(pickInfoViewCube.pickedMesh.name); }

    // Select obst
    if (event.ctrlKey) {
      let pickInfo;
      pickInfo = this.babylonService.scene.pick(this.babylonService.scene.pointerX, this.babylonService.scene.pointerY, null, null, this.babylonService.camera);
      if (pickInfo.hit) {
        var ray = new BABYLON.Ray(pickInfo.ray.origin, pickInfo.ray.direction, 4);
        //let rayHelper = new BABYLON.RayHelper(ray);
        //rayHelper.show(this.babylonService.scene, new BABYLON.Color3(0, 0, 1));
        this.obstService.selectObst(ray);
      }
      else {
        this.obstService.pickedObstMesh.dispose();
        this.obstService.pickedObst = undefined;
      }
    }
  }

  showHelp: boolean = false;

  constructor(
    public obstService: ObstService,
    public meshService: MeshService,
    public openService: OpenService,
    public sliceGeomService: SliceGeomService,
    private babylonService: BabylonService,
    public sliceService: SliceService,
    public playerService: PlayerService,
    public inputService: InputService,
    public viewCubeService: ViewCubeService
  ) { }


  ngOnInit() { }

  ngAfterViewInit() {

    this.babylonService.createScene(this.rendererCanvas);
    this.viewCubeService.init();
    this.babylonService.animate();

  }

  /**
   * On OBST file upload
   */
  //public onObstFileSelected() {
  //  const inputNode: any = document.querySelector('#fileObst');

  //  if (typeof (FileReader) !== 'undefined') {
  //    const reader = new FileReader();

  //    reader.onload = (e: any) => {
  //      //this.obstService.getFromFile(JSON.parse(e.target.result));
  //    };

  //    reader.readAsText(inputNode.files[0], 'UTF-8');
  //  }
  //}

  /**
   * On slice file upload
   */
  public onSliceFileSelected() {
    const inputNode: any = document.querySelector('#fileSlice');

    if (typeof (FileReader) !== 'undefined') {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        this.sliceService.getFromFile(JSON.parse(e.target.result));
      };

      reader.readAsText(inputNode.files[0], 'UTF-8');
    }
  }

  /**
   * On FDS file upload
   */
  public onFdsFileSelected() {
    const inputNode: any = document.querySelector('#fileFds');

    if (typeof (FileReader) !== 'undefined') {
      const reader = new FileReader();


      // REFACTOR TO INPUT.SERVICE ...

      reader.onload = (e: any) => {
        //this.obstService.getFromFile(JSON.parse(e.target.result));
        // TODO - create FDS object interface ... and class
        let ampers = [];
        let obsts = [];
        let surfs = [];
        let startRecording = false;
        let amper = '';

        forEach(e.target.result, (letter) => {

          if (letter == '&') startRecording = true;
          if (startRecording) amper += letter;

          if (letter == '/') {
            if (amper != '') ampers.push(amper);
            startRecording = false
            amper = '';
          }

        });

        // Find surfs first
        forEach(ampers, (amper) => {

          if (startsWith(toLower(amper), '&surf')) {

            surfs.push({
              id: this.inputService.parseText(amper, 'id'),
              color: this.inputService.parseText(amper, 'color')
            });

          }

        });

        // Find obsts
        forEach(ampers, (amper) => {

          if (startsWith(toLower(amper), '&obst')) {

            let surfId = this.inputService.testParam(amper, 'surf_id') ? this.inputService.parseText(amper, 'surf_id') : '';

            obsts.push({
              xb: this.inputService.parseXb(amper),
              color: this.inputService.testParam(amper, 'surf_id') ? this.inputService.parseRgb(surfs, surfId) : undefined,
              surf_id: surfId
            });

          }

        });

        console.log(surfs);

        let xMin = minBy(obsts, function (obst) { return min(obst.xb.slice(0, 2)); }).xb[0];
        let xMax = maxBy(obsts, function (obst) { return max(obst.xb.slice(0, 2)); }).xb[1];

        let yMin = minBy(obsts, function (obst) { return min(obst.xb.slice(2, 4)); }).xb[2];
        let yMax = maxBy(obsts, function (obst) { return max(obst.xb.slice(2, 4)); }).xb[3];

        let zMin = minBy(obsts, function (obst) { return min(obst.xb.slice(4, 6)); }).xb[4];
        let zMax = maxBy(obsts, function (obst) { return max(obst.xb.slice(4, 6)); }).xb[5];

        // get deltas
        let deltaX = xMax - xMin;
        let deltaY = yMax - yMin;
        let deltaZ = zMax - zMin;
        let delta = max([deltaX, deltaY, deltaZ]);

        // normalize ...
        forEach(obsts, obst => {
          obst.xb[0] += (xMin < 0) ? -xMin : xMin;
          obst.xb[0] /= delta;
          obst.xb[1] += (xMin < 0) ? -xMin : xMin;
          obst.xb[1] /= delta;
          obst.xb[2] += (yMin < 0) ? -yMin : yMin;
          obst.xb[2] /= delta;
          obst.xb[3] += (yMin < 0) ? -yMin : yMin;
          obst.xb[3] /= delta;
          obst.xb[4] += (zMin < 0) ? -zMin : zMin;
          obst.xb[4] /= delta;
          obst.xb[5] += (zMin < 0) ? -zMin : zMin;
          obst.xb[5] /= delta;
        });

        console.log(obsts);
        //this.obstService.updateObsts(obsts);

      };

      reader.readAsText(inputNode.files[0], 'UTF-8');
    }
  }

  public control() {
    if (this.playerService.isPlay) {
      this.playerService.stop();
    } else {
      this.playerService.start();
      this.sliceService.playSlice();
    }

  }


}
