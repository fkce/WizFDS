import { Injectable } from '@angular/core';

import { SceneElementType } from './scene-input';

/**
 * How much of a layer is drawn.
 *
 * Three states because that is what the layers offer: an outline alone says
 * where something is without hiding what is behind it. A layer that is only
 * ever drawn or not answers with two of the three.
 */
export type SceneLayerState = 'edges' | 'filled' | 'hidden';

/**
 * What each layer currently shows, asked by element type.
 *
 * The drawing services each count their own visibility - a &MESH in a numbering
 * of its own, a plane layer in another, a &DEVC in a boolean - and each of them
 * binds a translation here. Two consumers read it: the view facade, for the
 * buttons, and the picking service, because the cursor only sees what the user
 * can (see CONTEXT.md, "Reguła wskazywania"): a hidden layer answers no hover
 * and no click, and an edges-only layer answers only at its outline.
 *
 * Bound by each drawing service on construction rather than injected the other
 * way round - the same shape as PickService.bind(), and for the same reason:
 * the drawing services are the ones that know their own state.
 */
@Injectable({
  providedIn: 'root'
})
export class LayerVisibilityService {

  private readonly bindings = new Map<SceneElementType, () => SceneLayerState>();

  /** Say what a layer of this type currently shows. One binding per type. */
  public bind(type: SceneElementType, state: () => SceneLayerState): void {
    this.bindings.set(type, state);
  }

  /**
   * How much of this type's layer is on screen.
   *
   * `filled` for a type nothing has bound: an &OBST has no visibility button,
   * and an unbound type must stay pickable.
   */
  public stateOf(type: SceneElementType): SceneLayerState {
    const state = this.bindings.get(type);
    return state ? state() : 'filled';
  }
}
