import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { InitService } from './init.service';
import { ZoneService } from '../zone/zone.service';
import { BabylonService } from '../../babylon/babylon.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { SceneBoundsService } from '../../scene-bounds/scene-bounds.service';

describe('InitService', () => {
  let service: InitService;
  let zones: ZoneService;
  let registry: SceneRegistryService;
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);

    TestBed.configureTestingModule({
      providers: [{
        provide: BabylonService,
        useValue: {
          scene: scene,
          createShaderMaterial: (spec: { name: string }) => Promise.resolve(
            new BABYLON.ShaderMaterial(spec.name, scene, { vertexSource: '', fragmentSource: '' }, {})
          )
        }
      }]
    });
    service = TestBed.inject(InitService);
    zones = TestBed.inject(ZoneService);
    registry = TestBed.inject(SceneRegistryService);
    TestBed.inject(SceneBoundsService).setFrom([{ x1: 0, x2: 10, y1: 0, y2: 8, z1: 0, z2: 4 }]);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('draws the &INITs of the scenario, addressable by uuid', async () => {
    service.inits = [{
      uuid: 'init-uuid', id: 'HOT_LAYER',
      xb: { x1: 0, x2: 10, y1: 0, y2: 8, z1: 2.5, z2: 4 },
      color: { r: 0.67, g: 0.39, b: 1, a: 0.25 }
    }];

    await service.renderInits();

    expect(registry.entryFor('init-uuid').mesh).toBe(service.mesh);
  });

  it('draws them apart from the &ZONEs, so either can be hidden on its own', async () => {
    service.inits = [{
      uuid: 'init-uuid', id: 'HOT_LAYER', xb: { x1: 0, x2: 10, y1: 0, y2: 8, z1: 2.5, z2: 4 },
      color: { r: 0.67, g: 0.39, b: 1, a: 0.25 }
    }];
    zones.zones = [{
      uuid: 'zone-uuid', id: 'SHAFT', xb: { x1: 8, x2: 10, y1: 6, y2: 8, z1: 0, z2: 4 },
      color: { r: 1, g: 0.35, b: 0.78, a: 0.25 }
    }];

    await service.renderInits();
    await zones.renderZones();

    expect(service.mesh).not.toBe(zones.mesh);

    service.toggleVisibility();

    expect(service.mesh.isEnabled()).toBeFalse();
    expect(zones.mesh.isEnabled()).withContext('the zones are untouched').toBeTrue();
  });
});
