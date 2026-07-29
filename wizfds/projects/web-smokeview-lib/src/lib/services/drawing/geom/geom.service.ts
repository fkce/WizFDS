import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';

import { BabylonService, tryCreateShaderMaterial } from '../../babylon/babylon.service';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { SceneAxis, SceneBoundsService } from '../../scene-bounds/scene-bounds.service';
import { HelpersService } from '../../helpers/helpers.service';
import { SceneGeom } from '../scene-input';
import { SOLID_EDGE_COLOR } from '../../../consts/drawing';

/**
 * Draws the &GEOMs of a scenario - arbitrary triangle meshes.
 *
 * The one element whose geometry does not follow from a box, so it is the one
 * that cannot be instanced or batched: each geom gets a mesh of its own, which
 * is the third path of ADR-0006. That also makes identity the simplest it gets -
 * the mesh alone says which geom was picked.
 *
 * The triangles arrive already flattened and counted from zero (see SceneGeom):
 * turning the scenario's own form into that belongs to the app, which is what
 * holds the scenario in the form FDS reads.
 */
@Injectable({
  providedIn: 'root'
})
export class GeomService implements SceneScoped {

  public geoms: readonly SceneGeom[] = [];

  /** One mesh per geom, by uuid. */
  private readonly meshes = new Map<string, BABYLON.Mesh>();

  /** Shared by every geom: they differ in their buffers, in nothing the shader sees. */
  private material: BABYLON.ShaderMaterial;

  /** In flight while the shader sources are being fetched. */
  private materialPending: Promise<void> | null = null;

  /** Where the three clipping planes stand, in FDS metres. */
  public clipX: number;
  public clipY: number;
  public clipZ: number;

  /** Whether the geoms are drawn at all. */
  public visible = true;

  constructor(
    private babylonService: BabylonService,
    private helpersService: HelpersService,
    private sceneBounds: SceneBoundsService,
    private sceneRegistry: SceneRegistryService,
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
    this.resetClipping();
  }

  /** The mesh drawn for a geom, if it is drawn at all. */
  public meshFor(uuid: string): BABYLON.Mesh | undefined {
    return this.meshes.get(uuid);
  }

  /** Every mesh currently drawing a geom the user can see and pick. */
  public pickableMeshes(): BABYLON.Mesh[] {
    return Array.from(this.meshes.values());
  }

  /** Pull the clipping planes back to showing the whole model. */
  public resetClipping(): void {
    this.clipX = this.sceneBounds.openClipAt('x');
    this.clipY = this.sceneBounds.openClipAt('y');
    this.clipZ = this.sceneBounds.openClipAt('z');
    this.pushClip();
  }

  /**
   * Move a clipping plane
   * @param value the plane's coordinate, in FDS metres
   * @param direction x, y, z
   */
  public clip(value: number, direction: SceneAxis): void {
    if (direction == 'x') { this.clipX = value; }
    else if (direction == 'y') { this.clipY = value; }
    else { this.clipZ = value; }

    this.pushClip();
  }

  private pushClip(): void {
    if (!this.material) { return; }
    this.material.setFloat('clipX', this.clipX);
    this.material.setFloat('clipY', this.clipY);
    this.material.setFloat('clipZ', this.clipZ);
  }

  /** Release everything tied to the scene that has just been disposed. */
  public resetSceneState(): void {
    this.meshes.clear();
    this.material = null;
    this.materialPending = null;
    this.visible = true;
  }

  /**
   * Draw the &GEOMs of the current scenario.
   *
   * An empty list clears them rather than leaving the previous scenario's
   * meshes on screen.
   */
  public async renderGeoms(): Promise<void> {
    const wanted = new Set((this.geoms || []).map((geom: SceneGeom) => geom.uuid));

    // A geom no longer in the scenario takes its mesh - and its registry entry -
    // with it, rather than outliving what it stands for
    Array.from(this.meshes.keys())
      .filter(uuid => !wanted.has(uuid))
      .forEach(uuid => this.disposeGeom(uuid));

    (this.geoms || []).forEach((geom: SceneGeom) => this.draw(geom));

    await this.ensureMaterial();
    this.applyVisibility();
  }

  /**
   * Build or rebuild the mesh for one geom.
   *
   * The mesh is reused across renders where it can be: a geom that did not
   * change keeps the material and the outline it was given, and the vertex data
   * is simply applied over the top.
   */
  private draw(geom: SceneGeom): void {
    const positions = Array.from(geom.vertices);
    const indices = Array.from(geom.faces);

    // Worked out here rather than carried across the boundary: they follow from
    // the triangles, and a normal facing away from its own triangle zeroes the
    // diffuse term in obst.fragment.wgsl - visibly darker than everything else
    const normals: number[] = new Array(positions.length).fill(0);
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);

    const colors: number[] = [];
    const rgba = this.helpersService.toRgba(geom.color);
    for (let i = 0; i < positions.length / 3; i++) { colors.push(...rgba); }

    const vertexData = new BABYLON.VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.colors = colors;

    let mesh = this.meshes.get(geom.uuid);
    if (!mesh) {
      mesh = new BABYLON.Mesh(`geom_${geom.uuid}`, this.babylonService.scene);
      this.meshes.set(geom.uuid, mesh);
    }
    vertexData.applyToMesh(mesh);
    mesh.freezeWorldMatrix();
    if (this.material) { mesh.material = this.material; }

    // One mesh per geom, so the mesh alone identifies it
    this.sceneRegistry.register(geom.uuid, { mesh: mesh });

    // After the buffer: the edges renderer reads the geometry it is given at
    // the moment it is enabled
    mesh.enableEdgesRendering();
    mesh.edgesWidth = this.sceneBounds.edgeWidth;
    mesh.edgesColor = SOLID_EDGE_COLOR;
  }

  private disposeGeom(uuid: string): void {
    this.sceneRegistry.forget(uuid);
    this.meshes.get(uuid).dispose();
    this.meshes.delete(uuid);
  }

  /**
   * Build the material every geom shares, once for the scene.
   *
   * Geoms borrow the obst shaders: a geom is a lit solid that a clipping plane
   * cuts, read from a per-vertex colour, which is what those already are.
   */
  private ensureMaterial(): Promise<void> {
    if (this.materialPending) {
      // The meshes of this render still need the material of the last one
      return this.materialPending.then(() => this.applyMaterial());
    }

    this.materialPending = tryCreateShaderMaterial(this.babylonService, {
      name: 'geomShader', shader: 'obst', fragmentShader: 'obst'
    }, 'GeomService').then((material: BABYLON.ShaderMaterial) => {
      if (!material) { return; }
      // The scene can be gone by the time the sources arrive
      if (!this.babylonService.scene) { material.dispose(); return; }

      this.material = material;
      // A geom is a surface, not a solid: an open one has to show both sides
      material.backFaceCulling = false;
      this.pushClip();
      this.applyMaterial();
    });

    return this.materialPending;
  }

  private applyMaterial(): void {
    if (!this.material) { return; }
    this.meshes.forEach(mesh => { mesh.material = this.material; });
  }

  /** Show or hide every geom at once. */
  public toggleVisibility(): void {
    this.visible = !this.visible;
    this.applyVisibility();
  }

  private applyVisibility(): void {
    this.meshes.forEach(mesh => mesh.setEnabled(this.visible));
  }
}
