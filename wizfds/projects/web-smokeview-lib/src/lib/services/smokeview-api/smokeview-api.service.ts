import { Injectable, isDevMode } from '@angular/core';
import { ObstService } from '../drawing/obst/obst.service';
import { IObst, ISurf, IMesh, IOpen, IVent, IJetFan, IHole, IFire } from '../drawing/interfaces';
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

  public renderObsts(obsts: IObst[], surfs?: ISurf[]) {
    this.obstService.obsts = obsts;
    this.obstService.surfs = surfs;
    this.obstService.renderObsts();
  }

  public renderHoles(holes: IHole[]) {
    this.obstService.holes = holes;
  }

  public renderJsonObsts(data: any) {
    this.obstService.renderJson(data);
  }

  public renderMeshes(meshes: IMesh[]) {
    this.meshService.meshes = meshes;
    this.meshService.renderMeshes();
  }

  public renderOpens(opens: IOpen[]) {
    this.openService.opens = opens;
    this.openService.renderOpens();
  }

  public renderJetfans(jetfans: any[]) {
    //this.jetfanService.jetfans = jetfans;
    this.jetfanService.renderJetfans(jetfans);
  }

  public renderWizJetfans(jetfans: any[]) {
    this.jetfanService.renderJetfans(jetfans);
  }

  /**
   * Fires and basic vents render asynchronously. The returned promise settles
   * once the render has finished, and never rejects: a failed render is logged
   * rather than left to surface as an unhandled rejection in the host app.
   */
  public async renderFires(fires: IFire[]): Promise<void> {
    this.fireService.fires = fires;
    try {
      await this.fireService.renderFires();
    } catch (e) {
      if (isDevMode()) { try { console.error('[SmokeviewApi] Failed to render fires', e); } catch { } }
    }
  }

  public async renderVents(vents: IVent[]): Promise<void> {
    this.ventService.basicVents = vents;
    try {
      await this.ventService.renderBasicVents();
    } catch (e) {
      if (isDevMode()) { try { console.error('[SmokeviewApi] Failed to render basic vents', e); } catch { } }
    }
  }
}