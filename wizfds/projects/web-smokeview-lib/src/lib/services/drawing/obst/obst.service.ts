import { Injectable, isDevMode } from '@angular/core';
import { BabylonService } from '../../babylon/babylon.service';
import * as BABYLON from 'babylonjs';
import { forEach, find, sortBy } from 'lodash';
import { HelpersService } from '../../helpers/helpers.service';
import { HoleService } from '../hole/hole.service';
import { SceneHole, SceneObst, SceneXb } from '../scene-input';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { SceneAxis, SceneBoundsService } from '../../scene-bounds/scene-bounds.service';

/**
 * An obst as the app gave it, paired with everything the library worked out about
 * drawing it. The obst itself is never written to - it belongs to the scenario
 * (ADR-0004).
 */
interface PlacedObst {
  readonly obst: SceneObst,
  /** The colour as a flat rgba array, ready for the vertex buffer. */
  readonly color: number[],
  /** The openings that cut into this obst. */
  readonly holeXbs: SceneXb[]
}

@Injectable({
  providedIn: 'root'
})
export class ObstService implements SceneScoped {

  obsts: readonly SceneObst[] = [];
  holes: readonly SceneHole[] = [];

  /** The obst under the last pick, as the app described it. */
  pickedObst: SceneObst;
  pickedObstMesh;
  pickedObstMaterial: BABYLON.StandardMaterial;

  vertices: number[] = [];
  normals: number[] = [];
  colors: number[] = [];
  indices: number[] = [];
  positions: BABYLON.Vector3[] = [];

  // Track ranges of standard obsts that need normal computation
  standardObstRanges: {start: number, end: number, vertexStart: number, indexStart: number, indexEnd: number}[] = [];

  mesh;
  meshBackCap;
  vertexData: BABYLON.VertexData;
  material: BABYLON.ShaderMaterial;
  materialBackCap: BABYLON.ShaderMaterial;
  materialTransparent: BABYLON.ShaderMaterial;

  /** Read through the meshTransparent getter. */
  private _meshTransparent: BABYLON.Mesh;

  /** Where each obst of the last render went, and in what colour. */
  private placed: PlacedObst[] = [];

  /** The second buffer, for the obsts whose &SURF is not fully opaque. */
  private transparentVertices: number[] = [];
  private transparentColors: number[] = [];
  private transparentIndices: number[] = [];

  /**
   * Whether obsts are drawn as wireframe. Held here rather than read off the
   * material, because the button is clickable before the material exists.
   */
  private wireframeOn = false;

  /**
   * Face ranges collected while the buffers are built, registered once the
   * meshes they refer to exist.
   */
  private readonly pendingRegistrations: { uuid: string, transparent: boolean, first: number, count: number }[] = [];

  /** What this service put in the registry, so a re-render can take it out. */
  private registeredUuids: string[] = [];

  /** Where the three clipping planes stand, in FDS metres. */
  clipX: number;
  clipY: number;
  clipZ: number;

  constructor(
    private babylonService: BabylonService,
    private helperService: HelpersService,
    private holeService: HoleService,
    private sceneBounds: SceneBoundsService,
    private sceneRegistry: SceneRegistryService,
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
    this.resetClipping();
  }

  /**
   * Pull the clipping planes back to showing the whole model.
   *
   * The planes are coordinates, so they mean nothing once the model changes:
   * z = 4 m is the ceiling of a room and the floor of a tunnel. Whoever measures
   * the scene calls this - see SmokeviewApiService.render().
   */
  public resetClipping(): void {
    this.clipX = this.sceneBounds.openClipAt('x');
    this.clipY = this.sceneBounds.openClipAt('y');
    this.clipZ = this.sceneBounds.openClipAt('z');
    this.pushClipToMaterials();
  }

  /** Where a clipping plane currently stands, in FDS metres. */
  public clipPlane(axis: SceneAxis): number {
    return axis === 'x' ? this.clipX : axis === 'y' ? this.clipY : this.clipZ;
  }

  /**
   * Push the current slider positions onto a material, as planes in metres.
   *
   * Every material this service builds is built inside a promise, long after the
   * sliders became clickable, so each of them starts life by reading them back.
   */
  private applyClipTo(material: BABYLON.ShaderMaterial): void {
    material.setFloat("clipX", this.clipX);
    material.setFloat("clipY", this.clipY);
    material.setFloat("clipZ", this.clipZ);
  }

  /**
   * Push the planes onto every material that exists.
   *
   * The sliders are live from the first frame, while the materials are still
   * being fetched; whatever is not there yet reads them back when it is built.
   */
  private pushClipToMaterials(): void {
    forEach([this.material, this.materialBackCap, this.materialTransparent],
      (material: BABYLON.ShaderMaterial) => {
        if (material) { this.applyClipTo(material); }
      });
  }

  /**
   * Tell the registry where each obst ended up, now that the meshes exist.
   *
   * The previous render's entries go first: obsts removed from the scenario
   * would otherwise keep naming faces of a buffer they are no longer in.
   */
  private registerWithScene(): void {
    this.registeredUuids.forEach(uuid => this.sceneRegistry.forget(uuid));
    this.registeredUuids = [];

    this.pendingRegistrations.forEach(({ uuid, transparent, first, count }) => {
      const mesh = transparent ? this._meshTransparent : this.mesh;
      if (!mesh) { return; }
      this.sceneRegistry.register(uuid, { mesh: mesh, faces: { first: first, count: count } });
      this.registeredUuids.push(uuid);
    });
  }

  /**
   * Drop everything that belonged to the scene that has just been disposed.
   * The meshes and materials are already gone with it - this is about not
   * holding references to them into the next scene.
   */
  public resetSceneState(): void {
    this.mesh = null;
    this.meshBackCap = null;
    this._meshTransparent = null;
    this.material = null;
    this.materialBackCap = null;
    this.materialTransparent = null;
    this.vertexData = null;

    this.pickedObst = undefined;
    this.pickedObstMesh = undefined;
    this.pickedObstMaterial = undefined;

    this.vertices.length = 0;
    this.normals.length = 0;
    this.colors.length = 0;
    this.indices.length = 0;
    this.positions.length = 0;
    this.standardObstRanges.length = 0;
    this.transparentVertices.length = 0;
    this.transparentColors.length = 0;
    this.transparentIndices.length = 0;
    this.placed.length = 0;
  }

  /**
   * Move a clipping plane
   * @param value the plane's coordinate, in FDS metres
   * @param direction x, y, z direction
   */
  public clip(value: number, direction: SceneAxis) {
    if (direction == 'x') { this.clipX = value; }
    else if (direction == 'y') { this.clipY = value; }
    else { this.clipZ = value; }

    this.pushClipToMaterials();
  }

  /**
   * Render geometry from json data
   * @param data
   */
  public renderJson(data: any) {

    // Clear arrays
    this.vertices.length = 0;
    this.colors.length = 0;
    this.indices.length = 0;
    this.positions.length = 0;

    // Copy rather than alias: these buffers are emptied in place on the next
    // render, which would otherwise truncate the caller's arrays.
    this.vertices = [...data.vertices];
    this.colors = [...data.colors];
    this.indices = [...data.indices];

    // Generate positions
    for (let i = 0; i < this.vertices.length; i += 3) {
      this.positions.push(new BABYLON.Vector3(this.vertices[i], this.vertices[i + 1], this.vertices[i + 2]));
    }

    // Render geometry
    this.render();
  }

  public renderWiz() {

  }

  public renderFds() {
    // upload fds file ...

  }

  /**
   * Reder obsts
   */
  public renderObsts() {

    // Work out what colour every obst is and which openings cut it
    this.placed = this.placeObsts();

    // Update obsts vertex data
    this.updateObstsVertexData();

    // Render data
    this.render();
  }

  /**
   * Work out how each obst is drawn.
   *
   * Colours arrive resolved: the app looks the &SURF up, because it is the app
   * that owns both. The boxes themselves need no placing - the scene is in FDS
   * metres 1:1 (ADR-0002), so an obst stands exactly where the scenario says.
   */
  private placeObsts(): PlacedObst[] {
    return (this.obsts || []).map((obst: SceneObst) => ({
      obst: obst,
      color: this.helperService.toRgba(obst.color),
      holeXbs: this.holeService.holesFor(obst, this.holes)
        .map((hole: SceneHole) => hole.xb)
    }));
  }

  /**
   * Update obsts vertex data - separate opaque and transparent obsts
   */
  private updateObstsVertexData(): void {

    // Clear arrays for opaque obsts
    this.vertices.length = 0;
    this.colors.length = 0;
    this.indices.length = 0;
    this.positions.length = 0;
    this.normals.length = 0;
    this.standardObstRanges.length = 0;

    // Arrays for transparent obsts
    const transparentVertices = this.transparentVertices;
    const transparentColors = this.transparentColors;
    const transparentIndices = this.transparentIndices;
    transparentVertices.length = 0;
    transparentColors.length = 0;
    transparentIndices.length = 0;

    let opaqueIndex = 0;
    let transparentIndex = 0;

    // Track if we have any CSG meshes (for backCap compatibility)
    let hasCSGMeshes = false;

    this.pendingRegistrations.length = 0;

    forEach(this.placed, (placed: PlacedObst) => {
      const obst = placed.obst;
      // FDS TRANSPARENCY is the alpha the app resolved from the &SURF: anything
      // short of fully opaque goes into the second buffer
      const isTransparent = placed.color[3] < 1;
      let processedWithHoles = false;

      // Where this obst's faces start, whichever path below appends them. Read
      // afterwards rather than computed, because an obst carrying a &HOLE has
      // no fixed triangle count - which is what broke identity by position.
      const opaqueFacesBefore = this.indices.length / 3;
      const transparentFacesBefore = transparentIndices.length / 3;

      // Check if obst has holes and can have holes
      if (placed.holeXbs.length > 0 && this.holeService.canHaveHoles(obst)) {
        try {
          // Process obst with holes using CSG
          const meshWithHoles = this.holeService.cutHoles(
            obst.id, obst.xb, placed.holeXbs, this.babylonService.scene
          );

          if (meshWithHoles) {

            // Extract vertices and indices from CSG mesh
            const positions = meshWithHoles.getVerticesData(BABYLON.VertexBuffer.PositionKind);
            const indices = meshWithHoles.getIndices();
            const normals = meshWithHoles.getVerticesData(BABYLON.VertexBuffer.NormalKind);

            if (isDevMode()) console.log('[ObstService] Extracted data:', {
              positionsLength: positions?.length,
              indicesLength: indices?.length,
              normalsLength: normals?.length,
              vertices: positions?.length ? positions.length / 3 : 0
            });

            if (positions && indices && normals) {
              // Generate colors for each vertex (same color for all vertices of this obst)
              const colorArray: number[] = [];
              for (let i = 0; i < positions.length / 3; i++) {
                colorArray.push(...placed.color);
              }

              // Convert indices to proper format - fix the indexing
              const adjustedIndices: number[] = [];
              const currentVertexCount = isTransparent ? transparentVertices.length / 3 : this.vertices.length / 3;
              if (isDevMode()) console.log('[ObstService] Index adjustment:', {
                originalIndices: indices.length,
                currentVertexCount: currentVertexCount,
                firstFewIndices: indices.slice(0, 6),
                obstId: obst.id
              });

              // Manifold winds its triangles the opposite way from HelpersService
              // .getIndices(). Both end up in one buffer feeding one back-cap mesh,
              // which draws a single facing - mixed winding paints the outside of
              // these obsts red instead of capping the cut. Flip them to match.
              const flippedIndices: number[] = [];
              for (let i = 0; i < indices.length; i += 3) {
                flippedIndices.push(indices[i], indices[i + 2], indices[i + 1]);
                adjustedIndices.push(
                  indices[i] + currentVertexCount,
                  indices[i + 2] + currentVertexCount,
                  indices[i + 1] + currentVertexCount
                );
              }

              // Recompute rather than reuse Manifold's normals: those follow its
              // own winding, and a normal facing away from its triangle zeroes the
              // diffuse term in obst.fragment.wgsl, leaving the obst at ambient
              // brightness only - visibly darker than everything around it.
              const csgNormals = new Array(positions.length).fill(0);
              BABYLON.VertexData.ComputeNormals(positions, flippedIndices, csgNormals);

              if (isDevMode()) console.log('[ObstService] Adjusted indices:', {
                firstFewAdjusted: adjustedIndices.slice(0, 6),
                totalAdjusted: adjustedIndices.length
              });

              if (isTransparent) {
                transparentVertices.push(...positions);
                transparentColors.push(...colorArray);
                transparentIndices.push(...adjustedIndices);
                // Note: We'd need separate normals array for transparent, but skipping for now
                transparentIndex++;
              } else {
                this.vertices.push(...positions);
                this.colors.push(...colorArray);
                this.indices.push(...adjustedIndices);
                this.normals.push(...csgNormals);
                // Don't increment opaqueIndex for CSG meshes since they have variable vertex count
                // opaqueIndex is used for standard box calculation which assumes 24 vertices per obst
              }

              processedWithHoles = true;
              hasCSGMeshes = true; // Mark that we have CSG meshes
            } else {
              if (isDevMode()) console.warn('[ObstService] No positions or indices extracted from CSG mesh');
            }

            // Clean up the temporary mesh
            meshWithHoles.dispose();
          } else {
            if (isDevMode()) console.warn('[ObstService] CSG processing returned null, falling back to standard rendering');
          }
        } catch (error) {
          if (isDevMode()) console.error('[ObstService] Error processing obst with holes, falling back to standard rendering:', error);
          // Fall through to standard processing
        }
      } else {
        if (placed.holeXbs.length > 0) {
          if (isDevMode()) console.log('[ObstService] Obst has holes but permit_hole is false:', obst.id, 'permit_hole:', obst.permitHole);
        }
      }

      // Standard obst processing (no holes or holes processing failed)
      if (!processedWithHoles) {
        if (isTransparent) {
          // Add to transparent mesh
          transparentVertices.push(...this.helperService.getVerticesFromXb(obst.xb));
          transparentColors.push(...this.helperService.getColors(placed.color));
          transparentIndices.push(...this.helperService.getIndices(transparentIndex));
          transparentIndex++;
        } else {
          // Add to opaque mesh
          const currentVertexCount = this.vertices.length / 3;
          const currentVertexStart = this.vertices.length;
          this.vertices.push(...this.helperService.getVerticesFromXb(obst.xb));
          const currentVertexEnd = this.vertices.length;
          this.colors.push(...this.helperService.getColors(placed.color));

          // For standard obsts, we need to adjust indices based on current vertex count, not opaqueIndex
          // getIndices() returns indices for a single box (24 vertices), but we need to offset them
          const standardIndices = this.helperService.getIndices(0); // Get base indices for a single box
          const adjustedStandardIndices = standardIndices.map(index => index + currentVertexCount);
          const currentIndexStart = this.indices.length;
          this.indices.push(...adjustedStandardIndices);

          // Track this range for normal computation later. Recording where this
          // obst's indices land saves re-scanning the whole index array per obst.
          this.standardObstRanges.push({
            start: currentVertexStart,
            end: currentVertexEnd,
            vertexStart: currentVertexCount,
            indexStart: currentIndexStart,
            indexEnd: this.indices.length
          });

          // Add placeholder normals for this standard obst (will be computed later)
          const placeholderNormals = new Array(72).fill(0); // 24 vertices * 3 components = 72
          this.normals.push(...placeholderNormals);

          opaqueIndex++;
        }
      }

      const opaqueFaces = this.indices.length / 3 - opaqueFacesBefore;
      const transparentFaces = transparentIndices.length / 3 - transparentFacesBefore;
      if (opaqueFaces > 0) {
        this.pendingRegistrations.push({
          uuid: obst.uuid, transparent: false, first: opaqueFacesBefore, count: opaqueFaces
        });
      } else if (transparentFaces > 0) {
        this.pendingRegistrations.push({
          uuid: obst.uuid, transparent: true, first: transparentFacesBefore, count: transparentFaces
        });
      }
    });

    // Generate positions for opaque mesh
    for (let i = 0; i < this.vertices.length; i += 3) {
      this.positions.push(new BABYLON.Vector3(this.vertices[i], this.vertices[i + 1], this.vertices[i + 2]));
    }

    // Debug info
    if (isDevMode()) { try {
      console.debug('[ObstService] Vertex data split:', {
        opaqueCount: opaqueIndex,
        transparentCount: transparentIndex,
        opaqueVertices: this.vertices.length,
        transparentVertices: transparentVertices.length,
        opaqueIndices: this.indices.length,
        transparentIndices: transparentIndices.length,
        opaqueColors: this.colors.length,
        transparentColors: transparentColors.length,
        hasCSGMeshes: hasCSGMeshes
      });
    } catch {} }
  }

  /**
   * Render current obst geometry - separate opaque and transparent meshes
   */
  public render() {

    // Create opaque mesh. Babylon does not dispose a material along with its
    // mesh, and every render builds a fresh set, so the old ones are released
    // by hand - otherwise each render leaves three ShaderMaterials behind.
    if (this.mesh) { this.mesh.dispose(); }
    if (this.material) { this.material.dispose(); this.material = null; }
    this.mesh = new BABYLON.Mesh("obstOpaque", this.babylonService.scene);

    if (this.vertices.length > 0) {
      // Compute normals only for standard obsts, preserve CSG mesh normals
      for (const range of this.standardObstRanges) {
        // Extract vertices and indices for this standard obst. Its indices were
        // appended as one contiguous block, so read that block directly instead
        // of scanning every index in the scene for each obst in turn.
        const obstVertices = this.vertices.slice(range.start, range.end);
        const obstIndices = [];

        for (let i = range.indexStart; i < range.indexEnd; i++) {
          obstIndices.push(this.indices[i] - range.vertexStart); // Make indices relative to this obst
        }


        // Compute normals for this standard obst
        const obstNormals = new Array(obstVertices.length).fill(0);
        BABYLON.VertexData.ComputeNormals(obstVertices, obstIndices, obstNormals);

        // Copy computed normals back to the main normals array
        for (let i = 0; i < obstNormals.length; i++) {
          this.normals[range.start + i] = obstNormals[i];
        }
      }

      // Assign data to opaque mesh
      this.vertexData = new BABYLON.VertexData();
      this.vertexData.positions = this.vertices;
      this.vertexData.indices = this.indices;
      this.vertexData.colors = this.colors;
      this.vertexData.normals = this.normals;
      this.vertexData.applyToMesh(this.mesh);

      // Opaque mesh never needs alpha blending
      const opaqueMesh = this.mesh;
      this.babylonService.createShaderMaterial({ name: "opaqueShader", shader: "obst" })
        .then((material) => {
          // A second render can land before this settles, leaving the material
          // with no mesh to belong to.
          if (opaqueMesh.isDisposed()) { material.dispose(); return; }
          this.material = material;
          this.applyClipTo(this.material);
          this.material.backFaceCulling = false;
          // A wireframe toggled while this was still loading must not be lost
          this.applyWireframe();
          this.material.freeze();
          opaqueMesh.material = this.material;
        })
        .catch((e) => { if (isDevMode()) { try { console.error('[ObstService] Failed to create the opaque obst material', e); } catch {} } });

      this.mesh.enableEdgesRendering();
      this.mesh.edgesWidth = this.sceneBounds.edgeWidth;
      this.mesh.edgesColor = new BABYLON.Color4(0.4, 0.4, 0.4, 1);
      this.mesh.freezeWorldMatrix();
    }

    // Create transparent mesh if needed
    const transparentVertices = this.transparentVertices;
    const transparentColors = this.transparentColors;
    const transparentIndices = this.transparentIndices;

    if (this._meshTransparent) { this._meshTransparent.dispose(); }
    if (this.materialTransparent) {
      this.materialTransparent.dispose();
      this.materialTransparent = null;
    }

    if (transparentVertices.length > 0) {
      this._meshTransparent = new BABYLON.Mesh("obstTransparent", this.babylonService.scene);

      if (isDevMode()) { try {
        console.debug('[ObstService] Creating transparent mesh with vertices:', transparentVertices.length);
      } catch {} }

      const transparentNormals = [];
      BABYLON.VertexData.ComputeNormals(transparentVertices, transparentIndices, transparentNormals);

      const transparentVertexData = new BABYLON.VertexData();
      transparentVertexData.positions = transparentVertices;
      transparentVertexData.indices = transparentIndices;
      transparentVertexData.colors = transparentColors;
      transparentVertexData.normals = transparentNormals;
      transparentVertexData.applyToMesh(this._meshTransparent);

      const transparentMesh = this._meshTransparent;
      this.babylonService.createShaderMaterial({ name: "transparentShader", shader: "obst", needAlphaBlending: true })
        .then((material) => {
          if (transparentMesh.isDisposed()) { material.dispose(); return; }
          this.materialTransparent = material;
          this.applyClipTo(this.materialTransparent);
          this.materialTransparent.backFaceCulling = false;
          this.materialTransparent.freeze();
          transparentMesh.material = this.materialTransparent;
        })
        .catch((e) => { if (isDevMode()) { try { console.error('[ObstService] Failed to create the transparent obst material', e); } catch {} } });

      this._meshTransparent.enableEdgesRendering();
      this._meshTransparent.edgesWidth = this.sceneBounds.edgeWidth;
      this._meshTransparent.edgesColor = new BABYLON.Color4(0.4, 0.4, 0.4, 1);
      this._meshTransparent.freezeWorldMatrix();
    }

    // Create back cap mesh for opaque obsts (clipping visualization).
    // It is applied the same vertexData as the opaque mesh - geometry produced
    // by CSG hole cutting included - so obsts carrying a &HOLE get a cap too.
    if (this.meshBackCap) { this.meshBackCap.dispose(); }
    if (this.materialBackCap) { this.materialBackCap.dispose(); this.materialBackCap = null; }

    if (this.vertices.length > 0) {
      if (isDevMode()) console.log('[ObstService] Creating meshBackCap');
      this.meshBackCap = new BABYLON.Mesh("obstBackCapOpaque", this.babylonService.scene);
      this.vertexData.applyToMesh(this.meshBackCap);
      this.applyWireframe();

      // Back-cap material for opaque mesh only
      const backCapMesh = this.meshBackCap;
      this.babylonService.createShaderMaterial({ name: "opaqueBackCapShader", shader: "obstBackCap" })
        .then((material) => {
          if (backCapMesh.isDisposed()) { material.dispose(); return; }
          this.materialBackCap = material;
          this.applyClipTo(this.materialBackCap);
          this.materialBackCap.zOffset = -0.01; // Always bring to front for clipping visualization
          this.materialBackCap.freeze();
          backCapMesh.material = this.materialBackCap;
        })
        .catch((e) => { if (isDevMode()) { try { console.error('[ObstService] Failed to create the obst back-cap material', e); } catch {} } });
      this.meshBackCap.freezeWorldMatrix();
    }

    // Both meshes exist by now, so the face ranges collected while building the
    // buffers have something to point at
    this.registerWithScene();

    // Uncomment when opacity - not working properly
    //this.mesh.material.needDepthPrePass = true;
    //this.mesh.mustDepthSortFacets = true;
    //this.babylonService.scene.registerBeforeRender(() => {
    //  this.mesh.updateFacetData();
    //});
  }

  /**
   * Show the obsts as solid or as wireframe, back cap following along.
   *
   * The template calls this from the first frame, while the shader material is
   * still being fetched - hence the guards rather than reaching into
   * `material.wireframe` from the markup.
   */
  public toggleWireframe(): void {
    this.wireframeOn = !this.wireframeOn;
    this.applyWireframe();
  }

  /**
   * Push the wireframe state onto whatever currently exists.
   *
   * Guarding the material and the back cap independently would let them drift
   * apart: a click before the material lands would flip only the cap, and the
   * two would stay inverted for the rest of the session.
   */
  private applyWireframe(): void {
    if (this.material) {
      // The material is frozen once built; wireframe is a fill mode, not part
      // of the shader, so it may be flipped regardless.
      this.material.wireframe = this.wireframeOn;
    }
    if (this.meshBackCap) {
      // The cap fills the clipped cross-section - in wireframe it would hide
      // the triangles the user asked to see.
      this.meshBackCap.isVisible = !this.wireframeOn;
    }
  }

  /**
   * Flip obst outlines on or off. Edges live on the meshes, so this works even
   * before the materials arrive - but not before the first render.
   */
  public toggleEdgesRendering(): void {
    if (!this.mesh) { return; }
    this.setEdgesRendering(this.mesh.edgesWidth == 0);
  }

  /**
   * Drop the current selection. Called when a pick misses, which can happen
   * before anything was ever selected.
   */
  public clearSelection(): void {
    if (this.pickedObstMesh) {
      this.pickedObstMesh.dispose();
      this.pickedObstMesh = undefined;
    }
    if (this.pickedObstMaterial) {
      this.pickedObstMaterial.dispose();
      this.pickedObstMaterial = undefined;
    }
    this.pickedObst = undefined;
  }

  /**
   * Enable or disable edges rendering for all obst meshes
   */
  public setEdgesRendering(enabled: boolean): void {
    // Control edges for opaque mesh
    if (this.mesh) {
      if (enabled) {
        this.mesh.enableEdgesRendering();
        this.mesh.edgesWidth = this.sceneBounds.edgeWidth;
        this.mesh.edgesColor = new BABYLON.Color4(0.4, 0.4, 0.4, 1);
      } else {
        this.mesh.disableEdgesRendering();
        this.mesh.edgesWidth = 0; // Set to 0 for button logic
      }
    }

    // Control edges for transparent mesh
    if (this._meshTransparent) {
      if (enabled) {
        this._meshTransparent.enableEdgesRendering();
        this._meshTransparent.edgesWidth = this.sceneBounds.edgeWidth;
        this._meshTransparent.edgesColor = new BABYLON.Color4(0.4, 0.4, 0.4, 1);
      } else {
        this._meshTransparent.disableEdgesRendering();
        this._meshTransparent.edgesWidth = 0; // Set to 0 for button logic
      }
    }
  }

  /**
   * Get transparent mesh for external access (e.g., for outline control)
   */
  public get meshTransparent(): BABYLON.Mesh | undefined {
    return this._meshTransparent;
  }

  /**
   * Select and highlight picked obst
   * @param ray ray from camera to pick point
   */
  public selectObst(ray: BABYLON.Ray) {

    // Find all intersecting triangles
    let intersectInfo = [];
    let faceId = -1;

    // The clipping planes, read once: they are the same for every triangle and
    // the loop below runs over the whole scene.
    const clipX = this.clipX, clipY = this.clipY, clipZ = this.clipZ;

    for (let i = 0; i < this.indices.length; i += 3) {
      faceId += 1;
      let p0 = this.positions[this.indices[i]];
      let p1 = this.positions[this.indices[i + 1]];
      let p2 = this.positions[this.indices[i + 2]];

      var currentIntersectInfo = ray.intersectsTriangle(p0, p1, p2);

      // Test if ray cross only visible triangles
      if (currentIntersectInfo
        &&
        (
          (p0.x >= clipX && p0.y >= clipY && p0.z <= clipZ)
          ||
          (p1.x >= clipX && p1.y >= clipY && p1.z <= clipZ)
          ||
          (p2.x >= clipX && p2.y >= clipY && p2.z <= clipZ)
        )
      ) {
        currentIntersectInfo.faceId = faceId;
        intersectInfo.push(currentIntersectInfo);
      }
    }

    if (intersectInfo.length > 0) {
      // Find clicked obst - sort triangles by distance
      intersectInfo = sortBy(intersectInfo, ['distance']);

      // Drop the previous highlight box and the material built for it
      this.clearSelection();

      // Ask the registry which obst owns the face that was hit. This used to be
      // `this.obsts[Math.floor(faceId / 12)]`, which assumed every obst is
      // twelve triangles - false for any obst carrying a &HOLE, and false for
      // every obst after it in the buffer.
      const uuid = this.sceneRegistry.uuidAt(this.mesh, intersectInfo[0].faceId);
      const picked = find(this.placed, (placed: PlacedObst) => placed.obst.uuid === uuid);
      if (!picked) { return; }
      this.pickedObst = picked.obst;

      // Create box
      const xb = picked.obst.xb;
      let options = {
        width: xb.x2 - xb.x1,
        height: xb.y2 - xb.y1,
        depth: xb.z2 - xb.z1
      }
      this.pickedObstMesh = BABYLON.MeshBuilder.CreateBox("pickedObst", options, this.babylonService.scene);
      this.pickedObstMaterial = new BABYLON.StandardMaterial("myMaterial", this.babylonService.scene);
      this.pickedObstMaterial.ambientColor = new BABYLON.Color3(1, 1, 1);
      this.pickedObstMaterial.alpha = 0.4;
      this.pickedObstMaterial.zOffset = -0.05;
      this.pickedObstMesh.material = this.pickedObstMaterial;
      this.pickedObstMesh.enableEdgesRendering();
      this.pickedObstMesh.edgesWidth = this.sceneBounds.outlineWidth;
      this.pickedObstMesh.edgesColor = new BABYLON.Color4(0.09, 0.49, 0.99, 1);
      this.pickedObstMesh.position = new BABYLON.Vector3(
        xb.x1 + (xb.x2 - xb.x1) / 2,
        xb.y1 + (xb.y2 - xb.y1) / 2,
        xb.z1 + (xb.z2 - xb.z1) / 2
      );

      if (isDevMode()) console.log(this.pickedObstMesh);
    }
  }

}
