import { Injectable, isDevMode } from '@angular/core';
import { ObstService } from '../drawing/obst/obst.service';
import { SceneInput } from '../drawing/scene-input';
import { MeshService } from '../drawing/mesh/mesh.service';
import { OpenService } from '../drawing/open/open.service';
import { VentService } from '../drawing/vent/vent.service';
import { JetfanService } from '../drawing/jetfan/jetfan.service';
import { FireService } from '../drawing/fire/fire.service';

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
    private fireService: FireService
  ) { }

  /**
   * Draw a scenario.
   *
   * One call for the whole scene rather than one per element type: the drawing
   * services share the normalisation the meshes establish, so the order below is
   * part of the contract and not something a caller should have to know. Handing
   * over `SceneInput` also means every element type crosses this boundary the
   * same way - flat, typed and read-only (ADR-0004).
   *
   * The promise settles once everything has been drawn and never rejects: a
   * failed render is logged rather than left to surface as an unhandled
   * rejection in the host app.
   */
  public async render(scene: SceneInput): Promise<void> {
    // The meshes span the whole model, so they are what the scene bounds are
    // taken from. Everything after this is placed against those bounds.
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
   * it has no scenario to hand over - see ADR-0004.
   */
  public renderJsonObsts(data: any) {
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
