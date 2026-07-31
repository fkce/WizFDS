import { Injectable, isDevMode } from '@angular/core';
import { ObstService } from '../drawing/obst/obst.service';
import { SceneElementType, SceneHole, SceneInput, SceneObst } from '../drawing/scene-input';
import { applyChange, isEmptyChange, SceneChange, typesIn } from '../drawing/scene-change';
import { HoleService } from '../drawing/hole/hole.service';
import { PickService } from '../picking/pick.service';
import { MeshService } from '../drawing/mesh/mesh.service';
import { OpenService } from '../drawing/open/open.service';
import { VentService } from '../drawing/vent/vent.service';
import { JetfanService } from '../drawing/jetfan/jetfan.service';
import { FireService } from '../drawing/fire/fire.service';
import { DevcService } from '../drawing/devc/devc.service';
import { GeomService } from '../drawing/geom/geom.service';
import { InitService } from '../drawing/init/init.service';
import { ZoneService } from '../drawing/zone/zone.service';
import { HoleRegionService } from '../drawing/hole/hole-region.service';
import { BabylonService } from '../babylon/babylon.service';
import { SceneBoundsService } from '../scene-bounds/scene-bounds.service';
import { SceneViewService } from '../scene-view/scene-view.service';

@Injectable({
  providedIn: 'root'
})
export class SmokeviewApiService {

  /**
   * The scenario as it was last drawn.
   *
   * An incremental update is told what changed and not what the scenario now
   * is, so this is what the change is folded into - see update().
   */
  private scene: SceneInput | null = null;

  /** The update in flight, so the next one waits for it - see update(). */
  private updating: Promise<void> = Promise.resolve();

  constructor(
    private obstService: ObstService,
    private meshService: MeshService,
    private openService: OpenService,
    private ventService: VentService,
    private jetfanService: JetfanService,
    private fireService: FireService,
    private devcService: DevcService,
    private geomService: GeomService,
    private initService: InitService,
    private zoneService: ZoneService,
    private holeRegionService: HoleRegionService,
    private babylonService: BabylonService,
    private sceneBounds: SceneBoundsService,
    private sceneView: SceneViewService,
    // Which obsts an opening cuts is a question about boxes, and this is what
    // answers it - the incremental path has to ask it without cutting anything
    private holeService: HoleService,
    private pickService: PickService
  ) { }

  /**
   * Draw a scenario.
   *
   * One call for the whole scene rather than one per element type: how big the
   * model is has to be settled before anything is drawn, and that is a property
   * of the scenario as a whole. Handing over `SceneInput` also means every
   * element type crosses this boundary the same way - flat, typed and read-only
   * (ADR-0004).
   *
   * The only way in, for both apps that use the library: `wizfds` builds the
   * input from its `Fds` object, and the standalone viewer from a loaded
   * Smokeview export - see SceneInputService and ObstJsonService respectively.
   *
   * The promise settles once everything has been drawn and never rejects: a
   * failed render is logged rather than left to surface as an unhandled
   * rejection in the host app.
   */
  public async render(scene: SceneInput): Promise<void> {
    // Kept so that an incremental update knows what the rest of the scenario
    // is - it is told what changed, not what everything now looks like.
    this.scene = scene;

    // Measure first: the camera, the clip sliders, the edge widths and the world
    // axes are all multiples of how big the model is (ADR-0002). Doing it here
    // rather than in whichever drawing service happened to run first is what
    // makes the answer the same however little the scenario contains.
    this.sceneBounds.setFromScene(scene);
    this.babylonService.applySceneBounds();
    // The section planes are coordinates, so a new model makes nonsense of them
    // - see SceneViewService.resetClipping()
    this.sceneView.resetClipping();

    // The obst service needs both lists together whichever layer is being
    // drawn: a hole is cut out of every obst it overlaps
    this.obstService.obsts = scene.obsts;
    this.obstService.holes = scene.holes;

    for (const layer of this.layers()) {
      await layer.draw(scene);
    }
  }

  /**
   * The layers, in the order they are drawn.
   *
   * One table rather than a run of near-identical statements per entry point:
   * `render()` walks all of it and `update()` walks the part a change touched,
   * so the two cannot disagree about how a layer is drawn - and the order,
   * which is the part with reasons behind it, is stated once.
   *
   * The order is not arbitrary:
   *
   * - the obsts come early, and carry the openings cut out of them;
   * - the condition regions (&INIT, &ZONE) are not matter, so they follow
   *   everything that is. What order they end up drawn in is Babylon's business
   *   - a transparent mesh is sorted by depth, not by when it was awaited;
   * - an opening is drawn last of all: it sits over the obsts it was cut out of
   *   and over any region covering them, so it is the one thing that must not be
   *   hidden by what it belongs to.
   */
  private layers(): ReadonlyArray<{
    type: SceneElementType, draw: (scene: SceneInput) => Promise<void>
  }> {
    return [
      {
        type: 'mesh', draw: async (scene) => {
          this.meshService.meshes = scene.meshes;
          this.meshService.renderMeshes();
        }
      },
      {
        type: 'obst', draw: async (scene) => {
          this.obstService.obsts = scene.obsts;
          this.obstService.holes = scene.holes;
          this.obstService.renderObsts();
        }
      },
      {
        type: 'open', draw: (scene) => {
          this.openService.opens = scene.opens;
          return this.settled('opens', () => this.openService.renderOpens());
        }
      },
      {
        type: 'jetfan', draw: (scene) => {
          this.jetfanService.jetfans = scene.jetfans;
          return this.settled('jetfans', () => this.jetfanService.render());
        }
      },
      {
        type: 'fire', draw: (scene) => {
          this.fireService.fires = scene.fires;
          return this.settled('fires', () => this.fireService.renderFires());
        }
      },
      {
        type: 'vent', draw: (scene) => {
          this.ventService.basicVents = scene.vents;
          return this.settled('vents', () => this.ventService.renderBasicVents());
        }
      },
      {
        type: 'geom', draw: (scene) => {
          this.geomService.geoms = scene.geoms;
          return this.settled('geoms', () => this.geomService.renderGeoms());
        }
      },
      {
        type: 'devc', draw: (scene) => {
          this.devcService.devcs = scene.devcs;
          return this.settled('devices', () => this.devcService.renderDevcs());
        }
      },
      {
        type: 'init', draw: (scene) => {
          this.initService.inits = scene.inits;
          return this.settled('inits', () => this.initService.renderInits());
        }
      },
      {
        type: 'zone', draw: (scene) => {
          this.zoneService.zones = scene.zones;
          return this.settled('zones', () => this.zoneService.renderZones());
        }
      },
      {
        type: 'hole', draw: (scene) => {
          this.holeRegionService.holes = scene.holes;
          return this.settled('holes', () => this.holeRegionService.renderHoles());
        }
      }
    ];
  }

  /**
   * Redraw what changed, and nothing else.
   *
   * The second way in (ADR-0004). `render()` rebuilds both instance pools, cuts
   * every &HOLE out through CSG and builds the shader materials; at ten thousand
   * obsts that is seconds, so a moved wall cannot go through it. The app applied
   * the command itself, so it says what changed and only that is redrawn.
   *
   * What deliberately does **not** happen here:
   *
   * - the scene is not measured again. The camera, the clip ranges and every
   *   width derived from the model's size (ADR-0002) would move under the user
   *   mid-edit, and an editing gesture is the worst moment for that. A model
   *   that has genuinely outgrown its bounds is settled by the next `render()`.
   * - the clipping planes are left where the user put them, for the same reason.
   *
   * Settles once everything is drawn, and never rejects - as `render()` does.
   */
  public update(change: SceneChange): Promise<void> {
    // One at a time, in the order they arrived. Each call folds the change into
    // the scene it kept, and two of them interleaving their awaits - which
    // Ctrl+Z held down will do - would have the second read a scene the first
    // had not finished drawing.
    this.updating = this.updating.then(() => this.applyUpdate(change));
    return this.updating;
  }

  private async applyUpdate(change: SceneChange): Promise<void> {
    // Nothing has been drawn yet, so there is nothing to change - the app is
    // still waiting for the scene, and the full render is on its way
    if (!this.scene || isEmptyChange(change)) { return; }

    const previous = this.scene;
    const scene = applyChange(previous, change);
    this.scene = scene;
    const types = typesIn(change);

    // Both lists, always: the obsts are drawn from the openings that cut them,
    // and either list may have moved under the other.
    this.obstService.obsts = scene.obsts;
    this.obstService.holes = scene.holes;

    // The pooled layer is the one with a per-element path; everything else is
    // redrawn from its own list, which is tens of elements rather than the ten
    // thousand obsts that path exists for (ADR-0006).
    if (types.indexOf('obst') !== -1) { this.redrawObsts(change); }

    // An opening changes the obsts it has left as well as the ones it has
    // reached, so both sides of the move are recut.
    if (types.indexOf('hole') !== -1) { this.recutObstsAround(previous, change); }

    for (const layer of this.layers()) {
      if (layer.type === 'obst' || types.indexOf(layer.type) === -1) { continue; }
      await layer.draw(scene);
    }

    // The outline sits at the box the element occupied when it was selected, so
    // anything that moved would leave its highlight behind.
    this.pickService.redrawSelection();
  }

  /** Apply the obst part of a change, one element at a time. */
  private redrawObsts(change: SceneChange): void {
    (change.removed ?? [])
      .filter(gone => gone.type === 'obst')
      .forEach(gone => this.obstService.removeObst(gone.uuid));

    [...(change.changed ?? []), ...(change.added ?? [])]
      .filter(drawn => drawn.type === 'obst')
      .forEach(drawn => this.obstService.redrawObst(drawn.element as SceneObst));
  }

  /**
   * Cut the openings out of the obsts an opening has touched.
   *
   * Both where it was and where it is now: a doorway dragged from one wall to
   * the next has to close behind it as well as open in front of it. Which obsts
   * those are is a question about boxes, and HoleService is what answers it.
   */
  private recutObstsAround(previous: SceneInput, change: SceneChange): void {
    const touched: SceneHole[] = [];

    [...(change.changed ?? []), ...(change.added ?? [])]
      .filter(drawn => drawn.type === 'hole')
      .forEach(drawn => touched.push(drawn.element as SceneHole));

    // Where they stood before, which is the half of the move the new state
    // cannot say anything about
    const gone = new Set((change.removed ?? [])
      .filter(removed => removed.type === 'hole').map(removed => removed.uuid));
    const moved = new Set(touched.map(hole => hole.uuid));
    previous.holes
      .filter(hole => gone.has(hole.uuid) || moved.has(hole.uuid))
      .forEach(hole => touched.push(hole));

    const affected = this.scene.obsts.filter(obst =>
      touched.some(hole => this.holeService.holeIntersectsObst(hole, obst)));

    affected.forEach(obst => this.obstService.redrawObst(obst));
  }

  /** Run one drawing step, keeping a failure from taking the rest down with it. */
  private async settled(what: string, render: () => Promise<void>): Promise<void> {
    try {
      await render();
    } catch (e) {
      if (isDevMode()) { try { console.error(`[SmokeviewApi] Failed to render ${what}`, e); } catch { } }
    }
  }
}
