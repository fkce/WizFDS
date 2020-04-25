import { Injectable } from '@angular/core';
import { ObstService } from '../drawing/obst/obst.service';
import { FdsObjectService } from '../fds-object/fds-object.service';
import { IObst, ISurf, IMesh } from '../drawing/interfaces';
import { MeshService } from '../drawing/mesh/mesh.service';

@Injectable({
  providedIn: 'root'
})
export class SmokeviewApiService {

  constructor(
    private obstService: ObstService,
    private meshService: MeshService
  ) { }

  public renderObsts(obsts: IObst[], surfs?: ISurf[]) {
    this.obstService.obsts = obsts;
    this.obstService.surfs = surfs;
    this.obstService.renderObsts();
  }

  public renderMeshes(meshes: IMesh[]) {
    this.meshService.meshes = meshes;
    this.meshService.renderMeshes();
  }
}
