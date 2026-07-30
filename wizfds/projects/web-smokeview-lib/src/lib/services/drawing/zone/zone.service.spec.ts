import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { ZoneService } from './zone.service';
import { BabylonService } from '../../babylon/babylon.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { SceneBoundsService } from '../../scene-bounds/scene-bounds.service';

describe('ZoneService', () => {
  let service: ZoneService;
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
    service = TestBed.inject(ZoneService);
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

  it('draws the &ZONEs of the scenario, addressable by uuid', async () => {
    service.zones = [{
      uuid: 'zone-uuid', id: 'SHAFT',
      xb: { x1: 8, x2: 10, y1: 6, y2: 8, z1: 0, z2: 4 },
      color: { r: 1, g: 0.35, b: 0.78, a: 0.25 }
    }];

    await service.renderZones();

    expect(registry.entryFor('zone-uuid').mesh).toBe(service.mesh);
  });

  it('clears them when the scenario has none left', async () => {
    service.zones = [{
      uuid: 'zone-uuid', id: 'SHAFT', xb: { x1: 8, x2: 10, y1: 6, y2: 8, z1: 0, z2: 4 },
      color: { r: 1, g: 0.35, b: 0.78, a: 0.25 }
    }];
    await service.renderZones();

    service.zones = [];
    await service.renderZones();

    expect(registry.entryFor('zone-uuid')).toBeUndefined();
    expect(service.mesh.isEnabled()).toBeFalse();
  });
});
