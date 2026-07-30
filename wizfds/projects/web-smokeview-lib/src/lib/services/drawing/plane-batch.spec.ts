import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { BatchedPlane, PlaneBatch } from './plane-batch';
import { HelpersService } from '../helpers/helpers.service';
import { SceneRegistryService } from '../babylon/scene-registry.service';
import { SceneXb } from './scene-input';

/** One rectangle per orientation a &VENT can be written in. */
const WALL_X: SceneXb = { x1: 2, x2: 2, y1: 0, y2: 4, z1: 0, z2: 3 };
const WALL_Y: SceneXb = { x1: 0, x2: 5, y1: 1, y2: 1, z1: 0, z2: 3 };
const FLOOR: SceneXb = { x1: 0, x2: 5, y1: 0, y2: 4, z1: 0, z2: 0 };

function plane(uuid: string, xb: SceneXb, color: number[] = [1, 0, 0, 1]): BatchedPlane {
  return { uuid: uuid, xb: xb, color: color };
}

describe('PlaneBatch', () => {
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;
  let registry: SceneRegistryService;
  let helpers: HelpersService;
  let batch: PlaneBatch;

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    TestBed.configureTestingModule({});
    registry = TestBed.inject(SceneRegistryService);
    helpers = TestBed.inject(HelpersService);
    batch = new PlaneBatch('vents', 'vent', scene, helpers, registry);
  });

  afterEach(() => {
    batch.dispose();
    scene.dispose();
    engine.dispose();
  });

  /** The box the drawn triangles actually occupy, read back off the buffer. */
  function drawnBounds(): SceneXb {
    const positions = Array.from(batch.mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind));
    const at = (offset: number) => positions.filter((_, i) => i % 3 === offset);
    const xs = at(0), ys = at(1), zs = at(2);
    return {
      x1: Math.min(...xs), x2: Math.max(...xs),
      y1: Math.min(...ys), y2: Math.max(...ys),
      z1: Math.min(...zs), z2: Math.max(...zs)
    };
  }

  function expectBoundsCloseTo(actual: SceneXb, expected: SceneXb): void {
    (['x1', 'x2', 'y1', 'y2', 'z1', 'z2'] as const).forEach(key => {
      expect(actual[key]).withContext(`${key}`).toBeCloseTo(expected[key], 6);
    });
  }

  describe('the rectangle it draws', () => {
    it('covers exactly the box the scenario gave, on a wall across x', () => {
      batch.setPlanes([plane('a', WALL_X)]);

      expectBoundsCloseTo(drawnBounds(), WALL_X);
    });

    it('covers exactly the box the scenario gave, on a wall across y', () => {
      batch.setPlanes([plane('a', WALL_Y)]);

      expectBoundsCloseTo(drawnBounds(), WALL_Y);
    });

    it('covers exactly the box the scenario gave, on a floor', () => {
      batch.setPlanes([plane('a', FLOOR)]);

      expectBoundsCloseTo(drawnBounds(), FLOOR);
    });

    it('draws a plane four hundred metres out four hundred metres out', () => {
      // Nothing normalises any more: the scene is in FDS metres 1:1 (ADR-0002)
      const far: SceneXb = { x1: 400, x2: 400, y1: 0, y2: 4, z1: 0, z2: 3 };
      batch.setPlanes([plane('far', far)]);

      expectBoundsCloseTo(drawnBounds(), far);
    });

    it('is two triangles, whichever way it faces', () => {
      batch.setPlanes([plane('a', WALL_X)]);

      expect(batch.mesh.getIndices().length).toBe(6);
      expect(batch.mesh.getTotalVertices()).toBe(4);
    });
  });

  describe('batching', () => {
    it('draws many planes on one mesh', () => {
      batch.setPlanes([plane('a', WALL_X), plane('b', WALL_Y), plane('c', FLOOR)]);

      // The whole point of a batch: three vents, one draw call
      expect(batch.count).toBe(3);
      expect(batch.mesh.getTotalVertices()).toBe(12);
      expect(batch.mesh.getIndices().length).toBe(18);
    });

    it('gives every plane its own colour', () => {
      batch.setPlanes([
        plane('a', WALL_X, [1, 0, 0, 1]),
        plane('b', FLOOR, [0, 0.5, 1, 0.4])
      ]);

      const colors = Array.from(batch.mesh.getVerticesData(BABYLON.VertexBuffer.ColorKind));
      // Four vertices apiece, so the second plane's colour starts at 16
      [1, 0, 0, 1].forEach((expected, i) => {
        expect(colors[i]).withContext(`first plane, component ${i}`).toBeCloseTo(expected, 6);
      });
      [0, 0.5, 1, 0.4].forEach((expected, i) => {
        expect(colors[16 + i]).withContext(`second plane, component ${i}`).toBeCloseTo(expected, 6);
      });
    });

    it('draws nothing at all when it holds nothing', () => {
      batch.setPlanes([plane('a', WALL_X)]);
      batch.setPlanes([]);

      expect(batch.count).toBe(0);
      expect(batch.mesh.isEnabled())
        .withContext('an empty batch has no triangles to draw')
        .toBe(false);
    });

    it('draws again after having been emptied', () => {
      batch.setPlanes([plane('a', WALL_X)]);
      batch.setPlanes([]);
      batch.setPlanes([plane('a', WALL_X)]);

      expect(batch.mesh.isEnabled()).toBe(true);
      expectBoundsCloseTo(drawnBounds(), WALL_X);
    });
  });

  describe('identity', () => {
    it('names the plane a face belongs to', () => {
      batch.setPlanes([plane('a', WALL_X), plane('b', WALL_Y), plane('c', FLOOR)]);

      // Two triangles apiece, in the order they were given
      expect(registry.uuidAt(batch.mesh, 0)).toBe('a');
      expect(registry.uuidAt(batch.mesh, 1)).toBe('a');
      expect(registry.uuidAt(batch.mesh, 2)).toBe('b');
      expect(registry.uuidAt(batch.mesh, 5)).toBe('c');
    });

    it('registers a plane against the mesh that draws it', () => {
      batch.setPlanes([plane('a', WALL_X)]);

      expect(registry.entryFor('a').mesh).toBe(batch.mesh);
    });

    it('forgets a plane that is no longer in the scenario', () => {
      batch.setPlanes([plane('a', WALL_X), plane('b', FLOOR)]);
      batch.setPlanes([plane('a', WALL_X)]);

      expect(registry.entryFor('b')).toBeUndefined();
      expect(registry.uuidAt(batch.mesh, 2)).toBeUndefined();
    });

    it('forgets everything when it is emptied', () => {
      batch.setPlanes([plane('a', WALL_X), plane('b', FLOOR)]);
      batch.setPlanes([]);

      expect(registry.entryFor('a')).toBeUndefined();
      expect(registry.entryFor('b')).toBeUndefined();
    });
  });

  describe('planes the library derives itself', () => {
    // A jetfan's inlet and outlet are drawings, not elements of the scenario:
    // there is no &VENT behind them and nothing to identify.

    it('draws a plane that has no uuid', () => {
      batch.setPlanes([{ xb: WALL_X, color: [0, 0, 1, 0.8] }]);

      expect(batch.count).toBe(1);
      expectBoundsCloseTo(drawnBounds(), WALL_X);
    });

    it('puts nothing in the registry for it', () => {
      batch.setPlanes([{ xb: WALL_X, color: [0, 0, 1, 0.8] }, plane('b', FLOOR)]);

      // The named one still has to be findable, at its own faces
      expect(registry.uuidAt(batch.mesh, 0)).toBeUndefined();
      expect(registry.uuidAt(batch.mesh, 2)).toBe('b');
    });
  });

  describe('a box that is not a plane', () => {
    // &VENT is a plane by definition, but a scenario imported from CAD can carry
    // one whose XB has thickness on every axis. There is no rectangle to draw.

    it('skips it rather than drawing something arbitrary', () => {
      const solid: SceneXb = { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 };
      batch.setPlanes([plane('solid', solid), plane('b', FLOOR)]);

      expect(batch.count).toBe(1);
      expect(batch.mesh.getTotalVertices()).toBe(4);
    });

    it('leaves the planes after it findable at their own faces', () => {
      // The ranges are read off the buffer, so a skipped plane must not shift
      // everything behind it by two triangles
      const solid: SceneXb = { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 };
      batch.setPlanes([plane('solid', solid), plane('b', FLOOR)]);

      expect(registry.uuidAt(batch.mesh, 0)).toBe('b');
      expect(registry.entryFor('solid')).toBeUndefined();
    });
  });

  describe('dispose', () => {
    it('takes its mesh with it', () => {
      batch.setPlanes([plane('a', WALL_X)]);
      const mesh = batch.mesh;

      batch.dispose();

      expect(mesh.isDisposed()).toBe(true);
    });

    it('leaves nothing of itself in the registry', () => {
      batch.setPlanes([plane('a', WALL_X), plane('b', FLOOR)]);

      batch.dispose();

      expect(registry.entryFor('a')).toBeUndefined();
      expect(registry.entryFor('b')).toBeUndefined();
    });
  });
});
