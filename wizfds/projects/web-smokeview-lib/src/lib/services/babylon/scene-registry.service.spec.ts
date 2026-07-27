import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { SceneRegistryService } from './scene-registry.service';
import { SceneLifecycleService } from './scene-lifecycle.service';

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
      registry.register('obst-1', { mesh: mesh, faces: { first: 0, count: 12 } });

      expect(registry.entryFor('obst-1').mesh).toBe(mesh);
      expect(registry.entryFor('obst-1').faces).toEqual({ first: 0, count: 12 });
    });

    it('has nothing to say about an element it was never told about', () => {
      expect(registry.entryFor('never-drawn')).toBeUndefined();
    });

    it('takes an element that owns its whole mesh', () => {
      // Meshes, opens and jet fans get a mesh each - no face range needed
      registry.register('mesh-1', { mesh: otherMesh });

      expect(registry.entryFor('mesh-1').mesh).toBe(otherMesh);
      expect(registry.entryFor('mesh-1').faces).toBeUndefined();
    });

    it('replaces an entry when the same element is drawn again', () => {
      registry.register('obst-1', { mesh: mesh, faces: { first: 0, count: 12 } });
      registry.register('obst-1', { mesh: otherMesh });

      expect(registry.entryFor('obst-1').mesh).toBe(otherMesh);
      expect(registry.uuidAt(mesh, 3)).toBeUndefined();
    });
  });

  describe('by face', () => {
    beforeEach(() => {
      // Three obsts batched into one mesh, 12 faces each
      registry.register('obst-1', { mesh: mesh, faces: { first: 0, count: 12 } });
      registry.register('obst-2', { mesh: mesh, faces: { first: 12, count: 12 } });
      // One carrying a hole, so its triangle count is not 12
      registry.register('obst-3', { mesh: mesh, faces: { first: 24, count: 30 } });
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
      registry.register('vent-1', { mesh: otherMesh, faces: { first: 0, count: 2 } });

      expect(registry.uuidAt(otherMesh, 0)).toBe('vent-1');
      expect(registry.uuidAt(mesh, 0)).toBe('obst-1');
    });

    it('names an element that owns its whole mesh, whichever face was hit', () => {
      registry.register('jetfan-1', { mesh: otherMesh });

      expect(registry.uuidAt(otherMesh, 0)).toBe('jetfan-1');
      expect(registry.uuidAt(otherMesh, 999)).toBe('jetfan-1');
    });
  });

  describe('scene lifecycle', () => {
    it('is emptied when the scene goes away', () => {
      registry.register('obst-1', { mesh: mesh, faces: { first: 0, count: 12 } });

      TestBed.inject(SceneLifecycleService).reset();

      expect(registry.entryFor('obst-1')).toBeUndefined();
      expect(registry.uuidAt(mesh, 0)).toBeUndefined();
    });
  });
});
