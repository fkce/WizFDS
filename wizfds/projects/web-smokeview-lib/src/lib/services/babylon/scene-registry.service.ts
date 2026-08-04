import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';

import { SceneLifecycleService, SceneScoped } from './scene-lifecycle.service';
import { SceneElement, SceneElementType, SceneXb } from '../drawing/scene-input';

/**
 * What one FDS element is, and where it lives in the scene.
 *
 * Three shapes, one per way the library draws something:
 * - neither positional field - the element owns its mesh outright (an obst with
 *   an opening, an obst singled out for editing);
 * - `faces` - several elements share one vertex buffer, so the mesh alone would
 *   not say which of them was hit;
 * - `instance` - the element is one thin instance of a shared base box, and every
 *   instance is the same twelve faces, so only the slot identifies it (ADR-0006).
 *
 * `type`, `id` and `xb` describe the element rather than its address. They are
 * here because a pick has to answer more than "which uuid": what kind of element
 * it is, what it is called, and where to draw a highlight around it. Keeping them
 * next to the address is what lets one service pick every type, instead of eleven
 * drawing services each answering for their own.
 */
export interface SceneEntry {
  mesh: BABYLON.AbstractMesh;
  /** Which kind of element is drawn here. */
  type: SceneElementType;
  /** Its FDS `ID`, to show the user. Not an identity - see SceneElement.id. */
  id: string;
  /**
   * The box it occupies **as drawn**.
   *
   * Usually the element's own `XB`, but not always: a point &DEVC stands at a
   * coordinate and is drawn as a marker around it, and a linear one is opened out
   * into a beam. A highlight has to enclose what is on screen, so this is what is
   * on screen. In the units the boxes arrived in - FDS metres for everything the
   * app hands over (ADR-0002), SmokeView's own for the standalone viewer.
   */
  xb: SceneXb;
  /** Faces occupied within `mesh`, as triangle indices. */
  faces?: { first: number; count: number };
  /** Slot occupied in `mesh`'s thin instance buffer. */
  instance?: number;
}

/**
 * What a pick landed on: the element, not the geometry it was drawn as.
 *
 * The whole of what a caller needs to act on a click - which is why it is what
 * the picking service hands out, rather than a Babylon PickingInfo. It is a
 * `SceneElement` and its type, because that is what it is: the element the app
 * handed over, named.
 */
export interface ScenePick extends SceneElement {
  readonly type: SceneElementType;
}

/**
 * One element's slice of a batched buffer, as collected while that buffer is
 * built - before the mesh it will belong to exists.
 *
 * Services that batch several elements into one buffer return these from the
 * method that builds it, and hand them to `register()` once the mesh is there.
 * The range is read off the buffer rather than derived from a triangle count,
 * which is what keeps it right for geometry that is not a plain box.
 */
export interface FaceRange extends SceneElement {
  first: number;
  count: number;
}

/**
 * The one place that knows which scene object is which FDS element.
 *
 * Identity is the `uuid` (ADR-0005). Before this, each drawing service worked
 * it out from array position - `this.obsts[Math.floor(faceId / 12)]` - which
 * assumes every obst is twelve triangles and so picks the wrong one as soon as
 * a `&HOLE` is cut out of any of them.
 *
 * The registry is scene-scoped: it is emptied when the scene is disposed, so
 * it can never name a mesh that no longer exists.
 */
@Injectable({
  providedIn: 'root'
})
export class SceneRegistryService implements SceneScoped {

  private readonly byUuid = new Map<string, SceneEntry>();

  /** Per-mesh entries, so a face lookup only walks that mesh's elements. */
  private readonly byMesh = new Map<BABYLON.AbstractMesh, { uuid: string, entry: SceneEntry }[]>();

  /**
   * Instance slots, per base mesh. A pool holds thousands of boxes and a pick
   * has to answer while the mouse is still down, so this is a lookup rather
   * than a walk of the same list `byMesh` keeps.
   */
  private readonly byInstance = new Map<BABYLON.AbstractMesh, Map<number, string>>();

  constructor(sceneLifecycle: SceneLifecycleService) {
    sceneLifecycle.register(this);
  }

  /**
   * Record where an element is drawn. Registering the same `uuid` again
   * replaces the previous location - services re-register on every render.
   */
  public register(uuid: string, entry: SceneEntry): void {
    this.forget(uuid);

    this.byUuid.set(uuid, entry);

    const forMesh = this.byMesh.get(entry.mesh) ?? [];
    forMesh.push({ uuid: uuid, entry: entry });
    this.byMesh.set(entry.mesh, forMesh);

    if (entry.instance !== undefined) {
      const slots = this.byInstance.get(entry.mesh) ?? new Map<number, string>();
      slots.set(entry.instance, uuid);
      this.byInstance.set(entry.mesh, slots);
    }
  }

  /** Where the element with this `uuid` is drawn, if it is drawn at all. */
  public entryFor(uuid: string): SceneEntry | undefined {
    return this.byUuid.get(uuid);
  }

  /**
   * Visit every element currently drawn.
   *
   * For a question the meshes cannot answer: the picking service walks a
   * layer's outlines when that layer is drawn as edges only, because a ray
   * aimed at a box's edge slides along the very triangles it would have to
   * hit, and the surface pick cannot be trusted to exist there at all.
   */
  public eachEntry(visit: (uuid: string, entry: SceneEntry) => void): void {
    this.byUuid.forEach((entry, uuid) => visit(uuid, entry));
  }

  /**
   * Which element a face of this mesh belongs to.
   *
   * Walks that mesh's entries rather than indexing: elements do not have a
   * uniform triangle count, which is the assumption that broke picking.
   */
  public uuidAt(mesh: BABYLON.AbstractMesh, faceId: number): string | undefined {
    const candidates = this.byMesh.get(mesh);
    if (!candidates) { return undefined; }

    for (const { uuid, entry } of candidates) {
      // An instance is identified by its slot, never by a face: every instance
      // draws the same twelve faces of the same box, so answering here would
      // name whichever of them happens to come first.
      if (entry.instance !== undefined) { continue; }
      if (!entry.faces) { return uuid; }
      if (faceId >= entry.faces.first && faceId < entry.faces.first + entry.faces.count) {
        return uuid;
      }
    }
    return undefined;
  }

  /**
   * Which element occupies a slot of this base mesh's instance buffer.
   *
   * Every thin instance draws the same faces of the same box, so a face index
   * says nothing here - the slot is the whole of the identity.
   */
  public uuidAtInstance(mesh: BABYLON.AbstractMesh, instance: number): string | undefined {
    return this.byInstance.get(mesh)?.get(instance);
  }

  /**
   * Which element a pick landed on.
   *
   * A pick hands over a mesh, a face and a thin instance index that Babylon sets
   * to -1 when the mesh it hit is not instanced. One question for all three ways
   * the library draws something, so the caller does not have to know which of
   * them it is looking at - nor which element type, which is why the answer
   * carries the type rather than the uuid alone.
   */
  public pickAt(
    mesh: BABYLON.AbstractMesh, faceId: number, thinInstanceIndex: number
  ): ScenePick | undefined {
    const uuid = thinInstanceIndex >= 0
      ? this.uuidAtInstance(mesh, thinInstanceIndex)
      : this.uuidAt(mesh, faceId);
    if (!uuid) { return undefined; }

    const entry = this.byUuid.get(uuid);
    if (!entry) { return undefined; }

    return { uuid: uuid, type: entry.type, id: entry.id, xb: entry.xb };
  }

  /**
   * Whether any element of the scenario is drawn on this mesh.
   *
   * What a pick filters by, so that it reaches everything the app handed over and
   * nothing the library put on screen for its own reasons - the view cube, the
   * world axes, a back cap, a highlight box.
   */
  public drawsElements(mesh: BABYLON.AbstractMesh): boolean {
    return this.byMesh.has(mesh);
  }

  /**
   * Forget everything drawn on one mesh.
   *
   * What a pool does when the scenario is drawn again. One call rather than one
   * `forget()` per box, because each of those has to scan the mesh's own list to
   * find its entry - which at ten thousand boxes is a hundred million
   * comparisons, the very cost #87 was opened to remove.
   */
  public forgetMesh(mesh: BABYLON.AbstractMesh): void {
    const drawn = this.byMesh.get(mesh);
    if (!drawn) { return; }

    drawn.forEach(({ uuid }) => this.byUuid.delete(uuid));
    this.byMesh.delete(mesh);
    this.byInstance.delete(mesh);
  }

  /** Forget one element, e.g. when it is removed from the scenario. */
  public forget(uuid: string): void {
    const existing = this.byUuid.get(uuid);
    if (!existing) { return; }

    this.byUuid.delete(uuid);

    if (existing.instance !== undefined) {
      const slots = this.byInstance.get(existing.mesh);
      if (slots) {
        // Only if this element is still the one standing there: a slot freed by
        // one element is taken by another as soon as the pool closes the gap,
        // and forgetting the first must not take the second with it.
        if (slots.get(existing.instance) === uuid) { slots.delete(existing.instance); }
        if (slots.size === 0) { this.byInstance.delete(existing.mesh); }
      }
    }

    const forMesh = this.byMesh.get(existing.mesh);
    if (!forMesh) { return; }

    const remaining = forMesh.filter(candidate => candidate.uuid !== uuid);
    if (remaining.length > 0) {
      this.byMesh.set(existing.mesh, remaining);
    } else {
      this.byMesh.delete(existing.mesh);
    }
  }

  /** Nothing here may outlive the scene it points into. */
  public resetSceneState(): void {
    this.byUuid.clear();
    this.byMesh.clear();
    this.byInstance.clear();
  }
}
