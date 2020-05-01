import { Injectable } from '@angular/core';
import { ObstService } from '../drawing/obst/obst.service';
import { IObst, ISurf, IMesh, IOpen } from '../drawing/interfaces';
import { MeshService } from '../drawing/mesh/mesh.service';
import { OpenService } from '../drawing/open/open.service';

@Injectable({
  providedIn: 'root'
})
export class SmokeviewApiService {

  constructor(
    private obstService: ObstService,
    private meshService: MeshService,
    private openService: OpenService
  ) { }

  public renderJsonObsts(data: any) {
    this.obstService.renderJson(data);
  }

  public renderWizObsts(obsts: IObst[], surfs?: ISurf[]) {

  }

  public renderObsts(obsts: IObst[], surfs?: ISurf[]) {
    this.obstService.obsts = obsts;
    this.obstService.surfs = surfs;
    this.obstService.renderObsts();
  }

  public renderMeshes(meshes: IMesh[]) {
    this.meshService.meshes = meshes;
    this.meshService.renderMeshes();
  }

  public renderOpens(opens: IOpen[]) {
    this.openService.opens = opens;
    this.openService.renderOpens();
  }
}
