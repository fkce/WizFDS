import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { ViewCubeService } from './view-cube.service';
import { BabylonService } from '../babylon.service';

describe('ViewCubeService', () => {
  let service: ViewCubeService;
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;
  let camera: BABYLON.ArcRotateCamera;

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    camera = new BABYLON.ArcRotateCamera('Camera', 0, 0, 2, BABYLON.Vector3.Zero(), scene);

    TestBed.configureTestingModule({
      providers: [{
        provide: BabylonService,
        useValue: {
          scene: scene,
          camera: camera,
          engine: engine,
          canvas: document.createElement('canvas')
        }
      }]
    });
    service = TestBed.inject(ViewCubeService);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('keeping the cube out of the model, and the model out of the cube', () => {
    // Both used to be a matter of distance: the cube stands a thousand units from
    // the origin, which put it out of sight while the whole scene was one unit
    // across. In metres 1:1 (ADR-0002) a hundred-metre model reaches far enough
    // to show up in the cube's corner of the screen.

    it('draws the cube only through its own camera', () => {
      service.init();

      expect(service.viewCube.layerMask & camera.layerMask)
        .withContext('the main camera must not draw the cube')
        .toBe(0);
      expect(service.viewCube.layerMask & service.cameraViewCube.layerMask)
        .withContext('the cube camera must draw it')
        .not.toBe(0);
    });

    it('puts every part of the cube on that layer, not just the cube itself', () => {
      // Twenty-six hit boxes and six faces; one left behind is a box floating in
      // the middle of the model.
      service.init();

      const strays = scene.meshes.filter(mesh => (mesh.layerMask & camera.layerMask) !== 0);
      expect(strays.map(mesh => mesh.name)).toEqual([]);
    });

    it('picks only the cube, never geometry on another layer', () => {
      // scene.pick() does not honour layer masks the way rendering does, so the
      // cube's own pick has to say so. In the running app an obst at the FDS
      // sentinel - a box surrounding the cube's camera on every side - answered
      // first for most of the cube's corner of the screen, and clicking a face
      // did nothing at all.
      service.init();
      BABYLON.MeshBuilder.CreateBox('sentinelObst', { size: 1e20 }, scene);
      scene.pointerX = engine.getRenderWidth() * 0.95;
      scene.pointerY = engine.getRenderHeight() * 0.1;

      const picked = service.pickSide();

      expect(picked).withContext('a face or corner of the cube').toBeTruthy();
      expect(scene.getMeshByName(picked).layerMask & camera.layerMask)
        .withContext(`${picked} must be part of the cube, not of the model`)
        .toBe(0);
    });

    it('leaves the model to the main camera alone', () => {
      const wall = BABYLON.MeshBuilder.CreateBox('wall', {}, scene);

      service.init();

      expect(wall.layerMask & camera.layerMask).not.toBe(0);
      expect(wall.layerMask & service.cameraViewCube.layerMask)
        .withContext('the cube camera must not draw the model')
        .toBe(0);
    });
  });
});
