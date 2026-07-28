import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';

import { BabylonService } from '../../babylon/babylon.service';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { SceneBoundsService } from '../../scene-bounds/scene-bounds.service';
import { SceneObst, SceneXb } from '../scene-input';

/**
 * What choosing an obst needs to know from whoever draws them.
 *
 * Four questions, no more: a pick is a question about what is on screen, and
 * everything about how it got there belongs to the drawing side. ObstService is
 * what answers them - see its constructor.
 */
export interface ObstScene {
  /** The meshes currently drawing obst geometry a pick may land on. */
  pickableMeshes(): BABYLON.Mesh[];
  /** Whether a point is on the side of the clipping planes that is drawn. */
  isVisible(point: BABYLON.Vector3): boolean;
  /** The obst behind a uuid, as the app described it. */
  obstFor(uuid: string): SceneObst | undefined;
  /** Take an obst out of its pool and give it a mesh of its own (ADR-0006). */
  promote(uuid: string): void;
  /** Put it back into the pool it came from. */
  demote(uuid: string): void;
}

/** Colour of the outline around a selected obst. */
const SELECTED_COLOR = new BABYLON.Color4(0.09, 0.49, 0.99, 1);

/** Colour of the outline around the obst under the pointer. */
const HOVERED_COLOR = new BABYLON.Color4(0.55, 0.72, 1, 1);

/** How solid the box over a selected obst is, and over a hovered one. */
const SELECTED_ALPHA = 0.4;
const HOVERED_ALPHA = 0.15;

/**
 * Which obsts the user has chosen, and which one the pointer is over.
 *
 * Separate from ObstService because the two change for different reasons: this
 * one changes when the way a user chooses things changes - hovering, adding to
 * a selection, what a highlight looks like - and the other when the way obsts
 * are drawn does.
 *
 * Picking goes through Babylon's own mechanisms. What it replaced walked the
 * whole index buffer in JS, which saw the opaque geometry only, so a glazed
 * obst could not be clicked at all.
 */
@Injectable({
  providedIn: 'root'
})
export class ObstSelectionService implements SceneScoped {

  /**
   * The obsts under the current selection, as the app described them.
   * `pickedObst` is the last of them - what the pick panel shows.
   */
  public pickedObsts: SceneObst[] = [];
  public pickedObst: SceneObst;

  /** The obst under the pointer, if the pointer is over one. */
  public hoveredObst: SceneObst;

  /** Who draws the obsts. Bound once, by that service itself. */
  private obstScene: ObstScene | null = null;

  /** The highlight boxes drawn over the selection, and the one over the hover. */
  private readonly selectionMeshes = new Map<string, BABYLON.Mesh>();
  private hoverMesh: BABYLON.Mesh;
  private selectionMaterial: BABYLON.StandardMaterial;
  private hoverMaterial: BABYLON.StandardMaterial;

  constructor(
    private babylonService: BabylonService,
    private sceneBounds: SceneBoundsService,
    private sceneRegistry: SceneRegistryService,
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
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

  /** Release everything tied to the scene that has just been disposed. */
  public resetSceneState(): void {
    this.selectionMeshes.clear();
    this.hoverMesh = undefined;
    this.selectionMaterial = undefined;
    this.hoverMaterial = undefined;
    this.pickedObsts = [];
    this.pickedObst = undefined;
    this.hoveredObst = undefined;
  }

  /**
   * Select the obst a ray reaches.
   *
   * @param ray a picking ray, in scene coordinates
   * @param options `add` extends the selection instead of replacing it
   */
  public selectObst(ray: BABYLON.Ray, options: { add?: boolean } = {}): void {
    const uuid = this.pickUuid(ray);

    if (!uuid) {
      if (!options.add) { this.clearSelection(); }
      return;
    }

    if (options.add && this.selectionMeshes.has(uuid)) {
      this.deselect(uuid);
      return;
    }

    if (!options.add) { this.clearSelection(); }
    this.select(uuid);
  }

  /**
   * Mark the obst a ray reaches as hovered.
   *
   * Hovering does not single the obst out: the pointer crosses hundreds of them
   * on the way anywhere, and promoting each in turn would be pure churn.
   */
  public hoverObst(ray: BABYLON.Ray): void {
    const uuid = this.pickUuid(ray);
    if (uuid && this.hoveredObst && this.hoveredObst.uuid === uuid) { return; }

    this.clearHover();
    if (!uuid) { return; }

    const obst = this.obstScene ? this.obstScene.obstFor(uuid) : undefined;
    if (!obst) { return; }

    this.hoveredObst = obst;
    this.hoverMesh = this.outlineBox(obst.xb, 'hoveredObst', HOVERED_COLOR, HOVERED_ALPHA);
  }

  /**
   * Drop the current selection. Called when a pick misses, which can happen
   * before anything was ever selected.
   */
  public clearSelection(): void {
    Array.from(this.selectionMeshes.keys()).forEach(uuid => this.deselect(uuid));
    this.pickedObsts = [];
    this.pickedObst = undefined;
  }

  /** Drop the hover highlight - the pointer left the canvas, or ctrl came up. */
  public clearHover(): void {
    if (this.hoverMesh) {
      this.hoverMesh.dispose();
      this.hoverMesh = undefined;
    }
    this.hoveredObst = undefined;
  }

  /** Which obst a ray reaches first, among the ones actually on screen. */
  private pickUuid(ray: BABYLON.Ray): string | undefined {
    const scene = this.babylonService.scene;
    if (!scene || !this.obstScene) { return undefined; }

    const drawn = new Set<BABYLON.AbstractMesh>(this.obstScene.pickableMeshes());
    const hits = scene.multiPickWithRay(ray, (mesh) => drawn.has(mesh));
    if (!hits || hits.length === 0) { return undefined; }

    // Nearest first, and nothing the clipping planes have taken off the screen:
    // a click has to land on what the user can see.
    const visible = hits
      .filter(hit => hit.pickedPoint && this.obstScene.isVisible(hit.pickedPoint))
      .sort((a, b) => a.distance - b.distance);

    for (const hit of visible) {
      const uuid = this.sceneRegistry.uuidForPick(
        hit.pickedMesh, hit.faceId, hit.thinInstanceIndex ?? -1);
      if (uuid) { return uuid; }
    }
    return undefined;
  }

  /** Add one obst to the selection, singling it out of its pool. */
  private select(uuid: string): void {
    const obst = this.obstScene ? this.obstScene.obstFor(uuid) : undefined;
    if (!obst) { return; }

    // A selected obst is next in line to be edited, so it leaves the pool
    this.obstScene.promote(uuid);

    this.pickedObsts.push(obst);
    this.pickedObst = obst;
    this.selectionMeshes.set(
      uuid, this.outlineBox(obst.xb, `pickedObst_${uuid}`, SELECTED_COLOR, SELECTED_ALPHA));
  }

  /** Take one obst back out of the selection. */
  private deselect(uuid: string): void {
    const mesh = this.selectionMeshes.get(uuid);
    if (mesh) { mesh.dispose(); }
    this.selectionMeshes.delete(uuid);

    if (this.obstScene) { this.obstScene.demote(uuid); }

    this.pickedObsts = this.pickedObsts.filter(obst => obst.uuid !== uuid);
    this.pickedObst = this.pickedObsts[this.pickedObsts.length - 1];
  }

  /**
   * A translucent box drawn over an obst, outlined so it reads through whatever
   * is in front of it.
   */
  private outlineBox(
    xb: SceneXb, name: string, color: BABYLON.Color4, alpha: number
  ): BABYLON.Mesh {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, {
      width: xb.x2 - xb.x1, height: xb.y2 - xb.y1, depth: xb.z2 - xb.z1
    }, this.babylonService.scene);

    mesh.material = this.highlightMaterial(color === SELECTED_COLOR, alpha);
    // It sits exactly on the obst it marks; picking it would shadow the obst
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
   * One apiece is what left a StandardMaterial behind on every ctrl+click, and
   * a multi-selection would have made that one per selected obst.
   */
  private highlightMaterial(selected: boolean, alpha: number): BABYLON.StandardMaterial {
    const existing = selected ? this.selectionMaterial : this.hoverMaterial;
    if (existing) { return existing; }

    const material = new BABYLON.StandardMaterial(
      selected ? 'pickedObstMaterial' : 'hoveredObstMaterial', this.babylonService.scene);
    material.ambientColor = new BABYLON.Color3(1, 1, 1);
    material.alpha = alpha;
    material.zOffset = -0.05;

    if (selected) { this.selectionMaterial = material; } else { this.hoverMaterial = material; }
    return material;
  }
}
