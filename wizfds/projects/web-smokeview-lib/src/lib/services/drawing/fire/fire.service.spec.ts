import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { FireService } from './fire.service';
import { BabylonService } from '../../babylon/babylon.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { SceneColor, SceneFire, SceneXb } from '../scene-input';

const RED: SceneColor = { r: 1, g: 0, b: 0, a: 1 };

function makeFire(id: string, xb: SceneXb): SceneFire {
  return { id: id, uuid: `${id}-uuid`, xb: xb, color: RED };
}

/** A fire is drawn as the plane of its &VENT, so its XB is flat on z. */
function plane(x1: number, x2: number, y1: number, y2: number, z: number): SceneXb {
  return { x1: x1, x2: x2, y1: y1, y2: y2, z1: z, z2: z };
}

describe('FireService', () => {
  let service: FireService;
  let registry: SceneRegistryService;
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;
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
          // No WGSL is served in the suite, so hand out a bare ShaderMaterial
          createShaderMaterial: (spec: { name: string }) => {
            const material = new BABYLON.ShaderMaterial(
              spec.name, scene, { vertexSource: '', fragmentSource: '' }, {});
            materials.push(material);
            return Promise.resolve(material);
          }
        }
      }]
    });
    service = TestBed.inject(FireService);
    registry = TestBed.inject(SceneRegistryService);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('when the shader cannot be loaded', () => {
    // #104, the same ordering VentService had: the mesh was built, the material
    // awaited, and only then was anything recorded that could dispose it.

    beforeEach(() => {
      const babylon: any = TestBed.inject(BabylonService);
      babylon.createShaderMaterial = () => Promise.reject(new Error('no shader'));
    });

    it('does not grow the scene on repeated renders', async () => {
      service.fires = [makeFire('F1', plane(0, 2, 0, 2, 0))];

      await service.renderFires();
      const afterFirst = scene.meshes.length;

      await service.renderFires();
      await service.renderFires();

      expect(scene.meshes.length).toBe(afterFirst);
    });

    it('leaves the fires pickable, since identity does not depend on the shader', async () => {
      service.fires = [makeFire('F1', plane(0, 2, 0, 2, 0))];

      await service.renderFires();

      expect(registry.uuidAt(service.mesh, 0)).toBe('F1-uuid');
    });
  });

  describe('identity', () => {
    it('registers every fire it draws, by uuid', async () => {
      service.fires = [makeFire('F1', plane(0, 2, 0, 2, 0)), makeFire('F2', plane(4, 6, 0, 2, 0))];

      await service.renderFires();

      expect(registry.entryFor('F1-uuid').mesh).toBe(service.mesh);
      expect(registry.entryFor('F2-uuid').mesh).toBe(service.mesh);
    });

    it('maps a face back to the fire that owns it', async () => {
      service.fires = [makeFire('F1', plane(0, 2, 0, 2, 0)), makeFire('F2', plane(4, 6, 0, 2, 0))];

      await service.renderFires();

      const second = registry.entryFor('F2-uuid').faces;
      expect(registry.uuidAt(service.mesh, 0)).toBe('F1-uuid');
      expect(registry.uuidAt(service.mesh, second.first)).toBe('F2-uuid');
    });

    it('forgets the fires when the scenario has none left', async () => {
      // The whole scene is handed over on every render, empty lists included, so
      // deleting the last fire arrives here as an empty list - and the plane
      // drawn for the previous one must not stay on screen
      service.fires = [makeFire('F1', plane(0, 2, 0, 2, 0))];
      await service.renderFires();

      service.fires = [];
      await service.renderFires();

      expect(registry.entryFor('F1-uuid')).toBeUndefined();
      expect(service.mesh.isEnabled()).toBe(false);
    });

    it('forgets the previous render rather than stacking entries', async () => {
      service.fires = [makeFire('F1', plane(0, 2, 0, 2, 0))];
      await service.renderFires();

      service.fires = [makeFire('F2', plane(0, 2, 0, 2, 0))];
      await service.renderFires();

      expect(registry.entryFor('F1-uuid')).toBeUndefined();
      expect(registry.entryFor('F2-uuid')).toBeTruthy();
    });
  });

  describe('renderFires', () => {
    it('draws every fire on one mesh', async () => {
      service.fires = [makeFire('F1', plane(0, 2, 0, 2, 0)), makeFire('F2', plane(4, 6, 0, 2, 0))];

      await service.renderFires();

      expect(service.mesh.getTotalVertices()).toBe(8);
    });

    it('builds its material once rather than orphaning one per render', async () => {
      service.fires = [makeFire('F1', plane(0, 2, 0, 2, 0))];

      await service.renderFires();
      await service.renderFires();
      await service.renderFires();

      expect(materials.length).toBe(1);
    });

    it('does not grow the scene on repeated renders', async () => {
      service.fires = [makeFire('F1', plane(0, 2, 0, 2, 0))];

      await service.renderFires();
      const afterFirst = scene.meshes.length;

      await service.renderFires();

      expect(scene.meshes.length).toBe(afterFirst);
    });
  });

  describe('resetSceneState', () => {
    it('leaves the service able to draw into the next scene', async () => {
      service.fires = [makeFire('F1', plane(0, 2, 0, 2, 0))];
      await service.renderFires();

      service.resetSceneState();
      await service.renderFires();

      expect(registry.entryFor('F1-uuid').mesh).toBe(service.mesh);
    });
  });
});
