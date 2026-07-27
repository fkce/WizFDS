import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { VentService } from './vent.service';
import { BabylonService } from '../../babylon/babylon.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { IVent, IXb } from '../interfaces';

function makeVent(id: string, xb: IXb, rgb: number[]): IVent {
  return {
    id: id,
    uuid: `${id}-uuid`,
    idAC: 1,
    xb: xb,
    surf_id: 'SUPPLY',
    elevation: 0,
    color: { label: 'C', value: 'C', rgb: rgb, show: true },
    // Filled in by normalizeBasicVents(), which writes into an existing object
    vis: { xbNorm: { x1: 0, x2: 0, y1: 0, y2: 0, z1: 0, z2: 0 }, colorNorm: [1, 1, 1, 1] }
  };
}

/** &VENT XB with z1 = z2 - a horizontal plane, which is what FDS vents are. */
function plane(x1: number, x2: number, y1: number, y2: number, z: number): IXb {
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
    const blue = [0, 0, 255];
    const red = [255, 0, 0];

    it('registers every basic vent it draws, by uuid', async () => {
      service.basicVents = [
        makeVent('V1', plane(0, 2, 0, 2, 0), blue),
        makeVent('V2', plane(4, 6, 0, 2, 0), blue)
      ];

      await service.renderBasicVents();

      expect(registry.entryFor('V1-uuid')).toBeTruthy();
      expect(registry.entryFor('V2-uuid')).toBeTruthy();
      expect(registry.entryFor('V1-uuid').mesh).toBe(service.basicMeshGroups[0].mesh);
    });

    it('maps a face back to the vent that owns it', async () => {
      service.basicVents = [
        makeVent('V1', plane(0, 2, 0, 2, 0), blue),
        makeVent('V2', plane(4, 6, 0, 2, 0), blue)
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
        makeVent('BLUE', plane(0, 2, 0, 2, 0), blue),
        makeVent('RED', plane(4, 6, 0, 2, 0), red)
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
      service.basicVents = [makeVent('V1', plane(0, 2, 0, 2, 0), blue)];
      await service.renderBasicVents();

      service.basicVents = [makeVent('V2', plane(0, 2, 0, 2, 0), blue)];
      await service.renderBasicVents();

      expect(registry.entryFor('V1-uuid')).toBeUndefined();
      expect(registry.entryFor('V2-uuid')).toBeTruthy();
    });

    it('forgets the vents when the scenario has none left', async () => {
      // visualize.component.ts renders whatever ventilation.vents holds, empty
      // or not - so deleting the last vent arrives here as an empty list, and
      // the vent drawn for the previous one must stop answering for its faces.
      service.basicVents = [makeVent('V1', plane(0, 2, 0, 2, 0), blue)];
      await service.renderBasicVents();

      service.basicVents = [];
      await service.renderBasicVents();

      expect(registry.entryFor('V1-uuid')).toBeUndefined();
      expect(service.basicMeshGroups.length).toBe(0);
    });

    it('forgets the vents it drew when they are cleared', async () => {
      service.basicVents = [makeVent('V1', plane(0, 2, 0, 2, 0), blue)];
      await service.renderBasicVents();

      service.clearBasic();

      expect(registry.entryFor('V1-uuid')).toBeUndefined();
    });
  });

  describe('resetSceneState', () => {
    it('lets go of everything that belonged to the disposed scene', async () => {
      service.basicVents = [makeVent('V1', plane(0, 2, 0, 2, 0), [0, 0, 255])];
      await service.renderBasicVents();

      expect(service.basicMeshGroups.length).withContext('precondition: a mesh was built').toBe(1);

      service.resetSceneState();

      expect(service.basicMeshGroups.length).toBe(0);
      expect(service.mesh).toBeNull();
    });

    it('leaves the service able to draw into the next scene', async () => {
      service.basicVents = [makeVent('V1', plane(0, 2, 0, 2, 0), [0, 0, 255])];
      await service.renderBasicVents();

      service.resetSceneState();
      await service.renderBasicVents();

      expect(service.basicMeshGroups.length).toBe(1);
      expect(registry.entryFor('V1-uuid').mesh).toBe(service.basicMeshGroups[0].mesh);
    });
  });
});
