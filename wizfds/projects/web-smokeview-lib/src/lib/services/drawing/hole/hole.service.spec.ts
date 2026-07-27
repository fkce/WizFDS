import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { HoleService } from './hole.service';
import { IHole, IObst, IXb } from '../interfaces';

/**
 * Signed volume of a closed triangle mesh, via the divergence theorem. An
 * independent yardstick: it knows nothing about how the mesh was built, so it
 * can disagree with the CSG implementation.
 */
function meshVolume(mesh: BABYLON.Mesh): number {
  const p = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  const idx = mesh.getIndices();
  let v = 0;
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    v += (
      p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) -
      p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) +
      p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])
    ) / 6;
  }
  return Math.abs(v);
}

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

  describe('processObstWithHoles', () => {
    let engine: BABYLON.NullEngine;
    let scene: BABYLON.Scene;

    // Wall 4 x 0.2 x 3 m  ->  2.4 m3
    // Doorway 1 m wide, 2.1 m high, straight through the full 0.2 m thickness,
    // so the two solids share their y faces exactly. Removed: 1 * 0.2 * 2.1 = 0.42 m3.
    // What must remain: 2.4 - 0.42 = 1.98 m3.
    const WALL_VOLUME = 2.4;
    const DOORWAY_VOLUME = 0.42;

    function wallWithDoorway(): IObst {
      const wall = makeObst(wallXb);
      wall.vis.xbNorm = { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 };
      const doorway = makeHole({ x1: 1.0, x2: 2.0, y1: 1.9, y2: 2.3, z1: 0.0, z2: 2.1 });
      doorway.vis.xbNorm = { x1: 1.0, x2: 2.0, y1: 1.9, y2: 2.3, z1: 0.0, z2: 2.1 };
      wall.holes = [doorway];
      return wall;
    }

    beforeEach(() => {
      engine = new BABYLON.NullEngine();
      scene = new BABYLON.Scene(engine);
    });

    afterEach(() => {
      scene.dispose();
      engine.dispose();
    });

    it('cuts a doorway whose faces are coplanar with the wall', () => {
      const mesh = service.processObstWithHoles(wallWithDoorway(), scene);

      expect(mesh).withContext('an obst carrying a hole must produce a mesh').toBeTruthy();
      expect(meshVolume(mesh)).toBeCloseTo(WALL_VOLUME - DOORWAY_VOLUME, 3);
    });

    it('cuts a doorway written flush with the wall thickness', () => {
      // The same doorway, but written with exactly the wall's own y bounds -
      // an ordinary way to write it, and the case where both solids share two
      // whole faces rather than merely crossing.
      const wall = makeObst(wallXb);
      wall.vis.xbNorm = { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 };
      const doorway = makeHole({ x1: 1.0, x2: 2.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 2.1 });
      doorway.vis.xbNorm = { x1: 1.0, x2: 2.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 2.1 };
      wall.holes = [doorway];

      const mesh = service.processObstWithHoles(wall, scene);

      expect(mesh).toBeTruthy();
      expect(meshVolume(mesh)).toBeCloseTo(WALL_VOLUME - DOORWAY_VOLUME, 3);
    });

    it('leaves an obst without holes to the standard rendering path', () => {
      const wall = makeObst(wallXb);
      wall.holes = [];

      expect(service.processObstWithHoles(wall, scene)).toBeNull();
    });
  });
});
