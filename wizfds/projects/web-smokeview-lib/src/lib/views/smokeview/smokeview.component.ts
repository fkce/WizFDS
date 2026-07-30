import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, isDevMode } from '@angular/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { PickService } from '../../services/picking/pick.service';
import { BabylonService } from '../../services/babylon/babylon.service';
import { SliceService } from '../../services/drawing/slice/slice.service';
import { PlayerService } from '../../services/player/player.service';
import { ViewCubeService } from '../../services/babylon/viewCube/view-cube.service';
import * as BABYLON from 'babylonjs';
import { SceneBoundsService } from '../../services/scene-bounds/scene-bounds.service';

/**
 * How far the pointer may travel between down and up and still count as a click,
 * in CSS pixels.
 *
 * Enough to absorb the shake of a deliberate click, far short of the smallest
 * orbit anybody makes on purpose.
 */
const CLICK_SLOP = 5;

/** PointerEvent.button for the left button - the only one that selects. */
const PRIMARY_BUTTON = 0;

/**
 * The canvas, and the gestures made on it.
 *
 * What used to sit over it - the visibility menu, the section sliders, the help
 * table, the panel naming what was picked - belongs to the host now and reaches
 * the scene through SceneViewService (ADR-0010). The library draws and exposes
 * an API; it does not hold an interface.
 */
@Component({
    selector: 'lib-smokeview',
    templateUrl: './smokeview.component.html',
    styleUrls: ['./smokeview.component.scss'],
    standalone: false
})
export class SmokeviewComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('rendererCanvas', { static: true }) rendererCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('mainContainer', { static: true }) mainContainer: ElementRef<HTMLCanvasElement>;

  /**
   * Arm a possible click.
   *
   * Bound on the canvas in the template rather than on the host: the player
   * controls and any gesture overlay are layered over the canvas inside this
   * component, and a press on one of those is not a press in the scene. It would
   * also pick at whatever pointer position the scene last saw - Babylon reads
   * scene.pointerX off canvas events only - so it would usually miss and
   * silently clear the selection.
   */
  onPointerDown(event: PointerEvent): void {
    this.pointerDownAt = null;

    // No scene when the browser has no WebGPU - nothing to pick against
    if (!this.babylonService.scene) return;

    // The left button selects; the right one pans and the middle one is nobody's
    if (event.button !== PRIMARY_BUTTON) return;

    // Control camera. A click on the cube is the cube's, not a selection's.
    const side = this.viewCubeService.pickSide();
    if (side) {
      this.viewCubeService.zoomToSide(side);
      return;
    }

    this.pointerDownAt = { x: event.clientX, y: event.clientY };
  }

  /**
   * Select on a plain click; leave a drag to the camera.
   *
   * The two gestures begin identically, so what tells them apart is how far the
   * pointer travelled in between - which is why this is on pointerup and not on
   * pointerdown. Ctrl or shift extends the selection instead of replacing it.
   *
   * A plain click is what every 3D editor selects with. The ctrl this replaces
   * was an artefact of selection having been bolted on.
   *
   * Nothing is armed unless the press was a left one on the canvas, so this has
   * no button check of its own - see onPointerDown().
   */
  onPointerUp(event: PointerEvent): void {
    const downAt = this.pointerDownAt;
    this.pointerDownAt = null;

    if (!downAt || !this.babylonService.scene) return;
    if (Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) > CLICK_SLOP) return;

    this.picking.pick(this.pickingRay(), { add: event.ctrlKey || event.shiftKey });
  }

  /**
   * Mark what a click would select, and say where the pointer is.
   *
   * At most once a frame: a pick runs against everything drawn, and a scenario
   * at the scale this module is built for holds ten thousand obsts. A pointer
   * emits far more moves than there are frames to show the result in, so the
   * rest of them are dropped.
   *
   * Not while the pointer is down: that gesture is on its way to being a drag,
   * the camera is already moving, and a highlight chasing the cursor across the
   * model while it does is noise.
   */
  onPointerMove(): void {
    if (!this.babylonService.scene) return;
    if (this.pointerDownAt) return;

    if (this.hoverQueued) { return; }
    this.hoverQueued = true;
    requestAnimationFrame(() => {
      if (!this.hoverQueued) { return; }
      this.hoverQueued = false;
      // The pointer can have left, or the view been torn down, since the move
      if (this.destroyed || !this.babylonService.scene) { return; }
      this.picking.hover(this.pickingRay());
    });
  }

  /** Nothing is under a pointer that is not over the canvas. */
  onPointerLeave(): void {
    this.hoverQueued = false;
    this.pointerDownAt = null;
    this.picking.clearHover();
  }

  /**
   * A ray from the camera through the pointer, long enough to cross the whole
   * model from wherever the camera stands. A fixed length used to do, back when
   * the scene was squeezed into a cube one unit across.
   */
  private pickingRay(): BABYLON.Ray {
    const scene = this.babylonService.scene;
    const ray = scene.createPickingRay(
      scene.pointerX, scene.pointerY, null, this.babylonService.camera);
    ray.length = this.babylonService.camera.radius + 2 * this.sceneBounds.extent;
    return ray;
  }

  /**
   * Mirrors BabylonService.webGPUAvailable once the scene has been attempted.
   * False means the browser cannot render anything - the template says so
   * instead of leaving a blank canvas. See docs/adr/0001-webgpu-only-wgsl.md.
   */
  webGPUAvailable: boolean = true;

  private sceneSub: Subscription;

  /** Set in ngOnDestroy - createScene() is awaited and can outlive the view. */
  private destroyed = false;

  /** A hover pick is already waiting for the next frame - see onPointerMove(). */
  private hoverQueued = false;

  /**
   * Where the pointer went down, while the gesture could still turn out to be a
   * click. Null once it is settled - or from the start, for a press the view cube
   * took.
   */
  private pointerDownAt: { x: number, y: number } | null = null;

  constructor(
    public picking: PickService,
    private babylonService: BabylonService,
    public sliceService: SliceService,
    public playerService: PlayerService,
    public viewCubeService: ViewCubeService,
    private sceneBounds: SceneBoundsService
  ) { }

  ngOnInit() {
    // Decided on first paint, so an unsupported browser sees the message
    // straight away instead of after a failed engine initialisation.
    this.webGPUAvailable = BabylonService.isWebGPUSupported();
  }

  async ngAfterViewInit() {
    if (!this.webGPUAvailable) return;

    await this.babylonService.createScene(this.rendererCanvas);

    // Leaving the view while the engine was still initialising: ngOnDestroy
    // already ran and found nothing to dispose, so tear down what just arrived.
    if (this.destroyed) {
      this.babylonService.disposeScene();
      return;
    }

    // The adapter request can still fail on a browser that advertises WebGPU
    this.webGPUAvailable = this.babylonService.webGPUAvailable;
    if (!this.webGPUAvailable) return;

    this.sceneSub = this.babylonService.scene$
      .pipe(filter(scene => !!scene))
      .subscribe(() => {
        this.babylonService.animate();

        // Initialize ViewCube after scene is ready
        try {
          this.viewCubeService.init();
          if (isDevMode()) { try { console.debug('[SmokeviewComponent] ViewCube initialized'); } catch {} }
        } catch (e) {
          if (isDevMode()) { try { console.error('[SmokeviewComponent] Failed to initialize ViewCube', e); } catch {} }
        }
      });
  }

  ngOnDestroy() {
    this.destroyed = true;
    if (this.sceneSub) {
      this.sceneSub.unsubscribe();
    }
    // Tears down scene and engine, and resets every scene-scoped service
    this.babylonService.disposeScene();
  }

  /**
   * On slice file upload
   */
  public onSliceFileSelected() {
    const inputNode: any = document.querySelector('#fileSlice');

    if (typeof (FileReader) !== 'undefined') {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        this.sliceService.getFromFile(JSON.parse(e.target.result));
      };

      reader.readAsText(inputNode.files[0], 'UTF-8');
    }
  }

  public control() {
    if (this.playerService.isPlay) {
      this.playerService.stop();
    } else {
      this.playerService.start();
      this.sliceService.playSlice();
    }
  }

}
