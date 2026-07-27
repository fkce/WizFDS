import { Injectable, NgZone, ElementRef, HostListener, isDevMode } from '@angular/core';
import * as BABYLON from 'babylonjs';
import 'babylonjs-materials';
import { BehaviorSubject } from 'rxjs';
import { SceneLifecycleService } from './scene-lifecycle.service';

/** WGSL sources for one shader, plus the URLs they came from (for diagnostics). */
export interface ShaderSources {
  vertexSource: string;
  fragmentSource: string;
  shaderLanguage: BABYLON.ShaderLanguage;
  urls: { vertex: string; fragment: string };
}

/** What actually differs between the library's shader materials. */
export interface ShaderMaterialSpec {
  /** Material name, as it appears in the scene and in Babylon's diagnostics */
  name: string;
  /** Shader base name under assets/shaders, e.g. 'obst' for obst.{vertex,fragment}.wgsl */
  shader: string;
  /** Defaults to SHADER_INTERFACES[shader].attributes */
  attributes?: string[];
  /** Defaults to SHADER_INTERFACES[shader].uniforms */
  uniforms?: string[];
  needAlphaBlending?: boolean;
}

/**
 * The attributes and uniforms each shader in assets/shaders declares.
 *
 * These follow from the .wgsl sources, not from the caller - every service that
 * draws with `obst` needs exactly the same three clipping uniforms - so they are
 * declared once here and defaulted in createShaderMaterial(). Change a shader's
 * interface and this table is the single place to follow it.
 */
const SHADER_INTERFACES: Record<string, { attributes: string[]; uniforms: string[] }> = {
  obst: { attributes: ['position', 'normal', 'color'], uniforms: ['clipX', 'clipY', 'clipZ'] },
  obstBackCap: { attributes: ['position', 'normal', 'color'], uniforms: ['clipX', 'clipY', 'clipZ'] },
  vent: { attributes: ['position', 'normal', 'color'], uniforms: ['clipX', 'clipY', 'clipZ'] },
  fire: { attributes: ['position', 'normal', 'color'], uniforms: ['clipX', 'clipY', 'clipZ', 'transparent'] },
  mesh: { attributes: ['position', 'normal', 'color'], uniforms: ['transparent'] },
  arrow: { attributes: ['position', 'normal'], uniforms: [] },
  slice: { attributes: ['position', 'normal', 'color', 'texture_coordinate', 'blank'], uniforms: ['is_blank'] }
};

@Injectable({
  providedIn: 'root'
})
export class BabylonService {

  public canvas: HTMLCanvasElement;
  public engine: BABYLON.WebGPUEngine;
  public camera: BABYLON.ArcRotateCamera;
  public scene: BABYLON.Scene;

  private readonly sceneSubject = new BehaviorSubject<BABYLON.Scene | null>(null);

  /**
   * The current scene, or null when there is none.
   *
   * A BehaviorSubject rather than a ReplaySubject on purpose: leaving the view
   * emits null, so a consumer subscribing on re-entry is told there is nothing
   * to draw into instead of replaying the previous scene's ready signal and
   * rendering into a disposed scene.
   */
  public readonly scene$ = this.sceneSubject.asObservable();

  /** Held so it can be removed again - see animate(). */
  private resizeListener: (() => void) | null = null;
  /**
   * False once createScene() has established that this browser cannot run the
   * WebGPU engine. There is no WebGL fallback - see docs/adr/0001-webgpu-only-wgsl.md.
   */
  public webGPUAvailable = true;

  /** Shader name -> in-flight or resolved sources. See loadShaderSources(). */
  private readonly shaderSources = new Map<string, Promise<ShaderSources>>();

  public constructor(
    private ngZone: NgZone,
    private sceneLifecycle: SceneLifecycleService
  ) { }

  /**
   * Whether this browser exposes WebGPU at all. Callable before a scene exists,
   * so the UI can say so on first paint rather than after a failed engine
   * initialisation. A true answer is necessary but not sufficient - the adapter
   * request inside createScene() can still fail.
   */
  public static isWebGPUSupported(): boolean {
    return typeof navigator !== 'undefined' && !!(navigator as any).gpu;
  }

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

  /**
   * Tear the scene down and tell everything that depended on it.
   *
   * Disposing the scene takes its meshes and materials with it, but the drawing
   * services are `providedIn: 'root'` and would otherwise keep pointing at
   * them - hence the lifecycle reset. Subscribers are told before the teardown,
   * so nobody draws into a scene that is halfway gone.
   */
  public disposeScene(): void {
    if (this.sceneSubject.value) {
      this.sceneSubject.next(null);
    }

    // Every step runs even if an earlier one throws: a half-torn-down scene
    // that still looks alive is what wedges the next createScene().
    try {
      if (this.scene) { this.scene.dispose(); }
    } catch (e) {
      console.error('[BabylonService] Disposing the scene failed', e);
    } finally {
      this.scene = null;
    }

    try {
      if (this.engine) {
        this.engine.stopRenderLoop();
        this.engine.dispose();
      }
    } catch (e) {
      console.error('[BabylonService] Disposing the engine failed', e);
    } finally {
      this.engine = null;
    }

    this.removeResizeListener();
    this.sceneLifecycle.reset();
  }

  public async createScene(canvas: ElementRef<HTMLCanvasElement>): Promise<void> {
    // Clean up existing resources
    this.disposeScene();

    // The first step is to get the reference of the canvas element from our HTML document
    this.canvas = canvas.nativeElement;
    this.webGPUAvailable = true;

    // WebGPU only, no WebGL fallback - see docs/adr/0001-webgpu-only-wgsl.md.
    // The caller is expected to surface webGPUAvailable to the user.
    if (!BabylonService.isWebGPUSupported()) {
      this.webGPUAvailable = false;
      console.warn('[BabylonService] navigator.gpu is unavailable - this browser does not support WebGPU.');
      return;
    }

    try {
      // `alpha` and `preserveDrawingBuffer` used to be passed here as well;
      // both are WebGL-only options that WebGPUEngine never reads.
      const webgpu = new BABYLON.WebGPUEngine(this.canvas, {
        adaptToDeviceRatio: true,
        antialias: true,
        premultipliedAlpha: false
      });
      await webgpu.initAsync();
      this.engine = webgpu;

      // A WebGPU device can be lost - driver reset, GPU switch, a backgrounded
      // tab reclaimed. Without this the canvas silently stops updating.
      this.engine.onContextLostObservable.add(() => {
        console.error('[BabylonService] The GPU device was lost - tearing the scene down.');
        // Not just a signal: the render loop would otherwise keep drawing into
        // a lost device, and the services would keep holding its meshes.
        this.disposeScene();
      });
    } catch (e) {
      this.webGPUAvailable = false;
      console.error('[BabylonService] WebGPU engine failed to initialise', e);
      return;
    }

    if (isDevMode()) console.info('[BabylonService] Engine: WebGPU');

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

    // Expose a back-reference so downstream code can reach the service from a scene.
    (this.scene as any).babylonService = this;

    // Fix canvas resolution to match display size
    this.engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
    this.engine.resize();

    // Holes are cut during the first render, so the CSG backend has to be up
    // before anyone acts on ready$.
    await this.initializeCsg2();

    // Announce the scene only now that it is fully built
    this.sceneSubject.next(this.scene);
  }

  /**
   * Load the Manifold backend behind CSG2, used to cut &HOLE openings out of
   * obsts. Babylon would otherwise pull Manifold from unpkg at first use; we
   * serve it from our own assets so the preview works offline and does not
   * depend on a third-party host.
   *
   * A failure here is not fatal: HoleService draws those obsts solid instead.
   */
  private async initializeCsg2(): Promise<void> {
    if (BABYLON.IsCSG2Ready()) {
      return;
    }

    try {
      await BABYLON.InitializeCSG2Async({ manifoldUrl: this.resolveAssetPath('assets/manifold') });
      if (isDevMode()) console.info('[BabylonService] CSG2 backend ready');
    } catch (e) {
      console.error('[BabylonService] Manifold failed to load - obst openings will not be cut', e);
    }
  }

  public animate(): void {
    // We have to run this outside angular zones,
    // because it could trigger heavy changeDetection cycles.
    this.ngZone.runOutsideAngular(() => {
      const rendererLoopCallback = () => {
        // The loop is stopped on dispose, but a frame already in flight can
        // still land after the scene is gone.
        if (this.scene) { this.scene.render(); }
      };

      if (document.readyState !== 'loading') {
        this.engine.runRenderLoop(rendererLoopCallback);
      } else {
        window.addEventListener('DOMContentLoaded', () => {
          if (this.engine) { this.engine.runRenderLoop(rendererLoopCallback); }
        }, { once: true });
      }

      // Kept so disposeScene() can take it off again - re-entering the view
      // used to add another one, and after leaving they all fired against a
      // null engine.
      this.removeResizeListener();
      this.resizeListener = () => {
        if (this.engine) { this.engine.resize(); }
      };
      window.addEventListener('resize', this.resizeListener);
    });
  }

  private removeResizeListener(): void {
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = null;
    }
  }

  /**
   * Build a ShaderMaterial from a shader name, fetching its sources if needed.
   *
   * Every material in this library is WGSL and binds the same two uniform
   * buffers, so callers describe only what actually differs between them.
   */
  public async createShaderMaterial(spec: ShaderMaterialSpec): Promise<BABYLON.ShaderMaterial> {
    const sources = await this.loadShaderSources(spec.shader);
    const shaderInterface = SHADER_INTERFACES[spec.shader];

    // Cast: `entryPoint` is honoured at runtime but absent from IShaderMaterialOptions
    return new (BABYLON as any).ShaderMaterial(
      spec.name,
      this.scene,
      { vertexSource: sources.vertexSource, fragmentSource: sources.fragmentSource },
      {
        needAlphaBlending: spec.needAlphaBlending ?? false,
        attributes: spec.attributes ?? shaderInterface?.attributes ?? [],
        uniforms: spec.uniforms ?? shaderInterface?.uniforms ?? [],
        uniformBuffers: ['Scene', 'Mesh'],
        shaderLanguage: sources.shaderLanguage,
        entryPoint: { vertex: 'main', fragment: 'main' }
      }
    ) as BABYLON.ShaderMaterial;
  }

  /**
   * Load shader sources (vertex/fragment) as plain text from assets/shaders.
   * This bypasses Babylon’s internal filename/extension inference and guarantees
   * we fetch the right files - Babylon resolves unknown includes without an
   * error callback, so a wrong URL hangs silently instead of throwing.
   *
   * Shaders are static assets and several services ask for the same one, so the
   * in-flight promise is shared. A failure is not cached, to leave retries open.
   */
  public loadShaderSources(name: string): Promise<ShaderSources> {
    const cached = this.shaderSources.get(name);
    if (cached) return cached;

    const pending = this.fetchShaderSources(name);
    this.shaderSources.set(name, pending);
    pending.catch(() => this.shaderSources.delete(name));
    return pending;
  }

  private async fetchShaderSources(name: string): Promise<ShaderSources> {
    const base = this.resolveAssetPath(`assets/shaders/${name}`);
    const vUrl = `${base}.vertex.wgsl`;
    const fUrl = `${base}.fragment.wgsl`;

    // Shaders are static assets copied verbatim by the build, so they carry no
    // content hash and their freshness is the server's cache headers to decide.
    // Forcing `no-cache` here only bought a revalidation round-trip per load.
    const [vRes, fRes] = await Promise.all([
      fetch(vUrl),
      fetch(fUrl),
    ]);

    if (!vRes.ok || !fRes.ok) {
      const err = `[BabylonService] Failed to fetch shader(s): ${!vRes.ok ? vUrl : ''} ${!fRes.ok ? fUrl : ''}`;
      if (isDevMode()) { try { console.error(err, { vStatus: vRes.status, fStatus: fRes.status }); } catch {} }
      throw new Error(err);
    }

    const [vertexSource, fragmentSource] = await Promise.all([vRes.text(), fRes.text()]);

    return {
      vertexSource,
      fragmentSource,
      shaderLanguage: BABYLON.ShaderLanguage.WGSL,
      urls: { vertex: vUrl, fragment: fUrl }
    };
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