import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { JetfanService } from './jetfan.service';
import { VentService } from '../vent/vent.service';
import { BabylonService } from '../../babylon/babylon.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { SceneJetfan, SceneJetfanDirection, SceneXb } from '../scene-input';

function makeJetfan(
  id: string, xb: SceneXb, transparency: number, direction: SceneJetfanDirection = '+x'
): SceneJetfan {
  return {
    id: id,
    uuid: `${id}-uuid`,
    xb: xb,
    direction: direction,
    // A jetfan is drawn as a translucent box; its transparency is the alpha
    color: { r: 1, g: 0, b: 0, a: transparency }
  };
}

function box(x1: number, x2: number): SceneXb {
  return { x1: x1, x2: x2, y1: 3.0, y2: 5.0, z1: 1.0, z2: 3.0 };
}

describe('JetfanService', () => {
  let service: JetfanService;
  let ventService: VentService;
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
          // render() awaits one per mesh and would otherwise stop at the first.
          loadShaderSources: () => Promise.reject(new Error('no shader assets under test')),
          createShaderMaterial: (spec: { name: string }) => Promise.resolve(
            new BABYLON.ShaderMaterial(spec.name, scene, { vertexSource: '', fragmentSource: '' }, {})
          )
        }
      }]
    });
    service = TestBed.inject(JetfanService);
    ventService = TestBed.inject(VentService);
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
    it('registers every jetfan it draws, by uuid', async () => {
      service.jetfans = [makeJetfan('JF1', box(2, 8), 0.5), makeJetfan('JF2', box(12, 18), 0.5)];

      await service.render();

      expect(registry.entryFor('JF1-uuid')).toBeTruthy();
      expect(registry.entryFor('JF2-uuid')).toBeTruthy();
      expect(registry.entryFor('JF1-uuid').mesh).toBe(scene.getMeshByName('jetfansTransparent'));
    });

    it('maps a face back to the jetfan that owns it', async () => {
      service.jetfans = [makeJetfan('JF1', box(2, 8), 0.5), makeJetfan('JF2', box(12, 18), 0.5)];

      await service.render();

      const mesh = scene.getMeshByName('jetfansTransparent');
      const first = registry.entryFor('JF1-uuid').faces;
      const second = registry.entryFor('JF2-uuid').faces;
      expect(registry.uuidAt(mesh, first.first)).toBe('JF1-uuid');
      expect(registry.uuidAt(mesh, first.first + first.count - 1)).toBe('JF1-uuid');
      expect(registry.uuidAt(mesh, second.first)).toBe('JF2-uuid');
      expect(registry.uuidAt(mesh, second.first + second.count - 1)).toBe('JF2-uuid');
    });

    it('counts faces within the buffer the jetfan actually landed in', async () => {
      // Opaque and transparent jetfans go into separate buffers, so a face index
      // only means anything inside its own - a range counted across both would
      // name the transparent jetfan by an offset the opaque mesh uses.
      service.jetfans = [makeJetfan('SOLID', box(2, 8), 1), makeJetfan('GLAZED', box(12, 18), 0.5)];

      await service.render();

      const opaque = scene.getMeshByName('jetfans');
      const transparent = scene.getMeshByName('jetfansTransparent');
      expect(registry.entryFor('SOLID-uuid').mesh).toBe(opaque);
      expect(registry.entryFor('GLAZED-uuid').mesh).toBe(transparent);
      expect(registry.entryFor('GLAZED-uuid').faces.first)
        .withContext('the transparent jetfan starts at the head of its own buffer')
        .toBe(0);
      expect(registry.uuidAt(transparent, 0)).toBe('GLAZED-uuid');
      expect(registry.uuidAt(opaque, 0)).toBe('SOLID-uuid');
    });

    it('forgets the previous render rather than stacking entries', async () => {
      service.jetfans = [makeJetfan('JF1', box(2, 8), 0.5)];
      await service.render();

      service.jetfans = [makeJetfan('JF2', box(2, 8), 0.5)];
      await service.render();

      expect(registry.entryFor('JF1-uuid')).toBeUndefined();
      expect(registry.entryFor('JF2-uuid')).toBeTruthy();
    });

    it('forgets the jetfans it drew when they are cleared', async () => {
      service.jetfans = [makeJetfan('JF1', box(2, 8), 0.5)];
      await service.render();

      service.clear();

      expect(registry.entryFor('JF1-uuid')).toBeUndefined();
    });
  });

  describe('inlet and outlet planes', () => {
    // They are derived from the box and the direction - there is no &VENT behind
    // them, so nothing in the scenario has to carry them.

    it('collapses each plane onto the face the air crosses', async () => {
      service.jetfans = [makeJetfan('JF1', box(2, 8), 0.5, '+x')];

      await service.render();

      expect(ventService.vents.length).withContext('one inlet and one outlet').toBe(2);
      const inlet = ventService.vents[0].xb;
      const outlet = ventService.vents[1].xb;
      expect(inlet.x1).toBe(inlet.x2);
      expect(outlet.x1).toBe(outlet.x2);
      expect(outlet.x1).withContext('+x blows out of the far face').toBeGreaterThan(inlet.x1);
    });

    it('swaps the two faces when the fan blows the other way', async () => {
      service.jetfans = [makeJetfan('JF1', box(2, 8), 0.5, '-x')];

      await service.render();

      const inlet = ventService.vents[0].xb;
      const outlet = ventService.vents[1].xb;
      expect(outlet.x1).withContext('-x blows out of the near face').toBeLessThan(inlet.x1);
    });

    it('takes the vertical faces for a fan blowing up', async () => {
      service.jetfans = [makeJetfan('JF1', box(2, 8), 0.5, '+z')];

      await service.render();

      const inlet = ventService.vents[0].xb;
      const outlet = ventService.vents[1].xb;
      expect(inlet.z1).toBe(inlet.z2);
      expect(outlet.z1).toBe(outlet.z2);
      expect(outlet.z1).toBeGreaterThan(inlet.z1);
    });

    it('gives up its planes when the jetfans are cleared', async () => {
      service.jetfans = [makeJetfan('JF1', box(2, 8), 0.5)];
      await service.render();

      service.clear();

      expect(ventService.vents.length).toBe(0);
    });
  });

  describe('a jetfan that was never placed', () => {
    it('draws a stand-in box rather than a degenerate point', async () => {
      // Until a jetfan is placed in CAD the scenario holds all-zero coordinates,
      // and there is nothing to draw at that position.
      service.jetfans = [makeJetfan('JF1', { x1: 0, x2: 0, y1: 0, y2: 0, z1: 0, z2: 0 }, 0.5)];

      await service.render();

      const mesh = scene.getMeshByName('jetfansTransparent');
      expect(mesh).toBeTruthy();
      const size = mesh.getBoundingInfo().boundingBox.extendSize;
      expect(size.x).toBeGreaterThan(0);
      expect(size.y).toBeGreaterThan(0);
      expect(size.z).toBeGreaterThan(0);
    });
  });

  describe('resetSceneState', () => {
    it('names the mesh of the new scene, not the one it drew into before', async () => {
      // The disposed scene took its meshes with it, so re-rendering has to put
      // the jetfan on the mesh it has just built.
      service.jetfans = [makeJetfan('JF1', box(2, 8), 0.5)];
      await service.render();
      const drawnBefore = registry.entryFor('JF1-uuid').mesh;

      service.resetSceneState();
      await service.render();

      const drawnAfter = registry.entryFor('JF1-uuid').mesh;
      expect(drawnAfter).toBeTruthy();
      expect(drawnAfter.name).toBe('jetfansTransparent');
      expect(drawnAfter).not.toBe(drawnBefore);
    });
  });
});
