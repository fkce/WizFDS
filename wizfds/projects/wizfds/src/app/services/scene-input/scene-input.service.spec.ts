import { TestBed } from '@angular/core/testing';

import { SceneInputService } from './scene-input.service';
import { Fds } from '@services/fds-object/fds-object';
import { deepSnapshot } from '../../../testing/deep-snapshot';
import { scenarioJson } from '../../../testing/scenario-fixture';

describe('SceneInputService', () => {
  let service: SceneInputService;
  let fds: Fds;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SceneInputService);
    fds = new Fds(JSON.stringify(scenarioJson()));
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('fromFds', () => {
    it('carries every element type across, keyed by uuid', () => {
      const scene = service.fromFds(fds);

      expect(scene.meshes.map(m => m.uuid)).toEqual(['mesh-uuid']);
      expect(scene.obsts.map(o => o.uuid)).toEqual(['w1-uuid', 'w2-uuid']);
      expect(scene.holes.map(h => h.uuid)).toEqual(['door-uuid']);
      expect(scene.opens.map(o => o.uuid)).toEqual(['open-uuid']);
      expect(scene.vents.map(v => v.uuid)).toEqual(['v1-uuid']);
      expect(scene.fires.map(f => f.uuid)).toEqual(['f1-uuid']);
      expect(scene.jetfans.map(j => j.uuid)).toEqual(['jf1-uuid']);
    });

    it('copies the coordinates instead of handing out the model Xb', () => {
      // The library used to receive the domain object by reference and write
      // into it - see ADR-0004.
      const scene = service.fromFds(fds);

      expect(scene.obsts[0].xb).toEqual({ x1: 0, x2: 4, y1: 2, y2: 2.2, z1: 0, z2: 3 });
      expect(scene.obsts[0].xb as any).not.toBe(fds.geometry.obsts[0].xb);
      expect(scene.meshes[0].xb as any).not.toBe(fds.geometry.meshes[0].xb);
    });

    it('takes a fire from the plane of its &VENT, not from a box of its own', () => {
      const scene = service.fromFds(fds);

      expect(scene.fires[0].xb).toEqual({ x1: 1, x2: 3, y1: 1, y2: 3, z1: 0, z2: 0 });
    });

    describe('colours', () => {
      it('resolves an obst colour from its &SURF, alpha from its transparency', () => {
        const scene = service.fromFds(fds);

        expect(scene.obsts[0].color.r).toBeCloseTo(200 / 255, 6);
        expect(scene.obsts[0].color.g).toBeCloseTo(100 / 255, 6);
        expect(scene.obsts[0].color.b).toBeCloseTo(50 / 255, 6);
        expect(scene.obsts[0].color.a).toBe(1);
        expect(scene.obsts[1].color.a).toBe(0.4);
      });

      it('names the &SURF the obst points at, for the pick panel', () => {
        const scene = service.fromFds(fds);

        expect(scene.obsts[0].surfId).toBe('WALL');
        expect(scene.obsts[1].surfId).toBe('GLASS');
      });

      it('keeps the &SURF name even when the scenario no longer has that surf', () => {
        // Only the colour falls back. Blanking the name too would hide it in the
        // one case where the user most needs to see what the obst is asking for.
        const scene = service.fromFds(fds);
        const orphaned = new Fds(JSON.stringify(scenarioJson()));
        orphaned.geometry.surfs = orphaned.geometry.surfs.filter(surf => surf.id !== 'WALL');

        const drawn = service.fromFds(orphaned).obsts[0];

        expect(drawn.surfId).toBe('WALL');
        expect(drawn.color.a).toBe(1);
        expect(drawn.color).not.toEqual(scene.obsts[0].color);
      });

      it('falls back to an opaque colour for an obst with no &SURF', () => {
        // The library has no surf list to fall back on any more. Alpha stays 1
        // so the obst goes on drawing solid rather than turning invisible.
        const withoutSurf = new Fds(JSON.stringify({
          geometry: {
            surfs: [{ id: 'WALL', color: { rgb: [200, 100, 50] }, transparency: 1 }],
            obsts: [{ id: 'W', uuid: 'w-uuid', xb: { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 } }]
          }
        }));

        const scene = service.fromFds(withoutSurf);

        expect(scene.obsts[0].surfId).toBe('');
        expect(scene.obsts[0].color.a).toBe(1);
        expect(scene.obsts[0].color.r).toBeGreaterThan(0);
      });

      it('resolves a vent colour from its &SURF', () => {
        const scene = service.fromFds(fds);

        expect(scene.vents[0].color.r).toBeCloseTo(10 / 255, 6);
        expect(scene.vents[0].color.a).toBe(0.5);
      });

      it('falls back to blue for a vent with no &SURF', () => {
        const withoutSurf = new Fds(JSON.stringify({
          ventilation: { vents: [{ id: 'V', uuid: 'v-uuid', xb: { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 0 } }] }
        }));

        const scene = service.fromFds(withoutSurf);

        expect(scene.vents[0].color).toEqual({ r: 0, g: 0, b: 1, a: 1 });
      });

      it('resolves a fire colour from its &SURF and draws it opaque', () => {
        const scene = service.fromFds(fds);

        expect(scene.fires[0].color.r).toBeCloseTo(1, 6);
        expect(scene.fires[0].color.g).toBeCloseTo(128 / 255, 6);
        expect(scene.fires[0].color.a).toBe(1);
      });

      it('puts a jetfan transparency into the alpha channel', () => {
        const scene = service.fromFds(fds);

        expect(scene.jetfans[0].color.r).toBeCloseTo(1, 6);
        expect(scene.jetfans[0].color.a).toBe(0.5);
      });
    });

    describe('jetfan direction', () => {
      it('carries a direction the library can draw', () => {
        expect(service.fromFds(fds).jetfans[0].direction).toBe('-z');
      });

      it('narrows an unknown direction onto +x rather than passing it through', () => {
        // Scenarios come out of the database, so the stored value is whatever was
        // written there. The library switches on the six it knows.
        const odd = new Fds(JSON.stringify({
          ventilation: {
            jetfans: [{
              id: 'JF', uuid: 'jf-uuid', direction: 'sideways',
              xb: { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 }
            }]
          }
        }));

        expect(service.fromFds(odd).jetfans[0].direction).toBe('+x');
      });
    });

    it('leaves the Fds object exactly as it found it', () => {
      const before = JSON.stringify(deepSnapshot(fds));

      service.fromFds(fds);

      expect(JSON.stringify(deepSnapshot(fds))).toBe(before);
    });

    it('copes with a scenario that has nothing in it', () => {
      const empty = new Fds(JSON.stringify({}));

      const scene = service.fromFds(empty);

      expect(scene.meshes).toEqual([]);
      expect(scene.obsts).toEqual([]);
      expect(scene.holes).toEqual([]);
      expect(scene.opens).toEqual([]);
      expect(scene.vents).toEqual([]);
      expect(scene.fires).toEqual([]);
      expect(scene.jetfans).toEqual([]);
    });
  });
});
