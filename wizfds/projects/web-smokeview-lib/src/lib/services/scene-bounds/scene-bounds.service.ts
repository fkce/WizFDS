import { Injectable } from '@angular/core';
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
 * How far past the model a clip slider reaches at either end.
 *
 * The shader compares a fragment's own coordinate against the plane, so a plane
 * sitting exactly on a face would clip that face away. Same margin the unit-cube
 * scene expressed as the magic -1.1 / 1.1.
 */
const CLIP_MARGIN_RATIO = 0.1;

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

  /**
   * Where a clip slider at `percent` puts its plane, in metres.
   *
   * The slider spans the model: the ends clear it entirely so that a slider
   * pushed all the way hides nothing (or everything), and everything between
   * interpolates across the bounding box. Holding the sliders as percentages and
   * resolving them here is what lets a scenario of a different size be drawn
   * without moving them - half way along is half way along whatever is on screen.
   *
   * Which end hides nothing is not the same on all three axes - the shaders keep
   * what is above the plane on x and y, and what is below it on z - which is why
   * the drawing services start their sliders at 0, 0 and 100.
   */
  public clipAt(axis: SceneAxis, percent: number): number {
    const min = this.minOn(axis);
    const max = this.maxOn(axis);

    if (percent <= 0) { return min - CLIP_MARGIN_RATIO * this.extent; }
    if (percent >= 100) { return max + CLIP_MARGIN_RATIO * this.extent; }
    return min + (max - min) * percent / 100;
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
      ...(scene.jetfans || []).map(jetfanDrawnBox)
    ]);
  }

  /**
   * Measure the scene from a set of boxes, in metres.
   *
   * An empty list leaves the bounds alone: a scenario with nothing in it is
   * still drawn somewhere, and collapsing the scene onto a point would take
   * the camera and the clip sliders with it.
   */
  public setFrom(boxes: readonly SceneXb[]): void {
    if (!boxes || boxes.length === 0) { return; }

    let xMin = boxes[0].x1, yMin = boxes[0].y1, zMin = boxes[0].z1;
    let xMax = boxes[0].x2, yMax = boxes[0].y2, zMax = boxes[0].z2;

    boxes.forEach((xb: SceneXb) => {
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
   * Measure the scene from a flat position buffer, as the standalone viewer
   * hands it over - it reads geometry out of a Smokeview export and has no
   * scenario to measure (ADR-0004).
   *
   * Folded over the raw array rather than turned into boxes and handed to
   * setFrom(): an export runs to hundreds of thousands of vertices, and one
   * object apiece is a lot of garbage for a bounding box.
   */
  public setFromPositions(positions: readonly number[]): void {
    if (!positions || positions.length < 3) { return; }

    let xMin = positions[0], yMin = positions[1], zMin = positions[2];
    let xMax = xMin, yMax = yMin, zMax = zMin;

    for (let i = 3; i + 2 < positions.length; i += 3) {
      xMin = Math.min(xMin, positions[i]);
      xMax = Math.max(xMax, positions[i]);
      yMin = Math.min(yMin, positions[i + 1]);
      yMax = Math.max(yMax, positions[i + 1]);
      zMin = Math.min(zMin, positions[i + 2]);
      zMax = Math.max(zMax, positions[i + 2]);
    }

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
