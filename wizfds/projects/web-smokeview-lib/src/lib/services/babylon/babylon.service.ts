import { Injectable, NgZone, ElementRef, HostListener } from '@angular/core';
import * as BABYLON from 'babylonjs';
import 'babylonjs-materials';

@Injectable({
  providedIn: 'root'
})
export class BabylonService {

  public canvas: HTMLCanvasElement;
  public engine: BABYLON.Engine;
  public camera: BABYLON.ArcRotateCamera;
  public scene: BABYLON.Scene;

  public constructor(private ngZone: NgZone) { }

  public createScene(canvas: ElementRef<HTMLCanvasElement>): void {
    // The first step is to get the reference of the canvas element from our HTML document
    this.canvas = canvas.nativeElement;
    this.engine = new BABYLON.Engine(this.canvas, true);
    BABYLON.Engine.ShadersRepository = '/assets/';
    //this.engine.enableOfflineSupport = false;

    // create a basic BJS Scene object
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = new BABYLON.Color4(0.9, 0.9, 0.9, 1);
    this.scene.useRightHandedSystem = true;

    // Preformance features
    this.scene.autoClear = false; // Color buffer
    this.scene.autoClearDepthAndStencil = false; // Depth and stencil, obviously

    // Colors for viewcube
    this.scene.ambientColor = BABYLON.Color3.White();

    // Parameters: alpha, beta, radius, target position, scene
    this.camera = new BABYLON.ArcRotateCamera("Camera", 0, 0, 0.1, BABYLON.Vector3.Zero(), this.scene);
    this.camera.minZ = 0.01;
    this.camera.maxZ = 1000;
    this.camera.wheelPrecision = 500;
    this.camera.upVector = new BABYLON.Vector3(0, 0, 1);
    this.camera.lowerRadiusLimit = 0.01;
    this.camera.upperRadiusLimit = 5;
    //this.camera.panningAxis = new BABYLON.Vector3(1, 1, 0);
    //this.camera._panningMouseButton = 0;
    this.camera.panningSensibility = 10000;

    // Positions the camera overwriting alpha, beta, radius
    this.camera.setPosition(new BABYLON.Vector3(0, 0, 2));

    // This attaches the camera to the canvas
    this.camera.attachControl(this.canvas, true);

    // Generates the world x-y-z axis for better understanding
    this.showWorldAxis(0.1);

    this.scene.activeCameras.push(this.camera);

  }

  public animate(): void {
    // We have to run this outside angular zones,
    // because it could trigger heavy changeDetection cycles.
    this.ngZone.runOutsideAngular(() => {
      const rendererLoopCallback = () => {
        this.scene.render();
      };

      if (document.readyState !== 'loading') {
        this.engine.runRenderLoop(rendererLoopCallback);
      } else {
        window.addEventListener('DOMContentLoaded', () => {
          this.engine.runRenderLoop(rendererLoopCallback);
        });
      }

      window.addEventListener('resize', () => {
        this.engine.resize();
      });
    });
  }

  /**
   * Create the world axes
   * Source: https://doc.babylonjs.com/snippets/world_axes
   * @param size number
   */
  public showWorldAxis(size: number) {

    const axisX = BABYLON.Mesh.CreateLines('axisX',
      [
        BABYLON.Vector3.Zero(),
        new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0.05 * size, 0),
        new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, -0.05 * size, 0)
      ], this.scene);
    axisX.color = new BABYLON.Color3(1, 0, 0);

    const axisY = BABYLON.Mesh.CreateLines('axisY',
      [
        BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3(-0.05 * size, size * 0.95, 0),
        new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3(0.05 * size, size * 0.95, 0)
      ], this.scene);
    axisY.color = new BABYLON.Color3(0, 1, 0);

    const axisZ = BABYLON.Mesh.CreateLines('axisZ',
      [
        BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3(0, -0.05 * size, size * 0.95),
        new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3(0, 0.05 * size, size * 0.95)
      ], this.scene);
    axisZ.color = new BABYLON.Color3(0, 0, 1);
  }

}
