import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { ObstJsonService } from './obst-json.service';
import { exportOfBoxes } from './obst-json.fixture';
import { SmokeviewApiService } from '../../smokeview-api/smokeview-api.service';
import { BabylonService } from '../../babylon/babylon.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { PickService } from '../../picking/pick.service';

/**
 * Two walls well apart, as `<chid>_obst.json` holds them.
 *
 * The coordinates are SmokeView's own normalised ones - the export carries no
 * scale to undo that with, see ObstJsonService - so the model is one unit
 * across rather than ten metres.
 */
function obstExport() {
  return exportOfBoxes([
    { x1: 0, x2: 0.02, y1: 0, y2: 0.6, z1: 0, z2: 0.3 },
    { x1: 1, x2: 1.02, y1: 0, y2: 0.6, z1: 0, z2: 0.3 }
  ]);
}

/**
 * The standalone viewer draws through the same call as the app.
 *
 * This is the definition of done for #106: a `.smv` or `.json` simulation
 * loaded in `webSmokeview` goes through `render(scene)` exactly as a scenario
 * does in `wizfds`, and a ctrl+click lands on an obst. Neither was true of the
 * raw-buffer path this replaced - it registered nothing, so there was nothing
 * to select.
 */
describe('rendering a Smokeview export', () => {
  let adapter: ObstJsonService;
  let api: SmokeviewApiService;
  let registry: SceneRegistryService;
  let picking: PickService;
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;

  beforeAll(async () => {
    await BABYLON.InitializeCSG2Async({ manifoldUrl: '/assets/manifold' });
  });

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);

    TestBed.configureTestingModule({
      providers: [{
        provide: BabylonService,
        useValue: {
          scene: scene,
          camera: { setPosition: () => { }, setTarget: () => { } },
          applySceneBounds: () => { },
          loadShaderSources: () => Promise.reject(new Error('no shader assets under test')),
          createShaderMaterial: (spec: { name: string }) => Promise.resolve(
            new BABYLON.ShaderMaterial(spec.name, scene, { vertexSource: '', fragmentSource: '' }, {})
          )
        }
      }]
    });
    adapter = TestBed.inject(ObstJsonService);
    api = TestBed.inject(SmokeviewApiService);
    registry = TestBed.inject(SceneRegistryService);
    picking = TestBed.inject(PickService);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  it('draws every blockage of the export', async () => {
    await api.render(adapter.toScene(obstExport()));

    expect(registry.entryFor('smv-obst-0')).toBeTruthy();
    expect(registry.entryFor('smv-obst-1')).toBeTruthy();
  });

  it('selects the obst a ctrl+click lands on', async () => {
    await api.render(adapter.toScene(obstExport()));

    // Along +x at mid-height: the west wall first, as the pointer would find it
    const ray = new BABYLON.Ray(
      new BABYLON.Vector3(-1, 0.3, 0.15), new BABYLON.Vector3(1, 0, 0), 10);
    picking.pick(ray);

    expect(picking.lastSelected).toBeTruthy();
    expect(picking.lastSelected.id).toBe('OBST 1');
  });

  it('measures the scene from what was loaded', async () => {
    // The old path measured the raw position buffer; this one measures the
    // boxes, which is the same answer arrived at through the contract.
    const scene = adapter.toScene(obstExport());

    expect(scene.obsts.map(obst => obst.xb.x2)).toEqual([0.02, 1.02]);
  });

  it('leaves the export exactly as it found it', async () => {
    const data = obstExport();
    const before = JSON.stringify(data);

    await api.render(adapter.toScene(data));

    expect(JSON.stringify(data)).toBe(before);
  });
});
