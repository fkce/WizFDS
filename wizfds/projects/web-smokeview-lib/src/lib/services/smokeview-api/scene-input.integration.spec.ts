import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { SmokeviewApiService } from './smokeview-api.service';
import { BabylonService } from '../babylon/babylon.service';
import { SceneRegistryService } from '../babylon/scene-registry.service';
import { SceneInput } from '../drawing/scene-input';

/**
 * Freeze a whole object graph, so that any write into it throws.
 *
 * Modules are strict-mode code, so an assignment to a frozen property is a
 * TypeError rather than a silent no-op. That is what makes this a test rather
 * than a decoration.
 */
function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) { return value; }
  Object.freeze(value);
  Object.keys(value).forEach(key => deepFreeze((value as any)[key]));
  return value;
}

/** One of everything the preview draws, in a 10 x 8 x 4 m room. */
function sceneInput(): SceneInput {
  return {
    meshes: [
      { uuid: 'mesh-uuid', id: 'MESH', xb: { x1: 0, x2: 10, y1: 0, y2: 8, z1: 0, z2: 4 } }
    ],
    obsts: [
      {
        uuid: 'w1-uuid', id: 'W1', surfId: 'WALL', permitHole: true,
        xb: { x1: 0, x2: 4, y1: 2, y2: 2.2, z1: 0, z2: 3 },
        color: { r: 1, g: 208 / 255, b: 0, a: 1 }
      },
      {
        uuid: 'w2-uuid', id: 'W2', surfId: 'GLASS', permitHole: false,
        xb: { x1: 6, x2: 8, y1: 2, y2: 2.2, z1: 0, z2: 3 },
        color: { r: 0, g: 128 / 255, b: 1, a: 0.4 }
      }
    ],
    holes: [
      { uuid: 'door-uuid', id: 'DOOR', xb: { x1: 1, x2: 2, y1: 1.9, y2: 2.3, z1: 0, z2: 2.1 } }
    ],
    opens: [
      { uuid: 'open-uuid', id: 'OPEN', xb: { x1: 0, x2: 4, y1: 0, y2: 0, z1: 0, z2: 3 } }
    ],
    vents: [
      {
        uuid: 'v1-uuid', id: 'V1',
        xb: { x1: 0, x2: 2, y1: 0, y2: 2, z1: 1, z2: 1 },
        color: { r: 0, g: 0.8, b: 0.1, a: 0.5 }
      }
    ],
    fires: [
      {
        uuid: 'f1-uuid', id: 'F1',
        xb: { x1: 1, x2: 3, y1: 1, y2: 3, z1: 0, z2: 0 },
        color: { r: 1, g: 0.5, b: 0, a: 1 }
      }
    ],
    jetfans: [
      {
        uuid: 'jf1-uuid', id: 'JF1', direction: '-z',
        xb: { x1: 2, x2: 8, y1: 3, y2: 5, z1: 1, z2: 3 },
        color: { r: 1, g: 0, b: 0, a: 0.5 }
      }
    ]
  };
}

/**
 * The library writes to nothing it is given.
 *
 * This is one half of the definition of done for #98; the other half is in the
 * app, where SceneInputService is shown to leave the `Fds` object byte-identical.
 * Together they close the loop: rendering a scenario cannot change it.
 */
describe('rendering a scene input', () => {
  let service: SmokeviewApiService;
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;

  beforeAll(async () => {
    // Without the CSG backend the &HOLE is skipped and the cutting path - the one
    // that used to read vis.xbNorm off the elements - would never run.
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
          loadShaderSources: () => Promise.reject(new Error('no shader assets under test')),
          createShaderMaterial: (spec: { name: string }) => Promise.resolve(
            new BABYLON.ShaderMaterial(spec.name, scene, { vertexSource: '', fragmentSource: '' }, {})
          )
        }
      }]
    });
    service = TestBed.inject(SmokeviewApiService);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  it('draws a whole scenario without writing into it', async () => {
    const frozen = deepFreeze(sceneInput());

    await expectAsync(service.render(frozen)).toBeResolved();
  });

  it('leaves the scene input exactly as it found it', async () => {
    const input = sceneInput();
    const before = JSON.stringify(input);

    await service.render(input);

    expect(JSON.stringify(input)).toBe(before);
  });

  it('draws the same scenario twice without writing into it', async () => {
    // Re-entering the view renders the same scenario again, against services that
    // are still holding the previous render's state.
    const frozen = deepFreeze(sceneInput());

    await service.render(frozen);

    await expectAsync(service.render(frozen)).toBeResolved();
  });

  it('draws an empty scenario without writing into it', async () => {
    const frozen = deepFreeze({
      meshes: [], obsts: [], holes: [], opens: [], vents: [], fires: [], jetfans: []
    } as SceneInput);

    await expectAsync(service.render(frozen)).toBeResolved();
  });

  it('puts every element of the scenario in the scene, addressable by uuid', async () => {
    const input = sceneInput();

    await service.render(input);

    // A pick has to resolve to an element of the scenario, whatever buffer it
    // ended up in - so every uuid that was handed over has to be findable.
    const registry = TestBed.inject(SceneRegistryService);
    ['mesh-uuid', 'w1-uuid', 'w2-uuid', 'open-uuid', 'v1-uuid', 'f1-uuid', 'jf1-uuid']
      .forEach(uuid => {
        expect(registry.entryFor(uuid)).withContext(`${uuid} must be in the registry`).toBeTruthy();
      });
  });
});
