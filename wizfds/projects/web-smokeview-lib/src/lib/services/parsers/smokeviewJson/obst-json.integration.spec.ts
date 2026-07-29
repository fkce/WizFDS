import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { ObstJsonService } from './obst-json.service';
import { SmokeviewApiService } from '../../smokeview-api/smokeview-api.service';
import { BabylonService } from '../../babylon/babylon.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { ObstSelectionService } from '../../drawing/obst/obst-selection.service';

/**
 * The 24 vertices, 96 colour floats and 36 indices SmokeView writes for one
 * blockage - see `GetBlockNodes()` in `Source/smokeview/renderhtml.c`.
 */
function blockage(
  xb: { x1: number, x2: number, y1: number, y2: number, z1: number, z2: number },
  offset: number
) {
  const ii = [0, 1, 1, 0, 0, 1, 1, 0];
  const jj = [0, 0, 1, 1, 0, 0, 1, 1];
  const kk = [0, 0, 0, 0, 1, 1, 1, 1];
  const x = [xb.x1, xb.x2], y = [xb.y1, xb.y2], z = [xb.z1, xb.z2];

  const vertices: number[] = [];
  const colors: number[] = [];
  for (let group = 0; group < 3; group++) {
    for (let n = 0; n < 8; n++) {
      vertices.push(x[ii[n]], y[jj[n]], z[kk[n]]);
      colors.push(1, 208 / 255, 0, 1);
    }
  }

  const corners = [
    0, 1, 5, 0, 5, 4, 2, 3, 7, 2, 7, 6,
    1, 2, 6, 1, 6, 5, 3, 0, 4, 3, 4, 7,
    4, 5, 6, 4, 6, 7, 0, 2, 1, 0, 3, 2
  ];
  const indices = corners.map((corner, n) =>
    offset + (n < 12 ? 0 : n < 24 ? 8 : 16) + corner);

  return { vertices: vertices, colors: colors, indices: indices };
}

/**
 * Two walls well apart, as `<chid>_obst.json` holds them.
 *
 * The coordinates are SmokeView's own normalised ones - the export carries no
 * scale to undo that with, see ObstJsonService - so the model is one unit
 * across rather than ten metres.
 */
function obstExport() {
  const west = blockage({ x1: 0, x2: 0.02, y1: 0, y2: 0.6, z1: 0, z2: 0.3 }, 0);
  const east = blockage({ x1: 1, x2: 1.02, y1: 0, y2: 0.6, z1: 0, z2: 0.3 }, 24);

  return {
    vertices: [...west.vertices, ...east.vertices],
    colors: [...west.colors, ...east.colors],
    indices: [...west.indices, ...east.indices]
  };
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
  let selection: ObstSelectionService;
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
    selection = TestBed.inject(ObstSelectionService);
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
    selection.selectObst(ray);

    expect(selection.pickedObst).toBeTruthy();
    expect(selection.pickedObst.id).toBe('OBST 1');
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
