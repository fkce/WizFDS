import { Injectable, NgZone, ElementRef, HostListener, isDevMode } from '@angular/core';
import * as BABYLON from 'babylonjs';
import 'babylonjs-materials';
import { ReplaySubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BabylonService {

  public canvas: HTMLCanvasElement;
  public engine: BABYLON.Engine;
  public camera: BABYLON.ArcRotateCamera;
  public scene: BABYLON.Scene;
  public readonly ready$ = new ReplaySubject<void>(1);
  // Feature flag: enable to use WGSL shader files. Default off to keep GLSLstable until validated.
  public useWGSL = false;

  public constructor(private ngZone: NgZone) { }

  /**
   * Resolve an assets-relative path (e.g. 'assets/shaders/mesh') against the app base href.
   * This ensures correct URL resolution when the app runs under nested routes or a subfolder.
   */
  public resolveAssetPath(relativePath: string): string {
    try {
      const base = (typeof document !== 'undefined' && document.baseURI) ? document.baseURI : '/';
      const url = new URL(relativePath, base);
  // Return absolute href to avoid any SPA router rewrites or base-href quirks
  return url.href;
    } catch {
      // Fallback to a root-anchored path
      return relativePath.startsWith('/') ? relativePath : '/' + relativePath;
    }
  }

  public async createScene(canvas: ElementRef<HTMLCanvasElement>): Promise<void> {
    // Clean up existing resources
    if (this.scene) {
      this.scene.dispose();
      this.scene = null;
    }
    if (this.engine) {
      this.engine.stopRenderLoop();
      this.engine.dispose();
      this.engine = null;
    }

    // The first step is to get the reference of the canvas element from our HTML document
    this.canvas = canvas.nativeElement;
    
    // Try WebGPU engine first (unless overridden by query params)
    let isWebGPU = false;

    // Diagnostics / overrides via query params: ?webgl=1 to force WebGL, ?wgsl=1 to force WGSL (when WebGPU available)
    let forceWebGL = false;
    let forceWGSL = false;
    try {
      const href = (typeof window !== 'undefined' && window.location?.href) ? window.location.href : '';
      if (href) {
        const params = new URL(href).searchParams;
        const yes = (v: string | null) => v === '1' || v === 'true';
        forceWebGL = yes(params.get('webgl'));
        forceWGSL = yes(params.get('wgsl'));
      }
    } catch {}

    const gpuSupported = typeof navigator !== 'undefined' && !!(navigator as any).gpu;

    try {
      const WebGPUEngineCtor = (BABYLON as any).WebGPUEngine;
      if (!forceWebGL) {
        const webgpu = new WebGPUEngineCtor(this.canvas, { 
          adaptToDeviceRatio: true,
          antialias: true,
          alpha: false,
          premultipliedAlpha: false,
          preserveDrawingBuffer: true
        });
        await (webgpu as any).initAsync();
        this.engine = webgpu as unknown as BABYLON.Engine;
        isWebGPU = true;
      } else {
        throw new Error('Forced WebGL via query param');
      }
    } catch (e) {
      // Fallback to WebGL engine
      this.engine = new BABYLON.Engine(this.canvas, true);
      isWebGPU = false;
    }
  // Choose shader language automatically
  this.useWGSL = isWebGPU;
  if (forceWGSL && !isWebGPU) {
    if (isDevMode()) console.warn('[BabylonService] WGSL was forced via ?wgsl=1, but WebGPU is not active. Using GLSL with WebGL.');
  }
  if (isDevMode()) console.info('[BabylonService] GPU supported:', gpuSupported, '| Engine:', isWebGPU ? 'WebGPU' : 'WebGL', '| useWGSL:', this.useWGSL);

  // Configure shader repositories to the app assets base path so we can pass shader names only (e.g. 'mesh').
  try {
    const repoBase = this.resolveAssetPath(`assets/shaders/${this.useWGSL ? 'wgsl' : 'glsl'}/`);
    (BABYLON as any).Engine.ShadersRepository = repoBase;
    (BABYLON as any).Effect.ShadersRepository = repoBase;
    (BABYLON as any).Effect.ShadersRepositoryWGSL = repoBase;
    // Force the default source processors to NO-OP so they don't rewrite our explicit URLs
    const EffectAny = (BABYLON as any).Effect;
    if (EffectAny) {
      try { EffectAny.SetShadersRepository?.(repoBase); } catch {}
      // Disable includes and preprocessors from pulling from default paths
      try { EffectAny.IncludesShadersStore = EffectAny.IncludesShadersStore || {}; } catch {}
      try { EffectAny.ShadersStore = EffectAny.ShadersStore || {}; } catch {}
    }
    if (isDevMode()) console.info('[BabylonService] ShadersRepository set to', repoBase);
  } catch {}

    // create a basic BJS Scene object
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.15, 1);
    this.scene.useRightHandedSystem = true;

    // Colors for viewcube
    this.scene.ambientColor = BABYLON.Color3.White();

    // Parameters: alpha, beta, radius, target position, scene
    this.camera = new BABYLON.ArcRotateCamera("Camera", 0, 0, 2, BABYLON.Vector3.Zero(), this.scene);
    this.camera.minZ = 0.01;
    this.camera.maxZ = 1000;
    this.camera.wheelPrecision = 500;
    this.camera.upVector = new BABYLON.Vector3(0, 0, 1);
    this.camera.lowerRadiusLimit = 0.1;
    this.camera.upperRadiusLimit = 50; // Increased from 5 to allow wider view
    this.camera.panningSensibility = 10000;

    // Positions the camera overwriting alpha, beta, radius
    this.camera.setPosition(new BABYLON.Vector3(1, 1, 1));

    // This attaches the camera to the canvas
    this.camera.attachControl(this.canvas, true);

    // Generates the world x-y-z axis for better understanding
    this.showWorldAxis(0.1);

    this.scene.activeCameras.push(this.camera);

    // Expose a back-reference so downstream code can access the flag when needed.
    (this.scene as any).babylonService = this;

    // Fix canvas resolution to match display size
    this.engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
    this.engine.resize();

    // signal ready
    this.ready$.next();
  }

  public animate(): void {
    // We have to run this outside angular zones,
    // because it could trigger heavy changeDetection cycles.
    this.ngZone.runOutsideAngular(() => {
      let frameCount = 0;
      const rendererLoopCallback = () => {
        this.scene.render();
        frameCount++;
      };

      if (document.readyState !== 'loading') {
        this.engine.runRenderLoop(rendererLoopCallback);
      } else {
        window.addEventListener('DOMContentLoaded', () => {
          this.engine.runRenderLoop(rendererLoopCallback);
        });
      }

      window.addEventListener('resize', () => {
        this.engine.resize();
      });
    });
  }

  /**
   * Load shader sources (vertex/fragment) as plain text from assets/shaders/{wgsl|glsl}.
   * This bypasses Babylon’s internal filename/extension inference and guarantees
   * we fetch the correct .wgsl or .fx files.
   */
  public async loadShaderSources(name: string): Promise<{
    vertexSource: string;
    fragmentSource: string;
    shaderLanguage: number; // 0: GLSL, 1: WGSL
    urls: { vertex: string; fragment: string };
  }> {
    const folder = this.useWGSL ? 'wgsl' : 'glsl';
    const ext = this.useWGSL ? 'wgsl' : 'fx';
    const base = this.resolveAssetPath(`assets/shaders/${folder}/${name}`);
    const vUrl = `${base}.vertex.${ext}`;
    const fUrl = `${base}.fragment.${ext}`;

    const [vRes, fRes] = await Promise.all([
      fetch(vUrl, { cache: 'no-cache' }),
      fetch(fUrl, { cache: 'no-cache' }),
    ]);

    if (!vRes.ok || !fRes.ok) {
      const err = `[BabylonService] Failed to fetch shader(s): ${!vRes.ok ? vUrl : ''} ${!fRes.ok ? fUrl : ''}`;
      if (isDevMode()) { try { console.error(err, { vStatus: vRes.status, fStatus: fRes.status }); } catch {} }
      throw new Error(err);
    }

    const [vertexSource, fragmentSource] = await Promise.all([vRes.text(), fRes.text()]);
    //try { console.debug('[BabylonService] Loaded shader sources', { vUrl, fUrl, lenV: vertexSource.length, lenF: fragmentSource.length, useWGSL: this.useWGSL }); } catch {}

    const shaderLanguage = this.useWGSL ? ((BABYLON as any).ShaderLanguage?.WGSL ?? 1) : ((BABYLON as any).ShaderLanguage?.GLSL ?? 0);
    return { vertexSource, fragmentSource, shaderLanguage, urls: { vertex: vUrl, fragment: fUrl } };
  }

  /**
   * Create the world axes
   * Source: https://doc.babylonjs.com/snippets/world_axes
   * @param size number
   */
  public showWorldAxis(size: number) {

    const axisX = BABYLON.Mesh.CreateLines('axisX',
      [
        BABYLON.Vector3.Zero(),
        new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0.05 * size, 0),
        new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, -0.05 * size, 0)
      ], this.scene, false);
    axisX.color = new BABYLON.Color3(1, 0, 0);

    const axisY = BABYLON.Mesh.CreateLines('axisY',
      [
        BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3(-0.05 * size, size * 0.95, 0),
        new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3(0.05 * size, size * 0.95, 0)
      ], this.scene, false);
    axisY.color = new BABYLON.Color3(0, 1, 0);

    const axisZ = BABYLON.Mesh.CreateLines('axisZ',
      [
        BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3(0, -0.05 * size, size * 0.95),
        new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3(0, 0.05 * size, size * 0.95)
      ], this.scene, false);
    axisZ.color = new BABYLON.Color3(0, 0, 1);
  }

}