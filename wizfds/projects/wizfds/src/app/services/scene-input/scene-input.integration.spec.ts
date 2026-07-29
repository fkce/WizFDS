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
import {
  SceneLifecycleService
} from '../../../../../web-smokeview-lib/src/lib/services/babylon/scene-lifecycle.service';
import {
  SceneBoundsService
} from '../../../../../web-smokeview-lib/src/lib/services/scene-bounds/scene-bounds.service';

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
          // A getter, not a field: leaving the view disposes the scene and the
          // next one is a different object, exactly as BabylonService does
          get scene() { return scene; },
          camera: { setPosition: () => { }, setTarget: () => { } },
          applySceneBounds: () => { },
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

  describe('re-entering the view after the geometry was edited', () => {
    /** What the geometry form leaves behind: ngModel on a text input. */
    function resizeMeshThroughTheForm(): void {
      const xb: any = fds.geometry.meshes[0].xb;
      xb.x1 = '10'; xb.x2 = '40';
      xb.y1 = '0'; xb.y2 = '30';
      xb.z1 = '0'; xb.z2 = '12';
    }

    /** Leaving the view and coming back: what BabylonService does either side. */
    function leaveAndReturn(): void {
      TestBed.inject(SceneLifecycleService).reset();
      scene.dispose();
      scene = new BABYLON.Scene(engine);
    }

    it('measures the scene from the mesh the user just resized', async () => {
      // Reported as "the render is wrong after changing the mesh and coming
      // back". The mesh arrived as six strings, Number.isFinite said none of
      // them was measurable, and the scene silently kept its default ten-metre
      // box - so the camera, the clip sliders and every width followed a model
      // that was not on screen.
      await smokeviewApi.render(sceneInput.fromFds(fds));
      leaveAndReturn();

      resizeMeshThroughTheForm();
      await smokeviewApi.render(sceneInput.fromFds(fds));

      const bounds = TestBed.inject(SceneBoundsService);
      expect(bounds.box).toEqual({ x1: 10, x2: 40, y1: 0, y2: 30, z1: 0, z2: 12 });
      expect(bounds.extent).toBe(30);
    });

    it('draws that mesh where the scenario puts it', async () => {
      // `x1 + x2` on two strings concatenates: 10 and 40 became '1040', so the
      // mesh was drawn centred on 520 m and the model left the screen.
      await smokeviewApi.render(sceneInput.fromFds(fds));
      leaveAndReturn();

      resizeMeshThroughTheForm();
      await smokeviewApi.render(sceneInput.fromFds(fds));

      const pool = scene.getMeshByName('meshes') as BABYLON.Mesh;
      const centre = BABYLON.Vector3.TransformCoordinates(
        BABYLON.Vector3.Zero(), pool.thinInstanceGetWorldMatrices()[0]);

      expect(centre.x).toBeCloseTo(25, 6);
      expect(centre.y).toBeCloseTo(15, 6);
      expect(centre.z).toBeCloseTo(6, 6);
    });
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
