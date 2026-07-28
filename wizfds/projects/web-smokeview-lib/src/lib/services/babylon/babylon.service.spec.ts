import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { BabylonService } from './babylon.service';
import { SceneLifecycleService } from './scene-lifecycle.service';
import { SceneBoundsService } from '../scene-bounds/scene-bounds.service';

describe('BabylonService', () => {

  /**
   * navigator.gpu is an accessor on Navigator.prototype, so an own property
   * shadows it for the duration of a spec. The detection under test reads
   * navigator.gpu directly, which is exactly what this replaces.
   */
  let originalGpuDescriptor: PropertyDescriptor | undefined;

  const setNavigatorGpu = (value: unknown) => {
    Object.defineProperty(navigator, 'gpu', { value, configurable: true });
  };

  const canvasRef = () => new ElementRef(document.createElement('canvas'));

  beforeEach(() => {
    originalGpuDescriptor = Object.getOwnPropertyDescriptor(navigator, 'gpu');
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    if (originalGpuDescriptor) {
      Object.defineProperty(navigator, 'gpu', originalGpuDescriptor);
    } else {
      delete (navigator as any).gpu;
    }
  });

  it('should be created', () => {
    const service: BabylonService = TestBed.inject(BabylonService);
    expect(service).toBeTruthy();
  });

  it('loads shader sources as WGSL from the flat assets/shaders directory', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.callFake((input: RequestInfo | URL) =>
      Promise.resolve(new Response(`// ${String(input)}`, { status: 200 })));
    const service: BabylonService = TestBed.inject(BabylonService);

    const sources = await service.loadShaderSources('obst');

    const urls = fetchSpy.calls.allArgs().map(args => String(args[0]));
    expect(urls).toContain(jasmine.stringMatching(/\/assets\/shaders\/obst\.vertex\.wgsl$/));
    expect(urls).toContain(jasmine.stringMatching(/\/assets\/shaders\/obst\.fragment\.wgsl$/));
    expect(urls.some(url => url.includes('/glsl/') || url.endsWith('.fx'))).toBeFalse();
    expect(sources.shaderLanguage).toBe(BABYLON.ShaderLanguage.WGSL);
  });

  it('fetches each shader once, however many materials ask for it', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.callFake((input: RequestInfo | URL) =>
      Promise.resolve(new Response(`// ${String(input)}`, { status: 200 })));
    const service: BabylonService = TestBed.inject(BabylonService);

    await Promise.all([
      service.loadShaderSources('obst'),
      service.loadShaderSources('obst'),
      service.loadShaderSources('obst')
    ]);

    // one vertex + one fragment request, not three of each
    expect(fetchSpy.calls.count()).toBe(2);
  });

  it('pairs an instanced vertex stage with the fragment stage it shares', async () => {
    // A pool of thin instances reads its colour and its transform per instance,
    // so it needs a vertex stage of its own - but it lights and clips a fragment
    // exactly as the shared buffers do, and copying that would let the two drift.
    const fetchSpy = spyOn(window, 'fetch').and.callFake((input: RequestInfo | URL) =>
      Promise.resolve(new Response(`// ${String(input)}`, { status: 200 })));
    const service: BabylonService = TestBed.inject(BabylonService);

    await service.loadShaderSources('obstInstanced', 'obst');

    const urls = fetchSpy.calls.allArgs().map(args => String(args[0]));
    expect(urls).toContain(jasmine.stringMatching(/\/obstInstanced\.vertex\.wgsl$/));
    expect(urls).toContain(jasmine.stringMatching(/\/obst\.fragment\.wgsl$/));
    expect(urls.some(url => url.endsWith('obstInstanced.fragment.wgsl'))).toBeFalse();
  });

  it('fetches a shared fragment stage once across the shaders that pair with it', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.callFake((input: RequestInfo | URL) =>
      Promise.resolve(new Response(`// ${String(input)}`, { status: 200 })));
    const service: BabylonService = TestBed.inject(BabylonService);

    await Promise.all([
      service.loadShaderSources('obst'),
      service.loadShaderSources('obstInstanced', 'obst')
    ]);

    const fragments = fetchSpy.calls.allArgs()
      .map(args => String(args[0]))
      .filter(url => url.endsWith('obst.fragment.wgsl'));
    expect(fragments.length).toBe(1);
  });

  it('builds a shader material from a shader name', async () => {
    spyOn(window, 'fetch').and.callFake((input: RequestInfo | URL) =>
      Promise.resolve(new Response(`// ${String(input)}`, { status: 200 })));
    const service: BabylonService = TestBed.inject(BabylonService);
    const engine = new BABYLON.NullEngine();
    service.scene = new BABYLON.Scene(engine);

    const material = await service.createShaderMaterial({
      name: 'fireShader',
      shader: 'fire',
      needAlphaBlending: true
    });

    expect(material.name).toBe('fireShader');
    // attributes and uniforms follow from the shader, so the caller need not repeat them
    expect(material.options.uniforms).toEqual(['clipX', 'clipY', 'clipZ', 'transparent']);
    expect(material.options.attributes).toEqual(['position', 'normal', 'color']);
    expect(material.options.needAlphaBlending).toBeTrue();
    // WGSL needs the Scene and Mesh UBOs bound, which is the wiring being centralised
    expect(material.options.uniformBuffers).toContain('Scene');
    expect(material.options.uniformBuffers).toContain('Mesh');
    expect(material.options.shaderLanguage).toBe(BABYLON.ShaderLanguage.WGSL);

    service.scene.dispose();
    engine.dispose();
  });

  it('reports WebGPU as unavailable instead of falling back to WebGL', async () => {
    setNavigatorGpu(undefined);
    const service: BabylonService = TestBed.inject(BabylonService);
    const seen: (BABYLON.Scene | null)[] = [];
    service.scene$.subscribe(scene => seen.push(scene));

    await service.createScene(canvasRef());

    expect(service.webGPUAvailable).toBeFalse();
    expect(service.engine).toBeFalsy();
    expect(service.scene).toBeFalsy();
    expect(seen).toEqual([null]);
  });

  it('reports WebGPU as unavailable when the engine fails to initialise', async () => {
    // navigator.gpu present but useless - requestAdapter() rejects inside initAsync()
    setNavigatorGpu({ requestAdapter: () => Promise.reject(new Error('no adapter')) });
    const service: BabylonService = TestBed.inject(BabylonService);
    const seen: (BABYLON.Scene | null)[] = [];
    service.scene$.subscribe(scene => seen.push(scene));

    await service.createScene(canvasRef());

    expect(service.webGPUAvailable).toBeFalse();
    expect(service.scene).toBeFalsy();
    expect(seen).toEqual([null]);
  });

  describe('framing the model', () => {
    /** A ~68 x 36 x 11 m building, and an element that was never given coordinates. */
    const BUILDING = { x1: -39.9, x2: 27.6, y1: -25.5, y2: 10.8, z1: -4.2, z2: 6.9 };
    const UNSET = { x1: -1e20, x2: 1e20, y1: -1e20, y2: 1e20, z1: -1e20, z2: 1e20 };

    let service: BabylonService;
    let bounds: SceneBoundsService;
    let engine: BABYLON.NullEngine;
    let scene: BABYLON.Scene;

    beforeEach(() => {
      service = TestBed.inject(BabylonService);
      bounds = TestBed.inject(SceneBoundsService);
      engine = new BABYLON.NullEngine();
      scene = new BABYLON.Scene(engine);

      // The state createScene() leaves behind; it needs a real WebGPU adapter,
      // which the suite has no way to provide.
      service.scene = scene;
      service.engine = engine as any;
      service.camera = new BABYLON.ArcRotateCamera('Camera', 0, 0, 2, BABYLON.Vector3.Zero(), scene);
      service.camera.upVector = new BABYLON.Vector3(0, 0, 1);

      bounds.setFrom([BUILDING, UNSET]);
    });

    afterEach(() => {
      scene.dispose();
      engine.dispose();
    });

    it('stands the camera off the measured model, not off a mesh at the sentinel', () => {
      // The view cube's fly-to-side read the obst mesh's bounding sphere, 1e20 m
      // across, and flew the camera to the far radius limit. Both now ask this.
      const radius = service.radiusToFit();

      expect(radius).toBeGreaterThan(bounds.boundingRadius);
      expect(radius).toBeLessThan(1000);
    });

    it('does not open the scene looking down the axis it calls up', () => {
      // Straight above the centre with the up vector along +Z is the degenerate
      // case: Babylon clamps beta to almost nothing and the model reads as a flat
      // plan. A scenario has to open showing that it has height.
      service.applySceneBounds();

      expect(service.camera.beta).toBeGreaterThan(0.2);
      expect(service.camera.beta).toBeLessThan(Math.PI - 0.2);
    });

    it('looks at the middle of the model', () => {
      service.applySceneBounds();

      expect(service.camera.target.x).toBeCloseTo(bounds.center.x, 6);
      expect(service.camera.target.y).toBeCloseTo(bounds.center.y, 6);
      expect(service.camera.target.z).toBeCloseTo(bounds.center.z, 6);
    });
  });

  describe('a scene that only changes when the user edits it', () => {
    // Outside an edit the preview draws the same geometry frame after frame -
    // the "unused mechanisms for static scenes" part of #87. Two of the three
    // Babylon offers break thin instances outright; see tuneForStaticScene().

    let service: BabylonService;
    let engine: BABYLON.NullEngine;
    let scene: BABYLON.Scene;

    beforeEach(() => {
      service = TestBed.inject(BabylonService);
      engine = new BABYLON.NullEngine();
      scene = new BABYLON.Scene(engine);
      service.scene = scene;
      service.engine = engine as any;
    });

    afterEach(() => {
      scene.dispose();
      engine.dispose();
    });

    it('does not pick the whole scene on every movement of the pointer', () => {
      // At ten thousand obsts that is ten thousand ray tests per mouse move.
      // What the library needs picked, it picks itself.
      service.tuneForStaticScene();

      expect(scene.skipPointerMovePicking).toBe(true);
    });

    it('still clears the background', () => {
      // The setting turns auto-clear off, which is right for a scene that covers
      // the canvas. A model does not: whatever it leaves uncovered would keep the
      // previous frame and smear as the camera orbits.
      service.tuneForStaticScene();

      expect(scene.autoClear)
        .withContext('the background is the clear colour, not geometry')
        .toBe(true);
    });

    it('does not keep the render state between frames', () => {
      // Measured on a WebGPU device: with the aggressive setting, changing a
      // pool's instance count stops the pool being drawn at all - only its
      // outlines survive - and resetDrawCache() does not bring it back.
      service.tuneForStaticScene();

      expect(scene.performancePriority)
        .not.toBe(BABYLON.ScenePerformancePriority.Aggressive);
      expect(scene.renderingManager.maintainStateBetweenFrames).toBe(false);
    });

    it('is safe to call before there is a scene', () => {
      service.scene = null;

      expect(() => service.tuneForStaticScene()).not.toThrow();
    });
  });

  describe('scene lifecycle', () => {
    let service: BabylonService;
    let engine: BABYLON.NullEngine;

    beforeEach(() => {
      service = TestBed.inject(BabylonService);
      engine = new BABYLON.NullEngine();
    });

    afterEach(() => {
      engine.dispose();
    });

    it('tells subscribers there is no scene before one is built', () => {
      const seen: (BABYLON.Scene | null)[] = [];

      service.scene$.subscribe(scene => seen.push(scene));

      expect(seen).toEqual([null]);
    });

    /**
     * Put the service in the state createScene() leaves behind. That method
     * needs a real WebGPU adapter, which the suite has no way to provide, so
     * the scene is announced through the subject directly.
     */
    const announceScene = (scene: BABYLON.Scene) => {
      service.scene = scene;
      service.engine = engine as any;
      (service as any).sceneSubject.next(scene);
    };

    it('emits null when the scene is disposed', () => {
      const scene = new BABYLON.Scene(engine);
      announceScene(scene);
      const seen: (BABYLON.Scene | null)[] = [];
      service.scene$.subscribe(s => seen.push(s));

      service.disposeScene();

      expect(seen).toEqual([scene, null]);
      expect(service.scene).toBeNull();
    });

    it('does not emit twice when disposed twice', () => {
      announceScene(new BABYLON.Scene(engine));
      service.disposeScene();
      const seen: (BABYLON.Scene | null)[] = [];
      service.scene$.subscribe(s => seen.push(s));

      service.disposeScene();

      expect(seen).toEqual([null]);
    });

    it('does not replay a disposed scene to a late subscriber', () => {
      // The bug this fixes: ready$ was a ReplaySubject(1), so re-entering the
      // view replayed the previous scene's signal and drawing started against a
      // scene that no longer existed.
      service.scene = new BABYLON.Scene(engine);
      service.engine = engine as any;
      service.disposeScene();

      const seen: (BABYLON.Scene | null)[] = [];
      service.scene$.subscribe(scene => seen.push(scene));

      expect(seen).toEqual([null]);
    });

    it('resets the scene-scoped services when the scene is disposed', () => {
      const lifecycle = TestBed.inject(SceneLifecycleService);
      let resets = 0;
      lifecycle.register({ resetSceneState: () => resets++ });
      service.scene = new BABYLON.Scene(engine);
      service.engine = engine as any;

      service.disposeScene();

      expect(resets).toBe(1);
    });

    it('is safe to dispose when there is no scene', () => {
      expect(() => service.disposeScene()).not.toThrow();
    });
  });
});
