import { checkElement, RuleElement, RuleModel } from './fds-rules';

/** A 10 x 10 x 3 m room on a 0.25 m grid - what everything here is checked against. */
const ROOM: RuleModel = {
  meshes: [{
    uuid: 'mesh', id: 'MESH1',
    xb: { x1: 0, x2: 10, y1: 0, y2: 10, z1: 0, z2: 3 },
    cell: { i: 0.25, j: 0.25, k: 0.25 }
  }],
  obsts: []
};

/** An element to check, defaulted to a box that breaks none of the rules. */
function element(fields: Partial<RuleElement> = {}): RuleElement {
  return {
    uuid: 'e', type: 'obst',
    xb: { x1: 1, x2: 2, y1: 1, y2: 2, z1: 0, z2: 3 },
    ...fields
  };
}

/** The rules an element breaks, by name. */
function broken(subject: RuleElement, model: RuleModel = ROOM): string[] {
  return checkElement(subject, model).map(warning => warning.rule);
}

/**
 * The FDS rules an edit can break (#123).
 *
 * Every one of them warns and none of them blocks. FDS itself snaps a misaligned
 * &OBST to the nearest cell boundaries and carries on, overlapping obsts are
 * legal, and a scenario in the middle of being edited has every right to be
 * temporarily wrong - exactly as it already is in the forms (ADR-0009).
 */
describe('the FDS rules', () => {

  it('passes an obst that sits in the mesh, on the grid, with a thickness', () => {
    expect(broken(element())).toEqual([]);
  });

  describe('outside every mesh', () => {
    it('warns about an element that meets no mesh at all', () => {
      expect(broken(element({ xb: { x1: 20, x2: 21, y1: 1, y2: 2, z1: 0, z2: 3 } })))
        .toContain('outside-mesh');
    });

    it('says nothing about an element that only partly overlaps one', () => {
      // FDS ignores whatever lies beyond the domain and computes with the rest,
      // and a wall running out through the boundary is how models are drawn
      expect(broken(element({ xb: { x1: 9, x2: 12, y1: 1, y2: 2, z1: 0, z2: 3 } })))
        .not.toContain('outside-mesh');
    });

    it('says nothing about an element touching a mesh along a face', () => {
      expect(broken(element({ xb: { x1: 10, x2: 11, y1: 1, y2: 2, z1: 0, z2: 3 } })))
        .not.toContain('outside-mesh');
    });

    it('does not ask a mesh to be inside a mesh', () => {
      const mesh = element({
        uuid: 'mesh', type: 'mesh', xb: { x1: 0, x2: 10, y1: 0, y2: 10, z1: 0, z2: 3 }
      });

      expect(broken(mesh)).toEqual([]);
    });

    it('has nothing to say when the scenario has no mesh yet', () => {
      // Drawing a wall before adding a &MESH is a normal way to start
      expect(broken(element(), { meshes: [], obsts: [] })).toEqual([]);
    });
  });

  describe('alignment to the grid', () => {
    it('warns about a coordinate between two cell boundaries', () => {
      expect(broken(element({ xb: { x1: 3.15, x2: 3.4, y1: 1, y2: 2, z1: 0, z2: 3 } })))
        .toContain('off-grid');
    });

    it('accepts a coordinate that lands on a cell boundary', () => {
      expect(broken(element({ xb: { x1: 3.25, x2: 3.5, y1: 1, y2: 2, z1: 0, z2: 3 } })))
        .not.toContain('off-grid');
    });

    it('measures the cells from the mesh origin, not from zero', () => {
      const shifted: RuleModel = {
        meshes: [{
          uuid: 'mesh', id: 'MESH1',
          xb: { x1: 0.1, x2: 10.1, y1: 0, y2: 10, z1: 0, z2: 3 },
          cell: { i: 0.25, j: 0.25, k: 0.25 }
        }],
        obsts: []
      };

      expect(broken(element({ xb: { x1: 1.35, x2: 1.6, y1: 1, y2: 2, z1: 0, z2: 3 } }), shifted))
        .not.toContain('off-grid');
    });

    it('forgives what floating point does to an exact multiple', () => {
      // 0.1 + 0.2 is 0.30000000000000004 in binary, and on a 0.1 m grid that is
      // the third cell boundary - a user who typed a round number is not asking
      // to be told their wall is off the grid
      const fine: RuleModel = {
        meshes: [{
          uuid: 'mesh', id: 'MESH1',
          xb: { x1: 0, x2: 10, y1: 0, y2: 10, z1: 0, z2: 3 },
          cell: { i: 0.1, j: 0.1, k: 0.1 }
        }],
        obsts: []
      };

      expect(broken(element({ xb: { x1: 0.1 + 0.2, x2: 1, y1: 1, y2: 2, z1: 0, z2: 3 } }), fine))
        .not.toContain('off-grid');
    });

    it('does not ask a mesh to be aligned to its own grid', () => {
      const mesh = element({
        uuid: 'mesh', type: 'mesh', xb: { x1: 0, x2: 10, y1: 0, y2: 10, z1: 0, z2: 3 }
      });

      expect(broken(mesh)).not.toContain('off-grid');
    });

    it('has nothing to align to outside every mesh', () => {
      const away = element({ xb: { x1: 20.13, x2: 21.7, y1: 1, y2: 2, z1: 0, z2: 3 } });

      expect(broken(away)).toEqual(['outside-mesh']);
    });
  });

  describe('zero thickness', () => {
    it('warns about a body with no extent in one direction', () => {
      expect(broken(element({ xb: { x1: 1, x2: 1, y1: 1, y2: 2, z1: 0, z2: 3 } })))
        .toContain('zero-thickness');
    });

    it('accepts a vent, which is a plane and has to be flat', () => {
      const vent = element({
        type: 'vent', xb: { x1: 1, x2: 1, y1: 1, y2: 2, z1: 0, z2: 3 }
      });

      expect(broken(vent)).not.toContain('zero-thickness');
    });

    it('warns about a vent flattened onto a line, which has no area', () => {
      const line = element({
        type: 'vent', xb: { x1: 1, x2: 1, y1: 1, y2: 1, z1: 0, z2: 3 }
      });

      expect(broken(line)).toContain('zero-thickness');
    });

    it('says nothing about a device, which stands at a point on purpose', () => {
      const devc = element({
        type: 'devc', xb: { x1: 1, x2: 1, y1: 1, y2: 1, z1: 1, z2: 1 }
      });

      expect(broken(devc)).not.toContain('zero-thickness');
    });
  });

  describe('a vent on no surface', () => {
    // An FDS &VENT has to lie on something solid or on the boundary of the
    // domain; one floating in mid-air is silently ignored by the solver.

    it('accepts a vent lying on the face of an obst', () => {
      const model: RuleModel = {
        ...ROOM,
        obsts: [{ uuid: 'wall', xb: { x1: 2, x2: 3, y1: 0, y2: 10, z1: 0, z2: 3 } }]
      };
      const vent = element({
        type: 'vent', xb: { x1: 3, x2: 3, y1: 1, y2: 2, z1: 0, z2: 2 }
      });

      expect(broken(vent, model)).not.toContain('vent-in-mid-air');
    });

    it('accepts a vent lying on the boundary of its mesh', () => {
      const vent = element({
        type: 'vent', xb: { x1: 0, x2: 0, y1: 1, y2: 2, z1: 0, z2: 2 }
      });

      expect(broken(vent)).not.toContain('vent-in-mid-air');
    });

    it('warns about a vent standing in mid-air', () => {
      const vent = element({
        type: 'vent', xb: { x1: 5, x2: 5, y1: 1, y2: 2, z1: 0, z2: 2 }
      });

      expect(broken(vent)).toContain('vent-in-mid-air');
    });

    it('warns about a vent on the plane of an obst it does not overlap', () => {
      // The coordinate matches and the wall is elsewhere in the room, so the
      // vent is still hanging in the air
      const model: RuleModel = {
        ...ROOM,
        obsts: [{ uuid: 'wall', xb: { x1: 2, x2: 3, y1: 8, y2: 9, z1: 0, z2: 3 } }]
      };
      const vent = element({
        type: 'vent', xb: { x1: 3, x2: 3, y1: 1, y2: 2, z1: 0, z2: 2 }
      });

      expect(broken(vent, model)).toContain('vent-in-mid-air');
    });

    it('asks nothing of an obst, which is what vents lie on', () => {
      expect(broken(element())).not.toContain('vent-in-mid-air');
    });
  });

  it('reports every rule an element breaks, not the first', () => {
    // The palette lists them, so a wall that is off the grid *and* flat has to
    // say both
    const bad = element({ xb: { x1: 3.15, x2: 3.15, y1: 1, y2: 2, z1: 0, z2: 3 } });

    expect(broken(bad).sort()).toEqual(['off-grid', 'zero-thickness']);
  });

  it('says which element each warning is about, and in words', () => {
    const warnings = checkElement(
      element({ xb: { x1: 20, x2: 21, y1: 1, y2: 2, z1: 0, z2: 3 } }), ROOM);

    expect(warnings[0].uuid).toBe('e');
    expect(warnings[0].message.length).toBeGreaterThan(0);
  });
});
