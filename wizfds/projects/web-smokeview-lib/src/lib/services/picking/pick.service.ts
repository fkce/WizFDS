import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import * as BABYLON from 'babylonjs';

import { BabylonService } from '../babylon/babylon.service';
import { SceneLifecycleService, SceneScoped } from '../babylon/scene-lifecycle.service';
import { ScenePick, SceneRegistryService } from '../babylon/scene-registry.service';
import { SceneBoundsService, ScenePoint } from '../scene-bounds/scene-bounds.service';
import { SceneElementType, SceneXb } from '../drawing/scene-input';
import { LayerVisibilityService } from '../drawing/layer-visibility.service';
import { SceneDelta } from '../editing/edit-command';

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
 * How close to an outline a ray has to land to pick an edges-only element.
 *
 * In screen pixels, because the outline itself is drawn at a screen-constant
 * width: what looks grabbable has to be grabbable at any zoom.
 */
const EDGE_PICK_TOLERANCE_PX = 5;

/**
 * The tolerance in metres when there is no camera to measure pixels against -
 * which is the test suite, not the app.
 */
const EDGE_PICK_FALLBACK_M = 0.05;

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
 * A pick, as the user made it.
 *
 * The modifier travels with it because whoever owns the selection is the one who
 * applies it: "the user picked X" is not the whole of what happened if the click
 * was meant to extend a selection rather than replace it.
 */
export interface ScenePicked {
  /** What the click landed on. Absent for a click on empty space. */
  readonly element?: ScenePick;
  /** Whether the click extends the selection - ctrl or shift was held. */
  readonly add: boolean;
}

/** An element a ray reached, and the point on it where it did. */
export interface PickedAt {
  readonly element: ScenePick;
  /** In FDS metres - the scene is drawn in them (ADR-0002). */
  readonly point: ScenePoint;
}

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
   * What the user picked, as they picked it. A click that landed on nothing
   * carries no element - which is how a user drops a selection.
   */
  public readonly picked$: Observable<ScenePicked>;

  /** What is highlighted. The last of them is what the pick panel shows. */
  public selected: ScenePick[] = [];

  /** The element under the pointer, if the pointer is over one. */
  public hovered: ScenePick;

  /**
   * What is highlighted, each time that changes.
   *
   * Replayed, because a tool that stands on the selection - the gizmo of #124 -
   * is switched on long after the click that made it. It also fires when a
   * redraw follows an edit, so the gizmo goes where the element went instead of
   * staying behind on the box it used to occupy.
   *
   * Not the same statement as `picked$`: that one is what the user *did*, this
   * is what is currently marked, whoever decided it.
   */
  public readonly selection$: Observable<readonly ScenePick[]>;

  /**
   * Where the pointer last met the model, in FDS metres - what the status bar
   * reads out. Null when it is over empty space, or off the canvas altogether.
   *
   * A point on a surface rather than on an imagined working plane: in a 3D view
   * there is no one plane the cursor is on, and the coordinate a user wants is
   * the one they could type into a `.fds` file (ADR-0002).
   */
  public readonly pointerAt$: Observable<ScenePoint | null>;

  /**
   * Whether a pick is folded into the highlight here.
   *
   * On for the standalone viewer, which has no `Fds` and so nowhere else for a
   * selection to live. The app turns it off and owns the selection itself
   * (ADR-0004): with both applying, the two would answer differently as soon as
   * a selection reached the app by any route other than a click - from a form,
   * or from the CAD plugin.
   */
  public applyOwnPicks = true;

  /** Who draws the obsts. Bound once, by that service itself. */
  private obstScene: ObstScene | null = null;

  /** The highlight boxes drawn over the selection, and the one over the hover. */
  private readonly selectionMeshes = new Map<string, BABYLON.Mesh>();
  /** The outlines of boxes that do not exist yet - an array or mirror preview (#126). */
  private ghostMeshes: BABYLON.Mesh[] = [];
  private hoverMesh: BABYLON.Mesh;
  private selectionMaterial: BABYLON.StandardMaterial;
  private hoverMaterial: BABYLON.StandardMaterial;

  private readonly pickedSubject = new Subject<ScenePicked>();

  /**
   * Replayed rather than fired: the host subscribes when the user enters the 3D
   * view, which can be after the pointer has already been over the canvas.
   */
  private readonly pointerAtSubject = new BehaviorSubject<ScenePoint | null>(null);

  /** Replayed for the same reason as pointerAt$ - see selection$. */
  private readonly selectionSubject = new BehaviorSubject<readonly ScenePick[]>([]);

  constructor(
    private babylonService: BabylonService,
    private sceneBounds: SceneBoundsService,
    private sceneRegistry: SceneRegistryService,
    private layerVisibility: LayerVisibilityService,
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
    this.picked$ = this.pickedSubject.asObservable();
    this.pointerAt$ = this.pointerAtSubject.asObservable();
    this.selection$ = this.selectionSubject.asObservable();
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
    // The ghosts died with the scene - only the list is left to drop
    this.ghostMeshes = [];
    this.hoverMesh = undefined;
    this.selectionMaterial = undefined;
    this.hoverMaterial = undefined;
    this.selected = [];
    this.hovered = undefined;
    // There is no model left to be over, and nothing left to stand on
    this.pointerAtSubject.next(null);
    this.selectionSubject.next([]);
  }

  /**
   * Pick whatever a ray reaches, and say so.
   *
   * @param ray a picking ray, in scene coordinates
   * @param options `add` extends the selection instead of replacing it
   */
  public pick(ray: BABYLON.Ray, options: { add?: boolean } = {}): void {
    const found = this.pickAlong(ray);
    const hit = found ? found.element : undefined;
    const add = options.add === true;

    if (this.applyOwnPicks) { this.applyPick(hit, add); }
    this.pickedSubject.next({ element: hit, add: add });
  }

  /**
   * Mark what a click would select.
   *
   * Hovering does not single the element out: the pointer crosses hundreds of
   * them on the way anywhere, and promoting each in turn would be pure churn.
   */
  public hover(ray: BABYLON.Ray): void {
    const found = this.pickAlong(ray);
    const hit = found ? found.element : undefined;

    // Published before the outline is dealt with: the pointer travelling across
    // one wall changes the coordinate every frame while the element stays put.
    this.pointerAtSubject.next(found ? found.point : null);

    if (hit && this.hovered && this.hovered.uuid === hit.uuid) { return; }

    this.dropHoverOutline();
    if (!hit) { return; }

    this.hovered = hit;
    this.hoverMesh = this.outlineBox(hit.xb, 'hovered', HOVERED_COLOR, HOVERED_ALPHA);
  }

  /**
   * Highlight exactly these elements, replacing whatever was highlighted.
   *
   * Uuids and nothing else: the identity is all the caller has to know (ADR-0005),
   * and where to draw the box is what the registry is for. The way in for whoever
   * owns the selection - the app, which spans the 3D view, the forms and the CAD
   * bridge and so is the only place that can hold it (ADR-0004).
   *
   * A uuid the scene does not draw is skipped rather than an error: the app's
   * selection can name a &SURF, or an element of a scenario that has since been
   * replaced, and neither is something to highlight.
   */
  public setSelected(uuids: readonly string[]): void {
    const kept = new Set(uuids);

    Array.from(this.selectionMeshes.keys())
      .filter(uuid => !kept.has(uuid))
      .forEach(uuid => this.dropHighlight(uuid));

    const drawn: ScenePick[] = [];
    uuids.forEach(uuid => {
      const entry = this.sceneRegistry.entryFor(uuid);
      if (!entry) { return; }
      drawn.push({ uuid: uuid, type: entry.type, id: entry.id, xb: entry.xb });
    });

    this.selected = drawn;
    drawn
      .filter(element => !this.selectionMeshes.has(element.uuid))
      .forEach(element => this.addHighlight(element));

    this.selectionSubject.next(this.selected);
  }

  /**
   * Draw the highlight around where the selection is *now*.
   *
   * `setSelected()` only adds an outline for a uuid that has none, because
   * re-outlining an unchanged selection would take an obst out of its pool and
   * put it back on every call. But an element that has been edited is still the
   * same uuid in a different place, and its outline would stay behind on the box
   * it used to occupy - so an incremental redraw ends here (#123).
   */
  public redrawSelection(): void {
    const uuids = this.selected.map(element => element.uuid);
    if (uuids.length === 0) { return; }

    // The boxes only - not the pool bookkeeping, which is untouched by an edit:
    // what was singled out for editing is still singled out afterwards.
    this.selectionMeshes.forEach(mesh => mesh.dispose());
    this.selectionMeshes.clear();

    const drawn: ScenePick[] = [];
    uuids.forEach(uuid => {
      const entry = this.sceneRegistry.entryFor(uuid);
      if (!entry) { return; }

      drawn.push({ uuid: uuid, type: entry.type, id: entry.id, xb: entry.xb });
      this.selectionMeshes.set(uuid, this.outlineBox(
        entry.xb, `picked_${uuid}`, SELECTED_COLOR, SELECTED_ALPHA));
    });
    this.selected = drawn;

    // The boxes moved, so whatever stands on them has to move too
    this.selectionSubject.next(this.selected);
  }

  // ==========================================
  // While a gesture is in progress
  // ==========================================

  /**
   * Draw the outlines where the gesture currently has the selection.
   *
   * Nothing is committed until the pointer comes up (ADR-0004), so this is the
   * whole of what moves under the user's hand: the elements themselves stay
   * where the scenario says they are, and one command lands when the drag ends.
   *
   * Read off the registry each time rather than remembered, so a preview cannot
   * drift from where the elements actually are.
   */
  public previewMove(delta: SceneDelta): void {
    this.selectionMeshes.forEach((mesh, uuid) => {
      const entry = this.sceneRegistry.entryFor(uuid);
      if (!entry) { return; }

      mesh.position = new BABYLON.Vector3(
        (entry.xb.x1 + entry.xb.x2) / 2 + delta.dx,
        (entry.xb.y1 + entry.xb.y2) / 2 + delta.dy,
        (entry.xb.z1 + entry.xb.z2) / 2 + delta.dz
      );
    });
  }

  /**
   * Draw one element's outline at a box of its own - what a face drag shows.
   *
   * Rebuilt rather than scaled: a box scaled about its centre moves both of its
   * faces, and the point of a face handle is that one of them stays put. It is
   * one mesh per frame, and a face drag is one element by construction.
   */
  public previewBox(uuid: string, xb: SceneXb): void {
    const existing = this.selectionMeshes.get(uuid);
    if (!existing) { return; }

    existing.dispose();
    this.selectionMeshes.set(uuid, this.outlineBox(
      xb, `picked_${uuid}`, SELECTED_COLOR, SELECTED_ALPHA));
  }

  /**
   * Put the outlines back where the scenario has the elements.
   *
   * The end of every gesture, committed or abandoned: if it was committed, the
   * edit has already been applied and this draws the result; if it was not,
   * this is what undoes the preview.
   */
  public endPreview(): void {
    this.redrawSelection();
  }

  /**
   * Show where a clone-producing command would put its copies (#126).
   *
   * Boxes and nothing else: the elements do not exist yet, so there is no uuid
   * to address them by. The app redraws the set on every change of the
   * builder's numbers and clears it when the builder closes.
   */
  public previewGhosts(boxes: readonly SceneXb[]): void {
    this.clearGhosts();
    if (!this.babylonService.scene) { return; }

    this.ghostMeshes = boxes.map((xb, index) =>
      this.outlineBox(xb, `ghost_${index}`, SELECTED_COLOR, SELECTED_ALPHA));
  }

  /** Take the ghost outlines down. */
  public clearGhosts(): void {
    this.ghostMeshes.forEach(mesh => mesh.dispose());
    this.ghostMeshes = [];
  }

  /**
   * Drop the current selection. Called when a pick misses, which can happen
   * before anything was ever selected.
   */
  public clearSelection(): void {
    this.setSelected([]);
  }

  /**
   * Drop the selection outright - what Escape means when no gesture is running.
   *
   * Announced exactly like a click on empty space, because that is the other
   * way a user drops a selection: whoever owns it (ADR-0004) hears one miss and
   * clears, so the forms and the 3D view let go together. The hover outline
   * goes too, though only until the pointer moves again.
   */
  public dropSelection(): void {
    this.dropHoverOutline();
    if (this.applyOwnPicks) { this.clearSelection(); }
    this.pickedSubject.next({ element: undefined, add: false });
  }

  /**
   * The surface a ray lands on, and where - what the draw tool starts a new
   * element from (#125).
   *
   * The same answer a click gets: layer visibility, the yielding of enclosing
   * volumes and the clipping planes all apply, because the first corner has to
   * land on what the user can see themselves aiming at.
   */
  public surfaceUnder(ray: BABYLON.Ray): PickedAt | undefined {
    return this.pickAlong(ray);
  }

  /** Drop the hover highlight - the pointer left the canvas. */
  public clearHover(): void {
    this.dropHoverOutline();
    // Off the canvas the pointer is nowhere in the model, so it has no coordinate
    this.pointerAtSubject.next(null);
  }

  /**
   * Take the outline off whatever was hovered, leaving the coordinate alone.
   *
   * The pointer crossing from one element to the next moves the outline but is
   * still somewhere in the model, so the two are not the same event.
   */
  private dropHoverOutline(): void {
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
    const current = this.selected.map(element => element.uuid);

    if (!hit) {
      if (!add) { this.clearSelection(); }
      return;
    }

    if (add && current.indexOf(hit.uuid) !== -1) {
      this.setSelected(current.filter(uuid => uuid !== hit.uuid));
      return;
    }

    this.setSelected(add ? [...current, hit.uuid] : [hit.uuid]);
  }

  /**
   * Which element a ray reaches first, among the ones actually on screen, and
   * the point on it where that happened.
   *
   * Everything the app handed over is a candidate; nothing the library put on
   * screen for its own reasons is - the registry is what tells the two apart.
   *
   * The point comes back with the element rather than being worked out again by
   * the caller: which hit the answer came from is decided here, and the nearest
   * hit is not always it.
   */
  private pickAlong(ray: BABYLON.Ray): PickedAt | undefined {
    const scene = this.babylonService.scene;
    if (!scene) { return undefined; }

    const hits = scene.multiPickWithRay(ray, (mesh) => this.sceneRegistry.drawsElements(mesh));
    if (!hits || hits.length === 0) { return undefined; }

    // Nearest first, and nothing the clipping planes have taken off the screen:
    // a click has to land on what the user can see.
    const visible = hits
      .filter(hit => hit.pickedPoint && this.isVisible(hit.pickedPoint))
      .sort((a, b) => a.distance - b.distance);

    // The cursor only sees what the user can (CONTEXT.md, "Reguła
    // wskazywania"): a hidden layer answers nothing - its geometry is still in
    // the scene, only not drawn - a filled layer answers with its surface, and
    // an edges-only layer answers just at its outline, the way a CAD wireframe
    // is grabbed by its lines. The outline is asked separately below rather
    // than through the surface hits: a ray aimed at a box's edge slides along
    // the very triangles it would have to hit, and floating point decides
    // whether such a hit exists at all.
    const candidates: { distance: number, picked: PickedAt }[] = [];
    for (const hit of visible) {
      const pick = this.sceneRegistry.pickAt(
        hit.pickedMesh, hit.faceId, hit.thinInstanceIndex ?? -1);
      if (!pick) { continue; }
      if (this.layerVisibility.stateOf(pick.type) !== 'filled') { continue; }

      const point = hit.pickedPoint;
      candidates.push({
        distance: hit.distance,
        picked: { element: pick, point: { x: point.x, y: point.y, z: point.z } }
      });
    }

    this.outlinePicks(ray).forEach(candidate => candidates.push(candidate));

    const picks = candidates
      .sort((a, b) => a.distance - b.distance)
      .map(candidate => candidate.picked);

    // A volume drawn around other geometry yields to what is inside it
    return picks.find(({ element }) => ENCLOSING_TYPES.indexOf(element.type) === -1) ?? picks[0];
  }

  /**
   * Every edges-only element whose outline the ray passes within tolerance.
   *
   * Walked off the registry rather than read out of the surface hits, because
   * the outline is where such an element answers and its surface is not even
   * reliably hit there - see pickAlong(). The point handed back lies on the
   * outline, which is also the coordinate the user is visually aiming at.
   */
  private outlinePicks(ray: BABYLON.Ray): { distance: number, picked: PickedAt }[] {
    const found: { distance: number, picked: PickedAt }[] = [];

    this.sceneRegistry.eachEntry((uuid, entry) => {
      if (this.layerVisibility.stateOf(entry.type) !== 'edges') { return; }

      const touch = this.outlineTouch(entry.xb, ray);
      if (!touch) { return; }

      // The clipping planes take outlines off the screen like everything else
      const point = new BABYLON.Vector3(touch.x, touch.y, touch.z);
      if (!this.isVisible(point)) { return; }

      found.push({
        distance: BABYLON.Vector3.Distance(ray.origin, point),
        picked: {
          element: { uuid: uuid, type: entry.type, id: entry.id, xb: entry.xb },
          point: touch
        }
      });
    });

    return found;
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

  /**
   * Where the ray touches the element's outline, if it passes close enough.
   *
   * Against the RAY, not against the point where the surface was first met: a
   * camera above the model enters a box through its roof, metres from any
   * edge, and leaves through the bottom edge the user is pointing at - the
   * outline answers wherever the ray grazes it. The point handed back lies on
   * the outline itself, which is also the coordinate the user is aiming at.
   */
  private outlineTouch(xb: SceneXb, ray: BABYLON.Ray): ScenePoint | null {
    let best: { distance: number; point: BABYLON.Vector3 } | null = null;
    eachOutlineEdge(xb, (a, b) => {
      const near = closestOnSegmentToRay(a, b, ray);
      if (!best || near.distance < best.distance) { best = near; }
    });

    if (!best || best.distance > this.edgeTolerance(best.point)) { return null; }
    return { x: best.point.x, y: best.point.y, z: best.point.z };
  }

  /**
   * How far, in metres, "at the outline" reaches at this depth.
   *
   * The outline is drawn at a screen-constant width, so the tolerance is a few
   * pixels converted to metres where the hit landed - what looks grabbable has
   * to be grabbable at any zoom.
   */
  private edgeTolerance(at: BABYLON.Vector3): number {
    const scene = this.babylonService.scene;
    const camera = scene ? scene.activeCamera : null;
    if (!camera) { return EDGE_PICK_FALLBACK_M; }

    const height = scene.getEngine().getRenderHeight();
    if (!height) { return EDGE_PICK_FALLBACK_M; }

    const depth = BABYLON.Vector3.Distance(camera.globalPosition, at);
    const metresPerPixel = 2 * depth * Math.tan(camera.fov / 2) / height;
    return EDGE_PICK_TOLERANCE_PX * metresPerPixel;
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

/**
 * Walk the 12 edges of a box's outline.
 *
 * A plane element is a box with no thickness and its degenerate edges collapse
 * onto the real ones, so one walk serves every element type.
 */
function eachOutlineEdge(
  xb: SceneXb, edge: (a: BABYLON.Vector3, b: BABYLON.Vector3) => void
): void {
  [xb.y1, xb.y2].forEach(y => [xb.z1, xb.z2].forEach(z =>
    edge(new BABYLON.Vector3(xb.x1, y, z), new BABYLON.Vector3(xb.x2, y, z))));
  [xb.x1, xb.x2].forEach(x => [xb.z1, xb.z2].forEach(z =>
    edge(new BABYLON.Vector3(x, xb.y1, z), new BABYLON.Vector3(x, xb.y2, z))));
  [xb.x1, xb.x2].forEach(x => [xb.y1, xb.y2].forEach(y =>
    edge(new BABYLON.Vector3(x, y, xb.z1), new BABYLON.Vector3(x, y, xb.z2))));
}

/**
 * The point on a segment nearest to a ray, and how far apart the two pass.
 *
 * The closest-points-of-two-segments algorithm (Ericson, Real-Time Collision
 * Detection, 5.1.9), with the ray treated as a segment of its own length.
 */
function closestOnSegmentToRay(
  a: BABYLON.Vector3, b: BABYLON.Vector3, ray: BABYLON.Ray
): { distance: number; point: BABYLON.Vector3 } {
  const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

  const u = b.subtract(a);
  const v = ray.direction.scale(ray.length);
  const offset = a.subtract(ray.origin);

  const uu = BABYLON.Vector3.Dot(u, u);
  const uv = BABYLON.Vector3.Dot(u, v);
  const vv = BABYLON.Vector3.Dot(v, v);
  const uo = BABYLON.Vector3.Dot(u, offset);
  const vo = BABYLON.Vector3.Dot(v, offset);

  const denominator = uu * vv - uv * uv;
  let s = denominator > 0 ? clamp01((uv * vo - uo * vv) / denominator) : 0;
  let t = vv > 0 ? (uv * s + vo) / vv : 0;

  if (t < 0) {
    t = 0;
    s = uu > 0 ? clamp01(-uo / uu) : 0;
  } else if (t > 1) {
    t = 1;
    s = uu > 0 ? clamp01((uv - uo) / uu) : 0;
  }

  const onSegment = a.add(u.scale(s));
  const onRay = ray.origin.add(v.scale(t));
  return { distance: BABYLON.Vector3.Distance(onSegment, onRay), point: onSegment };
}
