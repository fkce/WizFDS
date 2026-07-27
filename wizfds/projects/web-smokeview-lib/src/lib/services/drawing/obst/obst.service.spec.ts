import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { ObstService } from './obst.service';
import { BabylonService } from '../../babylon/babylon.service';
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

/**
 * Signed volume of the triangle soup. Its sign encodes the winding: the back cap
 * draws only one facing, so geometry wound the other way shows its outside faces
 * painted red instead of capping the cut.
 */
function signedVolume(positions: ArrayLike<number>, indices: ArrayLike<number>): number {
  let v = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
    v += (
      positions[a] * (positions[b + 1] * positions[c + 2] - positions[b + 2] * positions[c + 1]) -
      positions[a + 1] * (positions[b] * positions[c + 2] - positions[b + 2] * positions[c]) +
      positions[a + 2] * (positions[b] * positions[c + 1] - positions[b + 1] * positions[c])
    ) / 6;
  }
  return v;
}

describe('ObstService', () => {
  let service: ObstService;
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;

  beforeEach(() => {
    // A headless engine is enough: the back cap is a mesh, and CSG runs on the CPU.
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);

    TestBed.configureTestingModule({
      providers: [{
        provide: BabylonService,
        useValue: {
          scene: scene,
          camera: { setPosition: () => { }, setTarget: () => { } },
          // No shader assets are served in the suite, and NullEngine compiles no
          // WGSL. Both are treated as non-fatal by the drawing services, so the
          // meshes are still built - which is what these tests are about.
          loadShaderSources: () => Promise.reject(new Error('no shader assets under test')),
          createShaderMaterial: () => Promise.reject(new Error('no shader assets under test'))
        }
      }]
    });
    service = TestBed.inject(ObstService);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
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

  describe('vertex normals', () => {
    const opaqueSurf = { id: 'SURF_1', color: { rgb: [255, 208, 0] }, transparency: 1 };

    it('computes a unit normal for every vertex of every obst', () => {
      // Three walls so that per-obst normals cannot be confused with each other
      service.obsts = [
        makeObst('W1', { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 }),
        makeObst('W2', { x1: 0.0, x2: 0.2, y1: 0.0, y2: 4.0, z1: 0.0, z2: 3.0 }),
        makeObst('W3', { x1: 6.0, x2: 8.0, y1: 6.0, y2: 6.2, z1: 0.0, z2: 2.5 })
      ];
      service.holes = [];
      service.surfs = [opaqueSurf];

      service.renderObsts();

      expect(service.normals.length).toBe(service.vertices.length);

      const lengths = [];
      for (let i = 0; i < service.normals.length; i += 3) {
        lengths.push(Math.hypot(service.normals[i], service.normals[i + 1], service.normals[i + 2]));
      }
      expect(lengths.length).toBe(3 * 24);
      lengths.forEach((len, i) => {
        expect(len).withContext(`normal ${i} must be a unit vector, got ${len}`).toBeCloseTo(1, 5);
      });
    });
  });

  describe('triangle winding', () => {
    const opaqueSurf = { id: 'SURF_1', color: { rgb: [255, 208, 0] }, transparency: 1 };
    const wallXb = { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 };

    beforeAll(async () => {
      // Without the CSG backend the hole is skipped and the obst is drawn solid,
      // so this test would compare a plain box against another plain box.
      await BABYLON.InitializeCSG2Async({ manifoldUrl: '/assets/manifold' });
    });

    it('winds obsts carrying a hole the same way as plain ones', () => {
      // The whole opaque buffer feeds one back-cap mesh with one material, so a
      // mixed winding shows up as red exterior walls on the obsts with openings.
      service.obsts = [makeObst('PLAIN', wallXb)];
      service.holes = [];
      service.surfs = [opaqueSurf];
      service.renderObsts();
      const plain = signedVolume(service.vertices, service.indices);

      service.obsts = [makeObst('WITH_HOLE', wallXb)];
      service.holes = [makeHole('DOOR', { x1: 1.0, x2: 2.0, y1: 1.9, y2: 2.3, z1: 0.0, z2: 2.1 })];
      service.surfs = [opaqueSurf];
      service.renderObsts();
      const cut = signedVolume(service.vertices, service.indices);

      expect(Math.abs(plain)).toBeGreaterThan(0);
      expect(Math.abs(cut)).toBeGreaterThan(0);
      expect(Math.sign(cut))
        .withContext(`plain ${plain.toFixed(4)} vs cut ${cut.toFixed(4)} - opposite signs mean opposite winding`)
        .toBe(Math.sign(plain));
    });

    /** Share of triangles whose vertex normal sits on the same side as their winding. */
    function normalWindingAgreement(): number {
      const p = service.vertices, n = service.normals, idx = service.indices;
      let agreeing = 0, counted = 0;
      for (let i = 0; i < idx.length; i += 3) {
        const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
        const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
        const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
        const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
        if (fx === 0 && fy === 0 && fz === 0) { continue; }
        counted++;
        if (fx * n[a] + fy * n[a + 1] + fz * n[a + 2] >= 0) { agreeing++; }
      }
      return counted === 0 ? -1 : agreeing / counted;
    }

    it('relates normals to winding on a cut obst exactly as on a plain one', () => {
      // obst.fragment.wgsl lights the surface with max(dot(normal, lightDir), 0)
      // over a 0.5 ambient floor, so a normal on the wrong side of its triangle
      // kills the diffuse term and the obst renders visibly darker than its
      // neighbours. What matters is that both paths agree - the absolute sign is
      // whatever VertexData.ComputeNormals settles on.
      service.obsts = [makeObst('PLAIN', wallXb)];
      service.holes = [];
      service.surfs = [opaqueSurf];
      service.renderObsts();
      const plain = normalWindingAgreement();

      service.obsts = [makeObst('WITH_HOLE', wallXb)];
      service.holes = [makeHole('DOOR', { x1: 1.0, x2: 2.0, y1: 1.9, y2: 2.3, z1: 0.0, z2: 2.1 })];
      service.surfs = [opaqueSurf];
      service.renderObsts();
      const cut = normalWindingAgreement();

      expect(plain).toBeGreaterThanOrEqual(0);
      expect(cut)
        .withContext(`plain obst ${(plain * 100).toFixed(0)}% of triangles agree, cut obst ${(cut * 100).toFixed(0)}%`)
        .toBeCloseTo(plain, 6);
    });
  });

  describe('clipping back cap', () => {
    const opaqueSurf = { id: 'SURF_1', color: { rgb: [255, 208, 0] }, transparency: 1 };

    it('builds the back cap for a plain wall', () => {
      service.obsts = [makeObst('WALL', { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 })];
      service.holes = [];
      service.surfs = [opaqueSurf];

      service.renderObsts();

      expect(service.meshBackCap).toBeTruthy();
    });

    it('builds the back cap for a wall that has a doorway cut out of it', () => {
      // Without the back cap the clipped cross-section renders hollow instead of
      // solid red - and the cap is switched off for the whole scene, not just
      // for the wall carrying the hole.
      const wall = makeObst('WALL', { x1: 0.0, x2: 4.0, y1: 2.0, y2: 2.2, z1: 0.0, z2: 3.0 });
      service.obsts = [wall];
      service.holes = [makeHole('DOOR', { x1: 1.0, x2: 2.0, y1: 1.9, y2: 2.3, z1: 0.0, z2: 2.1 })];
      service.surfs = [opaqueSurf];

      service.renderObsts();

      expect(wall.holes.length).withContext('the doorway must reach the wall').toBe(1);
      expect(service.meshBackCap).toBeTruthy();
    });
  });
});
