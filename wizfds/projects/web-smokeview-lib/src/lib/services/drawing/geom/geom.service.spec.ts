import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { GeomService } from './geom.service';
import { BabylonService } from '../../babylon/babylon.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { SceneGeom } from '../scene-input';

const GREY = { r: 0.7, g: 0.7, b: 0.7, a: 1 };

/** A quad in the z = 0 plane, as two triangles. */
function quad(id: string, offsetX = 0): SceneGeom {
  return {
    id: id, uuid: `${id}-uuid`, color: GREY,
    xb: { x1: offsetX, x2: offsetX + 2, y1: 0, y2: 2, z1: 0, z2: 0 },
    vertices: [
      offsetX, 0, 0,
      offsetX + 2, 0, 0,
      offsetX + 2, 2, 0,
      offsetX, 2, 0
    ],
    faces: [0, 1, 2, 0, 2, 3]
  };
}

describe('GeomService', () => {
  let service: GeomService;
  let registry: SceneRegistryService;
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;
  /** Every material the service asked for, in the order it asked. */
  let materials: BABYLON.ShaderMaterial[];

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    materials = [];

    TestBed.configureTestingModule({
      providers: [{
        provide: BabylonService,
        useValue: {
          scene: scene,
          createShaderMaterial: (spec: { name: string }) => {
            const material = new BABYLON.ShaderMaterial(
              spec.name, scene, { vertexSource: '', fragmentSource: '' }, {});
            materials.push(material);
            return Promise.resolve(material);
          }
        }
      }]
    });
    service = TestBed.inject(GeomService);
    registry = TestBed.inject(SceneRegistryService);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('renderGeoms', () => {
    it('draws the triangles the scenario gave it', async () => {
      service.geoms = [quad('G1')];

      await service.renderGeoms();

      const mesh = service.meshFor('G1-uuid');
      expect(mesh.getTotalVertices()).toBe(4);
      expect(mesh.getIndices().length).toBe(6);
    });

    it('puts the triangles where the scenario put them, in metres', async () => {
      service.geoms = [quad('G1', 100)];

      await service.renderGeoms();

      const positions = Array.from(
        service.meshFor('G1-uuid').getVerticesData(BABYLON.VertexBuffer.PositionKind));
      const xs = positions.filter((_, i) => i % 3 === 0);
      expect(Math.min(...xs)).toBeCloseTo(100, 6);
      expect(Math.max(...xs)).toBeCloseTo(102, 6);
    });

    it('gives each geom a mesh of its own', async () => {
      // Its geometry does not follow from a box, so there is nothing to instance
      // and nothing to batch it with - the separate-mesh path of ADR-0006
      service.geoms = [quad('G1'), quad('G2', 5)];

      await service.renderGeoms();

      expect(service.meshFor('G1-uuid')).not.toBe(service.meshFor('G2-uuid'));
    });

    it('colours every vertex from the &SURF the app resolved', async () => {
      service.geoms = [quad('G1')];

      await service.renderGeoms();

      const colors = Array.from(
        service.meshFor('G1-uuid').getVerticesData(BABYLON.VertexBuffer.ColorKind));
      expect(colors.length).toBe(16);
      expect(colors[0]).toBeCloseTo(0.7, 6);
      expect(colors[3]).toBeCloseTo(1, 6);
    });

    it('works out the normals, so the geom is lit rather than flat black', async () => {
      service.geoms = [quad('G1')];

      await service.renderGeoms();

      const normals = service.meshFor('G1-uuid').getVerticesData(BABYLON.VertexBuffer.NormalKind);
      expect(normals).toBeTruthy();
      expect(normals.length).toBe(12);
    });

    it('does not grow the scene on repeated renders', async () => {
      service.geoms = [quad('G1'), quad('G2', 5)];

      await service.renderGeoms();
      const afterFirst = scene.meshes.length;

      await service.renderGeoms();
      await service.renderGeoms();

      expect(scene.meshes.length).toBe(afterFirst);
    });

    it('builds its material once rather than orphaning one per render', async () => {
      service.geoms = [quad('G1')];

      await service.renderGeoms();
      await service.renderGeoms();

      expect(materials.length).toBe(1);
    });
  });

  describe('identity', () => {
    it('registers every geom it draws, by uuid', async () => {
      service.geoms = [quad('G1'), quad('G2', 5)];

      await service.renderGeoms();

      expect(registry.entryFor('G1-uuid').mesh).toBe(service.meshFor('G1-uuid'));
      expect(registry.entryFor('G2-uuid').mesh).toBe(service.meshFor('G2-uuid'));
    });

    it('answers a pick anywhere on the geom, since the mesh alone identifies it', async () => {
      service.geoms = [quad('G1')];

      await service.renderGeoms();

      const mesh = service.meshFor('G1-uuid');
      expect(registry.uuidAt(mesh, 0)).toBe('G1-uuid');
      expect(registry.uuidAt(mesh, 1)).toBe('G1-uuid');
    });

    it('forgets the geoms when the scenario has none left', async () => {
      service.geoms = [quad('G1')];
      await service.renderGeoms();

      service.geoms = [];
      await service.renderGeoms();

      expect(registry.entryFor('G1-uuid')).toBeUndefined();
      expect(service.meshFor('G1-uuid')).toBeUndefined();
    });
  });

  describe('resetSceneState', () => {
    it('leaves the service able to draw into the next scene', async () => {
      service.geoms = [quad('G1')];
      await service.renderGeoms();

      service.resetSceneState();
      await service.renderGeoms();

      expect(registry.entryFor('G1-uuid').mesh).toBe(service.meshFor('G1-uuid'));
    });
  });
});
