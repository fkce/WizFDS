import { TestBed } from '@angular/core/testing';

import { HoleService } from './hole.service';
import { IHole, IObst, IXb } from '../interfaces';

/**
 * A wall 4 m long, 0.2 m thick, 3 m high, running along the X axis.
 * In FDS terms: &OBST XB=0.0,4.0,2.0,2.2,0.0,3.0
 */
const wallXb: IXb = { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 };

function makeObst(xb: IXb): IObst {
  return {
    id: 'OBST_WALL',
    uuid: 'obst-uuid',
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
    // Deliberately left un-normalized: assignment happens before normalizeObsts()
    vis: { xbNorm: { x1: 0, x2: 0, y1: 0, y2: 0, z1: 0, z2: 0 }, colorNorm: [1, 1, 1, 1] }
  };
}

function makeHole(xb: IXb): IHole {
  return {
    id: 'HOLE_DOOR',
    uuid: 'hole-uuid',
    idAC: 2,
    xb: xb,
    vis: { xbNorm: { x1: 0, x2: 0, y1: 0, y2: 0, z1: 0, z2: 0 }, colorNorm: [1, 1, 1, 1] }
  };
}

describe('HoleService', () => {
  let service: HoleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HoleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('holeIntersectsObst', () => {
    it('detects a doorway cut clean through the wall, overhanging it on both sides', () => {
      // A door 1 m wide, 2.1 m high, punched through the full 0.2 m wall thickness
      // and reaching 0.1 m past each face - the ordinary way of writing a &HOLE.
      const doorway = makeHole({ x1: 1.0, x2: 2.0, y1: 1.9, y2: 2.3, z1: 0.0, z2: 2.1 });

      expect(service.holeIntersectsObst(doorway, makeObst(wallXb))).toBe(true);
    });

    it('detects a hole fully contained in the wall', () => {
      const window = makeHole({ x1: 1.0, x2: 2.0, y1: 2.05, y2: 2.15, z1: 1.0, z2: 2.0 });

      expect(service.holeIntersectsObst(window, makeObst(wallXb))).toBe(true);
    });

    it('rejects a hole that misses the wall along its length', () => {
      // Same thickness and height as the doorway, but placed past the x2 end of the wall
      const elsewhere = makeHole({ x1: 5.0, x2: 6.0, y1: 1.9, y2: 2.3, z1: 0.0, z2: 2.1 });

      expect(service.holeIntersectsObst(elsewhere, makeObst(wallXb))).toBe(false);
    });

    it('rejects a hole that misses the wall in height', () => {
      // Sits directly above the 3 m wall - shares a plane, no volume
      const aboveWall = makeHole({ x1: 1.0, x2: 2.0, y1: 1.9, y2: 2.3, z1: 3.0, z2: 4.0 });

      expect(service.holeIntersectsObst(aboveWall, makeObst(wallXb))).toBe(false);
    });

    it('rejects a hole that only touches the wall face', () => {
      // Ends exactly on y1 = 2.0, the near face of the wall: zero shared volume, nothing to cut
      const flushAgainstWall = makeHole({ x1: 1.0, x2: 2.0, y1: 1.8, y2: 2.0, z1: 0.0, z2: 2.1 });

      expect(service.holeIntersectsObst(flushAgainstWall, makeObst(wallXb))).toBe(false);
    });

    it('returns false when either element has no coordinates', () => {
      const doorway = makeHole({ x1: 1.0, x2: 2.0, y1: 1.9, y2: 2.3, z1: 0.0, z2: 2.1 });
      const holeWithoutXb = makeHole(undefined);
      const obstWithoutXb = makeObst(undefined);

      expect(service.holeIntersectsObst(holeWithoutXb, makeObst(wallXb))).toBe(false);
      expect(service.holeIntersectsObst(doorway, obstWithoutXb)).toBe(false);
    });
  });
});
