import { Injectable, isDevMode } from '@angular/core';
import { ObstService } from '../drawing/obst/obst.service';
import { SceneInput } from '../drawing/scene-input';
import { MeshService } from '../drawing/mesh/mesh.service';
import { OpenService } from '../drawing/open/open.service';
import { VentService } from '../drawing/vent/vent.service';
import { JetfanService } from '../drawing/jetfan/jetfan.service';
import { FireService } from '../drawing/fire/fire.service';
import { DevcService } from '../drawing/devc/devc.service';
import { GeomService } from '../drawing/geom/geom.service';
import { BabylonService } from '../babylon/babylon.service';
import { SceneBoundsService } from '../scene-bounds/scene-bounds.service';

@Injectable({
  providedIn: 'root'
})
export class SmokeviewApiService {

  constructor(
    private obstService: ObstService,
    private meshService: MeshService,
    private openService: OpenService,
    private ventService: VentService,
    private jetfanService: JetfanService,
    private fireService: FireService,
    private devcService: DevcService,
    private geomService: GeomService,
    private babylonService: BabylonService,
    private sceneBounds: SceneBoundsService
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
    // Measure first: the camera, the clip sliders, the edge widths and the world
    // axes are all multiples of how big the model is (ADR-0002). Doing it here
    // rather than in whichever drawing service happened to run first is what
    // makes the answer the same however little the scenario contains.
    this.sceneBounds.setFromScene(scene);
    this.babylonService.applySceneBounds();
    this.resetClipping();

    this.meshService.meshes = scene.meshes;
    this.meshService.renderMeshes();

    // Holes are not drawn in their own right - they are cut out of the obsts
    // they overlap, so the obst service needs both lists together.
    this.obstService.obsts = scene.obsts;
    this.obstService.holes = scene.holes;
    this.obstService.renderObsts();

    this.openService.opens = scene.opens;
    await this.settled('opens', () => this.openService.renderOpens());

    this.jetfanService.jetfans = scene.jetfans;
    await this.settled('jetfans', () => this.jetfanService.render());

    this.fireService.fires = scene.fires;
    await this.settled('fires', () => this.fireService.renderFires());

    this.ventService.basicVents = scene.vents;
    await this.settled('vents', () => this.ventService.renderBasicVents());

    this.geomService.geoms = scene.geoms;
    await this.settled('geoms', () => this.geomService.renderGeoms());

    this.devcService.devcs = scene.devcs;
    await this.settled('devices', () => this.devcService.renderDevcs());
  }

  /**
   * Pull every clip slider back to showing the whole model.
   *
   * The planes are coordinates in metres (ADR-0002), so they mean nothing once
   * the model changes: z = 4 m is the ceiling of a room and the floor of a
   * tunnel. Drawing a scenario is the moment that can happen.
   */
  private resetClipping(): void {
    this.obstService.resetClipping();
    this.fireService.resetClipping();
    this.ventService.resetClipping();
    this.jetfanService.resetClipping();
    this.openService.resetClipping();
    this.devcService.resetClipping();
    this.geomService.resetClipping();
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
