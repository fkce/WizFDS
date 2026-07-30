import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { BoxInstancePool, PooledBox } from './box-instance-pool';
import { HelpersService } from '../helpers/helpers.service';
import { SceneRegistryService } from '../babylon/scene-registry.service';
import { SceneXb } from './scene-input';

/** A wall, a slab and a column - three boxes of visibly different shapes. */
const WALL: SceneXb = { x1: 0, x2: 4, y1: 2, y2: 2.2, z1: 0, z2: 3 };
const SLAB: SceneXb = { x1: 0, x2: 4, y1: 0, y2: 4, z1: 3, z2: 3.2 };
const COLUMN: SceneXb = { x1: 10, x2: 10.4, y1: 10, y2: 10.4, z1: 0, z2: 3 };

function box(uuid: string, xb: SceneXb, color: number[] = [1, 0, 0, 1]): PooledBox {
  return { uuid: uuid, id: uuid.toUpperCase(), xb: xb, color: color };
}

describe('BoxInstancePool', () => {
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;
  let registry: SceneRegistryService;
  let helpers: HelpersService;
  let pool: BoxInstancePool;

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    TestBed.configureTestingModule({});
    registry = TestBed.inject(SceneRegistryService);
    helpers = TestBed.inject(HelpersService);
    pool = new BoxInstancePool('obstOpaque', 'obst', scene, helpers, registry);
  });

  afterEach(() => {
    pool.dispose();
    scene.dispose();
    engine.dispose();
  });

  /** The box an instance actually occupies in the scene, read off its matrix. */
  function drawnBox(index: number): SceneXb {
    const matrix = pool.mesh.thinInstanceGetWorldMatrices()[index];
    const corner = (x: number, y: number, z: number) =>
      BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(x, y, z), matrix);
    const low = corner(-0.5, -0.5, -0.5);
    const high = corner(0.5, 0.5, 0.5);
    return { x1: low.x, x2: high.x, y1: low.y, y2: high.y, z1: low.z, z2: high.z };
  }

  function expectBoxCloseTo(actual: SceneXb, expected: SceneXb): void {
    (['x1', 'x2', 'y1', 'y2', 'z1', 'z2'] as const).forEach(key => {
      expect(actual[key]).withContext(`${key}`).toBeCloseTo(expected[key], 6);
    });
  }

  describe('the base box', () => {
    it('is one box however many are drawn from it', () => {
      pool.setBoxes([box('a', WALL), box('b', SLAB), box('c', COLUMN)]);

      // The whole point of ADR-0006: three obsts, one buffer of twelve triangles
      expect(pool.mesh.getTotalVertices()).toBe(24);
      expect(pool.mesh.getIndices().length).toBe(36);
      expect(pool.count).toBe(3);
    });

    it('is wound the same way as a box built for the shared buffer', () => {
      // Obsts with openings keep their own mesh and their own copy of this
      // geometry. The back cap draws one facing only, so the two paths showing
      // opposite windings paints the outside of those obsts red.
      pool.setBoxes([box('a', WALL)]);

      const fromHelpers = helpers.getVerticesFromXb({
        x1: -0.5, x2: 0.5, y1: -0.5, y2: 0.5, z1: -0.5, z2: 0.5
      });
      expect(Array.from(pool.mesh.getVerticesData('position'))).toEqual(fromHelpers);
      expect(Array.from(pool.mesh.getIndices())).toEqual(helpers.getIndices(0));
    });
  });

  describe('placing the boxes', () => {
    it('puts each instance where the scenario says, in metres', () => {
      pool.setBoxes([box('a', WALL), box('b', COLUMN)]);

      expectBoxCloseTo(drawnBox(0), WALL);
      expectBoxCloseTo(drawnBox(1), COLUMN);
    });

    it('draws a box a hundred metres out a hundred metres out', () => {
      // There is no normalisation left to squeeze the scene into a unit cube
      const far: SceneXb = { x1: 400, x2: 401, y1: 0, y2: 1, z1: 0, z2: 3 };
      pool.setBoxes([box('far', far)]);

      expectBoxCloseTo(drawnBox(0), far);
    });

    it('gives every instance its own colour', () => {
      pool.setBoxes([
        box('a', WALL, [1, 0, 0, 1]),
        box('b', SLAB, [0, 0.5, 1, 0.4])
      ]);

      // Babylon renames the buffer: a per-instance colour is instanceColor,
      // and `color` stays the per-vertex one the shared buffers use.
      const buffer = pool.mesh.getVertexBuffer('instanceColor');
      expect(buffer.getIsInstanced())
        .withContext('one colour per box, not one per vertex')
        .toBe(true);

      // Rounded to float32 on the way into the buffer, hence the tolerance
      const colors = Array.from(buffer.getData() as Float32Array);
      [1, 0, 0, 1, 0, 0.5, 1, 0.4].forEach((expected, i) => {
        expect(colors[i]).withContext(`component ${i}`).toBeCloseTo(expected, 6);
      });
    });

    it('draws nothing at all when it holds nothing', () => {
      pool.setBoxes([box('a', WALL)]);
      pool.setBoxes([]);

      expect(pool.count).toBe(0);
      expect(pool.mesh.isEnabled())
        .withContext('an empty pool has no instance attributes for the shader to read')
        .toBe(false);
    });
  });

  describe('a box with no thickness', () => {
    // An &OBST may be written as a sheet - x1 equal to x2. Scaled by zero, its
    // matrix cannot be inverted, and inverting it is how a pick reaches an
    // instance.

    it('can still be picked', () => {
      const sheet: SceneXb = { x1: 2, x2: 2, y1: 0, y2: 4, z1: 0, z2: 3 };
      pool.setBoxes([box('sheet', sheet)]);

      const ray = new BABYLON.Ray(new BABYLON.Vector3(-5, 2, 1.5), new BABYLON.Vector3(1, 0, 0), 100);
      const hit = scene.pickWithRay(ray, m => m === pool.mesh);

      expect(hit.hit).withContext('a sheet the ray goes straight through').toBe(true);
      expect(hit.thinInstanceIndex).toBe(0);
    });

    it('is still drawn where the scenario put it', () => {
      const sheet: SceneXb = { x1: 2, x2: 2, y1: 0, y2: 4, z1: 0, z2: 3 };
      pool.setBoxes([box('sheet', sheet)]);

      expectBoxCloseTo(drawnBox(0), sheet);
    });
  });

  describe('identity', () => {
    it('registers every box it draws, at the slot it drew it in', () => {
      pool.setBoxes([box('a', WALL), box('b', SLAB), box('c', COLUMN)]);

      expect(registry.uuidAtInstance(pool.mesh, 0)).toBe('a');
      expect(registry.uuidAtInstance(pool.mesh, 2)).toBe('c');
      expect(registry.entryFor('b').mesh).toBe(pool.mesh);
    });

    it('forgets a box that is no longer in the scenario', () => {
      pool.setBoxes([box('a', WALL), box('b', SLAB)]);
      pool.setBoxes([box('a', WALL)]);

      expect(registry.entryFor('b')).toBeUndefined();
      expect(registry.uuidAtInstance(pool.mesh, 1)).toBeUndefined();
    });

    it('answers which box stands in a slot', () => {
      pool.setBoxes([box('a', WALL), box('b', SLAB)]);

      expect(pool.boxAt(1).uuid).toBe('b');
      expect(pool.boxAt(9)).toBeUndefined();
    });
  });

  describe('taking a box out and putting it back', () => {
    // Singling an obst out for editing takes it out of the pool and gives it a
    // mesh of its own; finishing puts it back (ADR-0006).

    it('closes the gap rather than leaving a hole in the buffer', () => {
      pool.setBoxes([box('a', WALL), box('b', SLAB), box('c', COLUMN)]);

      pool.remove('a');

      expect(pool.count).toBe(2);
      expect(registry.entryFor('a')).toBeUndefined();
    });

    it('keeps every remaining box findable at its new slot', () => {
      pool.setBoxes([box('a', WALL), box('b', SLAB), box('c', COLUMN)]);

      pool.remove('a');

      const slots = [0, 1].map(i => registry.uuidAtInstance(pool.mesh, i)).sort();
      expect(slots).toEqual(['b', 'c']);
      expect(registry.uuidAtInstance(pool.mesh, 2)).toBeUndefined();
    });

    it('draws what is left exactly where it was', () => {
      pool.setBoxes([box('a', WALL), box('b', SLAB), box('c', COLUMN)]);

      pool.remove('a');

      // Removal must not move anything on screen - the boxes that stay are the
      // same boxes, wherever the buffer now keeps them.
      const drawn = [0, 1].map(i => ({ uuid: pool.boxAt(i).uuid, xb: drawnBox(i) }));
      const column = drawn.find(d => d.uuid === 'c');
      expectBoxCloseTo(column.xb, COLUMN);
    });

    it('takes the box back', () => {
      pool.setBoxes([box('a', WALL), box('b', SLAB)]);
      pool.remove('a');

      const slot = pool.add(box('a', WALL));

      expect(pool.count).toBe(2);
      expect(registry.uuidAtInstance(pool.mesh, slot)).toBe('a');
      expectBoxCloseTo(drawnBox(slot), WALL);
    });

    it('says nothing happened when asked to remove a box it does not hold', () => {
      pool.setBoxes([box('a', WALL)]);

      expect(pool.remove('never-drawn')).toBe(false);
      expect(pool.count).toBe(1);
    });
  });

  describe('the twin meshes', () => {
    it('draws the same instances from the same buffers', () => {
      // The back cap fills the cross-section a clipping plane exposes: same
      // boxes, same places, a different shader.
      const cap = pool.createTwin('obstBackCap');
      pool.setBoxes([box('a', WALL), box('b', SLAB)]);

      expect(cap.thinInstanceCount).toBe(2);
      expect(cap.getTotalVertices()).toBe(24);
    });

    it('is never picked - the pool itself answers for the box', () => {
      const cap = pool.createTwin('obstBackCap');

      expect(cap.isPickable).toBe(false);
    });

    it('follows the pool when it empties', () => {
      const cap = pool.createTwin('obstBackCap');
      pool.setBoxes([box('a', WALL)]);
      pool.setBoxes([]);

      expect(cap.isEnabled()).toBe(false);
    });
  });

  describe('dispose', () => {
    it('takes its meshes with it', () => {
      const cap = pool.createTwin('obstBackCap');
      pool.setBoxes([box('a', WALL)]);
      const base = pool.mesh;

      pool.dispose();

      expect(base.isDisposed()).toBe(true);
      expect(cap.isDisposed()).toBe(true);
    });

    it('leaves nothing of itself in the registry', () => {
      pool.setBoxes([box('a', WALL), box('b', SLAB)]);

      pool.dispose();

      expect(registry.entryFor('a')).toBeUndefined();
      expect(registry.entryFor('b')).toBeUndefined();
    });
  });

  describe('re-filling at scale', () => {
    it('does not walk the whole pool once per box when it is refilled', () => {
      // Re-entering the view redraws what is already there. Forgetting the boxes
      // one at a time costs a scan of the pool's registry list apiece; measured
      // at ten thousand boxes that was 528 ms of frozen UI against 6 ms for the
      // one call this now makes. The bound is loose enough for a busy machine
      // and two orders of magnitude below what the quadratic version took.
      const many: PooledBox[] = [];
      for (let i = 0; i < 10000; i++) {
        many.push(box(`b${i}`, { x1: i, x2: i + 0.5, y1: 0, y2: 1, z1: 0, z2: 1 }));
      }
      pool.setBoxes(many);

      const started = performance.now();
      pool.setBoxes(many);
      const elapsed = performance.now() - started;

      expect(pool.count).toBe(10000);
      expect(registry.uuidAtInstance(pool.mesh, 9999)).toBe('b9999');
      expect(elapsed)
        .withContext(`a second setBoxes of 10 000 boxes took ${elapsed.toFixed(0)} ms`)
        .toBeLessThan(150);
    });
  });
});
