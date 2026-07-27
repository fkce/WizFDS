import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { SceneInputService } from './scene-input.service';
import { Fds } from '@services/fds-object/fds-object';
import { deepSnapshot } from '../../../testing/deep-snapshot';
import { scenarioJson } from '../../../testing/scenario-fixture';
import {
  SmokeviewApiService
} from '../../../../../web-smokeview-lib/src/lib/services/smokeview-api/smokeview-api.service';
import {
  BabylonService
} from '../../../../../web-smokeview-lib/src/lib/services/babylon/babylon.service';

/**
 * The definition of done for #98: drawing a scenario leaves it byte-identical.
 *
 * The app owns the `Fds` object and auto-saves it while the preview is on screen
 * (ADR-0004), so a write from the view layer would end up in the database. This
 * runs the whole path - domain model, mapper, drawing services - against a
 * headless engine and compares the model before and after.
 */
describe('drawing a scenario', () => {
  let sceneInput: SceneInputService;
  let smokeviewApi: SmokeviewApiService;
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;
  let fds: Fds;

  beforeAll(async () => {
    // Without the CSG backend the &HOLE is skipped, and the hole-cutting path is
    // where the writes into the model used to be worst.
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
          // No WGSL is served in the suite; the drawing services treat a missing
          // shader as non-fatal and still build their meshes.
          loadShaderSources: () => Promise.reject(new Error('no shader assets under test')),
          createShaderMaterial: (spec: { name: string }) => Promise.resolve(
            new BABYLON.ShaderMaterial(spec.name, scene, { vertexSource: '', fragmentSource: '' }, {})
          )
        }
      }]
    });

    sceneInput = TestBed.inject(SceneInputService);
    smokeviewApi = TestBed.inject(SmokeviewApiService);
    fds = new Fds(JSON.stringify(scenarioJson()));
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  it('leaves the Fds object exactly as it was', async () => {
    const before = JSON.stringify(deepSnapshot(fds));

    await smokeviewApi.render(sceneInput.fromFds(fds));

    expect(JSON.stringify(deepSnapshot(fds))).toBe(before);
  });

  it('leaves it alone across repeated renders of the same scenario', async () => {
    // Re-entering the visualization view renders the same scenario again, and the
    // drawing services still hold the previous render's state.
    const before = JSON.stringify(deepSnapshot(fds));

    await smokeviewApi.render(sceneInput.fromFds(fds));
    await smokeviewApi.render(sceneInput.fromFds(fds));

    expect(JSON.stringify(deepSnapshot(fds))).toBe(before);
  });

  it('puts geometry in the scene - so the comparisons above are not vacuous', async () => {
    // An empty scenario would satisfy "unchanged" without proving anything.
    await smokeviewApi.render(sceneInput.fromFds(fds));

    expect(scene.meshes.length).toBeGreaterThan(0);
  });
});
