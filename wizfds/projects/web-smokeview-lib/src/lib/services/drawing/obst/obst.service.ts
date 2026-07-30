import { Injectable, isDevMode } from '@angular/core';
import { BabylonService, tryCreateShaderMaterial } from '../../babylon/babylon.service';
import * as BABYLON from 'babylonjs';
import { forEach, find } from 'lodash';
import { HelpersService } from '../../helpers/helpers.service';
import { HoleService } from '../hole/hole.service';
import { SceneElement, SceneHole, SceneObst, SceneXb } from '../scene-input';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { SceneAxis, SceneBoundsService } from '../../scene-bounds/scene-bounds.service';
import { PooledBox, isTranslucent } from '../box-instance-pool';
import { BoxPoolPair } from '../box-pool-pair';
import { ObstScene, PickService } from '../../picking/pick.service';
import { SOLID_EDGE_COLOR } from '../../../consts/drawing';

/**
 * An obst as the app gave it, paired with everything the library worked out
 * about drawing it. The obst itself is never written to - it belongs to the
 * scenario (ADR-0004).
 */
interface PlacedObst {
  readonly obst: SceneObst,
  /** The colour as a flat rgba array, ready for the vertex buffer. */
  readonly color: number[],
  /** The openings that cut into this obst. */
  readonly holeXbs: SceneXb[]
}

/**
 * An obst drawn on a mesh of its own rather than out of a pool.
 *
 * Two reasons for it (ADR-0006): an opening was cut into it, so what is left is
 * no longer a box; or it has been singled out - selected, and next in line to be
 * edited - and must be free to change without touching anyone else's buffer.
 */
interface OwnMesh {
  readonly solid: BABYLON.Mesh,
  /** Fills the cross-section a clipping plane exposes. Opaque obsts only. */
  readonly cap: BABYLON.Mesh | null,
  readonly transparent: boolean,
  /** The pool entry to hand back on demotion; null for an obst with openings. */
  readonly promotedFrom: PooledBox | null
}

/**
 * How far towards the camera a back cap is pushed.
 *
 * It is drawn from the same triangles as the surface it fills, so at equal
 * depth the two z-fight and the cap's red bleeds through the whole model.
 */
const CAP_Z_OFFSET = -0.01;

/** Colour of the outline around a selected obst. */
const SELECTED_COLOR = new BABYLON.Color4(0.09, 0.49, 0.99, 1);

/** Colour of the outline around the obst under the pointer. */
const HOVERED_COLOR = new BABYLON.Color4(0.55, 0.72, 1, 1);

@Injectable({
  providedIn: 'root'
})
export class ObstService implements SceneScoped, ObstScene {

  obsts: readonly SceneObst[] = [];
  holes: readonly SceneHole[] = [];

  /** The pools the bulk of the obsts are drawn from - opaque and translucent. */
  private pool: BoxPoolPair;
  /** Draws the opaque pool's boxes a second time, filled red where they are cut. */
  private opaqueCap: BABYLON.Mesh;

  /** Obsts that could not be instanced, by uuid. */
  private readonly ownMeshes = new Map<string, OwnMesh>();

  /**
   * The six shader materials, built once for the scene rather than once per
   * render: none of them depends on what is being drawn, and rebuilding them
   * every time was what left orphaned ShaderMaterials behind.
   */
  private materials: {
    instanced?: BABYLON.ShaderMaterial,
    instancedTransparent?: BABYLON.ShaderMaterial,
    instancedCap?: BABYLON.ShaderMaterial,
    own?: BABYLON.ShaderMaterial,
    ownTransparent?: BABYLON.ShaderMaterial,
    ownCap?: BABYLON.ShaderMaterial
  } = {};

  /** In flight while the shader sources are being fetched. */
  private materialsPending: Promise<void> | null = null;

  /** Where each obst of the last render went, and in what colour. */
  private placed: PlacedObst[] = [];

  /**
   * Whether obsts are drawn as wireframe. Held here rather than read off the
   * material, because the button is clickable before the material exists.
   */
  private wireframeOn = false;

  /** Whether obst outlines are drawn. Same reason as above. */
  private edgesOn = true;

  /**
   * What the two display switches currently show.
   *
   * Read by whoever draws the controls - the host's ribbon since ADR-0010 - so
   * that a button shows the state of the scene rather than a copy of it that a
   * re-render can leave behind.
   */
  public get wireframe(): boolean { return this.wireframeOn; }
  public get outlined(): boolean { return this.edgesOn; }

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
    private picking: PickService,
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
    // Picking asks this service about the clipping planes and about singling an
    // obst out of its pool; injecting it the other way round would be a cycle,
    // and this is the side that knows a re-render has to drop what was chosen.
    this.picking.bind(this);
    this.resetClipping();
  }

  /** The base box every plain opaque obst is drawn from. */
  public get opaqueMesh(): BABYLON.Mesh | undefined {
    return this.pool ? this.pool.opaque.mesh : undefined;
  }

  /** The base box the obsts short of fully opaque are drawn from. */
  public get transparentMesh(): BABYLON.Mesh | undefined {
    return this.pool ? this.pool.transparent.mesh : undefined;
  }

  /** The mesh an obst got to itself, if it has one. */
  public ownMeshFor(uuid: string): BABYLON.Mesh | undefined {
    const own = this.ownMeshes.get(uuid);
    return own ? own.solid : undefined;
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
   * Whether a point is on the side of the planes that is drawn.
   *
   * The same test the shaders make, in the same coordinates - which is what lets
   * a pick agree with what is on screen rather than reach into geometry the user
   * has clipped away.
   */
  public isVisible(point: BABYLON.Vector3): boolean {
    return point.x > this.clipX && point.y > this.clipY && point.z < this.clipZ;
  }

  /**
   * Drop everything that belonged to the scene that has just been disposed.
   * The meshes and materials are already gone with it - this is about not
   * holding references to them into the next scene.
   */
  public resetSceneState(): void {
    this.pool = null;
    this.opaqueCap = null;
    this.ownMeshes.clear();

    this.materials = {};
    this.materialsPending = null;

    this.placed.length = 0;
  }

  /**
   * Draw the obsts of the current scenario.
   */
  public renderObsts() {
    // A selection made against the previous scenario names obsts that may no
    // longer be there, and holds meshes promoted out of a pool that is about to
    // be rebuilt.
    this.picking.clearSelection();
    this.picking.clearHover();

    this.placed = this.placeObsts();
    this.ensurePools();

    const boxes: PooledBox[] = [];
    const cut: { placed: PlacedObst, vertexData: BABYLON.VertexData }[] = [];

    forEach(this.placed, (placed: PlacedObst) => {
      const carved = this.carve(placed);
      if (carved) {
        cut.push({ placed: placed, vertexData: carved });
        return;
      }

      boxes.push({
        uuid: placed.obst.uuid, id: placed.obst.id, xb: placed.obst.xb, color: placed.color
      });
    });

    // Every mesh of the previous render goes, including the ones an opening no
    // longer justifies - an obst whose &HOLE was deleted belongs in the pool.
    this.disposeOwnMeshes();

    // The pair decides which of its two pools each box belongs in - alpha
    // blending is a property of the material, so the split is not this
    // service's rule to keep.
    this.pool.setBoxes(boxes);

    cut.forEach(({ placed, vertexData }) => this.addOwnMesh(
      placed.obst, vertexData, placed.color[3] < 1, null
    ));

    this.ensureMaterials();
    this.applyEdgesToAll();
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
   * Cut this obst's openings out of it, if it has any and allows them.
   *
   * @returns the resulting geometry, or null when the obst is a plain box after
   *          all - which is every obst without a &HOLE, an obst that forbids
   *          them, and an obst whose cut failed.
   */
  private carve(placed: PlacedObst): BABYLON.VertexData | null {
    if (placed.holeXbs.length === 0) { return null; }
    if (!this.holeService.canHaveHoles(placed.obst)) {
      if (isDevMode()) {
        console.log('[ObstService] Obst has holes but permit_hole is false:', placed.obst.id);
      }
      return null;
    }

    let mesh: BABYLON.Mesh | null = null;
    try {
      mesh = this.holeService.cutHoles(
        placed.obst.id, placed.obst.xb, placed.holeXbs, this.babylonService.scene
      );
      if (!mesh) { return null; }

      const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
      const indices = mesh.getIndices();
      if (!positions || !indices) { return null; }

      // Manifold winds its triangles the opposite way from HelpersService
      // .getIndices(), and the back cap draws one facing only - mixed winding
      // paints the outside of these obsts red instead of capping the cut.
      const flipped: number[] = [];
      for (let i = 0; i < indices.length; i += 3) {
        flipped.push(indices[i], indices[i + 2], indices[i + 1]);
      }

      // Recomputed rather than reused: Manifold's normals follow its own
      // winding, and a normal facing away from its triangle zeroes the diffuse
      // term in obst.fragment.wgsl - visibly darker than everything around it.
      const normals: number[] = new Array(positions.length).fill(0);
      BABYLON.VertexData.ComputeNormals(positions, flipped, normals);

      const colors: number[] = [];
      for (let i = 0; i < positions.length / 3; i++) { colors.push(...placed.color); }

      const vertexData = new BABYLON.VertexData();
      vertexData.positions = Array.from(positions);
      vertexData.indices = flipped;
      vertexData.normals = normals;
      vertexData.colors = colors;
      return vertexData;
    } catch (error) {
      if (isDevMode()) {
        console.error('[ObstService] Cutting the openings failed, drawing the obst solid:', error);
      }
      return null;
    } finally {
      if (mesh) { mesh.dispose(); }
    }
  }

  /** Build the two pools and the opaque back cap, once per scene. */
  private ensurePools(): void {
    if (this.pool) { return; }

    this.pool = new BoxPoolPair(
      'obstOpaque', 'obstTransparent', 'obst',
      this.babylonService.scene, this.helperService, this.sceneRegistry);
    this.opaqueCap = this.pool.opaque.createTwin('obstBackCapOpaque');
  }

  /**
   * Draw one obst on a mesh of its own.
   *
   * @param promotedFrom what to hand back to the pool on demotion, if it came
   *                     from one
   */
  private addOwnMesh(
    drawn: SceneElement, vertexData: BABYLON.VertexData,
    transparent: boolean, promotedFrom: PooledBox | null
  ): void {
    const uuid = drawn.uuid;
    const scene = this.babylonService.scene;
    const solid = new BABYLON.Mesh(`obst_${uuid}`, scene);
    vertexData.applyToMesh(solid);
    solid.freezeWorldMatrix();

    // The cap fills the cross-section a clipping plane exposes; the transparent
    // path has never had one, and filling it solid red would defeat the glazing.
    let cap: BABYLON.Mesh | null = null;
    if (!transparent) {
      cap = new BABYLON.Mesh(`obstBackCap_${uuid}`, scene);
      vertexData.applyToMesh(cap);
      cap.isPickable = false;
      cap.freezeWorldMatrix();
    }

    this.ownMeshes.set(uuid, {
      solid: solid, cap: cap, transparent: transparent, promotedFrom: promotedFrom
    });
    this.sceneRegistry.register(uuid, {
      mesh: solid, type: 'obst', id: drawn.id, xb: drawn.xb
    });

    this.applyMaterials();
    this.applyEdges(solid, this.sceneBounds.edgeWidth);
    this.applyWireframe();
  }

  private disposeOwnMeshes(): void {
    this.ownMeshes.forEach((own, uuid) => {
      this.sceneRegistry.forget(uuid);
      own.solid.dispose();
      if (own.cap) { own.cap.dispose(); }
    });
    this.ownMeshes.clear();
  }

  /**
   * Take one obst out of its pool and give it a mesh of its own.
   *
   * Nothing changes on screen: the same box, in the same place, in the same
   * colour, through the same fragment stage. What changes is that it can now be
   * moved without rewriting the buffer the other ten thousand share (ADR-0006).
   */
  public promote(uuid: string): void {
    if (this.ownMeshes.has(uuid)) { return; }

    if (!this.pool) { return; }

    const box = this.pool.remove(uuid);
    if (!box) { return; }

    this.addOwnMesh(box, this.boxVertexData(box), isTranslucent(box), box);
  }

  /** Put an obst that was singled out back into the pool it came from. */
  public demote(uuid: string): void {
    const own = this.ownMeshes.get(uuid);
    if (!own || !own.promotedFrom) { return; }

    this.sceneRegistry.forget(uuid);
    own.solid.dispose();
    if (own.cap) { own.cap.dispose(); }
    this.ownMeshes.delete(uuid);

    this.pool.add(own.promotedFrom);
  }

  /** The geometry a pooled box is drawn as, baked at its own coordinates. */
  private boxVertexData(box: PooledBox): BABYLON.VertexData {
    const positions = this.helperService.getVerticesFromXb(box.xb);
    const indices = this.helperService.getIndices(0);
    const normals: number[] = new Array(positions.length).fill(0);
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);

    const vertexData = new BABYLON.VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.colors = this.helperService.getColors(box.color as number[]);
    return vertexData;
  }

  // ==========================================
  // Materials
  // ==========================================

  /**
   * Build the shader materials, once for the scene.
   *
   * Six of them: a pool reads its transform and its colour per instance and so
   * needs a vertex stage of its own, and each of the two paths comes in opaque,
   * transparent and back-cap flavours. The fragment stage is shared, so an obst
   * is lit and clipped in one place whichever path drew it.
   */
  private ensureMaterials(): void {
    if (this.materialsPending) { return; }

    const build = (
      name: string, shader: string, fragmentShader: string, needAlphaBlending = false
    ) => tryCreateShaderMaterial(this.babylonService, {
      name: name, shader: shader, fragmentShader: fragmentShader,
      needAlphaBlending: needAlphaBlending
    }, 'ObstService');

    this.materialsPending = Promise.all([
      build('obstInstancedShader', 'obstInstanced', 'obst'),
      build('obstInstancedTransparentShader', 'obstInstanced', 'obst', true),
      build('obstInstancedBackCapShader', 'obstBackCapInstanced', 'obstBackCap'),
      build('obstShader', 'obst', 'obst'),
      build('obstTransparentShader', 'obst', 'obst', true),
      build('obstBackCapShader', 'obstBackCap', 'obstBackCap')
    ]).then(([instanced, instancedTransparent, instancedCap, own, ownTransparent, ownCap]) => {
      // The scene can be gone by the time the sources arrive
      if (!this.babylonService.scene) {
        [instanced, instancedTransparent, instancedCap, own, ownTransparent, ownCap]
          .forEach(material => { if (material) { material.dispose(); } });
        return;
      }

      this.materials = {
        instanced: instanced, instancedTransparent: instancedTransparent,
        instancedCap: instancedCap, own: own, ownTransparent: ownTransparent, ownCap: ownCap
      };

      forEach(this.materials, (material: BABYLON.ShaderMaterial) => {
        if (!material) { return; }
        // Only the caps cull: they draw the inward-facing triangles a clipping
        // plane exposes, and the solid materials have to show both sides.
        const isCap = material === instancedCap || material === ownCap;
        material.backFaceCulling = isCap;
        // A cap sits on exactly the same triangles as the surface it fills, so
        // without this the two z-fight and the cap's red bleeds through the
        // whole model rather than showing only where a plane cuts through it.
        if (isCap) { material.zOffset = CAP_Z_OFFSET; }
        this.applyClipTo(material);
        material.freeze();
      });

      // A wireframe or a clip set while this was in flight must not be lost
      this.applyWireframe();
      this.applyMaterials();
    });
  }

  /** Give every mesh that exists the material its path calls for. */
  private applyMaterials(): void {
    const materials = this.materials;

    if (this.pool && materials.instanced) {
      this.pool.opaque.mesh.material = materials.instanced;
    }
    if (this.pool && materials.instancedTransparent) {
      this.pool.transparent.mesh.material = materials.instancedTransparent;
    }
    if (this.opaqueCap && materials.instancedCap) {
      this.opaqueCap.material = materials.instancedCap;
    }

    this.ownMeshes.forEach((own) => {
      const solidMaterial = own.transparent ? materials.ownTransparent : materials.own;
      if (solidMaterial) { own.solid.material = solidMaterial; }
      if (own.cap && materials.ownCap) { own.cap.material = materials.ownCap; }
    });
  }

  /**
   * Push the current slider positions onto a material, as planes in metres.
   *
   * Every material this service builds is built inside a promise, long after the
   * sliders became clickable, so each of them starts life by reading them back.
   */
  private applyClipTo(material: BABYLON.ShaderMaterial): void {
    material.setFloat('clipX', this.clipX);
    material.setFloat('clipY', this.clipY);
    material.setFloat('clipZ', this.clipZ);
  }

  /**
   * Push the planes onto every material that exists.
   *
   * The sliders are live from the first frame, while the materials are still
   * being fetched; whatever is not there yet reads them back when it is built.
   */
  private pushClipToMaterials(): void {
    forEach(this.materials, (material: BABYLON.ShaderMaterial) => {
      if (material) { this.applyClipTo(material); }
    });
  }

  // ==========================================
  // Outlines and wireframe
  // ==========================================

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
    // The materials are frozen once built; wireframe is a fill mode, not part
    // of the shader, so it may be flipped regardless.
    forEach(this.materials, (material: BABYLON.ShaderMaterial) => {
      if (material) { material.wireframe = this.wireframeOn; }
    });

    // The caps fill the clipped cross-section - in wireframe they would hide the
    // triangles the user asked to see.
    this.capMeshes().forEach(cap => { cap.isVisible = !this.wireframeOn; });

  }

  /** Every mesh currently drawing a back cap. */
  private capMeshes(): BABYLON.Mesh[] {
    const caps: BABYLON.Mesh[] = [];
    if (this.opaqueCap) { caps.push(this.opaqueCap); }
    this.ownMeshes.forEach(own => { if (own.cap) { caps.push(own.cap); } });
    return caps;
  }

  /** Every mesh currently drawing obst geometry the user can see and pick. */
  public pickableMeshes(): BABYLON.Mesh[] {
    const meshes: BABYLON.Mesh[] = [];
    if (this.pool) { meshes.push(...this.pool.meshes); }
    this.ownMeshes.forEach(own => meshes.push(own.solid));
    return meshes;
  }

  /**
   * Flip obst outlines on or off. Held as a flag rather than read back off a
   * mesh, because meshes come and go as obsts are singled out and put back.
   */
  public toggleEdgesRendering(): void {
    this.setEdgesRendering(!this.edgesOn);
  }

  /**
   * Enable or disable edges rendering for every obst mesh.
   *
   * The pools included: Babylon's edges renderer binds world0..world3 off the
   * base mesh and draws one outline per thin instance, so the same call covers
   * ten thousand boxes as it covers one.
   */
  public setEdgesRendering(enabled: boolean): void {
    this.edgesOn = enabled;
    this.applyEdgesToAll();
  }

  private applyEdgesToAll(): void {
    this.pickableMeshes().forEach(mesh => this.applyEdges(mesh, this.sceneBounds.edgeWidth));
  }

  private applyEdges(mesh: BABYLON.Mesh, width: number): void {
    if (this.edgesOn) {
      mesh.enableEdgesRendering();
      mesh.edgesWidth = width;
      mesh.edgesColor = SOLID_EDGE_COLOR;
    } else {
      mesh.disableEdgesRendering();
      mesh.edgesWidth = 0;
    }
  }

}
