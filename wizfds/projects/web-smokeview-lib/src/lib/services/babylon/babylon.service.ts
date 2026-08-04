import { Injectable, NgZone, ElementRef, HostListener, isDevMode } from '@angular/core';
import * as BABYLON from 'babylonjs';
import 'babylonjs-materials';
import { BehaviorSubject } from 'rxjs';
import { SceneLifecycleService } from './scene-lifecycle.service';
import { SceneBoundsService } from '../scene-bounds/scene-bounds.service';
import { SceneXb } from '../drawing/scene-input';
import { applyCadNavigation } from './camera-navigation';

/** WGSL sources for one shader, plus the URLs they came from (for diagnostics). */
export interface ShaderSources {
  vertexSource: string;
  fragmentSource: string;
  shaderLanguage: BABYLON.ShaderLanguage;
  urls: { vertex: string; fragment: string };
}

/** One stage of one shader, as fetched. */
interface ShaderStage {
  source: string;
  url: string;
}

/** What actually differs between the library's shader materials. */
export interface ShaderMaterialSpec {
  /** Material name, as it appears in the scene and in Babylon's diagnostics */
  name: string;
  /** Shader base name under assets/shaders, e.g. 'obst' for obst.{vertex,fragment}.wgsl */
  shader: string;
  /**
   * Where the fragment stage comes from, when it is not `shader`.
   *
   * A pool of thin instances reads its transform and its colour per instance, so
   * it needs a vertex stage of its own - but it lights and clips a fragment
   * exactly as the shared buffers do, and a second copy of that would drift.
   */
  fragmentShader?: string;
  /** Defaults to SHADER_INTERFACES[shader].attributes */
  attributes?: string[];
  /** Defaults to SHADER_INTERFACES[shader].uniforms */
  uniforms?: string[];
  needAlphaBlending?: boolean;
}

/**
 * Camera settings, as multiples of the model's longest side.
 *
 * They used to be the literals below tuned for a scene squeezed into a unit
 * cube, where that side measured exactly 1. Keeping them as ratios is what makes
 * a five-metre room and a four-hundred-metre tunnel behave the same (ADR-0002) -
 * including the near/far ratio, on which depth precision depends.
 */
const CAMERA = {
  nearPlane: 0.01,
  farPlane: 1000,
  /**
   * Just above the near plane, so the wheel stops right before the clipping
   * would start eating the geometry (ADR-0012). The wheel and pan sensibilities
   * that used to sit here are gone: a percentage zoom and a 1:1 pan follow from
   * the current frame, not from the size of the model - see camera-navigation.ts.
   */
  minRadius: 0.02,
  maxRadius: 50,
  /** Room left around the model when framing it, so it does not touch the edges. */
  framingMargin: 1.15,
  /**
   * Smallest sphere frameBox() will fly to, as a fraction of the model.
   *
   * A &VENT is flat and a point &DEVC has no size at all, so zooming to one
   * would otherwise put the camera exactly on it. A twentieth of the model is
   * close enough to read the element and far enough to see what it sits on.
   */
  minFramedRadius: 0.05,
  /** Length of the world axes drawn at the origin. */
  axisLength: 0.1
};

/**
 * Where the camera stands relative to the model when it is first framed.
 *
 * Length is irrelevant - only the direction is used. Straight above the centre
 * is what the preview used to do, and with the up vector along +Z that is the
 * degenerate case: the view direction is parallel to up, Babylon clamps beta to
 * almost zero, and the model reads as a flat plan with no sense of height.
 * Standing off to one side and above shows three faces of it instead.
 */
const FRAMING_DIRECTION = new BABYLON.Vector3(0.7, -0.8, 0.55);

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
  // The instanced pair asks for neither `color` nor the world matrix: Babylon
  // adds world0..world3 and instanceColor itself once the mesh has thin
  // instances, and listing them here would bind them a second time.
  obstInstanced: { attributes: ['position', 'normal'], uniforms: ['clipX', 'clipY', 'clipZ'] },
  obstBackCapInstanced: { attributes: ['position'], uniforms: ['clipX', 'clipY', 'clipZ'] },
  vent: { attributes: ['position', 'normal', 'color'], uniforms: ['clipX', 'clipY', 'clipZ'] },
  fire: { attributes: ['position', 'normal', 'color'], uniforms: ['clipX', 'clipY', 'clipZ', 'transparent'] },
  mesh: { attributes: ['position', 'normal', 'color'], uniforms: ['transparent'] },
  meshInstanced: { attributes: ['position', 'normal'], uniforms: ['transparent'] },
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

  /** '<name>.<stage>' -> in-flight or resolved source. See loadShaderSources(). */
  private readonly shaderSources = new Map<string, Promise<ShaderStage>>();

  /** The three lines drawn at the origin, held so they can be redrawn to scale. */
  private worldAxes: BABYLON.LinesMesh[] = [];


  public constructor(
    private ngZone: NgZone,
    private sceneLifecycle: SceneLifecycleService,
    private sceneBounds: SceneBoundsService
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

    // The scene took them with it; this is about not redrawing over corpses
    this.worldAxes = [];

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
    // Right-handed with Z up, as in FDS - see docs/adr/0002-wspolrzedne-w-metrach.md
    this.camera.upVector = new BABYLON.Vector3(0, 0, 1);

    // The arrow keys belong to the keyboard nudge (#124); the camera keeps
    // the mouse, as it does in PyroSim. Removed rather than re-bound - nobody
    // orbits by keyboard here, and a stray arrow must not turn a set view.
    const keyboard = this.camera.inputs.attached['keyboard'];
    if (keyboard) { this.camera.inputs.remove(keyboard); }

    // Everything else about the camera, and the world axes, follows from how big
    // the model is. Nothing has been measured yet, so this frames the default
    // box; SmokeviewApiService calls it again once it knows the scenario.
    this.applySceneBounds();

    // This attaches the camera to the canvas
    this.camera.attachControl(this.canvas, true);

    // The AutoCAD physics: the middle button drives the camera, the left one
    // is edit-only, and nothing glides after the mouse stops (ADR-0012).
    applyCadNavigation(this.camera, this.canvas);

    /*
     * Every pointer ray is built through this camera, whichever one rendered
     * last.
     *
     * The view cube renders through a second camera, into a corner of the
     * canvas, and Babylon leaves `scene.activeCamera` on whichever of the two
     * went last - the cube's. Without this, the InputManager builds every
     * pointer ray from a camera three metres from the origin, aimed through a
     * viewport a fifth of the canvas wide. Nothing that reads those rays can
     * work: a gizmo handle is missed at nearly every press, because the ray
     * offered to it points somewhere else entirely (#124).
     *
     * ViewCubeService picks with its own camera, passed explicitly, so it is
     * unaffected.
     */
    this.scene.cameraToUseForPointers = this.camera;

    this.scene.activeCameras.push(this.camera);

    // Expose a back-reference so downstream code can reach the service from a scene.
    (this.scene as any).babylonService = this;

    // Fix canvas resolution to match display size
    this.engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
    this.engine.resize();

    // The preview is a viewer: outside an edit the same geometry is drawn frame
    // after frame, which Babylon has to be told rather than rediscover.
    this.tuneForStaticScene();

    // Holes are cut during the first render, so the CSG backend has to be up
    // before anyone acts on ready$.
    await this.initializeCsg2();

    // Announce the scene only now that it is fully built
    this.sceneSubject.next(this.scene);
  }

  /**
   * Tell Babylon that the geometry only changes when the user asks it to.
   *
   * The preview draws the same scene frame after frame - the camera moves, the
   * model does not - and #87 asked for the mechanisms Babylon offers for exactly
   * that. Measured on a WebGPU device against a pool of thin instances, two of
   * the three break the drawing they are meant to speed up:
   *
   * - `snapshotRendering`. As soon as the pool's instance count changes, the
   *   recorded command buffer stops drawing the pool at all - only its outlines
   *   survive - and `snapshotRenderingReset()` does not bring it back. That call
   *   is also `enabled = false; enabled = true`, so it cannot even be used as a
   *   safe no-op on an engine that never turned snapshot rendering on.
   * - `ScenePerformancePriority.Aggressive`, which keeps the render state
   *   between frames. Same symptom on the same trigger, and `resetDrawCache()`
   *   does not recover it either.
   *
   * Intermediate is what is left, and it buys the one that matters at this
   * scale: Babylon stops picking the whole scene on every pointer move.
   */
  public tuneForStaticScene(): void {
    if (!this.scene) { return; }

    this.scene.performancePriority = BABYLON.ScenePerformancePriority.Intermediate;

    // Which also turns auto-clear off. That is right for a scene that covers the
    // canvas; a model does not, and whatever it leaves uncovered would keep the
    // previous frame and smear as the camera orbits.
    this.scene.autoClear = true;
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
    const sources = await this.loadShaderSources(spec.shader, spec.fragmentShader);
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
   * The two stages are named separately because they are not always paired:
   * `obstInstanced` has a vertex stage of its own and shares `obst`'s fragment
   * stage. Caching per stage rather than per pair is what keeps that one file
   * one fetch, however many vertex stages point at it.
   *
   * @param name shader base name, and the vertex stage's
   * @param fragmentName where the fragment stage comes from; `name` by default
   */
  public loadShaderSources(name: string, fragmentName: string = name): Promise<ShaderSources> {
    return Promise.all([
      this.loadShaderStage(name, 'vertex'),
      this.loadShaderStage(fragmentName, 'fragment')
    ]).then(([vertex, fragment]) => ({
      vertexSource: vertex.source,
      fragmentSource: fragment.source,
      shaderLanguage: BABYLON.ShaderLanguage.WGSL,
      urls: { vertex: vertex.url, fragment: fragment.url }
    }));
  }

  /**
   * One stage of one shader, fetched at most once.
   *
   * Shaders are static assets and several materials ask for the same one, so the
   * in-flight promise is shared. A failure is not cached, to leave retries open.
   */
  private loadShaderStage(name: string, stage: 'vertex' | 'fragment'): Promise<ShaderStage> {
    const key = `${name}.${stage}`;
    const cached = this.shaderSources.get(key);
    if (cached) return cached;

    const pending = this.fetchShaderStage(name, stage);
    this.shaderSources.set(key, pending);
    pending.catch(() => this.shaderSources.delete(key));
    return pending;
  }

  private async fetchShaderStage(name: string, stage: 'vertex' | 'fragment'): Promise<ShaderStage> {
    const url = `${this.resolveAssetPath(`assets/shaders/${name}`)}.${stage}.wgsl`;

    // Shaders are static assets copied verbatim by the build, so they carry no
    // content hash and their freshness is the server's cache headers to decide.
    // Forcing `no-cache` here only bought a revalidation round-trip per load.
    const response = await fetch(url);

    if (!response.ok) {
      const err = `[BabylonService] Failed to fetch shader: ${url}`;
      if (isDevMode()) { try { console.error(err, { status: response.status }); } catch {} }
      throw new Error(err);
    }

    return { source: await response.text(), url: url };
  }

  /**
   * Point the camera at the model that has just been measured, and size
   * everything that depends on how big it is.
   *
   * Called once when the scene is built - against the default box, so an empty
   * scenario still has a usable camera - and again by SmokeviewApiService each
   * time it knows what it is about to draw. Sizing the camera here rather than
   * in a drawing service is what lets a scenario with no &OBST be framed at all.
   */
  public applySceneBounds(): void {
    if (!this.scene || !this.camera) { return; }

    const extent = this.sceneBounds.extent;
    const center = this.sceneBounds.center;

    this.camera.minZ = CAMERA.nearPlane * extent;
    this.camera.maxZ = CAMERA.farPlane * extent;
    this.camera.lowerRadiusLimit = CAMERA.minRadius * extent;
    this.camera.upperRadiusLimit = CAMERA.maxRadius * extent;

    // Position first, then target: setTarget() rebuilds alpha, beta and radius
    // from wherever the camera currently stands.
    const target = new BABYLON.Vector3(center.x, center.y, center.z);
    const from = FRAMING_DIRECTION.normalizeToNew().scale(this.radiusToFit());
    this.camera.setPosition(target.add(from));
    this.camera.setTarget(target);

    this.drawWorldAxes(CAMERA.axisLength * extent);
  }

  /**
   * How far the camera has to stand for the whole model to fit in view.
   *
   * Off the measured model rather than off any mesh's bounding sphere: an
   * element left at the FDS sentinel is drawn but not measured (ADR-0002), and
   * reading a mesh would put the camera 1e20 metres away. The view cube's
   * fly-to-side uses this too, so both agree on what "the whole model" means.
   */
  public radiusToFit(): number {
    return this.radiusFor(this.sceneBounds.boundingRadius);
  }

  /**
   * Frame the whole model without turning the view - AutoCAD's zoom extents,
   * answered here to the double middle click (ADR-0012).
   *
   * Unlike a view cube side, the direction of looking is kept: only the target
   * and the distance change. That is what tells the two apart - the cube sets
   * where you look from, this one only backs off far enough to see everything.
   */
  public zoomExtents(): void {
    if (!this.scene || !this.camera) { return; }

    const center = this.sceneBounds.center;
    const target = new BABYLON.Vector3(center.x, center.y, center.z);
    const direction = this.camera.getTarget().subtract(this.camera.position).normalize();

    // Position first, then target - setTarget() rebuilds alpha, beta and
    // radius from wherever the camera stands, as in applySceneBounds().
    this.camera.setPosition(target.subtract(direction.scale(this.radiusToFit())));
    this.camera.setTarget(target);
  }

  /**
   * Point the camera at one box - what "zoom to selection" comes down to.
   *
   * The same framing as applySceneBounds() makes for the whole model, over a
   * smaller sphere; everything else the camera is tuned by - the near and far
   * planes, the wheel, the radius limits - stays as the model set it, because
   * the model has not changed.
   */
  public frameBox(box: SceneXb): void {
    if (!this.scene || !this.camera) { return; }

    const target = new BABYLON.Vector3(
      (box.x1 + box.x2) / 2, (box.y1 + box.y2) / 2, (box.z1 + box.z2) / 2);

    const dx = box.x2 - box.x1, dy = box.y2 - box.y1, dz = box.z2 - box.z1;
    // A &VENT is a plane and a point device is a point, so the sphere around one
    // can be flat or empty. A floor is what keeps the camera off the target.
    const radius = Math.max(
      Math.sqrt(dx * dx + dy * dy + dz * dz) / 2,
      CAMERA.minFramedRadius * this.sceneBounds.extent);

    const from = FRAMING_DIRECTION.normalizeToNew().scale(this.radiusFor(radius));
    this.camera.setPosition(target.add(from));
    this.camera.setTarget(target);
  }

  /** How far the camera has to stand for a sphere of this radius to fit in view. */
  private radiusFor(radius: number): number {
    // In portrait the horizontal field of view is the tighter one
    const aspectRatio = this.engine ? this.engine.getAspectRatio(this.camera) : 1;
    const halfMinFov = aspectRatio < 1
      ? Math.atan(aspectRatio * Math.tan(this.camera.fov / 2))
      : this.camera.fov / 2;

    return Math.abs(radius / Math.sin(halfMinFov)) * CAMERA.framingMargin;
  }

  /**
   * Draw the x-y-z axes at the FDS origin, at a length the model can be seen
   * against. Redrawn rather than scaled, because there is one set per scene and
   * it is cheap.
   *
   * Source: https://doc.babylonjs.com/snippets/world_axes
   */
  private drawWorldAxes(size: number): void {
    this.worldAxes.forEach(axis => axis.dispose());
    this.worldAxes = [];

    const arrow = (name: string, points: BABYLON.Vector3[], color: BABYLON.Color3) => {
      const axis = BABYLON.MeshBuilder.CreateLines(name, { points: points }, this.scene);
      axis.color = color;
      // A ctrl+click near the origin must reach the geometry behind them
      axis.isPickable = false;
      this.worldAxes.push(axis);
    };

    arrow('axisX', [
      BABYLON.Vector3.Zero(),
      new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0.05 * size, 0),
      new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, -0.05 * size, 0)
    ], new BABYLON.Color3(1, 0, 0));

    arrow('axisY', [
      BABYLON.Vector3.Zero(),
      new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3(-0.05 * size, size * 0.95, 0),
      new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3(0.05 * size, size * 0.95, 0)
    ], new BABYLON.Color3(0, 1, 0));

    arrow('axisZ', [
      BABYLON.Vector3.Zero(),
      new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3(0, -0.05 * size, size * 0.95),
      new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3(0, 0.05 * size, size * 0.95)
    ], new BABYLON.Color3(0, 0, 1));
  }

}

/**
 * Build a shader material, or nothing if its sources cannot be fetched.
 *
 * A missing shader costs the elements it draws, not the whole scene: a drawing
 * service that awaited several of them would otherwise stop at the first, and
 * every one of them was catching that the same way.
 *
 * A free function rather than a method, so that it stays available to a service
 * under test whose BabylonService is a stub - what it needs is
 * `createShaderMaterial`, which every such stub already provides.
 *
 * @param owner who to name in the log - the calling service
 */
export async function tryCreateShaderMaterial(
  babylonService: BabylonService, spec: ShaderMaterialSpec, owner: string
): Promise<BABYLON.ShaderMaterial | null> {
  try {
    return await babylonService.createShaderMaterial(spec);
  } catch (e) {
    if (isDevMode()) {
      try { console.error(`[${owner}] Failed to create ${spec.name}`, e); } catch { }
    }
    return null;
  }
}