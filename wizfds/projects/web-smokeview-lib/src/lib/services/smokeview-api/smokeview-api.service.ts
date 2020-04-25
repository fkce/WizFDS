import { Injectable } from '@angular/core';
import { ObstService } from '../drawing/obst/obst.service';
import { FdsObjectService } from '../fds-object/fds-object.service';
import { IObst, ISurf } from '../drawing/interfaces';

@Injectable({
  providedIn: 'root'
})
export class SmokeviewApiService {

  constructor(
    private obstService: ObstService
  ) { }

  public renderObsts(obsts: IObst[], surfs?: ISurf[]) {
    this.obstService.obsts = obsts;
    this.obstService.surfs = surfs;
    this.obstService.renderObsts();
  }
}
