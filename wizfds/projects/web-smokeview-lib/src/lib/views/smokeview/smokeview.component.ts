import {
  Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild,
  HostListener, NgZone, isDevMode
} from '@angular/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { PickService } from '../../services/picking/pick.service';
import { BabylonService } from '../../services/babylon/babylon.service';
import { ViewCubeService } from '../../services/babylon/viewCube/view-cube.service';
import * as BABYLON from 'babylonjs';
import { SceneBoundsService } from '../../services/scene-bounds/scene-bounds.service';
import {
  GestureView, GizmoService, NUDGE_KEYS, NudgeKey, nudgeDirection
} from '../../services/editing/gizmo.service';
import { DrawToolService } from '../../services/editing/draw-tool.service';
import { MeasureLabel, MeasureToolService } from '../../services/editing/measure-tool.service';
import { GestureKey } from '../../services/editing/gesture';
import { TimelineService } from '../../services/timeline/timeline.service';

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

/** PointerEvent.button for the middle button - the camera's (ADR-0012). */
const MIDDLE_BUTTON = 1;

/**
 * Two middle presses this close together, in ms, are a double press - and a
 * double middle press means zoom extents, as it has in AutoCAD for decades.
 * Within CLICK_SLOP of each other, or it was a pan put down and picked up.
 */
const DOUBLE_PRESS_MS = 400;

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
   * What the dynamic input is showing, or null when no gesture is running.
   *
   * One of the overlays that belong to a gesture, which is why it is here and
   * not in the host's ribbon (ADR-0010): it stands at the cursor, over the
   * canvas, and only exists while a gesture does. Fed by whichever tool owns
   * the gesture - the gizmo, or the draw tool (#125); only one of the two can
   * hold one at a time, because there is one pointer.
   */
  gesture: GestureView | null = null;

  /** What each producer last published - the panel shows whichever is running. */
  private gizmoView: GestureView | null = null;
  private drawView: GestureView | null = null;

  /**
   * The distance riding the cursor between the two measured points (#127).
   *
   * A separate overlay rather than a third gesture producer: a measurement has
   * no fields to type into, so what it shows is a readout, not the panel.
   */
  measureLabel: MeasureLabel | null = null;

  /** What is in each field, as text - the user's, not the model's. */
  values: Partial<Record<GestureKey, string>> = {};

  /**
   * The fields the keyboard has taken charge of.
   *
   * A field mid-typing reads as `-` or `1.`, and neither is a number yet - so
   * the live value must not be written back over it while the mouse goes on
   * moving. See GestureInput.type().
   */
  private editing = new Set<GestureKey>();

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
    // The pointer knows the truth about ctrl even when a keydown never
    // reached this window - ctrl pressed with the focus elsewhere
    this.gizmo.setCtrlHeld(event.ctrlKey);
    this.pointerDownAt = null;

    // No scene when the browser has no WebGPU - nothing to pick against
    if (!this.babylonService.scene) return;

    // The middle button is the camera's (ADR-0012). Babylon pans with it; the
    // component only watches for the double press, which means zoom extents.
    if (event.button === MIDDLE_BUTTON) {
      // The browser's middle-click autoscroll would open its widget over the pan
      event.preventDefault();
      this.handleMiddlePress(event);
      return;
    }

    // The left button selects and edits - the whole of it; the right one is
    // reserved for a future context menu (ADR-0012)
    if (event.button !== PRIMARY_BUTTON) return;

    // Control camera. A click on the cube is the cube's, not a selection's.
    const side = this.viewCubeService.pickSide();
    if (side) {
      this.viewCubeService.zoomToSide(side);
      return;
    }

    // While the measure tool runs, the left button lands its points (#127) -
    // the same claim the draw tool makes below, and the same ctrl latch.
    if (this.measureTool.active) {
      this.measureTool.setSnapSuspended(event.ctrlKey);
      this.pointerDownAt = { x: event.clientX, y: event.clientY };
      return;
    }

    // While the draw tool runs, the left button is its (#125): a click is a
    // step of the gesture, not a pick. Ctrl held at the press latches the
    // snap suspension for the rest of the operation (ADR-0011).
    if (this.drawTool.active) {
      this.drawTool.setSnapSuspended(event.ctrlKey);
      this.pointerDownAt = { x: event.clientX, y: event.clientY };
      return;
    }

    // A press on an arrow or a face handle starts a gesture; it is not a click
    // at whatever stands behind it, and releasing it must not drop the very
    // selection the gesture is about (#124).
    if (this.gizmo.isPointerOnGizmo) return;

    // Ctrl held as the gesture starts suspends snapping for the whole of it -
    // and each press arms the latch afresh, so it never carries over
    this.gizmo.setSnapSuspended(event.ctrlKey);

    this.pointerDownAt = { x: event.clientX, y: event.clientY };
  }

  /**
   * The second middle press of a quick pair zooms to extents (ADR-0012).
   *
   * Counted by hand rather than read off PointerEvent.detail: the browsers
   * disagree on whether a pointerdown carries a click count at all, and a pan
   * put down and picked up somewhere else must not count as a pair - which is
   * what the slop check is for.
   */
  private handleMiddlePress(event: PointerEvent): void {
    const last = this.lastMiddleDown;
    this.lastMiddleDown = { time: event.timeStamp, x: event.clientX, y: event.clientY };

    if (last
      && event.timeStamp - last.time < DOUBLE_PRESS_MS
      && Math.hypot(event.clientX - last.x, event.clientY - last.y) <= CLICK_SLOP) {
      // A third press starts a fresh pair, it does not extend this one
      this.lastMiddleDown = null;
      this.babylonService.zoomExtents();
    }
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

    // The measure tool takes the click as one of its two points (#127)
    if (this.measureTool.active) {
      this.measureTool.click(this.pickingRay());
      return;
    }

    // The draw tool takes the click as one step of its gesture (#125)
    if (this.drawTool.active) {
      this.drawTool.click(this.pickingRay());
      return;
    }

    // A drag that stayed within the slop is still a drag, not a click
    if (this.gizmo.isDragging) return;

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

      // The measure tool follows the pointer for the same reason the draw
      // tool does below: what the cursor means now is where the next point
      // lands (#127)
      if (this.measureTool.active) {
        this.measureTool.track(this.pickingRay());
        return;
      }

      // The draw tool follows the pointer instead of the hover: a highlight
      // chasing the cursor under a gesture would be noise, and what the cursor
      // means now is where the next corner lands (#125)
      if (this.drawTool.active) {
        this.drawTool.track(this.pickingRay());
        return;
      }

      this.picking.hover(this.pickingRay());
      // The cube lights its own part from here - its ActionManager hover died
      // with tuneForStaticScene(), which stopped Babylon picking on every move
      this.viewCubeService.highlight(this.viewCubeService.pickSide());
    });
  }

  /** Nothing is under a pointer that is not over the canvas. */
  onPointerLeave(): void {
    this.hoverQueued = false;
    this.pointerDownAt = null;
    this.picking.clearHover();
    this.viewCubeService.highlight(null);
  }

  // ==========================================
  // The dynamic input (#124)
  // ==========================================

  /**
   * Ctrl suspends snapping, Escape abandons the gesture - and while a gesture
   * runs, the keyboard IS the dynamic input.
   *
   * On the window rather than on the panel's fields, and the fields are never
   * focused at all. They must not be: the canvas holds the focus during a
   * drag, and Babylon answers the canvas's blur by synthesising a release of
   * every held button (WebDeviceInputSystem._pointerBlurEvent) - so the moment
   * anything steals the focus, the drag dies under the user's hand. Focusing
   * the panel's field on gesture start was exactly that, and it is why a held
   * drag ended two milliseconds after it began while a scripted one, over in
   * one tick, never noticed. Typing therefore never touches DOM focus: keys
   * are routed here, straight into the gesture (#124).
   *
   * Shift used to take the camera out of the left button's way here; since
   * ADR-0012 the camera does not listen to the left button at all, so there
   * is nothing to take it out of.
   */
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    this.gizmo.setCtrlHeld(event.ctrlKey);
    // Only ctrl's OWN fresh press suspends snapping: a held ctrl repeats its
    // keydown, and every other key pressed while ctrl is down carries
    // ctrlKey too - neither is the fresh press ADR-0011 means. What a held
    // ctrl does to the NEXT gesture is decided at the grab, in
    // GizmoService.begin(). The latch belongs to whichever tool owns the
    // gesture - the draw tool while it is on, the gizmo otherwise (#125).
    if (event.key === 'Control' && !event.repeat) { this.gestureOwner.setSnapSuspended(true); }

    // Layered as AutoCAD layers it (CONTEXT.md, "Escape (warstwowo)"): a
    // running gesture goes first - the draw tool's covers all of its steps -
    // and with none running, the selection is dropped wherever it is owned
    // (ADR-0004), exactly like a click on empty space. Not while typing in a
    // host form field, where Escape means the field.
    if (event.key === 'Escape') {
      if (this.measureTool.active) { this.measureTool.cancel(); }
      else if (this.drawTool.active) { this.drawTool.cancel(); }
      else if (this.gizmo.isDragging) { this.gizmo.cancel(); }
      else if (!SmokeviewComponent.isFormField(event.target)) { this.picking.dropSelection(); }
      return;
    }

    // Play/pause, the one key the timeline takes (#150). Nothing else claims
    // space, and it costs no learning. Not while typing in a host form field,
    // and not when a button has the focus - space is that button's own click,
    // and the play button would otherwise toggle twice.
    if (event.key === ' ' && this.timeline.hasAxis
      && !SmokeviewComponent.isFormField(event.target)
      && !SmokeviewComponent.isButton(event.target)) {
      event.preventDefault();
      this.zone.run(() => this.timeline.toggle());
      return;
    }

    if (this.handleNudgeKey(event)) { return; }
    if (this.gesture) { this.routeGestureKey(event); }
  }

  /**
   * Who the keyboard is talking to: the measure or draw tool while one is on,
   * the gizmo otherwise. One pointer, so never more than one at once.
   */
  private get gestureOwner(): GizmoService | DrawToolService | MeasureToolService {
    if (this.measureTool.active) { return this.measureTool; }
    return this.drawTool.active ? this.drawTool : this.gizmo;
  }

  /**
   * One press of a nudge key - the selection moves by one grid cell (#124).
   *
   * The arrows speak the camera's language, snapped to a world axis by
   * nudgeDirection(); the camera itself lost the arrow keys to this (see
   * BabylonService), so a stray press can never turn a set view. A burst of
   * presses is one gesture: it settles when the last key comes up (onKeyUp),
   * and Escape abandons it like any other. Nothing here fires while the user
   * types in a form field of the host, or while the mouse owns the gesture.
   */
  private handleNudgeKey(event: KeyboardEvent): boolean {
    if (!(NUDGE_KEYS as readonly string[]).includes(event.key)) { return false; }
    if (this.gizmo.mode !== 'move') { return false; }
    if (SmokeviewComponent.isFormField(event.target)) { return false; }
    if (this.gesture && !this.gizmo.isNudging) { return false; }

    // A repeat continues a burst - it never starts one. That is what lets
    // Escape abandon a burst under a held key: the element stays put until
    // the key is pressed afresh.
    if (event.repeat && !this.gizmo.isNudging) {
      event.preventDefault();
      return true;
    }

    const camera = this.babylonService.camera;
    if (!camera) { return false; }

    // The camera's OWN up, taken into world space - not upVector, which this
    // scene pins to the world's z and whose floor projection is nothing.
    const move = nudgeDirection(
      event.key as NudgeKey,
      camera.getDirection(BABYLON.Vector3.Right()),
      camera.getTarget().subtract(camera.position),
      camera.getDirection(BABYLON.Vector3.Up()));
    if (!move) { return false; }

    event.preventDefault();
    this.nudgeKeys.add(event.key);
    this.gizmo.nudge(move.axis, move.direction);
    return true;
  }

  /**
   * One keystroke of the dynamic input.
   *
   * The AutoCAD contract: digits state the dimension, Tab moves along, Enter
   * settles, Backspace corrects - all while the mouse goes on dragging. The
   * first digit replaces what the mouse was showing rather than appending to
   * it, exactly as a focused-and-selected field would have behaved.
   */
  private routeGestureKey(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) { return; }
    const key = this.gesture.activeKey;

    if (event.key === 'Enter') {
      event.preventDefault();
      this.gestureOwner.commit();
      return;
    }

    if (event.key === 'Tab') {
      // The panel floats over a canvas; the next thing in the document order
      // is not the next field
      event.preventDefault();
      this.gestureOwner.nextField();
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      const trimmed = (this.values[key] ?? '').slice(0, -1);
      this.applyTyped(key, trimmed);
      return;
    }

    // The characters a coordinate is made of. Comma types as a decimal point -
    // the numeric keypad of every Polish keyboard produces one.
    if (/^[0-9.,+-]$/.test(event.key)) {
      event.preventDefault();
      const typed = event.key === ',' ? '.' : event.key;
      const base = this.editing.has(key) ? (this.values[key] ?? '') : '';
      this.applyTyped(key, base + typed);
    }
  }

  /** Put one field's text where both the panel and the gesture read it. */
  private applyTyped(key: GestureKey, text: string): void {
    if (text === '') {
      this.editing.delete(key);
    } else {
      this.editing.add(key);
    }
    this.values[key] = text;
    this.gestureOwner.type(key, text);
  }

  /** Releasing ctrl asks for snapping back; a nudge burst settles here too. */
  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent): void {
    this.gizmo.setCtrlHeld(event.ctrlKey);
    // Mid-gesture the latch says no (ADR-0011)
    if (event.key === 'Control') { this.gestureOwner.setSnapSuspended(false); }

    // The nudge burst settles when the last of its keys comes up
    if (this.nudgeKeys.delete(event.key) && this.nudgeKeys.size === 0) {
      this.gizmo.endNudge();
    }
  }

  /** Alt-tab mid-burst: the keyup never arrives, so the burst settles here. */
  @HostListener('window:blur')
  onWindowBlur(): void {
    this.nudgeKeys.clear();
    this.gizmo.endNudge();
  }

  /** Show what the gesture is doing, without stepping on what is being typed. */
  private onGesture(): void {
    // Two producers, one panel: whichever holds a gesture is the one showing
    const view = this.drawView ?? this.gizmoView;
    this.gesture = view;

    if (!view) {
      this.values = {};
      this.editing.clear();
      return;
    }

    view.fields
      .filter(field => !this.editing.has(field.key))
      .forEach(field => this.values[field.key] = field.value.toFixed(3));
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
  private gestureSub: Subscription;
  private drawGestureSub: Subscription;
  private measureLabelSub: Subscription;

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

  /** The nudge keys currently held - the burst commits when the last comes up. */
  private readonly nudgeKeys = new Set<string>();

  /** The previous middle press, while a second one could still pair with it. */
  private lastMiddleDown: { time: number, x: number, y: number } | null = null;

  constructor(
    public picking: PickService,
    private babylonService: BabylonService,
    public viewCubeService: ViewCubeService,
    private sceneBounds: SceneBoundsService,
    private gizmo: GizmoService,
    private drawTool: DrawToolService,
    private measureTool: MeasureToolService,
    private timeline: TimelineService,
    private zone: NgZone
  ) { }

  /** Whether a keystroke belongs to a form field rather than the scene. */
  private static isFormField(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;
    if (!element || !element.tagName) { return false; }
    return element.tagName === 'INPUT' || element.tagName === 'TEXTAREA'
      || element.tagName === 'SELECT' || element.isContentEditable === true;
  }

  /** Whether a keystroke is a focused button's own activation. */
  private static isButton(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;
    return !!element && element.tagName === 'BUTTON';
  }

  ngOnInit() {
    // Decided on first paint, so an unsupported browser sees the message
    // straight away instead of after a failed engine initialisation.
    this.webGPUAvailable = BabylonService.isWebGPUSupported();

    // A drag arrives from Babylon's own pointer handling, and the render loop
    // runs outside the zone (see BabylonService.animate) - so the panel is
    // brought back into it rather than trusting the frame to do it.
    this.gestureSub = this.gizmo.gesture$.subscribe(view =>
      this.zone.run(() => { this.gizmoView = view; this.onGesture(); }));
    this.drawGestureSub = this.drawTool.gesture$.subscribe(view =>
      this.zone.run(() => { this.drawView = view; this.onGesture(); }));
    this.measureLabelSub = this.measureTool.label$.subscribe(label =>
      this.zone.run(() => this.measureLabel = label));
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
    if (this.gestureSub) {
      this.gestureSub.unsubscribe();
    }
    if (this.drawGestureSub) {
      this.drawGestureSub.unsubscribe();
    }
    if (this.measureLabelSub) {
      this.measureLabelSub.unsubscribe();
    }
    // Tears down scene and engine, and resets every scene-scoped service
    this.babylonService.disposeScene();
  }

}
