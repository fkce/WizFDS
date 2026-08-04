import * as BABYLON from 'babylonjs';

import { BabylonService, tryCreateShaderMaterial } from '../babylon/babylon.service';
import { SceneAxis, SceneBoundsService } from '../scene-bounds/scene-bounds.service';

/** Which shader a layer is drawn with, and how it sits against what it covers. */
export interface ClippedMaterialStyle {
  /** Name of the material, as it appears in the scene. */
  readonly materialName: string,
  /** The vertex shader. */
  readonly shader: string,
  /** The fragment shader, when it is not the vertex shader's own. */
  readonly fragmentShader?: string,
  readonly needAlphaBlending?: boolean,
  /**
   * How far towards the camera what it draws is pushed.
   *
   * A plane sits on the face of the body it belongs to, so at equal depth the
   * two z-fight. How far depends on what it sits on, hence per style.
   */
  readonly zOffset?: number,
  /**
   * Uniforms the shader must never see unset.
   *
   * A WGSL uniform nobody writes reads as zero, and zero is the wrong default
   * for a multiplier like `fillAlpha` - it would draw nothing. Applied on
   * construction and again after a scene reset, which is the moment the
   * remembered uniforms are dropped.
   */
  readonly defaults?: Readonly<Record<string, number>>
}

/**
 * One shader material, built once for the scene, with the clipping planes and
 * whatever else the shader is told kept alongside it.
 *
 * Every drawing service in the library had the same three problems and solved
 * them the same way: the material must be built once rather than per render or
 * it orphans one apiece; the sliders and buttons are live from the first frame,
 * long before the shader sources arrive, so whatever was set meanwhile has to be
 * read back when it is built; and the scene can be gone by the time they do
 * arrive. This is that, once.
 *
 * Uniforms are remembered rather than pushed straight through, which is what
 * lets a caller set a clipping plane before there is anything to set it on.
 */
export class ClippedMaterial {

  /** The material, once the shader sources have arrived. */
  public material: BABYLON.ShaderMaterial;

  /** Where the three clipping planes stand, in FDS metres. */
  public clipX: number;
  public clipY: number;
  public clipZ: number;

  /** What the shader has been told, kept for a material built later. */
  private readonly uniforms = new Map<string, number>();

  /** What the material is applied to, as of the last attach(). */
  private meshes: readonly BABYLON.Mesh[] = [];

  /** In flight while the shader sources are being fetched. */
  private pending: Promise<void> | null = null;

  constructor(
    private readonly style: ClippedMaterialStyle,
    private readonly babylonService: BabylonService,
    private readonly sceneBounds: SceneBoundsService,
    /** Named in the log when the shader cannot be built. */
    private readonly owner: string
  ) {
    this.resetClipping();
    this.applyDefaults();
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
   * Tell the shader something, now or as soon as it exists.
   *
   * The button that sets it is clickable from the first frame; the material is
   * not there until its sources have been fetched.
   */
  public setUniform(name: string, value: number): void {
    this.uniforms.set(name, value);
    if (this.material) { this.material.setFloat(name, value); }
  }

  /**
   * Give these meshes the material, building it the first time.
   *
   * Called after every render, because which meshes there are does not survive
   * one - a &VENT colour or a &GEOM can leave the scenario.
   */
  public attach(meshes: readonly BABYLON.Mesh[]): Promise<void> {
    this.meshes = meshes;

    if (this.pending) {
      // The meshes of this render still need the material of the last one
      return this.pending.then(() => this.applyToMeshes());
    }

    this.pending = tryCreateShaderMaterial(this.babylonService, {
      name: this.style.materialName,
      shader: this.style.shader,
      fragmentShader: this.style.fragmentShader,
      needAlphaBlending: this.style.needAlphaBlending ?? false
    }, this.owner).then((material: BABYLON.ShaderMaterial) => {
      if (!material) { return; }
      // The scene can be gone by the time the sources arrive
      if (!this.babylonService.scene) { material.dispose(); return; }

      this.material = material;
      // Nothing here draws a closed solid on its own: a plane, a surface and a
      // marker all have to show both of their sides
      material.backFaceCulling = false;
      if (this.style.zOffset) { material.zOffset = this.style.zOffset; }

      this.uniforms.forEach((value, name) => material.setFloat(name, value));
      this.applyToMeshes();
    });

    return this.pending;
  }

  /** Release everything tied to the scene that has just been disposed. */
  public resetSceneState(): void {
    this.material = null;
    this.pending = null;
    this.meshes = [];
    this.uniforms.clear();
    this.resetClipping();
    this.applyDefaults();
  }

  private applyDefaults(): void {
    Object.entries(this.style.defaults ?? {})
      .forEach(([name, value]) => this.setUniform(name, value));
  }

  private applyToMeshes(): void {
    if (!this.material) { return; }
    this.meshes.forEach(mesh => { mesh.material = this.material; });
  }

  private pushClip(): void {
    this.setUniform('clipX', this.clipX);
    this.setUniform('clipY', this.clipY);
    this.setUniform('clipZ', this.clipZ);
  }
}
