import { TestBed } from '@angular/core/testing';

import { SceneBoundsService } from './scene-bounds.service';
import { SceneInput } from '../drawing/scene-input';

/** A scene with nothing in it, to be spread over with whatever a test needs. */
function emptyScene(): SceneInput {
  return { meshes: [], obsts: [], holes: [], opens: [], vents: [], fires: [], jetfans: [] };
}

describe('SceneBoundsService', () => {
  let service: SceneBoundsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SceneBoundsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('the box the scene occupies', () => {
    it('spans every box it was given, in metres', () => {
      service.setFrom([
        { x1: 0, x2: 10, y1: 0, y2: 8, z1: 0, z2: 4 },
        { x1: -2, x2: 3, y1: 1, y2: 12, z1: 1, z2: 3 }
      ]);

      expect(service.box).toEqual({ x1: -2, x2: 10, y1: 0, y2: 12, z1: 0, z2: 4 });
    });

    it('keeps the coordinates it was given rather than shifting them to the origin', () => {
      // A picked coordinate has to be an FDS coordinate - that is the whole point
      // of ADR-0002, and the reason nothing is translated on the way in.
      service.setFrom([{ x1: 100, x2: 140, y1: 50, y2: 70, z1: 0, z2: 6 }]);

      expect(service.box.x1).toBe(100);
      expect(service.box.x2).toBe(140);
    });

    it('ignores an empty list rather than collapsing the scene', () => {
      service.setFrom([{ x1: 0, x2: 10, y1: 0, y2: 8, z1: 0, z2: 4 }]);

      service.setFrom([]);

      expect(service.box.x2).toBe(10);
    });
  });

  describe('extent', () => {
    it('is the longest edge of the box, in metres', () => {
      service.setFrom([{ x1: 0, x2: 10, y1: 0, y2: 40, z1: 0, z2: 4 }]);

      expect(service.extent).toBe(40);
    });

    it('never reaches zero, so nothing derived from it collapses', () => {
      // Everything the library sizes - edges, camera limits, clip margins - is a
      // multiple of this, and a scenario holding a single point would otherwise
      // make all of them zero.
      service.setFrom([{ x1: 3, x2: 3, y1: 3, y2: 3, z1: 3, z2: 3 }]);

      expect(service.extent).toBeGreaterThan(0);
    });
  });

  describe('centre', () => {
    it('sits in the middle of the box', () => {
      service.setFrom([{ x1: 0, x2: 10, y1: -4, y2: 4, z1: 2, z2: 6 }]);

      expect(service.center).toEqual({ x: 5, y: 0, z: 4 });
    });
  });

  describe('what the scene is measured from', () => {
    it('takes the meshes when the scenario has any', () => {
      // A &MESH spans the whole model; an obst outside it is a modelling error,
      // not a reason to zoom out.
      service.setFromScene({
        ...emptyScene(),
        meshes: [{ uuid: 'm', id: 'M1', xb: { x1: 0, x2: 10, y1: 0, y2: 10, z1: 0, z2: 4 } }],
        obsts: [{
          uuid: 'o', id: 'O1', surfId: '', permitHole: true,
          xb: { x1: 0, x2: 400, y1: 0, y2: 1, z1: 0, z2: 1 },
          color: { r: 1, g: 1, b: 1, a: 1 }
        }]
      });

      expect(service.box.x2).toBe(10);
    });

    it('falls back to everything else when the scenario has no mesh', () => {
      service.setFromScene({
        ...emptyScene(),
        obsts: [{
          uuid: 'o', id: 'O1', surfId: '', permitHole: true,
          xb: { x1: 0, x2: 4, y1: 0, y2: 1, z1: 0, z2: 3 },
          color: { r: 1, g: 1, b: 1, a: 1 }
        }],
        fires: [{
          uuid: 'f', id: 'F1', xb: { x1: 0, x2: 2, y1: 0, y2: 20, z1: 0, z2: 0 },
          color: { r: 1, g: 0, b: 0, a: 1 }
        }]
      });

      expect(service.box).toEqual({ x1: 0, x2: 4, y1: 0, y2: 20, z1: 0, z2: 3 });
    });

    it('measures a jetfan by the box it is actually drawn as', () => {
      // Until a jetfan is placed in CAD its coordinates are all zero and it is
      // drawn as a stand-in box; measuring the scene by the zeroes would put the
      // camera somewhere the geometry is not.
      service.setFromScene({
        ...emptyScene(),
        jetfans: [{
          uuid: 'j', id: 'JF1', direction: '+x',
          xb: { x1: 0, x2: 0, y1: 0, y2: 0, z1: 0, z2: 0 },
          color: { r: 1, g: 0, b: 0, a: 0.5 }
        }]
      });

      expect(service.extent).toBeGreaterThan(1);
    });

    it('stands an empty scenario against a default box rather than nothing', () => {
      service.setFromScene(emptyScene());

      expect(service.extent).toBeGreaterThan(0);
    });
  });

  describe('measuring a raw vertex buffer', () => {
    // The standalone viewer reads geometry straight out of a Smokeview export
    // and has no scenario to hand over - see ADR-0004.

    it('spans every position in the buffer', () => {
      service.setFromPositions([0, 0, 0, 6, 2, 3, -1, 5, 1]);

      expect(service.box).toEqual({ x1: -1, x2: 6, y1: 0, y2: 5, z1: 0, z2: 3 });
    });

    it('ignores an empty buffer', () => {
      service.setFrom([{ x1: 0, x2: 10, y1: 0, y2: 8, z1: 0, z2: 4 }]);

      service.setFromPositions([]);

      expect(service.box.x2).toBe(10);
    });
  });

  describe('clip planes', () => {
    beforeEach(() => {
      service.setFrom([{ x1: 0, x2: 20, y1: -10, y2: 10, z1: 0, z2: 5 }]);
    });

    it('spans the model, in metres, so the slider reads as a coordinate', () => {
      expect(service.clipMin('x')).toBeLessThan(0);
      expect(service.clipMax('x')).toBeGreaterThan(20);
      expect(service.clipMin('y')).toBeLessThan(-10);
      expect(service.clipMax('z')).toBeGreaterThan(5);
    });

    it('clears the model at either end, so the slider can hide nothing at all', () => {
      // The shader compares a fragment's own coordinate against the plane, so an
      // endpoint landing exactly on the face would clip that face away.
      expect(service.clipMin('x')).toBeLessThan(0);
      expect(service.clipMax('x')).toBeGreaterThan(20);
    });

    it('names the end of each axis at which a plane hides nothing', () => {
      // x and y keep what is above the plane, z keeps what is below it, so the
      // open end is not the same end on all three axes.
      expect(service.openClipAt('x')).toBe(service.clipMin('x'));
      expect(service.openClipAt('y')).toBe(service.clipMin('y'));
      expect(service.openClipAt('z')).toBe(service.clipMax('z'));
    });

    it('scales its travel with the model rather than with a fixed range', () => {
      service.setFrom([{ x1: 0, x2: 400, y1: 0, y2: 100, z1: 0, z2: 30 }]);

      expect(service.clipMin('x')).toBeCloseTo(-40, 6);
      expect(service.clipMax('x')).toBeCloseTo(440, 6);
    });

    it('moves in steps fine enough to place a plane anywhere in the model', () => {
      // A four-hundred-metre tunnel and a five-metre room both get a slider that
      // is worth dragging - a fixed step would be useless at one end or the other.
      service.setFrom([{ x1: 0, x2: 400, y1: 0, y2: 100, z1: 0, z2: 30 }]);
      const coarse = service.clipStep;

      service.setFrom([{ x1: 0, x2: 5, y1: 0, y2: 4, z1: 0, z2: 3 }]);

      expect(coarse).toBeGreaterThan(service.clipStep);
      expect(service.clipStep).toBeGreaterThan(0);
    });
  });

  describe('sizes derived from the model', () => {
    it('scales edge widths with the model, so outlines read the same at any size', () => {
      service.setFrom([{ x1: 0, x2: 10, y1: 0, y2: 10, z1: 0, z2: 10 }]);
      const small = service.edgeWidth;

      service.setFrom([{ x1: 0, x2: 200, y1: 0, y2: 200, z1: 0, z2: 200 }]);

      expect(service.edgeWidth).toBeCloseTo(small * 20, 6);
      expect(service.outlineWidth).toBeGreaterThan(service.edgeWidth);
    });
  });

  describe('resetSceneState', () => {
    it('forgets the model when the scene it was measured for is disposed', () => {
      service.setFrom([{ x1: 0, x2: 400, y1: 0, y2: 400, z1: 0, z2: 400 }]);

      service.resetSceneState();

      expect(service.extent).toBeLessThan(400);
    });
  });
});
