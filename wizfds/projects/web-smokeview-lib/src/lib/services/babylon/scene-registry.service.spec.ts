import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { SceneEntry, SceneRegistryService } from './scene-registry.service';
import { SceneLifecycleService } from './scene-lifecycle.service';
import { SceneElementType, SceneXb } from '../drawing/scene-input';

/** Somewhere, so an entry has a box. Where is what the pick tests care about. */
const SOMEWHERE: SceneXb = { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 };

/**
 * An entry: the address under test, with the description filled in.
 *
 * The registry holds both - where an element is drawn and what it is - and it is
 * the address these tests are about, so the rest is defaulted out of the way.
 */
function at(
  address: {
    mesh: BABYLON.AbstractMesh,
    faces?: { first: number, count: number },
    instance?: number
  },
  described: { type?: SceneElementType, id?: string, xb?: SceneXb } = {}
): SceneEntry {
  return {
    type: described.type ?? 'obst',
    id: described.id ?? 'ID',
    xb: described.xb ?? SOMEWHERE,
    ...address
  };
}

describe('SceneRegistryService', () => {
  let registry: SceneRegistryService;
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;
  let mesh: BABYLON.Mesh;
  let otherMesh: BABYLON.Mesh;

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    mesh = new BABYLON.Mesh('shared', scene);
    otherMesh = new BABYLON.Mesh('other', scene);

    TestBed.configureTestingModule({});
    registry = TestBed.inject(SceneRegistryService);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  it('should be created', () => {
    expect(registry).toBeTruthy();
  });

  describe('by uuid', () => {
    it('names the scene representation of a registered element', () => {
      registry.register('obst-1', at({ mesh: mesh, faces: { first: 0, count: 12 } }));

      expect(registry.entryFor('obst-1').mesh).toBe(mesh);
      expect(registry.entryFor('obst-1').faces).toEqual({ first: 0, count: 12 });
    });

    it('has nothing to say about an element it was never told about', () => {
      expect(registry.entryFor('never-drawn')).toBeUndefined();
    });

    it('takes an element that owns its whole mesh', () => {
      // Meshes, opens and jet fans get a mesh each - no face range needed
      registry.register('mesh-1', at({ mesh: otherMesh }));

      expect(registry.entryFor('mesh-1').mesh).toBe(otherMesh);
      expect(registry.entryFor('mesh-1').faces).toBeUndefined();
    });

    it('replaces an entry when the same element is drawn again', () => {
      registry.register('obst-1', at({ mesh: mesh, faces: { first: 0, count: 12 } }));
      registry.register('obst-1', at({ mesh: otherMesh }));

      expect(registry.entryFor('obst-1').mesh).toBe(otherMesh);
      expect(registry.uuidAt(mesh, 3)).toBeUndefined();
    });
  });

  describe('by face', () => {
    beforeEach(() => {
      // Three obsts batched into one mesh, 12 faces each
      registry.register('obst-1', at({ mesh: mesh, faces: { first: 0, count: 12 } }));
      registry.register('obst-2', at({ mesh: mesh, faces: { first: 12, count: 12 } }));
      // One carrying a hole, so its triangle count is not 12
      registry.register('obst-3', at({ mesh: mesh, faces: { first: 24, count: 30 } }));
    });

    it('names the element a face belongs to', () => {
      expect(registry.uuidAt(mesh, 0)).toBe('obst-1');
      expect(registry.uuidAt(mesh, 11)).toBe('obst-1');
      expect(registry.uuidAt(mesh, 12)).toBe('obst-2');
      expect(registry.uuidAt(mesh, 23)).toBe('obst-2');
    });

    it('names an element whose triangle count is not the usual twelve', () => {
      // The assumption `Math.floor(faceId / 12)` makes, and the reason picking
      // lands on the wrong obst once a &HOLE is cut out of one.
      expect(registry.uuidAt(mesh, 24)).toBe('obst-3');
      expect(registry.uuidAt(mesh, 53)).toBe('obst-3');
    });

    it('has nothing to say about a face beyond what was registered', () => {
      expect(registry.uuidAt(mesh, 54)).toBeUndefined();
    });

    it('keeps meshes apart', () => {
      registry.register('vent-1', at({ mesh: otherMesh, faces: { first: 0, count: 2 } }));

      expect(registry.uuidAt(otherMesh, 0)).toBe('vent-1');
      expect(registry.uuidAt(mesh, 0)).toBe('obst-1');
    });

    it('names an element that owns its whole mesh, whichever face was hit', () => {
      registry.register('jetfan-1', at({ mesh: otherMesh }));

      expect(registry.uuidAt(otherMesh, 0)).toBe('jetfan-1');
      expect(registry.uuidAt(otherMesh, 999)).toBe('jetfan-1');
    });
  });

  describe('by thin instance', () => {
    beforeEach(() => {
      // The bulk of the boxes share one base mesh; identity is the slot each of
      // them occupies in the instance buffer - see docs/adr/0006-*.md.
      registry.register('obst-1', at({ mesh: mesh, instance: 0 }));
      registry.register('obst-2', at({ mesh: mesh, instance: 1 }));
      registry.register('obst-3', at({ mesh: mesh, instance: 2 }));
    });

    it('names the element an instance belongs to', () => {
      expect(registry.uuidAtInstance(mesh, 0)).toBe('obst-1');
      expect(registry.uuidAtInstance(mesh, 2)).toBe('obst-3');
    });

    it('has nothing to say about a slot nothing was put in', () => {
      expect(registry.uuidAtInstance(mesh, 3)).toBeUndefined();
    });

    it('keeps base meshes apart', () => {
      registry.register('jetfan-1', at({ mesh: otherMesh, instance: 0 }));

      expect(registry.uuidAtInstance(otherMesh, 0)).toBe('jetfan-1');
      expect(registry.uuidAtInstance(mesh, 0)).toBe('obst-1');
    });

    it('lets go of a slot when the element moves elsewhere', () => {
      // Promotion to a mesh of its own is exactly this: the box leaves the pool
      registry.register('obst-2', at({ mesh: otherMesh }));

      expect(registry.uuidAtInstance(mesh, 1)).toBeUndefined();
      expect(registry.entryFor('obst-2').mesh).toBe(otherMesh);
    });
  });

  describe('forgetting a whole mesh at once', () => {
    it('drops every element drawn on it', () => {
      // What a pool does when the scenario is drawn again. One call rather than
      // one per box: forget() has to scan the mesh's list to find its entry, so
      // ten thousand of them is a hundred million comparisons.
      registry.register('obst-1', at({ mesh: mesh, instance: 0 }));
      registry.register('obst-2', at({ mesh: mesh, instance: 1 }));
      registry.register('vent-1', at({ mesh: otherMesh, faces: { first: 0, count: 2 } }));

      registry.forgetMesh(mesh);

      expect(registry.entryFor('obst-1')).toBeUndefined();
      expect(registry.entryFor('obst-2')).toBeUndefined();
      expect(registry.uuidAtInstance(mesh, 0)).toBeUndefined();
      expect(registry.entryFor('vent-1'))
        .withContext('another mesh is none of its business')
        .toBeTruthy();
    });

    it('is safe on a mesh nothing was ever drawn on', () => {
      expect(() => registry.forgetMesh(otherMesh)).not.toThrow();
    });
  });

  describe('answering a pick', () => {
    // What a pick hands over is a mesh plus a face, and a thin instance index
    // that is -1 for anything not instanced. One question, both representations.

    it('reads a face range when the hit was not an instance', () => {
      registry.register('obst-1', at({ mesh: mesh, faces: { first: 0, count: 12 } }));

      expect(registry.pickAt(mesh, 5, -1).uuid).toBe('obst-1');
    });

    it('reads the instance slot when the hit was one', () => {
      registry.register('obst-1', at({ mesh: mesh, instance: 0 }));
      registry.register('obst-2', at({ mesh: mesh, instance: 1 }));

      // Every instance is the same twelve faces of the base box, so the face is
      // no help at all here - only the slot says which obst was hit.
      expect(registry.pickAt(mesh, 5, 1).uuid).toBe('obst-2');
    });

    it('names an element that owns its whole mesh', () => {
      registry.register('obst-cut', at({ mesh: otherMesh }));

      expect(registry.pickAt(otherMesh, 40, -1).uuid).toBe('obst-cut');
    });

    it('names nobody when a face lands on a mesh whose elements are instances', () => {
      // Every instance draws the same twelve faces, so a face index cannot tell
      // them apart. Answering with the first of them would select an obst the
      // user never clicked on.
      registry.register('obst-1', at({ mesh: mesh, instance: 0 }));
      registry.register('obst-2', at({ mesh: mesh, instance: 1 }));

      expect(registry.uuidAt(mesh, 5)).toBeUndefined();
      expect(registry.pickAt(mesh, 5, -1)).toBeUndefined();
    });

    it('says what the element is, not only which one it is', () => {
      // Without the type the app would have to scan all eleven of its lists for
      // the uuid to find out what was clicked.
      const box: SceneXb = { x1: 1, x2: 2, y1: 3, y2: 4, z1: 5, z2: 6 };
      registry.register('vent-1', at(
        { mesh: otherMesh, faces: { first: 0, count: 2 } },
        { type: 'vent', id: 'V1', xb: box }
      ));

      const pick = registry.pickAt(otherMesh, 1, -1);

      expect(pick.type).toBe('vent');
      expect(pick.id).toBe('V1');
      expect(pick.xb).toEqual(box);
    });
  });

  describe('which meshes draw the scenario', () => {
    it('knows a mesh an element was registered on', () => {
      registry.register('obst-1', at({ mesh: mesh, instance: 0 }));

      expect(registry.drawsElements(mesh)).toBe(true);
    });

    it('does not know a mesh the library put on screen for its own reasons', () => {
      // The view cube, the world axes, a back cap, a highlight box. A pick that
      // reached those would answer with something the user cannot select.
      expect(registry.drawsElements(otherMesh)).toBe(false);
    });

    it('forgets a mesh once nothing is drawn on it', () => {
      registry.register('obst-1', at({ mesh: mesh, instance: 0 }));

      registry.forgetMesh(mesh);

      expect(registry.drawsElements(mesh)).toBe(false);
    });
  });

  describe('scene lifecycle', () => {
    it('is emptied when the scene goes away', () => {
      registry.register('obst-1', at({ mesh: mesh, faces: { first: 0, count: 12 } }));

      TestBed.inject(SceneLifecycleService).reset();

      expect(registry.entryFor('obst-1')).toBeUndefined();
      expect(registry.uuidAt(mesh, 0)).toBeUndefined();
    });
  });
});
