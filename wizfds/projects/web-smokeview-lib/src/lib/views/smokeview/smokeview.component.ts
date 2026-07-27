import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, HostListener, isDevMode } from '@angular/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ObstService } from '../../services/drawing/obst/obst.service';
import { BabylonService } from '../../services/babylon/babylon.service';
import { SliceService } from '../../services/drawing/slice/slice.service';
import { PlayerService } from '../../services/player/player.service';
import { InputService } from '../../services/input/input.service';
import { SmokeviewApiService } from '../../services/smokeview-api/smokeview-api.service';
import { forEach, startsWith, toLower, trim, toNumber, minBy, min, maxBy, max, sortBy } from 'lodash';
import { ViewCubeService } from '../../services/babylon/viewCube/view-cube.service';
import * as BABYLON from 'babylonjs';
import { MeshService } from '../../services/drawing/mesh/mesh.service';
import { OpenService } from '../../services/drawing/open/open.service';
import { VentService } from '../../services/drawing/vent/vent.service';
import { JetfanService } from '../../services/drawing/jetfan/jetfan.service';
import { FireService } from '../../services/drawing/fire/fire.service';
import { SceneAxis, SceneBoundsService } from '../../services/scene-bounds/scene-bounds.service';

@Component({
    selector: 'lib-smokeview',
    templateUrl: './smokeview.component.html',
    styleUrls: ['./smokeview.component.scss'],
    standalone: false
})
export class SmokeviewComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('rendererCanvas', { static: true }) rendererCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('mainContainer', { static: true }) mainContainer: ElementRef<HTMLCanvasElement>;

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    // No scene when the browser has no WebGPU - nothing to pick against
    if (!this.babylonService.scene) return;

    // Control camera
    let pickInfoViewCube = this.babylonService.scene.pick(this.babylonService.scene.pointerX, this.babylonService.scene.pointerY, null, null, this.viewCubeService.cameraViewCube);
    if (pickInfoViewCube.hit) { this.viewCubeService.zoomToSide(pickInfoViewCube.pickedMesh.name); }

    // Select obst
    if (event.ctrlKey) {
      let pickInfo;
      pickInfo = this.babylonService.scene.pick(this.babylonService.scene.pointerX, this.babylonService.scene.pointerY, null, null, this.babylonService.camera);
      if (pickInfo.hit) {
        // Long enough to cross the whole model from wherever the camera stands.
        // A fixed length used to do, back when the scene was one unit across.
        const reach = this.babylonService.camera.radius + 2 * this.sceneBounds.extent;
        var ray = new BABYLON.Ray(pickInfo.ray.origin, pickInfo.ray.direction, reach);
        //let rayHelper = new BABYLON.RayHelper(ray);
        //rayHelper.show(this.babylonService.scene, new BABYLON.Color3(0, 0, 1));
        this.obstService.selectObst(ray);
      }
      else {
        this.obstService.clearSelection();
      }
    }
  }

  showHelp: boolean = false;

  /**
   * Mirrors BabylonService.webGPUAvailable once the scene has been attempted.
   * False means the browser cannot render anything - the template says so
   * instead of leaving a blank canvas. See docs/adr/0001-webgpu-only-wgsl.md.
   */
  webGPUAvailable: boolean = true;

  private sceneSub: Subscription;

  /** Set in ngOnDestroy - createScene() is awaited and can outlive the view. */
  private destroyed = false;

  constructor(
    public obstService: ObstService,
    public meshService: MeshService,
    public openService: OpenService,
    public ventService: VentService,
    public jetfanService: JetfanService,
    public fireService: FireService,
    private babylonService: BabylonService,
    public sliceService: SliceService,
    public playerService: PlayerService,
    public inputService: InputService,
    public viewCubeService: ViewCubeService,
    private sceneBounds: SceneBoundsService,
    private smokeviewApiService: SmokeviewApiService
  ) { }

  /**
   * Where a clip slider currently cuts, as the user reads it.
   *
   * The slider is a percentage of the model; what it means is a coordinate in
   * metres, and that is the number the user can type into a `.fds` file
   * (ADR-0002). Rounded to a centimetre - finer than any geometry FDS is given.
   */
  public clipLabel(axis: SceneAxis): string {
    return `${this.obstService.clipPlane(axis).toFixed(2)} m`;
  }

  ngOnInit() {
    // Decided on first paint, so an unsupported browser sees the message
    // straight away instead of after a failed engine initialisation.
    this.webGPUAvailable = BabylonService.isWebGPUSupported();
  }

  async ngAfterViewInit() {
    if (!this.webGPUAvailable) return;

    await this.babylonService.createScene(this.rendererCanvas);

    // Leaving the view while the engine was still initialising: ngOnDestroy
    // already ran and found nothing to dispose, so tear down what just arrived.
    if (this.destroyed) {
      this.babylonService.disposeScene();
      return;
    }

    // The adapter request can still fail on a browser that advertises WebGPU
    this.webGPUAvailable = this.babylonService.webGPUAvailable;
    if (!this.webGPUAvailable) return;

    this.sceneSub = this.babylonService.scene$
      .pipe(filter(scene => !!scene))
      .subscribe(() => {
        this.babylonService.animate();

        // Initialize ViewCube after scene is ready
        try {
          this.viewCubeService.init();
          if (isDevMode()) { try { console.debug('[SmokeviewComponent] ViewCube initialized'); } catch {} }
        } catch (e) {
          if (isDevMode()) { try { console.error('[SmokeviewComponent] Failed to initialize ViewCube', e); } catch {} }
        }
      });
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

  ngOnDestroy() {
    this.destroyed = true;
    if (this.sceneSub) {
      this.sceneSub.unsubscribe();
    }
    // Tears down scene and engine, and resets every scene-scoped service
    this.babylonService.disposeScene();
  }

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

        if (isDevMode()) console.log(surfs);

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

        if (isDevMode()) console.log(obsts);
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
