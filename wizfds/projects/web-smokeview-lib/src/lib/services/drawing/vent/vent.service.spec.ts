import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { VentService } from './vent.service';
import { BabylonService } from '../../babylon/babylon.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { SceneColor, SceneVent, SceneXb } from '../scene-input';

/** The colours the app resolves from a &SURF, already in 0..1. */
const BLUE: SceneColor = { r: 0, g: 0, b: 1, a: 1 };
const RED: SceneColor = { r: 1, g: 0, b: 0, a: 1 };

function makeVent(id: string, xb: SceneXb, color: SceneColor): SceneVent {
  return {
    id: id,
    uuid: `${id}-uuid`,
    xb: xb,
    color: color
  };
}

/** &VENT XB with z1 = z2 - a horizontal plane, which is what FDS vents are. */
function plane(x1: number, x2: number, y1: number, y2: number, z: number): SceneXb {
  return { x1: x1, x2: x2, y1: y1, y2: y2, z1: z, z2: z };
}

describe('VentService', () => {
  let service: VentService;
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
          // No WGSL is served in the suite, so hand out a bare ShaderMaterial:
          // renderBasicVents() awaits one per colour group and would otherwise
          // abandon the loop after the first group.
          loadShaderSources: () => Promise.reject(new Error('no shader assets under test')),
          createShaderMaterial: (spec: { name: string }) => Promise.resolve(
            new BABYLON.ShaderMaterial(spec.name, scene, { vertexSource: '', fragmentSource: '' }, {})
          )
        }
      }]
    });
    service = TestBed.inject(VentService);
    registry = TestBed.inject(SceneRegistryService);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('scene registry', () => {
    it('registers every basic vent it draws, by uuid', async () => {
      service.basicVents = [
        makeVent('V1', plane(0, 2, 0, 2, 0), BLUE),
        makeVent('V2', plane(4, 6, 0, 2, 0), BLUE)
      ];

      await service.renderBasicVents();

      expect(registry.entryFor('V1-uuid')).toBeTruthy();
      expect(registry.entryFor('V2-uuid')).toBeTruthy();
      expect(registry.entryFor('V1-uuid').mesh).toBe(service.basicMeshGroups[0].mesh);
    });

    it('maps a face back to the vent that owns it', async () => {
      service.basicVents = [
        makeVent('V1', plane(0, 2, 0, 2, 0), BLUE),
        makeVent('V2', plane(4, 6, 0, 2, 0), BLUE)
      ];

      await service.renderBasicVents();

      const mesh = service.basicMeshGroups[0].mesh;
      const first = registry.entryFor('V1-uuid').faces;
      const second = registry.entryFor('V2-uuid').faces;
      expect(registry.uuidAt(mesh, first.first)).toBe('V1-uuid');
      expect(registry.uuidAt(mesh, first.first + first.count - 1)).toBe('V1-uuid');
      expect(registry.uuidAt(mesh, second.first)).toBe('V2-uuid');
      expect(registry.uuidAt(mesh, second.first + second.count - 1)).toBe('V2-uuid');
    });

    it('counts faces within the colour group buffer, not across all vents', async () => {
      // Vents are batched one buffer per colour, so a face index is only
      // meaningful inside its own group - a range counted across the whole
      // scenario would name the red vent by an offset the blue buffer uses.
      service.basicVents = [
        makeVent('BLUE', plane(0, 2, 0, 2, 0), BLUE),
        makeVent('RED', plane(4, 6, 0, 2, 0), RED)
      ];

      await service.renderBasicVents();

      expect(service.basicMeshGroups.length).withContext('one mesh per colour').toBe(2);
      const blueMesh = registry.entryFor('BLUE-uuid').mesh;
      const redMesh = registry.entryFor('RED-uuid').mesh;
      expect(blueMesh).not.toBe(redMesh);
      expect(registry.entryFor('RED-uuid').faces.first)
        .withContext('the red vent starts at the head of its own buffer')
        .toBe(0);
      expect(registry.uuidAt(redMesh, 0)).toBe('RED-uuid');
      expect(registry.uuidAt(blueMesh, 0)).toBe('BLUE-uuid');
    });

    it('forgets the previous render rather than stacking entries', async () => {
      service.basicVents = [makeVent('V1', plane(0, 2, 0, 2, 0), BLUE)];
      await service.renderBasicVents();

      service.basicVents = [makeVent('V2', plane(0, 2, 0, 2, 0), BLUE)];
      await service.renderBasicVents();

      expect(registry.entryFor('V1-uuid')).toBeUndefined();
      expect(registry.entryFor('V2-uuid')).toBeTruthy();
    });

    it('forgets the vents when the scenario has none left', async () => {
      // The whole scene is handed over on every render, empty lists included - so
      // deleting the last vent arrives here as an empty list, and the vent drawn
      // for the previous one must stop answering for its faces.
      service.basicVents = [makeVent('V1', plane(0, 2, 0, 2, 0), BLUE)];
      await service.renderBasicVents();

      service.basicVents = [];
      await service.renderBasicVents();

      expect(registry.entryFor('V1-uuid')).toBeUndefined();
      expect(service.basicMeshGroups.length).toBe(0);
    });

    it('forgets the vents it drew when they are cleared', async () => {
      service.basicVents = [makeVent('V1', plane(0, 2, 0, 2, 0), BLUE)];
      await service.renderBasicVents();

      service.clearBasic();

      expect(registry.entryFor('V1-uuid')).toBeUndefined();
    });
  });

  describe('resetSceneState', () => {
    it('lets go of everything that belonged to the disposed scene', async () => {
      service.basicVents = [makeVent('V1', plane(0, 2, 0, 2, 0), BLUE)];
      await service.renderBasicVents();

      expect(service.basicMeshGroups.length).withContext('precondition: a mesh was built').toBe(1);

      service.resetSceneState();

      expect(service.basicMeshGroups.length).toBe(0);
      expect(service.mesh).toBeNull();
    });

    it('leaves the service able to draw into the next scene', async () => {
      service.basicVents = [makeVent('V1', plane(0, 2, 0, 2, 0), BLUE)];
      await service.renderBasicVents();

      service.resetSceneState();
      await service.renderBasicVents();

      expect(service.basicMeshGroups.length).toBe(1);
      expect(registry.entryFor('V1-uuid').mesh).toBe(service.basicMeshGroups[0].mesh);
    });
  });

  describe('derived vents', () => {
    // The inlet and outlet planes of a jetfan are drawings, not elements of the
    // scenario, so they carry no identity.

    it('draws a translucent derived vent into the transparent buffer', async () => {
      service.vents = [{ xb: plane(0, 0.2, 0, 0.2, 0.1), color: [0, 0, 1, 0.8] }];

      await service.render();

      expect(scene.getMeshByName('ventsTransparent')).toBeTruthy();
      expect(scene.getMeshByName('vents')).toBeFalsy();
    });

    it('draws an opaque derived vent into the opaque buffer', async () => {
      service.vents = [{ xb: plane(0, 0.2, 0, 0.2, 0.1), color: [0, 0, 1, 1] }];

      await service.render();

      expect(scene.getMeshByName('vents')).toBeTruthy();
      expect(scene.getMeshByName('ventsTransparent')).toBeFalsy();
    });
  });
});
