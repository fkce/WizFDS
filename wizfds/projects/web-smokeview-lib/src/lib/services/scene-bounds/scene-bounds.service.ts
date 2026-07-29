import { Injectable, isDevMode } from '@angular/core';
import { SceneInput, SceneXb } from '../drawing/scene-input';
import { jetfanDrawnBox } from '../drawing/jetfan/jetfan-box';
import { SceneLifecycleService, SceneScoped } from '../babylon/scene-lifecycle.service';

/** One of the three axes of the FDS coordinate system. */
export type SceneAxis = 'x' | 'y' | 'z';

/** A point in the scene, in FDS metres. */
export interface ScenePoint {
  readonly x: number,
  readonly y: number,
  readonly z: number
}

/**
 * What an empty scenario is drawn against.
 *
 * Nothing is on screen either way, but the camera, the world axes and the clip
 * sliders all need a scale, and none of them may be handed a zero.
 */
const DEFAULT_BOX: SceneXb = { x1: 0, x2: 10, y1: 0, y2: 10, z1: 0, z2: 10 };

/** Edge width of a solid body, as a fraction of the model's longest side. */
const EDGE_WIDTH_RATIO = 0.05;

/** Edge width of an element drawn as an outline, same units as above. */
const OUTLINE_WIDTH_RATIO = 0.1;

/**
 * How big a device marker is drawn, in metres.
 *
 * A physical size, not a fraction of the model: a sprinkler is a piece of
 * equipment of a known size, and a marker that grew with the building would be
 * six metres across in a tunnel. Same reasoning as the jetfan arrows.
 */
const MARKER_SIZE = 0.3;

/**
 * The smallest a marker may be relative to the model.
 *
 * A physical size alone loses the other way round: 30 cm across a four-hundred
 * metre tunnel is a pixel, and a device the user cannot see is a device they
 * cannot check. This is the floor that keeps it on screen.
 */
const MARKER_MIN_RATIO = 0.004;

/**
 * How far past the model a clip slider reaches at either end.
 *
 * The shader compares a fragment's own coordinate against the plane, so a plane
 * sitting exactly on a face would clip that face away. Same margin the unit-cube
 * scene expressed as the magic -1.1 / 1.1.
 */
const CLIP_MARGIN_RATIO = 0.1;

/** How many positions a clip slider offers across its whole travel. */
const CLIP_SLIDER_STEPS = 1000;

/**
 * The largest coordinate the scene is measured against, in metres.
 *
 * FDS writes 1e20 for a coordinate that was never given one, and a scenario
 * imported from CAD can carry an element that kept it. Measured, that element
 * sets the scale of everything: the camera's near plane lands past the whole
 * model and the scene goes black but for the sentinel box itself. Such an
 * element is still drawn - it is the user's, and seeing it is how they find it -
 * it just does not get to say how big the scene is.
 *
 * A thousand kilometres is fourteen orders of magnitude clear of the sentinel
 * and further than any fire model reaches.
 */
const MEASURABLE_LIMIT = 1e6;

/**
 * The box the scene occupies, in FDS metres, and everything sized against it.
 *
 * The scene is drawn in metres 1:1 with its origin at the FDS origin (ADR-0002),
 * so a picked coordinate is an FDS coordinate and nothing is converted in either
 * direction. What used to be a constant tuned for a unit cube - camera limits,
 * clip ranges, edge widths - is a multiple of `extent` instead, which is what
 * lets a five-metre room and a four-hundred-metre tunnel look the same on screen.
 *
 * The bounds are measured once, before anything is drawn, rather than by whichever
 * drawing service happened to run first.
 */
@Injectable({
  providedIn: 'root'
})
export class SceneBoundsService implements SceneScoped {

  private current: SceneXb = DEFAULT_BOX;

  constructor(sceneLifecycle: SceneLifecycleService) {
    sceneLifecycle.register(this);
  }

  /** The bounds go with the scene they were measured for. */
  public resetSceneState(): void {
    this.current = DEFAULT_BOX;
  }

  /** The box the scene occupies, in FDS metres. */
  public get box(): SceneXb {
    return this.current;
  }

  /**
   * The longest side of the box, in metres - the one number everything else is
   * scaled by. Never zero, so nothing derived from it collapses.
   */
  public get extent(): number {
    const box = this.current;
    const longest = Math.max(box.x2 - box.x1, box.y2 - box.y1, box.z2 - box.z1);
    return longest > 0 ? longest : 1;
  }

  /**
   * Radius of the sphere that contains the whole model, in metres - what a
   * camera has to fit in view to show all of it.
   */
  public get boundingRadius(): number {
    const box = this.current;
    const dx = box.x2 - box.x1, dy = box.y2 - box.y1, dz = box.z2 - box.z1;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) / 2;
  }

  /** The middle of the box - where the camera looks. */
  public get center(): ScenePoint {
    const box = this.current;
    return {
      x: (box.x1 + box.x2) / 2,
      y: (box.y1 + box.y2) / 2,
      z: (box.z1 + box.z2) / 2
    };
  }

  /** Outline thickness for a solid body, in scene units. */
  public get edgeWidth(): number {
    return EDGE_WIDTH_RATIO * this.extent;
  }

  /** Outline thickness for an element drawn as an outline rather than filled. */
  public get outlineWidth(): number {
    return OUTLINE_WIDTH_RATIO * this.extent;
  }

  /** How big a device marker is drawn, in metres. See MARKER_SIZE. */
  public get markerSize(): number {
    return Math.max(MARKER_SIZE, MARKER_MIN_RATIO * this.extent);
  }

  /**
   * The far end a clip slider can be dragged to, in metres.
   *
   * A margin past the model at either end, so that a slider pushed all the way
   * hides nothing (or everything): the shader compares a fragment's own
   * coordinate against the plane, so a plane sitting exactly on the outermost
   * face would clip that face away.
   */
  public clipMin(axis: SceneAxis): number {
    return this.minOn(axis) - CLIP_MARGIN_RATIO * this.extent;
  }

  public clipMax(axis: SceneAxis): number {
    return this.maxOn(axis) + CLIP_MARGIN_RATIO * this.extent;
  }

  /**
   * How finely a clip slider moves, in metres.
   *
   * A whole number of steps across the travel, so that the far end is a position
   * the slider can actually reach - a range input only stops on multiples of its
   * step, and would otherwise come up short of its own maximum.
   */
  public clipStep(axis: SceneAxis): number {
    return (this.clipMax(axis) - this.clipMin(axis)) / CLIP_SLIDER_STEPS;
  }

  /**
   * Where a clip plane hides nothing, in metres.
   *
   * Not the same end on all three axes: the shaders keep what is above the plane
   * on x and y, and what is below it on z. Saying so once here keeps every
   * drawing service from having to know it.
   */
  public openClipAt(axis: SceneAxis): number {
    return axis === 'z' ? this.clipMax(axis) : this.clipMin(axis);
  }

  /**
   * Measure the scene from a scenario.
   *
   * The meshes span the whole model, so they are what defines it when the
   * scenario has any; an obst outside them is a modelling error rather than a
   * reason to zoom out. Without a &MESH the scene is whatever else is there.
   */
  public setFromScene(scene: SceneInput): void {
    if (scene.meshes && scene.meshes.length > 0) {
      this.setFrom(scene.meshes.map(mesh => mesh.xb));
      return;
    }

    this.setFrom([
      ...(scene.obsts || []).map(obst => obst.xb),
      ...(scene.holes || []).map(hole => hole.xb),
      ...(scene.opens || []).map(open => open.xb),
      ...(scene.vents || []).map(vent => vent.xb),
      ...(scene.fires || []).map(fire => fire.xb),
      ...(scene.jetfans || []).map(jetfanDrawnBox),
      // A geom carries the box its triangles occupy for exactly this - a
      // scenario whose only geometry is a &GEOM is still a scenario
      ...(scene.geoms || []).map(geom => geom.xb),
      ...(scene.devcs || []).map(devc => devc.xb)
    ]);
  }

  /**
   * Measure the scene from a set of boxes, in metres.
   *
   * Nothing measurable leaves the bounds alone: a scenario with nothing in it is
   * still drawn somewhere, and collapsing the scene onto a point - or blowing it
   * up to the sentinel - would take the camera and the clip sliders with it.
   */
  public setFrom(boxes: readonly SceneXb[]): void {
    const measurable = (boxes || []).filter(xb => this.isMeasurable(xb));
    if (measurable.length === 0) { return; }

    if (isDevMode() && measurable.length < boxes.length) {
      console.warn('[SceneBoundsService] Ignoring ' + (boxes.length - measurable.length) +
        ' element(s) whose coordinates are past ' + MEASURABLE_LIMIT +
        ' m when measuring the scene - they are still drawn.');
    }

    let xMin = measurable[0].x1, yMin = measurable[0].y1, zMin = measurable[0].z1;
    let xMax = measurable[0].x2, yMax = measurable[0].y2, zMax = measurable[0].z2;

    measurable.forEach((xb: SceneXb) => {
      xMin = Math.min(xMin, xb.x1, xb.x2);
      xMax = Math.max(xMax, xb.x1, xb.x2);
      yMin = Math.min(yMin, xb.y1, xb.y2);
      yMax = Math.max(yMax, xb.y1, xb.y2);
      zMin = Math.min(zMin, xb.z1, xb.z2);
      zMax = Math.max(zMax, xb.z1, xb.z2);
    });

    this.current = { x1: xMin, x2: xMax, y1: yMin, y2: yMax, z1: zMin, z2: zMax };
  }

  /**
   * Whether a box says anything usable about how big the scene is.
   *
   * See MEASURABLE_LIMIT: an element that was never given coordinates carries
   * the FDS sentinel, and one of those decides the scale of everything else.
   */
  private isMeasurable(xb: SceneXb): boolean {
    if (!xb) { return false; }
    return [xb.x1, xb.x2, xb.y1, xb.y2, xb.z1, xb.z2]
      .every(value => this.isMeasurableCoordinate(value));
  }

  private isMeasurableCoordinate(value: number): boolean {
    return Number.isFinite(value) && Math.abs(value) <= MEASURABLE_LIMIT;
  }

  /**
   * Measure the scene from a flat position buffer, as the standalone viewer
   * hands it over - it reads geometry out of a Smokeview export and has no
   * scenario to measure (ADR-0004).
   *
   * Folded over the raw array rather than turned into boxes and handed to
   * setFrom(): an export runs to hundreds of thousands of vertices, and one
   * object apiece is a lot of garbage for a bounding box.
   */
  public setFromPositions(positions: readonly number[]): void {
    if (!positions) { return; }

    let xMin = Infinity, yMin = Infinity, zMin = Infinity;
    let xMax = -Infinity, yMax = -Infinity, zMax = -Infinity;
    let measured = false;

    for (let i = 0; i + 2 < positions.length; i += 3) {
      const x = positions[i], y = positions[i + 1], z = positions[i + 2];
      // Same sentinel, one vertex at a time - see MEASURABLE_LIMIT
      if (!this.isMeasurableCoordinate(x) ||
        !this.isMeasurableCoordinate(y) ||
        !this.isMeasurableCoordinate(z)) { continue; }

      xMin = Math.min(xMin, x); xMax = Math.max(xMax, x);
      yMin = Math.min(yMin, y); yMax = Math.max(yMax, y);
      zMin = Math.min(zMin, z); zMax = Math.max(zMax, z);
      measured = true;
    }

    if (!measured) { return; }

    this.current = { x1: xMin, x2: xMax, y1: yMin, y2: yMax, z1: zMin, z2: zMax };
  }

  private minOn(axis: SceneAxis): number {
    const box = this.current;
    return axis === 'x' ? box.x1 : axis === 'y' ? box.y1 : box.z1;
  }

  private maxOn(axis: SceneAxis): number {
    const box = this.current;
    return axis === 'x' ? box.x2 : axis === 'y' ? box.y2 : box.z2;
  }
}
