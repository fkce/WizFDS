import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import * as BABYLON from 'babylonjs';

import { BabylonService } from '../babylon/babylon.service';
import { SceneLifecycleService, SceneScoped } from '../babylon/scene-lifecycle.service';
import { ScenePick, SceneRegistryService } from '../babylon/scene-registry.service';
import { SceneBoundsService } from '../scene-bounds/scene-bounds.service';
import { SceneElementType, SceneXb } from '../drawing/scene-input';

/**
 * What the picking service needs from the obst layer.
 *
 * Two questions, and neither is about obsts as such. `isVisible` answers for
 * every layer: the clipping planes are one coordinate per axis, set on all of
 * them together (see SmokeviewComponent.setClip), so whichever material is asked
 * gives the same answer. `promote`/`demote` are genuinely obst-only - it is the
 * obsts that are pooled in their thousands and have to leave the pool to be
 * edited (ADR-0006).
 *
 * ObstService is what answers them, and binds itself - see its constructor.
 */
export interface ObstScene {
  /** Whether a point is on the side of the clipping planes that is drawn. */
  isVisible(point: BABYLON.Vector3): boolean;
  /** Take an obst out of its pool and give it a mesh of its own (ADR-0006). */
  promote(uuid: string): void;
  /** Put it back into the pool it came from. */
  demote(uuid: string): void;
}

/** Colour of the outline around a selected element. */
const SELECTED_COLOR = new BABYLON.Color4(0.09, 0.49, 0.99, 1);

/** Colour of the outline around the element under the pointer. */
const HOVERED_COLOR = new BABYLON.Color4(0.55, 0.72, 1, 1);

/** How solid the box over a selected element is, and over a hovered one. */
const SELECTED_ALPHA = 0.4;
const HOVERED_ALPHA = 0.15;

/**
 * The types drawn as a volume around other geometry rather than as matter.
 *
 * A &MESH is the domain the whole model sits in; an &INIT is a warm layer over a
 * storey; a &ZONE wraps a shaft. Each of them therefore has faces between the
 * camera and the walls inside it, and nearest-first would make it answer every
 * click aimed at those walls - the &MESH would answer nearly all of them, since
 * it encloses everything.
 *
 * So they yield: a pick takes the nearest hit that is not one of these, and
 * reaches one only where nothing solid stands behind it. That is what a user
 * means by clicking a wall through the domain it is in.
 *
 * Not exhaustive, and knowingly so: a &DEVC that measures a volume is a region
 * by the same argument, but the type alone does not say which devices those are.
 * Turning the device layer off is the way past one for now.
 */
const ENCLOSING_TYPES: readonly SceneElementType[] = ['mesh', 'init', 'zone'];

/**
 * What the user picked in the scene, and what is highlighted.
 *
 * Picking is one service for every element type, because a pick is a question
 * about what is on screen and the answer comes from the registry, which knows
 * every type (ADR-0005). What replaced this filtered picks to the obst meshes,
 * so a &MESH, a &VENT or a device could not be clicked at all.
 *
 * The selection itself belongs to the app (ADR-0004): `picked$` says what the
 * user did, `setSelected()` says what to draw a highlight around. Until the app
 * owns it, this service applies its own picks - see pick().
 */
@Injectable({
  providedIn: 'root'
})
export class PickService implements SceneScoped {

  /**
   * What the user picked, in the order they picked it. `undefined` for a click
   * that landed on nothing, which is how a user drops a selection.
   */
  public readonly picked$: Observable<ScenePick | undefined>;

  /** What is highlighted. The last of them is what the pick panel shows. */
  public selected: ScenePick[] = [];

  /** The element under the pointer, if the pointer is over one. */
  public hovered: ScenePick;

  /** Who draws the obsts. Bound once, by that service itself. */
  private obstScene: ObstScene | null = null;

  /** The highlight boxes drawn over the selection, and the one over the hover. */
  private readonly selectionMeshes = new Map<string, BABYLON.Mesh>();
  private hoverMesh: BABYLON.Mesh;
  private selectionMaterial: BABYLON.StandardMaterial;
  private hoverMaterial: BABYLON.StandardMaterial;

  private readonly pickedSubject = new Subject<ScenePick | undefined>();

  constructor(
    private babylonService: BabylonService,
    private sceneBounds: SceneBoundsService,
    private sceneRegistry: SceneRegistryService,
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
    this.picked$ = this.pickedSubject.asObservable();
  }

  /**
   * Say who draws the obsts.
   *
   * Called by ObstService on construction rather than injected the other way
   * round, which would be a cycle: the drawing service is the one that has to
   * know a selection exists, because a re-render drops it.
   */
  public bind(obstScene: ObstScene): void {
    this.obstScene = obstScene;
  }

  /** The last element picked - what the pick panel names. */
  public get lastSelected(): ScenePick | undefined {
    return this.selected[this.selected.length - 1];
  }

  /** Release everything tied to the scene that has just been disposed. */
  public resetSceneState(): void {
    this.selectionMeshes.clear();
    this.hoverMesh = undefined;
    this.selectionMaterial = undefined;
    this.hoverMaterial = undefined;
    this.selected = [];
    this.hovered = undefined;
  }

  /**
   * Pick whatever a ray reaches, and say so.
   *
   * @param ray a picking ray, in scene coordinates
   * @param options `add` extends the selection instead of replacing it
   */
  public pick(ray: BABYLON.Ray, options: { add?: boolean } = {}): void {
    const hit = this.pickElement(ray);

    this.applyPick(hit, options.add === true);
    this.pickedSubject.next(hit);
  }

  /**
   * Mark what a click would select.
   *
   * Hovering does not single the element out: the pointer crosses hundreds of
   * them on the way anywhere, and promoting each in turn would be pure churn.
   */
  public hover(ray: BABYLON.Ray): void {
    const hit = this.pickElement(ray);
    if (hit && this.hovered && this.hovered.uuid === hit.uuid) { return; }

    this.clearHover();
    if (!hit) { return; }

    this.hovered = hit;
    this.hoverMesh = this.outlineBox(hit.xb, 'hovered', HOVERED_COLOR, HOVERED_ALPHA);
  }

  /**
   * Highlight exactly these elements, replacing whatever was highlighted.
   *
   * The way in for whoever owns the selection - the app, which spans the 3D view,
   * the forms and the CAD bridge and so is the only place that can hold it
   * (ADR-0004, ADR-0005).
   */
  public setSelected(selected: readonly ScenePick[]): void {
    const kept = new Set(selected.map(element => element.uuid));

    Array.from(this.selectionMeshes.keys())
      .filter(uuid => !kept.has(uuid))
      .forEach(uuid => this.dropHighlight(uuid));

    this.selected = [...selected];
    this.selected
      .filter(element => !this.selectionMeshes.has(element.uuid))
      .forEach(element => this.addHighlight(element));
  }

  /**
   * Drop the current selection. Called when a pick misses, which can happen
   * before anything was ever selected.
   */
  public clearSelection(): void {
    this.setSelected([]);
  }

  /** Drop the hover highlight - the pointer left the canvas. */
  public clearHover(): void {
    if (this.hoverMesh) {
      this.hoverMesh.dispose();
      this.hoverMesh = undefined;
    }
    this.hovered = undefined;
  }

  /**
   * Fold one pick into the selection.
   *
   * The app's job once it owns the selection; done here so that picking works on
   * its own, and so that the standalone viewer - which has no `Fds` to hold a
   * selection against - keeps working at all.
   */
  private applyPick(hit: ScenePick | undefined, add: boolean): void {
    if (!hit) {
      if (!add) { this.clearSelection(); }
      return;
    }

    const already = this.selected.some(element => element.uuid === hit.uuid);
    if (add && already) {
      this.setSelected(this.selected.filter(element => element.uuid !== hit.uuid));
      return;
    }

    this.setSelected(add ? [...this.selected, hit] : [hit]);
  }

  /**
   * Which element a ray reaches first, among the ones actually on screen.
   *
   * Everything the app handed over is a candidate; nothing the library put on
   * screen for its own reasons is - the registry is what tells the two apart.
   */
  private pickElement(ray: BABYLON.Ray): ScenePick | undefined {
    const scene = this.babylonService.scene;
    if (!scene) { return undefined; }

    const hits = scene.multiPickWithRay(ray, (mesh) => this.sceneRegistry.drawsElements(mesh));
    if (!hits || hits.length === 0) { return undefined; }

    // Nearest first, and nothing the clipping planes have taken off the screen:
    // a click has to land on what the user can see.
    const visible = hits
      .filter(hit => hit.pickedPoint && this.isVisible(hit.pickedPoint))
      .sort((a, b) => a.distance - b.distance);

    const picks: ScenePick[] = [];
    for (const hit of visible) {
      const pick = this.sceneRegistry.pickAt(
        hit.pickedMesh, hit.faceId, hit.thinInstanceIndex ?? -1);
      if (pick) { picks.push(pick); }
    }

    // A volume drawn around other geometry yields to what is inside it
    return picks.find(pick => ENCLOSING_TYPES.indexOf(pick.type) === -1) ?? picks[0];
  }

  /**
   * Whether a point survives the clipping planes.
   *
   * Answered by the obst layer for every type - the planes are set on all of
   * them together, so there is one answer. Nothing has been drawn yet if no
   * layer has bound, and then nothing is clipped either.
   */
  private isVisible(point: BABYLON.Vector3): boolean {
    return this.obstScene ? this.obstScene.isVisible(point) : true;
  }

  /** Draw the highlight over one element, singling an obst out of its pool. */
  private addHighlight(element: ScenePick): void {
    // A selected obst is next in line to be edited, so it leaves the pool
    if (element.type === 'obst' && this.obstScene) { this.obstScene.promote(element.uuid); }

    this.selectionMeshes.set(element.uuid, this.outlineBox(
      element.xb, `picked_${element.uuid}`, SELECTED_COLOR, SELECTED_ALPHA));
  }

  /** Take the highlight off one element, and put an obst back in its pool. */
  private dropHighlight(uuid: string): void {
    const mesh = this.selectionMeshes.get(uuid);
    if (mesh) { mesh.dispose(); }
    this.selectionMeshes.delete(uuid);

    const element = this.selected.find(candidate => candidate.uuid === uuid);
    if (element && element.type === 'obst' && this.obstScene) { this.obstScene.demote(uuid); }
  }

  /**
   * A translucent box drawn over an element, outlined so it reads through
   * whatever is in front of it.
   *
   * A plane has no thickness and a marker box is a cube, so both come out of the
   * same call - what is highlighted is the box the element is drawn in, which is
   * what the registry holds (see SceneEntry.xb).
   */
  private outlineBox(
    xb: SceneXb, name: string, color: BABYLON.Color4, alpha: number
  ): BABYLON.Mesh {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, {
      width: xb.x2 - xb.x1, height: xb.y2 - xb.y1, depth: xb.z2 - xb.z1
    }, this.babylonService.scene);

    mesh.material = this.highlightMaterial(color === SELECTED_COLOR, alpha);
    // It sits exactly on the element it marks; picking it would shadow it
    mesh.isPickable = false;
    mesh.enableEdgesRendering();
    mesh.edgesWidth = this.sceneBounds.outlineWidth;
    mesh.edgesColor = color;
    mesh.position = new BABYLON.Vector3(
      (xb.x1 + xb.x2) / 2, (xb.y1 + xb.y2) / 2, (xb.z1 + xb.z2) / 2
    );
    return mesh;
  }

  /**
   * The material every highlight box shares.
   *
   * One apiece is what left a StandardMaterial behind on every click, and a
   * multi-selection would have made that one per selected element.
   */
  private highlightMaterial(selected: boolean, alpha: number): BABYLON.StandardMaterial {
    const existing = selected ? this.selectionMaterial : this.hoverMaterial;
    if (existing) { return existing; }

    const material = new BABYLON.StandardMaterial(
      selected ? 'pickedMaterial' : 'hoveredMaterial', this.babylonService.scene);
    material.ambientColor = new BABYLON.Color3(1, 1, 1);
    material.alpha = alpha;
    material.zOffset = -0.05;

    if (selected) { this.selectionMaterial = material; } else { this.hoverMaterial = material; }
    return material;
  }
}
