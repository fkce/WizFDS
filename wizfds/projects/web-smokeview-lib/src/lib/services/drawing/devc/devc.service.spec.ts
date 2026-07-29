import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { DevcService } from './devc.service';
import { BabylonService } from '../../babylon/babylon.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { SceneBoundsService } from '../../scene-bounds/scene-bounds.service';
import { SceneDevc, SceneDevcExtent, SceneDevcMarker, SceneXb } from '../scene-input';

const CYAN = { r: 0, g: 0.86, b: 1, a: 1 };

function point(id: string, x: number, y: number, z: number, marker: SceneDevcMarker): SceneDevc {
  return {
    id: id, uuid: `${id}-uuid`, extent: 'point', marker: marker, color: CYAN,
    xb: { x1: x, x2: x, y1: y, y2: y, z1: z, z2: z }
  };
}

function spread(id: string, extent: SceneDevcExtent, xb: SceneXb): SceneDevc {
  return { id: id, uuid: `${id}-uuid`, extent: extent, marker: 'sensor', color: CYAN, xb: xb };
}

describe('DevcService', () => {
  let service: DevcService;
  let registry: SceneRegistryService;
  let bounds: SceneBoundsService;
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
          // No WGSL is served in the suite, so hand out a bare ShaderMaterial
          createShaderMaterial: (spec: { name: string }) => Promise.resolve(
            new BABYLON.ShaderMaterial(spec.name, scene, { vertexSource: '', fragmentSource: '' }, {})
          )
        }
      }]
    });
    service = TestBed.inject(DevcService);
    registry = TestBed.inject(SceneRegistryService);
    bounds = TestBed.inject(SceneBoundsService);
    // A ten-metre room, so the marker size is the physical one
    bounds.setFrom([{ x1: 0, x2: 10, y1: 0, y2: 8, z1: 0, z2: 4 }]);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  /** The box a registered element actually occupies, read off its instance. */
  function drawnBox(uuid: string): SceneXb {
    const entry = registry.entryFor(uuid);
    const matrix = (entry.mesh as BABYLON.Mesh).thinInstanceGetWorldMatrices()[entry.instance];
    const corner = (x: number, y: number, z: number) =>
      BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(x, y, z), matrix);
    const low = corner(-0.5, -0.5, -0.5);
    const high = corner(0.5, 0.5, 0.5);
    return { x1: low.x, x2: high.x, y1: low.y, y2: high.y, z1: low.z, z2: high.z };
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('point devices', () => {
    it('draws each kind of device from the shape that stands for it', async () => {
      service.devcs = [
        point('SPR', 5, 4, 3.8, 'sprinkler'),
        point('SD', 2, 6, 3.9, 'smoke detector')
      ];

      await service.renderDevcs();

      expect(registry.entryFor('SPR-uuid').mesh).toBe(service.markerMesh('sprinkler'));
      expect(registry.entryFor('SD-uuid').mesh).toBe(service.markerMesh('smoke detector'));
    });

    it('draws two devices of the same kind from one shape', async () => {
      // The whole point of instancing them: one mesh however many are drawn
      service.devcs = [point('A', 1, 1, 1, 'sensor'), point('B', 2, 2, 2, 'sensor')];

      await service.renderDevcs();

      expect(registry.entryFor('A-uuid').mesh).toBe(registry.entryFor('B-uuid').mesh);
      expect(registry.entryFor('A-uuid').instance).not.toBe(registry.entryFor('B-uuid').instance);
    });

    it('centres the marker on the point the device stands at', async () => {
      service.devcs = [point('SPR', 5, 4, 3.8, 'sprinkler')];

      await service.renderDevcs();

      const box = drawnBox('SPR-uuid');
      expect((box.x1 + box.x2) / 2).toBeCloseTo(5, 6);
      expect((box.y1 + box.y2) / 2).toBeCloseTo(4, 6);
      expect((box.z1 + box.z2) / 2).toBeCloseTo(3.8, 6);
    });

    it('gives the marker a size the scene decides, not a box of no extent', async () => {
      // A device is a point, and scaling a shape by zero draws nothing at all
      service.devcs = [point('SPR', 5, 4, 3.8, 'sprinkler')];

      await service.renderDevcs();

      const box = drawnBox('SPR-uuid');
      expect(box.x2 - box.x1).toBeCloseTo(bounds.markerSize, 6);
      expect(box.z2 - box.z1).toBeCloseTo(bounds.markerSize, 6);
    });

    it('grows the marker with the model, so it stays visible in a tunnel', async () => {
      bounds.setFrom([{ x1: 0, x2: 400, y1: 0, y2: 12, z1: 0, z2: 6 }]);
      service.devcs = [point('SPR', 5, 4, 3.8, 'sprinkler')];

      await service.renderDevcs();

      expect(drawnBox('SPR-uuid').x2 - drawnBox('SPR-uuid').x1).toBeGreaterThan(0.3);
    });
  });

  describe('devices that take up space', () => {
    it('draws a volume device as the box it measures', async () => {
      const room: SceneXb = { x1: 0, x2: 10, y1: 0, y2: 8, z1: 0, z2: 4 };
      service.devcs = [spread('LAYER', 'volume', room)];

      await service.renderDevcs();

      const box = drawnBox('LAYER-uuid');
      expect(box.x1).toBeCloseTo(0, 6);
      expect(box.x2).toBeCloseTo(10, 6);
      expect(box.z2).toBeCloseTo(4, 6);
    });

    it('gives a linear device enough thickness to be seen', async () => {
      // A thermocouple tree is a line: two of its three sides have no extent at
      // all, and a beam drawn at nothing wide is a beam nobody can see or click
      service.devcs = [spread('TC', 'linear', { x1: 1, x2: 1, y1: 1, y2: 1, z1: 0, z2: 4 })];

      await service.renderDevcs();

      const box = drawnBox('TC-uuid');
      expect(box.x2 - box.x1).toBeGreaterThan(0);
      expect(box.y2 - box.y1).toBeGreaterThan(0);
      expect(box.z2 - box.z1).withContext('its own length is left alone').toBeCloseTo(4, 6);
    });

    it('draws a plane device on the plane batch rather than as a body', async () => {
      service.devcs = [spread('SLICE', 'plane', { x1: 0, x2: 10, y1: 4, y2: 4, z1: 0, z2: 4 })];

      await service.renderDevcs();

      expect(registry.entryFor('SLICE-uuid').mesh).toBe(service.planeMesh);
      expect(registry.entryFor('SLICE-uuid').faces).toBeTruthy();
    });
  });

  describe('identity', () => {
    it('registers every device it draws, whatever path drew it', async () => {
      service.devcs = [
        point('SPR', 5, 4, 3.8, 'sprinkler'),
        spread('LAYER', 'volume', { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 }),
        spread('SLICE', 'plane', { x1: 0, x2: 1, y1: 0, y2: 0, z1: 0, z2: 1 })
      ];

      await service.renderDevcs();

      ['SPR-uuid', 'LAYER-uuid', 'SLICE-uuid'].forEach(uuid => {
        expect(registry.entryFor(uuid)).withContext(uuid).toBeTruthy();
      });
    });

    it('forgets the devices when the scenario has none left', async () => {
      service.devcs = [point('SPR', 5, 4, 3.8, 'sprinkler')];
      await service.renderDevcs();

      service.devcs = [];
      await service.renderDevcs();

      expect(registry.entryFor('SPR-uuid')).toBeUndefined();
    });

    it('forgets a device whose kind changed, rather than drawing it twice', async () => {
      service.devcs = [point('D', 1, 1, 1, 'sensor')];
      await service.renderDevcs();

      service.devcs = [point('D', 1, 1, 1, 'sprinkler')];
      await service.renderDevcs();

      expect(registry.entryFor('D-uuid').mesh).toBe(service.markerMesh('sprinkler'));
      expect(service.markerMesh('sensor').thinInstanceCount).toBe(0);
    });
  });

  describe('renderDevcs', () => {
    it('does not grow the scene on repeated renders', async () => {
      service.devcs = [
        point('SPR', 5, 4, 3.8, 'sprinkler'),
        spread('LAYER', 'volume', { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 })
      ];

      await service.renderDevcs();
      const afterFirst = scene.meshes.length;

      await service.renderDevcs();
      await service.renderDevcs();

      expect(scene.meshes.length).toBe(afterFirst);
    });

    it('leaves the service able to draw into the next scene', async () => {
      service.devcs = [point('SPR', 5, 4, 3.8, 'sprinkler')];
      await service.renderDevcs();

      service.resetSceneState();
      await service.renderDevcs();

      expect(registry.entryFor('SPR-uuid').mesh).toBe(service.markerMesh('sprinkler'));
    });
  });
});
