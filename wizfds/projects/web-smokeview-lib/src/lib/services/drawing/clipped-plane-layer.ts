import * as BABYLON from 'babylonjs';

import { BabylonService } from '../babylon/babylon.service';
import { SceneAxis, SceneBoundsService } from '../scene-bounds/scene-bounds.service';
import { ClippedMaterial } from './clipped-material';
import { SceneLayerState } from './layer-visibility.service';

/** A mesh drawn through a layer, and the colour it is outlined in. */
export interface OutlinedMesh {
  readonly mesh: BABYLON.Mesh,
  readonly edgeColor: BABYLON.Color4
}

/** What tells one layer of planes apart from another on screen. */
export interface PlaneLayerStyle {
  /** Name of the shared material, as it appears in the scene. */
  readonly materialName: string,
  /**
   * How far towards the camera the planes are pushed.
   *
   * A plane sits on the face of the body it belongs to, so at equal depth the
   * two z-fight. How far depends on what it sits on, which is why it is per
   * layer rather than one constant.
   */
  readonly zOffset: number,
  /** How solid the fill is in the state that shows one. */
  readonly fillAlpha: number
}

/** Edges only - what a layer starts out showing. */
export const EDGES_ONLY = 0;
/** Edges and a semi-transparent fill. */
export const EDGES_AND_FILL = 1;
/** Nothing at all. */
export const HIDDEN = 2;

/**
 * A set of plane batches drawn through one clipped material.
 *
 * Everything the library draws as a plane - an `OPEN`, a &VENT, the plane of a
 * fire, the region a &DEVC measures - is lit the same way, cut by the same three
 * planes in metres (ADR-0002) and shown in the same three states. Only the
 * outline colour, the fill and the depth offset differ, and those are the style.
 *
 * The layer holds the state rather than the meshes: the batches are the owner's,
 * and a &VENT has one per colour while a fire has one. It is told what it draws
 * on every render, and remembers it so that a button pressed later reaches the
 * same meshes.
 */
export class ClippedPlaneLayer {

  /** 3-state visibility: edges only → edges and fill → hidden. */
  public visibility: number = EDGES_ONLY;

  /** What the layer currently draws, as of the last attach(). */
  private outlined: readonly OutlinedMesh[] = [];

  /** The material and the clipping planes, built once for the scene. */
  private readonly clipped: ClippedMaterial;

  constructor(
    private readonly style: PlaneLayerStyle,
    babylonService: BabylonService,
    private readonly sceneBounds: SceneBoundsService,
    owner: string
  ) {
    this.clipped = new ClippedMaterial({
      materialName: style.materialName,
      // Every plane layer borrows the fire shader: it clips in metres and
      // carries the `transparent` uniform the visibility button turns
      shader: 'fire',
      needAlphaBlending: true,
      zOffset: style.zOffset
    }, babylonService, sceneBounds, owner);
    this.applyFill();
  }

  /** The material every batch of this layer shares. */
  public get material(): BABYLON.ShaderMaterial {
    return this.clipped.material;
  }

  /** The state, in the three words the rest of the system speaks. */
  public state(): SceneLayerState {
    if (this.visibility === EDGES_ONLY) { return 'edges'; }
    return this.visibility === EDGES_AND_FILL ? 'filled' : 'hidden';
  }

  /** Where a clipping plane currently stands, in FDS metres. */
  public get clipX(): number { return this.clipped.clipX; }
  public get clipY(): number { return this.clipped.clipY; }
  public get clipZ(): number { return this.clipped.clipZ; }

  /** Pull the clipping planes back to showing the whole model. */
  public resetClipping(): void {
    this.clipped.resetClipping();
  }

  /**
   * Move a clipping plane
   * @param value the plane's coordinate, in FDS metres
   * @param axis x, y, z
   */
  public clip(value: number, axis: SceneAxis): void {
    this.clipped.clip(value, axis);
  }

  /**
   * Say what the layer draws, and give it the material and outline.
   *
   * Called after every render: the batches survive a re-render, but which of
   * them exist does not - a &VENT colour can leave the scenario.
   */
  public attach(outlined: readonly OutlinedMesh[]): Promise<void> {
    this.outlined = outlined;
    // The buffers were just refilled, so the outlines have to be built against
    // what is in them now
    this.applyEdges(true);
    return this.clipped.attach(outlined.map(({ mesh }) => mesh));
  }

  /** Cycle the button: edges only → edges and fill → hidden → edges only. */
  public toggleVisibility(): void {
    // The button is live from the first frame, before anything is drawn
    if (this.outlined.length === 0) { return; }

    this.setVisibility(this.visibility === EDGES_ONLY ? EDGES_AND_FILL
      : this.visibility === EDGES_AND_FILL ? HIDDEN : EDGES_ONLY);
  }

  /**
   * Put the layer into one of the three states outright.
   *
   * For an owner whose own button is not this cycle: a &DEVC region is either
   * drawn or not, and is always drawn filled when it is.
   */
  public setVisibility(state: number): void {
    this.visibility = state;
    this.applyFill();
    // The geometry has not moved - only how thick its outline is drawn
    this.applyEdges(false);
  }

  /** Release everything tied to the scene that has just been disposed. */
  public resetSceneState(): void {
    this.clipped.resetSceneState();
    this.outlined = [];
    this.visibility = EDGES_ONLY;
    this.applyFill();
  }

  /** Push the current state's fill onto the material. */
  private applyFill(): void {
    this.clipped.setUniform(
      'transparent', this.visibility === EDGES_AND_FILL ? this.style.fillAlpha : 0.0);
  }

  /**
   * Outline every mesh in its own colour, except in the state that hides them.
   *
   * @param rebuild whether the outline geometry has to be built again.
   *
   * Only when the buffer changed. `enableEdgesRendering()` walks every edge of
   * the mesh to work out which ones to draw, so calling it on each press of the
   * visibility button - which moves no geometry at all - costs that walk three
   * times a cycle, on a scenario where it is measured in seconds.
   */
  private applyEdges(rebuild: boolean): void {
    const width = this.visibility === HIDDEN ? 0 : this.sceneBounds.outlineWidth;
    this.outlined.forEach(({ mesh, edgeColor }) => {
      if (rebuild || !mesh.edgesRenderer) { mesh.enableEdgesRendering(); }
      mesh.edgesWidth = width;
      mesh.edgesColor = edgeColor;
    });
  }
}
