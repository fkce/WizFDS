import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { HoleService } from './hole.service';
import { SceneHole, SceneObst, SceneXb } from '../scene-input';

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
const wallXb: SceneXb = { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 };

function makeObst(xb: SceneXb, id: string = 'OBST_WALL'): SceneObst {
  return {
    id: id,
    uuid: `${id}-uuid`,
    xb: xb,
    surfId: 'SURF_1',
    permitHole: true,
    color: { r: 1, g: 208 / 255, b: 0, a: 1 }
  };
}

function makeHole(xb: SceneXb, id: string = 'HOLE_DOOR'): SceneHole {
  return {
    id: id,
    uuid: `${id}-uuid`,
    xb: xb,
    color: { r: 0.59, g: 0.9, b: 0.27, a: 0.35 }
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

  describe('holesFor', () => {
    // Matching used to be done by writing a `holes` array onto the obst itself -
    // a field the FDS model does not have, on an object owned by the app.

    it('gives back the doorway that cuts clean through a wall', () => {
      const doorway = makeHole({ x1: 1.0, x2: 2.0, y1: 1.9, y2: 2.3, z1: 0.0, z2: 2.1 }, 'DOOR');

      expect(service.holesFor(makeObst(wallXb), [doorway])).toEqual([doorway]);
    });

    it('leaves out an opening that lands somewhere else', () => {
      const elsewhere = makeHole({ x1: 5.0, x2: 6.0, y1: 1.9, y2: 2.3, z1: 0.0, z2: 2.1 }, 'FAR');

      expect(service.holesFor(makeObst(wallXb), [elsewhere])).toEqual([]);
    });

    it('gives the same opening to every wall it crosses', () => {
      // A &HOLE belongs to no obst in particular - it is a box, and everything it
      // overlaps gets cut.
      const crossing = makeHole({ x1: 1.0, x2: 2.0, y1: 0.0, y2: 5.0, z1: 0.0, z2: 2.1 }, 'PASSAGE');
      const near = makeObst(wallXb, 'NEAR');
      const far = makeObst({ x1: 0.0, x2: 4.0, y1: 4.0, y2: 4.2, z1: 0.0, z2: 3.0 }, 'FAR_WALL');

      expect(service.holesFor(near, [crossing])).toEqual([crossing]);
      expect(service.holesFor(far, [crossing])).toEqual([crossing]);
    });

    it('still reports an opening on an obst that forbids holes', () => {
      // Whether the opening is actually cut is the caller's call - it logs the
      // refusal, so it has to be told there was something to refuse.
      const sealed: SceneObst = { ...makeObst(wallXb), permitHole: false };
      const doorway = makeHole({ x1: 1.0, x2: 2.0, y1: 1.9, y2: 2.3, z1: 0.0, z2: 2.1 }, 'DOOR');

      expect(service.holesFor(sealed, [doorway])).toEqual([doorway]);
      expect(service.canHaveHoles(sealed)).toBe(false);
    });

    it('copes with a scenario that has no openings at all', () => {
      expect(service.holesFor(makeObst(wallXb), [])).toEqual([]);
      expect(service.holesFor(makeObst(wallXb), undefined)).toEqual([]);
    });
  });

  describe('cutHoles', () => {
    let engine: BABYLON.NullEngine;
    let scene: BABYLON.Scene;

    // Wall 4 x 0.2 x 3 m  ->  2.4 m3
    // Doorway 1 m wide, 2.1 m high, straight through the full 0.2 m thickness,
    // so the two solids share their y faces exactly. Removed: 1 * 0.2 * 2.1 = 0.42 m3.
    // What must remain: 2.4 - 0.42 = 1.98 m3.
    const WALL_VOLUME = 2.4;
    const DOORWAY_VOLUME = 0.42;

    /** The doorway written so that it overhangs the wall on both faces. */
    const doorwayXb: SceneXb = { x1: 1.0, x2: 2.0, y1: 1.9, y2: 2.3, z1: 0.0, z2: 2.1 };

    beforeAll(async () => {
      // Manifold is served from assets/manifold, never from a CDN - see
      // BabylonService.initializeCsg2().
      await BABYLON.InitializeCSG2Async({ manifoldUrl: '/assets/manifold' });
    });

    beforeEach(() => {
      engine = new BABYLON.NullEngine();
      scene = new BABYLON.Scene(engine);
    });

    afterEach(() => {
      scene.dispose();
      engine.dispose();
    });

    it('has the CSG2 backend ready', () => {
      expect(BABYLON.IsCSG2Ready()).toBe(true);
    });

    it('cuts a doorway whose faces are coplanar with the wall', () => {
      const mesh = service.cutHoles('WALL', wallXb, [doorwayXb], scene);

      expect(mesh).withContext('an obst carrying a hole must produce a mesh').toBeTruthy();
      expect(meshVolume(mesh)).toBeCloseTo(WALL_VOLUME - DOORWAY_VOLUME, 3);
    });

    it('cuts a doorway written flush with the wall thickness', () => {
      // The same doorway, but written with exactly the wall's own y bounds -
      // an ordinary way to write it, and the case where both solids share two
      // whole faces rather than merely crossing.
      const flush: SceneXb = { x1: 1.0, x2: 2.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 2.1 };

      const mesh = service.cutHoles('WALL', wallXb, [flush], scene);

      expect(mesh).toBeTruthy();
      expect(meshVolume(mesh)).toBeCloseTo(WALL_VOLUME - DOORWAY_VOLUME, 3);
    });

    it('leaves the cut mesh standing where the wall is', () => {
      // The cut geometry has to stay put. CSG2.toMesh() centres the result on
      // the origin unless told otherwise, which would teleport every obst
      // carrying a hole into the middle of the scene.
      const mesh = service.cutHoles('WALL', wallXb, [doorwayXb], scene);
      mesh.refreshBoundingInfo();
      const box = mesh.getBoundingInfo().boundingBox;

      expect(box.minimumWorld.x).toBeCloseTo(0.0, 3);
      expect(box.maximumWorld.x).toBeCloseTo(4.0, 3);
      expect(box.minimumWorld.y).toBeCloseTo(2.0, 3);
      expect(box.maximumWorld.y).toBeCloseTo(2.2, 3);
      expect(box.minimumWorld.z).toBeCloseTo(0.0, 3);
      expect(box.maximumWorld.z).toBeCloseTo(3.0, 3);
    });

    it('falls back to standard rendering when the CSG2 backend is unavailable', () => {
      // Manifold failing to load must cost the openings, not the whole scene.
      spyOn(service, 'isCsgReady').and.returnValue(false);

      expect(service.cutHoles('WALL', wallXb, [doorwayXb], scene)).toBeNull();
    });

    it('leaves an obst without holes to the standard rendering path', () => {
      expect(service.cutHoles('WALL', wallXb, [], scene)).toBeNull();
    });
  });
});
