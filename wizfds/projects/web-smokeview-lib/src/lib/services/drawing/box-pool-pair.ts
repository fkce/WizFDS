import * as BABYLON from 'babylonjs';

import { BoxInstancePool, PooledBox, isTranslucent } from './box-instance-pool';
import { HelpersService } from '../helpers/helpers.service';
import { SceneRegistryService } from '../babylon/scene-registry.service';

/**
 * The two pools every kind of box is drawn from: one opaque, one translucent.
 *
 * Alpha blending is a property of the material, and a material belongs to a
 * mesh, so a translucent box cannot share a pool with an opaque one however
 * alike they are otherwise. Every service that draws bodies therefore needs the
 * same pair and the same rule for choosing between them - obsts and jetfan
 * bodies alike - and that rule lives here rather than once per service.
 *
 * Which of the two draws a given element is answered through the registry, so
 * it costs the same at ten thousand boxes as at ten (ADR-0005, ADR-0006).
 */
export class BoxPoolPair {

  /** The pool the fully opaque boxes are drawn from. */
  public readonly opaque: BoxInstancePool;

  /** The pool the boxes short of fully opaque are drawn from. */
  public readonly transparent: BoxInstancePool;

  /**
   * @param opaqueName name of the opaque base mesh, as it appears in the scene
   * @param transparentName name of the translucent one
   */
  constructor(
    opaqueName: string,
    transparentName: string,
    scene: BABYLON.Scene,
    helpers: HelpersService,
    private readonly registry: SceneRegistryService
  ) {
    this.opaque = new BoxInstancePool(opaqueName, scene, helpers, registry);
    this.transparent = new BoxInstancePool(transparentName, scene, helpers, registry);
  }

  /** The two base meshes, to outline or to pick against. */
  public get meshes(): BABYLON.Mesh[] {
    return [this.opaque.mesh, this.transparent.mesh];
  }

  /**
   * Draw exactly these boxes, each out of the pool its alpha calls for,
   * replacing whatever was there. What a re-render of the scenario is.
   */
  public setBoxes(boxes: readonly PooledBox[]): void {
    const opaque: PooledBox[] = [];
    const transparent: PooledBox[] = [];
    boxes.forEach(box => (isTranslucent(box) ? transparent : opaque).push(box));

    this.opaque.setBoxes(opaque);
    this.transparent.setBoxes(transparent);
  }

  /**
   * Which pool draws this element, if either does.
   *
   * Undefined for an element drawn on a mesh of its own - an obst with an
   * opening, or one singled out for editing.
   */
  public poolFor(uuid: string): BoxInstancePool | undefined {
    const entry = this.registry.entryFor(uuid);
    if (!entry || entry.instance === undefined) { return undefined; }
    if (entry.mesh === this.opaque.mesh) { return this.opaque; }
    if (entry.mesh === this.transparent.mesh) { return this.transparent; }
    return undefined;
  }

  /**
   * Take one box out of whichever pool holds it, so that it can be given a mesh
   * of its own.
   *
   * @returns the box that was taken, or null when neither pool held it
   */
  public remove(uuid: string): PooledBox | null {
    const pool = this.poolFor(uuid);
    if (!pool) { return null; }

    const box = pool.boxFor(uuid);
    if (!box) { return null; }

    pool.remove(uuid);
    return box;
  }

  /** Put a box back, into the pool its alpha calls for. */
  public add(box: PooledBox): void {
    (isTranslucent(box) ? this.transparent : this.opaque).add(box);
  }

  /** Release both pools and everything they put in the registry. */
  public dispose(): void {
    this.opaque.dispose();
    this.transparent.dispose();
  }
}
