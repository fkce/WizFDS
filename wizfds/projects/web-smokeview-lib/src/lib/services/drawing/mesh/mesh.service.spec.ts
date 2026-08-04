import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { MeshService } from './mesh.service';
import { BabylonService } from '../../babylon/babylon.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { SceneMesh, SceneXb } from '../scene-input';

/** A quarter-metre grid - nothing here is drawn from it, but a mesh has one. */
const CELL = { i: 0.25, j: 0.25, k: 0.25 };

function makeMesh(id: string, xb: SceneXb): SceneMesh {
  return { id: id, uuid: `${id}-uuid`, xb: xb, cell: CELL };
}

describe('MeshService', () => {
  let service: MeshService;
  let registry: SceneRegistryService;
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);

    TestBed.configureTestingModule({
      providers: [{
        provide: BabylonService,
        useValue: {
          scene: scene,
          camera: { setPosition: () => { }, setTarget: () => { } },
          loadShaderSources: () => Promise.reject(new Error('no shader assets under test')),
          createShaderMaterial: () => Promise.reject(new Error('no shader assets under test'))
        }
      }]
    });
    service = TestBed.inject(MeshService);
    registry = TestBed.inject(SceneRegistryService);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('tolerates the visibility button being clicked before anything is rendered', () => {
    // The control is live from the first frame, while the shader material is
    // still being fetched - FireService already guards this way.
    expect(() => service.toogleVisibility()).not.toThrow();
  });

  describe('drawing', () => {
    it('draws every &MESH as an instance of one box', () => {
      service.meshes = [
        makeMesh('M1', { x1: 0, x2: 10, y1: 0, y2: 8, z1: 0, z2: 4 }),
        makeMesh('M2', { x1: 10, x2: 20, y1: 0, y2: 8, z1: 0, z2: 4 })
      ];

      service.renderMeshes();

      expect(service.mesh.thinInstanceCount).toBe(2);
      expect(service.mesh.getTotalVertices()).toBe(24);
    });

    it('puts each one where the scenario says, in metres', () => {
      const xb = { x1: -20, x2: 400, y1: 0, y2: 100, z1: 0, z2: 30 };
      service.meshes = [makeMesh('M1', xb)];

      service.renderMeshes();

      const matrix = service.mesh.thinInstanceGetWorldMatrices()[0];
      const low = BABYLON.Vector3.TransformCoordinates(
        new BABYLON.Vector3(-0.5, -0.5, -0.5), matrix);
      const high = BABYLON.Vector3.TransformCoordinates(
        new BABYLON.Vector3(0.5, 0.5, 0.5), matrix);
      expect(low.x).toBeCloseTo(xb.x1, 3);
      expect(high.x).toBeCloseTo(xb.x2, 3);
      expect(high.z).toBeCloseTo(xb.z2, 3);
    });

    it('registers every &MESH it draws, by uuid', () => {
      service.meshes = [makeMesh('M1', { x1: 0, x2: 10, y1: 0, y2: 8, z1: 0, z2: 4 })];

      service.renderMeshes();

      expect(registry.entryFor('M1-uuid').mesh).toBe(service.mesh);
      expect(registry.uuidAtInstance(service.mesh, 0)).toBe('M1-uuid');
    });

    it('takes the previous scenario\'s meshes off the screen', () => {
      service.meshes = [makeMesh('M1', { x1: 0, x2: 10, y1: 0, y2: 8, z1: 0, z2: 4 })];
      service.renderMeshes();

      service.meshes = [];
      service.renderMeshes();

      expect(service.mesh.thinInstanceCount).toBe(0);
      expect(registry.entryFor('M1-uuid')).toBeUndefined();
    });
  });
});
