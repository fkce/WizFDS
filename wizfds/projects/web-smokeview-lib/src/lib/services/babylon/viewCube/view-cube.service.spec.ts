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

    it('stays clickable in a scene tuned for static drawing', () => {
      // tuneForStaticScene() runs before the cube is built, and the
      // Intermediate performance priority it sets means every mesh created
      // after it is born with isPickable = false. The cube used to rely on
      // the old default - and every click on it fell straight through.
      scene.performancePriority = BABYLON.ScenePerformancePriority.Intermediate;

      service.init();
      scene.pointerX = engine.getRenderWidth() * 0.95;
      scene.pointerY = engine.getRenderHeight() * 0.1;

      expect(service.pickSide())
        .withContext('a face or corner of the cube under the pointer')
        .toBeTruthy();
    });
  });

  describe('lighting what a click would take', () => {
    // The azure half-glass over the part under the pointer. It used to ride
    // Babylon's ActionManager hover triggers, which need the scene picked on
    // every pointer move - exactly what tuneForStaticScene() turned off. The
    // cube lights itself now, from the same pick the component already makes.

    beforeEach(() => {
      scene.performancePriority = BABYLON.ScenePerformancePriority.Intermediate;
      service.init();
      scene.pointerX = engine.getRenderWidth() * 0.95;
      scene.pointerY = engine.getRenderHeight() * 0.1;
    });

    it('lights the part under the pointer', () => {
      const side = service.pickSide();

      service.highlight(side);

      expect(scene.getMeshByName(side).material.alpha).toBe(0.5);
    });

    it('puts the light out when the pointer moves on', () => {
      const side = service.pickSide();
      service.highlight(side);

      service.highlight(null);

      expect(scene.getMeshByName(side).material.alpha).toBe(0);
    });

    it('moves the light, never doubles it', () => {
      const side = service.pickSide();
      const other = side === 'front' ? 'back' : 'front';
      service.highlight(side);

      service.highlight(other);

      expect(scene.getMeshByName(side).material.alpha).toBe(0);
      expect(scene.getMeshByName(other).material.alpha).toBe(0.5);
    });

    it('ignores what is not a part of the cube', () => {
      expect(() => service.highlight('viewBox')).not.toThrow();
      expect(() => service.highlight('no-such-mesh')).not.toThrow();
    });
  });

  describe('following the model camera', () => {

    it('mirrors the model camera\'s angles every frame', () => {
      // The cube used to integrate the same pointer events as the model
      // camera - and the two drifted apart the moment one of them hit a beta
      // limit the other did not. A mirror cannot drift.
      service.init();

      camera.alpha = 2.31;
      camera.beta = 0.77;
      scene.render();

      expect(service.cameraViewCube.alpha).toBeCloseTo(2.31, 10);
      expect(service.cameraViewCube.beta).toBeCloseTo(0.77, 10);
    });

    it('keeps mirroring at the beta limit, where the lockstep used to break', () => {
      // A CAD user lives in the top view: the model camera rides its
      // lowerBetaLimit clamp there, and an independently-integrating cube
      // kept turning past it - desynchronised for good.
      service.init();

      camera.beta = camera.lowerBetaLimit;
      scene.render();

      expect(service.cameraViewCube.beta).toBeCloseTo(camera.lowerBetaLimit, 10);
    });

    it('does not listen to the pointer itself', () => {
      // Two integrations of one event stream is the drift bug; the cube's
      // camera follows the mirror and nothing else.
      service.init();

      expect(service.cameraViewCube.inputs.attachedToElement).toBeFalse();
    });
  });
});
