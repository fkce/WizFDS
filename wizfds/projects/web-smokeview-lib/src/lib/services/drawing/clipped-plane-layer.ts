import * as BABYLON from 'babylonjs';

import { BabylonService, tryCreateShaderMaterial } from '../babylon/babylon.service';
import { SceneAxis, SceneBoundsService } from '../scene-bounds/scene-bounds.service';

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
const EDGES_ONLY = 0;
/** Edges and a semi-transparent fill. */
const EDGES_AND_FILL = 1;
/** Nothing at all. */
const HIDDEN = 2;

/**
 * A set of plane batches drawn through one clipped material.
 *
 * Everything the library draws as a plane - an `OPEN`, a &VENT, the plane of a
 * fire - is lit the same way, cut by the same three planes in metres (ADR-0002)
 * and cycled through the same three states by its button. Only the outline
 * colour, the fill and the depth offset differ, and those are the style.
 *
 * The layer holds the state rather than the meshes: the batches are the owner's,
 * and a &VENT has one per colour while a fire has one. It is told what it draws
 * on every render, and remembers it so that a button pressed later reaches the
 * same meshes.
 *
 * The material is built once for the scene. The buttons and sliders are live
 * from the first frame, long before the shader sources arrive, so whatever was
 * set meanwhile is read back when it is built rather than lost.
 */
export class ClippedPlaneLayer {

  /** The material every batch of this layer shares. */
  public material: BABYLON.ShaderMaterial;

  /** 3-state visibility: edges only → edges and fill → hidden. */
  public visibility: number = EDGES_ONLY;

  /** Where the three clipping planes stand, in FDS metres. */
  public clipX: number;
  public clipY: number;
  public clipZ: number;

  /** What the layer currently draws, as of the last attach(). */
  private outlined: readonly OutlinedMesh[] = [];

  /** In flight while the shader sources are being fetched. */
  private materialPending: Promise<void> | null = null;

  constructor(
    private readonly style: PlaneLayerStyle,
    private readonly babylonService: BabylonService,
    private readonly sceneBounds: SceneBoundsService,
    /** Named in the log when the shader cannot be built. */
    private readonly owner: string
  ) {
    this.resetClipping();
  }

  /**
   * Pull the clipping planes back to showing the whole model - the planes are
   * coordinates, so they mean nothing once the model changes. See
   * SmokeviewApiService.render().
   */
  public resetClipping(): void {
    this.clipX = this.sceneBounds.openClipAt('x');
    this.clipY = this.sceneBounds.openClipAt('y');
    this.clipZ = this.sceneBounds.openClipAt('z');
    this.pushClip();
  }

  /**
   * Move a clipping plane
   * @param value the plane's coordinate, in FDS metres
   * @param axis x, y, z
   */
  public clip(value: number, axis: SceneAxis): void {
    if (axis === 'x') { this.clipX = value; }
    else if (axis === 'y') { this.clipY = value; }
    else { this.clipZ = value; }

    this.pushClip();
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
    return this.ensureMaterial();
  }

  /** Cycle the button: edges only → edges and fill → hidden → edges only. */
  public toggleVisibility(): void {
    // The button is live from the first frame, before anything is drawn
    if (this.outlined.length === 0) { return; }

    this.visibility = this.visibility === EDGES_ONLY ? EDGES_AND_FILL
      : this.visibility === EDGES_AND_FILL ? HIDDEN : EDGES_ONLY;
    this.applyFill();
    // The geometry has not moved - only how thick its outline is drawn
    this.applyEdges(false);
  }

  /** Release everything tied to the scene that has just been disposed. */
  public resetSceneState(): void {
    this.material = null;
    this.materialPending = null;
    this.outlined = [];
    this.visibility = EDGES_ONLY;
  }

  /**
   * Build the shared material, once for the scene.
   *
   * Every plane layer borrows the fire shader: it clips in metres and carries
   * the `transparent` uniform the visibility button turns. Rebuilding it per
   * render is what used to orphan one ShaderMaterial per re-render.
   */
  private ensureMaterial(): Promise<void> {
    if (this.materialPending) {
      // The batches of this render still need the material of the last one
      return this.materialPending.then(() => this.applyMaterial());
    }

    this.materialPending = tryCreateShaderMaterial(this.babylonService, {
      name: this.style.materialName, shader: 'fire', needAlphaBlending: true
    }, this.owner).then((material: BABYLON.ShaderMaterial) => {
      if (!material) { return; }
      // The scene can be gone by the time the sources arrive
      if (!this.babylonService.scene) { material.dispose(); return; }

      this.material = material;
      material.backFaceCulling = false;
      material.zOffset = this.style.zOffset;
      this.pushClip();
      this.applyFill();
      this.applyMaterial();
    });

    return this.materialPending;
  }

  private applyMaterial(): void {
    if (!this.material) { return; }
    this.outlined.forEach(({ mesh }) => { mesh.material = this.material; });
  }

  /** Push the planes onto the material, if it has arrived. */
  private pushClip(): void {
    if (!this.material) { return; }
    this.material.setFloat('clipX', this.clipX);
    this.material.setFloat('clipY', this.clipY);
    this.material.setFloat('clipZ', this.clipZ);
  }

  /** Push the current state's fill onto the material, if it has arrived. */
  private applyFill(): void {
    if (!this.material) { return; }
    this.material.setFloat(
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
