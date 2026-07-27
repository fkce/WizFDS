import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';

import { SceneLifecycleService, SceneScoped } from './scene-lifecycle.service';

/**
 * Where one FDS element lives in the scene.
 *
 * `faces` is absent when the element owns its mesh outright, and present when
 * several elements are batched into one - obsts and vents share a vertex
 * buffer, so naming the mesh alone would not say which of them was hit.
 */
export interface SceneEntry {
  mesh: BABYLON.AbstractMesh;
  /** Faces occupied within `mesh`, as triangle indices. */
  faces?: { first: number; count: number };
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
export interface FaceRange {
  uuid: string;
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
  }

  /** Where the element with this `uuid` is drawn, if it is drawn at all. */
  public entryFor(uuid: string): SceneEntry | undefined {
    return this.byUuid.get(uuid);
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
      if (!entry.faces) { return uuid; }
      if (faceId >= entry.faces.first && faceId < entry.faces.first + entry.faces.count) {
        return uuid;
      }
    }
    return undefined;
  }

  /** Forget one element, e.g. when it is removed from the scenario. */
  public forget(uuid: string): void {
    const existing = this.byUuid.get(uuid);
    if (!existing) { return; }

    this.byUuid.delete(uuid);

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
  }
}
