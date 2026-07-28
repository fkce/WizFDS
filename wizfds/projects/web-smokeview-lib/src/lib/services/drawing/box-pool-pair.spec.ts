import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { BoxPoolPair } from './box-pool-pair';
import { PooledBox } from './box-instance-pool';
import { HelpersService } from '../helpers/helpers.service';
import { SceneRegistryService } from '../babylon/scene-registry.service';
import { SceneXb } from './scene-input';

const WALL: SceneXb = { x1: 0, x2: 4, y1: 2, y2: 2.2, z1: 0, z2: 3 };
const SLAB: SceneXb = { x1: 0, x2: 4, y1: 0, y2: 4, z1: 3, z2: 3.2 };

/** Fully opaque - the alpha the app resolved from a &SURF with TRANSPARENCY=1. */
function solid(uuid: string, xb: SceneXb = WALL): PooledBox {
  return { uuid: uuid, xb: xb, color: [1, 0.8, 0, 1] };
}

/** Short of fully opaque - glazing. */
function glazed(uuid: string, xb: SceneXb = SLAB): PooledBox {
  return { uuid: uuid, xb: xb, color: [0, 0.5, 1, 0.4] };
}

describe('BoxPoolPair', () => {
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;
  let registry: SceneRegistryService;
  let pair: BoxPoolPair;

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    TestBed.configureTestingModule({});
    registry = TestBed.inject(SceneRegistryService);
    pair = new BoxPoolPair(
      'obstOpaque', 'obstTransparent', scene, TestBed.inject(HelpersService), registry);
  });

  afterEach(() => {
    pair.dispose();
    scene.dispose();
    engine.dispose();
  });

  describe('which pool a box goes into', () => {
    // Alpha blending is a property of the material, so a translucent box cannot
    // share a pool with an opaque one however alike they are otherwise.

    it('sends a fully opaque box to the opaque pool', () => {
      pair.setBoxes([solid('a')]);

      expect(pair.opaque.count).toBe(1);
      expect(pair.transparent.count).toBe(0);
    });

    it('sends anything short of fully opaque to the other one', () => {
      pair.setBoxes([glazed('a')]);

      expect(pair.opaque.count).toBe(0);
      expect(pair.transparent.count).toBe(1);
    });

    it('splits a mixed scenario between the two', () => {
      pair.setBoxes([solid('a'), glazed('b'), solid('c')]);

      expect(pair.opaque.count).toBe(2);
      expect(pair.transparent.count).toBe(1);
    });

    it('replaces what was there, on both pools at once', () => {
      pair.setBoxes([solid('a'), glazed('b')]);

      pair.setBoxes([solid('c')]);

      expect(pair.opaque.count).toBe(1);
      expect(pair.transparent.count).toBe(0);
      expect(registry.entryFor('b')).toBeUndefined();
    });
  });

  describe('naming the pool that draws an element', () => {
    it('answers with whichever of the two holds it', () => {
      pair.setBoxes([solid('a'), glazed('b')]);

      expect(pair.poolFor('a')).toBe(pair.opaque);
      expect(pair.poolFor('b')).toBe(pair.transparent);
    });

    it('has nothing to say about an element neither draws', () => {
      pair.setBoxes([solid('a')]);

      expect(pair.poolFor('never-drawn')).toBeUndefined();
    });

    it('has nothing to say about an element drawn on a mesh of its own', () => {
      // An obst with an opening is registered against its own mesh, not a pool
      pair.setBoxes([solid('a')]);
      registry.register('cut', { mesh: new BABYLON.Mesh('cut', scene) });

      expect(pair.poolFor('cut')).toBeUndefined();
    });
  });

  describe('singling a box out and putting it back', () => {
    it('takes the box out of whichever pool held it', () => {
      pair.setBoxes([solid('a'), glazed('b')]);

      const taken = pair.remove('b');

      expect(taken.uuid).toBe('b');
      expect(pair.transparent.count).toBe(0);
      expect(pair.opaque.count).withContext('the other pool is untouched').toBe(1);
    });

    it('says nothing was taken when neither pool held it', () => {
      pair.setBoxes([solid('a')]);

      expect(pair.remove('never-drawn')).toBeNull();
    });

    it('puts a box back into the pool its alpha calls for', () => {
      pair.setBoxes([solid('a'), glazed('b')]);
      const taken = pair.remove('b');

      pair.add(taken);

      expect(pair.transparent.count).toBe(1);
      expect(registry.entryFor('b').mesh).toBe(pair.transparent.mesh);
    });
  });

  describe('the meshes it draws with', () => {
    it('names both base boxes, so a caller can outline or pick against them', () => {
      expect(pair.meshes).toEqual([pair.opaque.mesh, pair.transparent.mesh]);
    });

    it('keeps the names it was given - other code looks them up by name', () => {
      expect(pair.opaque.mesh.name).toBe('obstOpaque');
      expect(pair.transparent.mesh.name).toBe('obstTransparent');
    });
  });

  describe('dispose', () => {
    it('takes both pools with it', () => {
      pair.setBoxes([solid('a'), glazed('b')]);
      const meshes = pair.meshes;

      pair.dispose();

      meshes.forEach(mesh => expect(mesh.isDisposed()).toBe(true));
      expect(registry.entryFor('a')).toBeUndefined();
      expect(registry.entryFor('b')).toBeUndefined();
    });
  });
});
