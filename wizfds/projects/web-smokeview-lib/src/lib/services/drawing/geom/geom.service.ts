import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';

import { BabylonService } from '../../babylon/babylon.service';
import { ClippedMaterial } from '../clipped-material';
import { LayerVisibilityService } from '../layer-visibility.service';
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

  /**
   * Shared by every geom: they differ in their buffers, in nothing the shader
   * sees. Geoms borrow the obst shaders - a geom is a lit surface that a
   * clipping plane cuts, read from a per-vertex colour.
   */
  private readonly surface: ClippedMaterial;

  /** Whether the geoms are drawn at all. */
  public visible = true;

  constructor(
    private babylonService: BabylonService,
    private helpersService: HelpersService,
    private sceneBounds: SceneBoundsService,
    private sceneRegistry: SceneRegistryService,
    sceneLifecycle: SceneLifecycleService,
    layerVisibility: LayerVisibilityService
  ) {
    sceneLifecycle.register(this);
    // Two states, not three: an outline of an arbitrary triangle mesh is a walk
    // over every edge it has - seconds of work that reads as noise, not contour
    layerVisibility.bind('geom', () => this.visible ? 'filled' : 'hidden');
    this.surface = new ClippedMaterial({
      materialName: 'geomShader', shader: 'obst', fragmentShader: 'obst',
      // The fragment multiplies by fillAlpha now; a &GEOM always draws in full
      defaults: { fillAlpha: 1.0 }
    }, babylonService, sceneBounds, 'GeomService');
  }

  /** The mesh drawn for a geom, if it is drawn at all. */
  public meshFor(uuid: string): BABYLON.Mesh | undefined {
    return this.meshes.get(uuid);
  }

  /** Where a clipping plane currently stands, in FDS metres. */
  public get clipX(): number { return this.surface.clipX; }
  public get clipY(): number { return this.surface.clipY; }
  public get clipZ(): number { return this.surface.clipZ; }

  /** Pull the clipping planes back to showing the whole model. */
  public resetClipping(): void {
    this.surface.resetClipping();
  }

  /**
   * Move a clipping plane
   * @param value the plane's coordinate, in FDS metres
   * @param direction x, y, z
   */
  public clip(value: number, direction: SceneAxis): void {
    this.surface.clip(value, direction);
  }

  /** Release everything tied to the scene that has just been disposed. */
  public resetSceneState(): void {
    this.meshes.clear();
    this.visible = true;
    this.surface.resetSceneState();
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

    await this.surface.attach(Array.from(this.meshes.values()));
    this.applyVisibility();
  }

  /**
   * Build or rebuild the mesh for one geom.
   *
   * The mesh itself is kept across renders - disposing and rebuilding one per
   * render is what orphans meshes - but its buffers are written afresh, because
   * nothing here knows whether the triangles changed. The outline follows them:
   * an outline built against the previous buffer would draw edges that are no
   * longer there.
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

    // One mesh per geom, so the mesh alone identifies it
    this.sceneRegistry.register(geom.uuid, {
      mesh: mesh, type: 'geom', id: geom.id, xb: geom.xb
    });

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

  /** Show or hide every geom at once. */
  public toggleVisibility(): void {
    this.visible = !this.visible;
    this.applyVisibility();
  }

  private applyVisibility(): void {
    this.meshes.forEach(mesh => mesh.setEnabled(this.visible));
  }
}
