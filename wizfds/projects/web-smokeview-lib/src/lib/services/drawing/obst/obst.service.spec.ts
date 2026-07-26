import { TestBed } from '@angular/core/testing';

import { ObstService } from './obst.service';
import { IHole, IObst, IXb } from '../interfaces';

function makeObst(id: string, xb: IXb): IObst {
  return {
    id: id,
    uuid: `${id}-uuid`,
    idAC: 1,
    xb: xb,
    surf: { surf_id: { id: 'SURF_1' } },
    elevation: 0,
    thicken: false,
    overlay: true,
    permit_hole: true,
    removable: true,
    ctrl_id: '',
    devc_id: '',
    // Deliberately left un-normalized: holes are assigned before normalizeObsts() runs
    vis: { xbNorm: { x1: 0, x2: 0, y1: 0, y2: 0, z1: 0, z2: 0 }, colorNorm: [1, 1, 1, 1] }
  };
}

function makeHole(id: string, xb: IXb): IHole {
  return {
    id: id,
    uuid: `${id}-uuid`,
    idAC: 2,
    xb: xb,
    vis: { xbNorm: { x1: 0, x2: 0, y1: 0, y2: 0, z1: 0, z2: 0 }, colorNorm: [1, 1, 1, 1] }
  };
}

describe('ObstService', () => {
  let service: ObstService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ObstService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('assignHolesToObsts', () => {
    it('assigns a doorway cut clean through a wall to that wall', () => {
      // &OBST XB=0.0,4.0,2.0,2.2,0.0,3.0 - a 0.2 m thick wall along the X axis
      const wall = makeObst('WALL', { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 });
      // &HOLE XB=1.0,2.0,1.9,2.3,0.0,2.1 - a door punched through the full wall
      // thickness, overhanging it by 0.1 m on each face
      const doorway = makeHole('DOOR', { x1: 1.0, x2: 2.0, y1: 1.9, y2: 2.3, z1: 0.0, z2: 2.1 });

      service.obsts = [wall];
      service.holes = [doorway];

      service.assignHolesToObsts();

      expect(wall.holes).toEqual([doorway]);
    });
  });
});
