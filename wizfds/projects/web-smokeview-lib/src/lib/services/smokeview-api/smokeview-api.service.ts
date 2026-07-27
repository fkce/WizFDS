import { Injectable, isDevMode } from '@angular/core';
import { ObstService } from '../drawing/obst/obst.service';
import { SceneInput } from '../drawing/scene-input';
import { MeshService } from '../drawing/mesh/mesh.service';
import { OpenService } from '../drawing/open/open.service';
import { VentService } from '../drawing/vent/vent.service';
import { JetfanService } from '../drawing/jetfan/jetfan.service';
import { FireService } from '../drawing/fire/fire.service';
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

    this.meshService.meshes = scene.meshes;
    this.meshService.renderMeshes();

    // Holes are not drawn in their own right - they are cut out of the obsts
    // they overlap, so the obst service needs both lists together.
    this.obstService.obsts = scene.obsts;
    this.obstService.holes = scene.holes;
    this.obstService.renderObsts();

    this.openService.opens = scene.opens;
    this.openService.renderOpens();

    this.jetfanService.jetfans = scene.jetfans;
    await this.settled('jetfans', () => this.jetfanService.render());

    this.fireService.fires = scene.fires;
    await this.settled('fires', () => this.fireService.renderFires());

    this.ventService.basicVents = scene.vents;
    await this.settled('vents', () => this.ventService.renderBasicVents());
  }

  /**
   * Draw obsts from a pre-built vertex buffer.
   *
   * The standalone viewer reads geometry straight out of a Smokeview export, so
   * it has no scenario to hand over - see ADR-0004. The buffer is what the model
   * is measured from instead.
   */
  public renderJsonObsts(data: any) {
    this.sceneBounds.setFromPositions((data && data.vertices) || []);
    this.babylonService.applySceneBounds();
    this.obstService.renderJson(data);
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
