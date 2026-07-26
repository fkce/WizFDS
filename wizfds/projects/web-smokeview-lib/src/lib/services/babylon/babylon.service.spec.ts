import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { BabylonService } from './babylon.service';

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

  it('reports WebGPU as unavailable instead of falling back to WebGL', async () => {
    setNavigatorGpu(undefined);
    const service: BabylonService = TestBed.inject(BabylonService);
    let ready = false;
    service.ready$.subscribe(() => ready = true);

    await service.createScene(canvasRef());

    expect(service.webGPUAvailable).toBeFalse();
    expect(service.engine).toBeFalsy();
    expect(service.scene).toBeFalsy();
    expect(ready).toBeFalse();
  });

  it('reports WebGPU as unavailable when the engine fails to initialise', async () => {
    // navigator.gpu present but useless - requestAdapter() rejects inside initAsync()
    setNavigatorGpu({ requestAdapter: () => Promise.reject(new Error('no adapter')) });
    const service: BabylonService = TestBed.inject(BabylonService);
    let ready = false;
    service.ready$.subscribe(() => ready = true);

    await service.createScene(canvasRef());

    expect(service.webGPUAvailable).toBeFalse();
    expect(service.scene).toBeFalsy();
    expect(ready).toBeFalse();
  });
});
