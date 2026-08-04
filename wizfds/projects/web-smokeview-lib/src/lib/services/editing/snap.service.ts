import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';

import { BabylonService } from '../babylon/babylon.service';
import { SceneLifecycleService, SceneScoped } from '../babylon/scene-lifecycle.service';
import { SceneAxis, ScenePoint } from '../scene-bounds/scene-bounds.service';
import { SceneElement, SceneInput, SceneXb } from '../drawing/scene-input';
import { ACCENT_COLOR, ACCENT_EDGE_COLOR } from '../../consts/drawing';
import { SceneDelta } from './edit-command';
import { faceAxis, SceneFace } from './face-drag';
import {
  activeGrid, cornersOf, metresPerPixel, SnapGrid, SnapHit, SnapMode, snapPoint, SnapModes
} from './snap';

/**
 * How near a candidate has to be, in screen pixels.
 *
 * On screen and not in metres, so that it means the same thing at every zoom -
 * ten centimetres is a doorway in a room and a rounding error in a tunnel. Ten
 * is what AutoCAD's aperture defaults to, and it is about the width of a cursor.
 */
const TOLERANCE_PIXELS = 10;

/** The marker drawn where a snap has caught, as a fraction of the tolerance. */
const MARKER_SCALE = 0.5;

/**
 * What the scene is snapped against, and who may turn it off.
 *
 * The arithmetic is in snap.ts and knows nothing of a scene. This is what hands
 * it three things it cannot work out for itself: the model, the tolerance the
 * current zoom implies, and the modes the user left switched on.
 *
 * It is public API of the library, like SceneViewService: the ribbon's Snap
 * panel drives it from the host, because the host is where the interface lives
 * (ADR-0010), while the snapping itself happens inside a gesture that never
 * leaves the library (ADR-0004).
 */
@Injectable({
  providedIn: 'root'
})
export class SnapService implements SceneScoped {

  /**
   * All three on to begin with, as OSNAP is.
   *
   * An editor whose users come from AutoCAD is expected to catch on geometry;
   * one that has to be switched on first reads as not having the feature. Ctrl
   * is the way past it for the one gesture that needs to be free.
   */
  private readonly modes: { corner: boolean, edge: boolean, grid: boolean } =
    { corner: true, edge: true, grid: true };

  /**
   * Snapping is off for the duration of the gesture - ctrl was pressed.
   *
   * Held rather than passed through each call: it is a state of the gesture,
   * not of one question. Who may clear it, and when, is GizmoService's - see
   * setSnapSuspended() there.
   */
  public suspended = false;

  /** The scenario as it was last drawn. Set by whoever draws it. */
  private scene: SceneInput | null = null;

  /** Every box on screen, gathered once per render rather than per frame. */
  private boxes: ReadonlyArray<SceneXb & { uuid: string }> = [];

  /** The marker drawn where a snap has caught, in the accent colour. */
  private marker: BABYLON.Mesh | null = null;
  private markerMaterial: BABYLON.StandardMaterial | null = null;

  constructor(
    private babylonService: BabylonService,
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
  }

  // ==========================================
  // Modes
  // ==========================================

  /** Whether one mode is currently on. */
  public isOn(mode: SnapMode): boolean {
    return this.modes[mode];
  }

  /** Flip one mode - what a button in the Snap panel does. */
  public toggle(mode: SnapMode): void {
    this.modes[mode] = !this.modes[mode];
  }

  /** Whether anything at all would catch a gesture. */
  public get anyOn(): boolean {
    return this.modes.corner || this.modes.edge || this.modes.grid;
  }

  // ==========================================
  // The model
  // ==========================================

  /**
   * Say what is on screen.
   *
   * Called by whoever draws the scene, on a full render and on an incremental
   * update, because a snap has to catch on what is there now - including
   * something the user drew a moment ago.
   */
  public setScene(scene: SceneInput): void {
    this.scene = scene;
    this.boxes = collectBoxes(scene);
  }

  /**
   * Which &MESH's grid is in force at a point.
   *
   * Also what the status bar names, which is why it is answered here rather
   * than a second time in the app: two implementations of "the active mesh"
   * would eventually disagree, and the one the user reads would not be the one
   * their edit obeyed.
   */
  public gridAt(point: ScenePoint): SnapGrid | null {
    return this.scene ? activeGrid(this.scene.meshes, point) : null;
  }

  // ==========================================
  // Snapping
  // ==========================================

  /**
   * Where a point wants to be, or null if nothing catches it.
   *
   * @param options `axes` confines the answer to those coordinates - one for a
   *                face handle or an axis arrow, two for a plane handle;
   *                `exclude` leaves elements out of the candidates, which is how
   *                the thing being dragged does not catch on itself
   */
  public snap(
    target: ScenePoint,
    options: { axes?: readonly SceneAxis[], exclude?: ReadonlySet<string> } = {}
  ): SnapHit | null {
    if (this.suspended || !this.anyOn) { return null; }

    const exclude = options.exclude;
    const boxes = exclude
      ? this.boxes.filter(box => !exclude.has(box.uuid))
      : this.boxes;

    return snapPoint(target, {
      grid: this.gridAt(target),
      boxes: boxes,
      modes: this.modes as SnapModes,
      tolerance: this.toleranceAt(target)
    }, options.axes);
  }

  /**
   * Adjust a translate so the box it moves catches on something.
   *
   * The box and not the pointer: the user aims with a corner of what they are
   * dragging, and which of the eight it is only becomes clear from which of
   * them finds a candidate. Each is offered, and the catch that asks for the
   * smallest correction is the one they meant.
   *
   * @param axes the axes the gesture is free on - one for an arrow, two for a
   *             plane handle. The correction is confined to them, because the
   *             handle the user grabbed is a promise that nothing else moves.
   */
  public snapMove(
    box: SceneXb,
    delta: SceneDelta,
    axes: readonly SceneAxis[],
    exclude: ReadonlySet<string>
  ): { delta: SceneDelta, hit: SnapHit | null } {
    if (this.suspended || !this.anyOn) { return { delta: delta, hit: null }; }

    const moved = shift(box, delta);
    let best: { hit: SnapHit, correction: SceneDelta, distance: number } | null = null;

    cornersOf(moved).forEach((corner: ScenePoint) => {
      const hit = this.snap(corner, { axes: axes, exclude: exclude });
      if (!hit) { return; }

      const correction = {
        dx: hit.point.x - corner.x, dy: hit.point.y - corner.y, dz: hit.point.z - corner.z
      };
      const distance = Math.hypot(correction.dx, correction.dy, correction.dz);
      if (!best || distance < best.distance) {
        best = { hit: hit, correction: correction, distance: distance };
      }
    });

    if (!best) { return { delta: delta, hit: null }; }

    return {
      delta: {
        dx: delta.dx + best.correction.dx,
        dy: delta.dy + best.correction.dy,
        dz: delta.dz + best.correction.dz
      },
      hit: best.hit
    };
  }

  /**
   * Adjust a face drag so the face it moves catches on something.
   *
   * The face's four corners are offered, for the same reason a translate offers
   * the box's eight: the user aims with a corner, and the middle of the face is
   * the one point on it that is nowhere near anything - the middle of a
   * ten-metre wall is five metres from either end of it.
   *
   * Only the dragged coordinate comes back. Six handles exist so that a drag
   * changes exactly one number, and a snap that moved the face sideways would
   * undo the whole point of them.
   */
  public snapFace(
    box: SceneXb, face: SceneFace, to: number, exclude: ReadonlySet<string>
  ): { coordinate: number, hit: SnapHit | null } {
    if (this.suspended || !this.anyOn) { return { coordinate: to, hit: null }; }

    const axis = faceAxis(face);
    let best: { hit: SnapHit, distance: number } | null = null;

    faceCorners({ ...box, [face]: to }, face).forEach(corner => {
      const hit = this.snap(corner, { axes: [axis], exclude: exclude });
      if (!hit) { return; }

      const distance = Math.abs(hit.point[axis] - to);
      if (!best || distance < best.distance) { best = { hit: hit, distance: distance }; }
    });

    return best
      ? { coordinate: best.hit.point[axis], hit: best.hit }
      : { coordinate: to, hit: null };
  }

  /**
   * How near a candidate has to be at this point, in metres.
   *
   * Worked out from where the camera stands, so the same ten pixels are
   * centimetres in a room and metres across a tunnel.
   */
  public toleranceAt(point: ScenePoint): number {
    return TOLERANCE_PIXELS * this.metresPerPixelAt(point);
  }

  /**
   * How much of the model one screen pixel covers at a point, in metres.
   *
   * Public because a snap is not the only thing measured on screen: a handle
   * that is a fixed size in metres is a speck on a tunnel and fills the view of
   * a cupboard, so the gizmo sizes its own handles from this too.
   */
  public metresPerPixelAt(point: ScenePoint): number {
    const camera = this.babylonService.camera;
    const canvas = this.babylonService.canvas;
    if (!camera || !canvas) { return 0; }

    const distance = BABYLON.Vector3.Distance(
      camera.position, new BABYLON.Vector3(point.x, point.y, point.z));

    return metresPerPixel(distance, camera.fov, canvas.clientHeight);
  }

  // ==========================================
  // The marker
  // ==========================================

  /**
   * Draw where the snap has caught.
   *
   * A box rather than a point, sized off the tolerance so it stays the same
   * size on screen however far the camera is - a marker that shrinks to nothing
   * as you zoom out is a marker you stop trusting.
   */
  public showMarker(hit: SnapHit | null): void {
    const scene = this.babylonService.scene;
    if (!scene || !hit) { this.hideMarker(); return; }

    const size = Math.max(this.toleranceAt(hit.point) * MARKER_SCALE, 1e-4);

    if (!this.marker) {
      this.marker = BABYLON.MeshBuilder.CreateBox('snapMarker', { size: 1 }, scene);
      this.marker.isPickable = false;
      this.marker.material = this.markerMaterialFor(scene);
      this.marker.enableEdgesRendering();
      this.marker.edgesColor = ACCENT_EDGE_COLOR;
    }

    this.marker.setEnabled(true);
    this.marker.scaling = new BABYLON.Vector3(size, size, size);
    this.marker.edgesWidth = Math.max(size * 40, 1);
    this.marker.position = new BABYLON.Vector3(hit.point.x, hit.point.y, hit.point.z);
  }

  /** Take the marker off - the gesture ended, or nothing is catching. */
  public hideMarker(): void {
    if (this.marker) { this.marker.setEnabled(false); }
  }

  /** Azure, which is what this product means by "the tool did something". */
  private markerMaterialFor(scene: BABYLON.Scene): BABYLON.StandardMaterial {
    if (this.markerMaterial) { return this.markerMaterial; }

    const material = new BABYLON.StandardMaterial('snapMarkerMaterial', scene);
    material.emissiveColor = ACCENT_COLOR;
    material.disableLighting = true;
    material.alpha = 0.85;
    this.markerMaterial = material;
    return material;
  }

  /** Nothing here may outlive the scene it was drawn in. */
  public resetSceneState(): void {
    this.marker = null;
    this.markerMaterial = null;
    this.scene = null;
    this.boxes = [];
    this.suspended = false;
  }
}

/** The same box, moved. */
function shift(xb: SceneXb, delta: SceneDelta): SceneXb {
  return {
    x1: xb.x1 + delta.dx, x2: xb.x2 + delta.dx,
    y1: xb.y1 + delta.dy, y2: xb.y2 + delta.dy,
    z1: xb.z1 + delta.dz, z2: xb.z2 + delta.dz
  };
}

/** The four corners of one face - what a face drag is aimed with. */
function faceCorners(xb: SceneXb, face: SceneFace): ScenePoint[] {
  const axis = faceAxis(face);
  return cornersOf(xb).filter(corner => corner[axis] === xb[face]);
}

/**
 * Every box on screen, with the uuid it belongs to.
 *
 * All eleven lists: a &MESH is the domain boundary and a &VENT sits on a wall,
 * and a user aligning to either of them means it. Gathered when the scene
 * changes rather than while a gesture runs, because a drag asks this question
 * on every frame.
 */
function collectBoxes(scene: SceneInput): ReadonlyArray<SceneXb & { uuid: string }> {
  const boxes: (SceneXb & { uuid: string })[] = [];

  const lists: ReadonlyArray<readonly SceneElement[]> = [
    scene.meshes, scene.obsts, scene.holes, scene.opens, scene.vents, scene.fires,
    scene.jetfans, scene.devcs, scene.geoms, scene.inits, scene.zones
  ];

  lists.forEach(list => list.forEach(element =>
    boxes.push({ ...element.xb, uuid: element.uuid })));

  return boxes;
}
