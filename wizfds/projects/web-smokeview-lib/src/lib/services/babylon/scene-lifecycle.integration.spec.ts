import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { BabylonService } from './babylon.service';
import { SceneLifecycleService } from './scene-lifecycle.service';
import { ObstService } from '../drawing/obst/obst.service';
import { MeshService } from '../drawing/mesh/mesh.service';
import { OpenService } from '../drawing/open/open.service';
import { FireService } from '../drawing/fire/fire.service';
import { VentService } from '../drawing/vent/vent.service';
import { JetfanService } from '../drawing/jetfan/jetfan.service';
import { SliceService } from '../drawing/slice/slice.service';
import { ViewCubeService } from './viewCube/view-cube.service';
import { PlayerService } from '../player/player.service';

/**
 * Every drawing service is providedIn: 'root' and outlives the scene it draws
 * into. This checks the wiring rather than any one service: injecting a service
 * must be enough for the scene lifecycle to reach it, so that adding a new one
 * cannot silently miss the reset.
 */
describe('scene lifecycle wiring', () => {
  let engine: BABYLON.NullEngine;

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    engine.dispose();
  });

  it('resets every drawing service when the scene is disposed', () => {
    const babylon = TestBed.inject(BabylonService);
    // Injecting is what registers them - the constructor does the registration
    const services = [
      TestBed.inject(ObstService),
      TestBed.inject(MeshService),
      TestBed.inject(OpenService),
      TestBed.inject(FireService),
      TestBed.inject(VentService),
      TestBed.inject(JetfanService),
      TestBed.inject(SliceService),
      TestBed.inject(ViewCubeService),
      TestBed.inject(PlayerService)
    ];
    const resets = services.map(service => {
      const spy = spyOn(service, 'resetSceneState').and.callThrough();
      return spy;
    });

    babylon.scene = new BABYLON.Scene(engine);
    babylon.engine = engine as any;
    babylon.disposeScene();

    resets.forEach((spy, i) => {
      expect(spy).withContext(`${services[i].constructor.name} must be reset`).toHaveBeenCalledTimes(1);
    });
  });

  it('leaves no Babylon object behind on any scene-scoped service', () => {
    // The reset methods clear fields by name, and a field added later is easy
    // to miss - which is how SliceService kept a slices[] array of live meshes
    // after its first version shipped. This walks what is actually there.
    const babylon = TestBed.inject(BabylonService);
    const services: { name: string, instance: any }[] = [
      { name: 'ObstService', instance: TestBed.inject(ObstService) },
      { name: 'MeshService', instance: TestBed.inject(MeshService) },
      { name: 'OpenService', instance: TestBed.inject(OpenService) },
      { name: 'FireService', instance: TestBed.inject(FireService) },
      { name: 'VentService', instance: TestBed.inject(VentService) },
      { name: 'JetfanService', instance: TestBed.inject(JetfanService) },
      { name: 'SliceService', instance: TestBed.inject(SliceService) },
      { name: 'ViewCubeService', instance: TestBed.inject(ViewCubeService) },
      { name: 'PlayerService', instance: TestBed.inject(PlayerService) }
    ];

    const scene = new BABYLON.Scene(engine);
    babylon.scene = scene;
    babylon.engine = engine as any;
    // Hand each service something from the scene to hold on to
    services.forEach(({ instance }) => {
      Object.keys(instance).forEach(key => {
        if (instance[key] === null || instance[key] === undefined) {
          const probe = new BABYLON.Mesh(`probe-${key}`, scene);
          instance[key] = probe;
        }
      });
    });

    babylon.disposeScene();

    services.forEach(({ name, instance }) => {
      Object.keys(instance).forEach(key => {
        const value = instance[key];
        const isBabylonObject = value instanceof BABYLON.Node || value instanceof BABYLON.Material;
        expect(isBabylonObject)
          .withContext(`${name}.${key} still holds a Babylon object after the scene was disposed`)
          .toBeFalse();
      });
    });
  });

  it('registers each drawing service exactly once', () => {
    const lifecycle = TestBed.inject(SceneLifecycleService);
    const obst = TestBed.inject(ObstService);
    const spy = spyOn(obst, 'resetSceneState');

    // Injecting again returns the same singleton, so no second registration
    TestBed.inject(ObstService);
    lifecycle.reset();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
