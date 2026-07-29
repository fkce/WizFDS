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
      expect(scene.devcs.map(d => d.uuid))
        .toEqual(['spr1-uuid', 'sd1-uuid', 'tc1-uuid', 'layer1-uuid', 'plane1-uuid']);
      expect(scene.geoms.map(g => g.uuid)).toEqual(['geom-uuid']);
    });

    it('copies the coordinates instead of handing out the model Xb', () => {
      // The library used to receive the domain object by reference and write
      // into it - see ADR-0004.
      const scene = service.fromFds(fds);

      expect(scene.obsts[0].xb).toEqual({ x1: 0, x2: 4, y1: 2, y2: 2.2, z1: 0, z2: 3 });
      expect(scene.obsts[0].xb as any).not.toBe(fds.geometry.obsts[0].xb);
      expect(scene.meshes[0].xb as any).not.toBe(fds.geometry.meshes[0].xb);
    });

    describe('coordinates a form has been through', () => {
      // ngModel on a text input writes a string into the model, and neither the
      // decimalInput directive nor the Xb setter turns it back into a number.
      // The contract says number, and the library does arithmetic on it: `x1 +
      // x2` on two strings concatenates, so a mesh edited from 10..40 was drawn
      // centred on 520 m, and Number.isFinite('40') is false, so the scene was
      // measured as the default 10 m box - wrong camera, wrong clip range,
      // wrong edge widths.

      /** What the mesh form leaves behind after the user types into it. */
      function typeInto(xb: any): void {
        ['x1', 'x2', 'y1', 'y2', 'z1', 'z2'].forEach(key => { xb[key] = String(xb[key]); });
      }

      it('hands a mesh across as numbers', () => {
        typeInto(fds.geometry.meshes[0].xb);

        const drawn = service.fromFds(fds).meshes[0].xb;

        expect(drawn).toEqual({ x1: 0, x2: 10, y1: 0, y2: 8, z1: 0, z2: 4 });
        (['x1', 'x2', 'y1', 'y2', 'z1', 'z2'] as const).forEach(key => {
          expect(typeof drawn[key]).withContext(key).toBe('number');
        });
      });

      it('hands every other element across as numbers too', () => {
        typeInto(fds.geometry.obsts[0].xb);
        typeInto(fds.geometry.holes[0].xb);
        typeInto(fds.geometry.opens[0].xb);
        typeInto(fds.ventilation.vents[0].xb);
        typeInto(fds.ventilation.jetfans[0].xb);
        typeInto(fds.fires.fires[0].vent.xb);

        const scene = service.fromFds(fds);

        expect(scene.obsts[0].xb.x2).toBe(4);
        expect(scene.holes[0].xb.z2).toBe(2.1);
        expect(scene.opens[0].xb.x2).toBe(4);
        expect(scene.vents[0].xb.y2).toBe(2);
        expect(scene.jetfans[0].xb.x1).toBe(2);
        expect(scene.fires[0].xb.x2).toBe(3);
      });

      it('hands a point device across as numbers', () => {
        const devc: any = fds.output.devcs[0];
        ['x', 'y', 'z'].forEach(key => { devc.xyz[key] = String(devc.xyz[key]); });

        expect(service.fromFds(fds).devcs[0].xb)
          .toEqual({ x1: 5, x2: 5, y1: 4, y2: 4, z1: 3.8, z2: 3.8 });
      });

      it('leaves a coordinate that is not a number at all as something harmless', () => {
        // A field cleared in the form arrives as '' - drawing it at NaN would
        // take the whole scene's bounding box with it
        (fds.geometry.meshes[0].xb as any).x2 = '';

        expect(service.fromFds(fds).meshes[0].xb.x2).toBe(0);
      });
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
      expect(scene.devcs).toEqual([]);
      expect(scene.geoms).toEqual([]);
    });
  });

  describe('devices', () => {
    it('says how much space each device takes up', () => {
      // FDS lets a &DEVC be a point, a line, a plane or a volume, and the four
      // are different drawings rather than one drawing at four sizes
      const scene = service.fromFds(fds);

      expect(scene.devcs.map(d => d.extent))
        .toEqual(['point', 'point', 'linear', 'volume', 'plane']);
    });

    it('puts a point device in a box with no extent, where it stands', () => {
      // One field says where every device is, however much space it takes up
      const scene = service.fromFds(fds);

      expect(scene.devcs[0].xb).toEqual({ x1: 5, x2: 5, y1: 4, y2: 4, z1: 3.8, z2: 3.8 });
    });

    it('takes a device with an extent from its box', () => {
      const scene = service.fromFds(fds);

      expect(scene.devcs[3].xb).toEqual({ x1: 0, x2: 10, y1: 0, y2: 8, z1: 0, z2: 4 });
    });

    describe('when the device names a &PROP', () => {
      /** A scenario whose first device points at a &PROP. */
      function withProp(smokeviewId: string, quantity?: object): Fds {
        const json: any = scenarioJson();
        json.output.props = [{ id: 'P1', smokeview_id: smokeviewId }];
        json.output.devcs[0] = {
          id: 'D1', uuid: 'd1-uuid', geometrical_type: 'point',
          xyz: { x: 1, y: 1, z: 1 },
          quantity_type: 'PROP', prop_id: 'P1',
          quantity: quantity
        };
        return new Fds(JSON.stringify(json));
      }

      it('reads the kind off the &PROP, which is what SmokeView does', () => {
        expect(service.fromFds(withProp('sprinkler')).devcs[0].marker).toBe('sprinkler');
      });

      it('prefers the &PROP over the quantity, when the two disagree', () => {
        // The prop is the deliberate statement of what the device is; the
        // quantity is what it happens to measure
        const scene = service.fromFds(withProp('nozzle', {
          id: 'Chamber obscuration', quantity: 'CHAMBER OBSCURATION'
        }));

        expect(scene.devcs[0].marker).toBe('nozzle');
      });

      it('falls back to the quantity when the &PROP names no shape it can draw', () => {
        const scene = service.fromFds(withProp('something-custom', {
          id: 'Sprinkler link temperature', quantity: 'SPRINKLER LINK TEMPERATURE'
        }));

        expect(scene.devcs[0].marker).toBe('sprinkler');
      });

      it('falls back to the quantity when the &PROP cannot be found', () => {
        const json: any = scenarioJson();
        json.output.props = [];
        json.output.devcs[0] = {
          id: 'D1', uuid: 'd1-uuid', geometrical_type: 'point', xyz: { x: 1, y: 1, z: 1 },
          quantity_type: 'PROP', prop_id: 'GONE',
          quantity: { id: 'Chamber obscuration', quantity: 'CHAMBER OBSCURATION' }
        };

        const scene = service.fromFds(new Fds(JSON.stringify(json)));

        expect(scene.devcs[0].marker).toBe('smoke detector');
      });
    });

    it('reads what kind of device it is off the QUANTITY it measures', () => {
      // The only link the app keeps: &PROP is never written to the input file
      // and the device form does not offer it, so PROP_ID says nothing here.
      const scene = service.fromFds(fds);

      expect(scene.devcs[0].marker).toBe('sprinkler');
      expect(scene.devcs[1].marker).toBe('smoke detector');
    });

    it('falls back to a plain sensor for a quantity that names no device', () => {
      const scene = service.fromFds(fds);

      expect(scene.devcs[3].marker).toBe('sensor');
    });

    it('copes with a device that measures nothing at all', () => {
      const bare = new Fds(JSON.stringify({
        output: { devcs: [{ id: 'D', uuid: 'd-uuid', geometrical_type: 'point' }] }
      }));

      const drawn = service.fromFds(bare).devcs[0];

      expect(drawn.marker).toBe('sensor');
      expect(drawn.extent).toBe('point');
    });

    it('narrows an unknown geometrical type onto a point', () => {
      const odd = new Fds(JSON.stringify({
        output: { devcs: [{ id: 'D', uuid: 'd-uuid', geometrical_type: 'sideways' }] }
      }));

      expect(service.fromFds(odd).devcs[0].extent).toBe('point');
    });
  });

  describe('complex geometry', () => {
    it('flattens the vertices into the triples a vertex buffer wants', () => {
      const scene = service.fromFds(fds);

      expect(Array.from(scene.geoms[0].vertices))
        .toEqual([0, 0, 0, 2, 0, 0, 2, 2, 0, 0, 2, 1]);
    });

    it('counts the faces from zero, where FDS counts them from one', () => {
      // FACES are Fortran indices in the scenario, because that is the form the
      // input file is written in
      const scene = service.fromFds(fds);

      expect(Array.from(scene.geoms[0].faces)).toEqual([0, 1, 2, 0, 2, 3]);
    });

    it('measures the box the triangles occupy', () => {
      // So that sizing the scene does not mean walking every vertex of every geom
      const scene = service.fromFds(fds);

      expect(scene.geoms[0].xb).toEqual({ x1: 0, x2: 2, y1: 0, y2: 2, z1: 0, z2: 1 });
    });

    it('resolves its colour from its &SURF', () => {
      const scene = service.fromFds(fds);

      expect(scene.geoms[0].color.r).toBeCloseTo(200 / 255, 6);
      expect(scene.geoms[0].color.a).toBe(1);
    });

    it('drops a face that points at a vertex the geom does not have', () => {
      // A geom arrives from CAD, and a triangle indexing past the vertex list
      // would draw from whatever memory follows it
      const broken = new Fds(JSON.stringify({
        geometry: {
          surfs: [{ id: 'WALL', color: { rgb: [200, 100, 50] }, transparency: 1 }],
          geoms: [{
            id: 'G', uuid: 'g-uuid', surf_id: 'WALL',
            verts: [[0, 0, 0], [1, 0, 0], [1, 1, 0]],
            faces: [[1, 2, 3], [2, 3, 9]]
          }]
        }
      }));

      expect(Array.from(service.fromFds(broken).geoms[0].faces)).toEqual([0, 1, 2]);
    });

    it('leaves out a geom with no triangles at all', () => {
      const empty = new Fds(JSON.stringify({
        geometry: {
          surfs: [{ id: 'WALL', color: { rgb: [200, 100, 50] }, transparency: 1 }],
          geoms: [{ id: 'G', uuid: 'g-uuid', surf_id: 'WALL' }]
        }
      }));

      expect(service.fromFds(empty).geoms).toEqual([]);
    });
  });
});
