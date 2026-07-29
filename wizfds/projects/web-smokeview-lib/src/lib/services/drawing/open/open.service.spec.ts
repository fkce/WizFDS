import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { OpenService } from './open.service';
import { BabylonService } from '../../babylon/babylon.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { SceneOpen, SceneXb } from '../scene-input';

function makeOpen(id: string, xb: SceneXb): SceneOpen {
  return {
    id: id,
    uuid: `${id}-uuid`,
    xb: xb
  };
}

describe('OpenService', () => {
  let service: OpenService;
  let registry: SceneRegistryService;
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;
  /** Every material the service asked for, in the order it asked. */
  let materials: BABYLON.ShaderMaterial[];

  beforeEach(() => {
    // A headless engine is enough: these tests read buffers, they do not draw.
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
            spyOn(material, 'setFloat').and.callThrough();
            materials.push(material);
            return Promise.resolve(material);
          }
        }
      }]
    });
    service = TestBed.inject(OpenService);
    registry = TestBed.inject(SceneRegistryService);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  /** The last value the service pushed for a uniform, or undefined. */
  function lastUniform(material: BABYLON.ShaderMaterial, name: string): number | undefined {
    const calls = (material.setFloat as jasmine.Spy).calls.all()
      .filter(call => call.args[0] === name);
    return calls.length > 0 ? calls[calls.length - 1].args[1] : undefined;
  }

  // Openings are planes: a wall on y = 0 and a floor on z = 0
  const wall: SceneXb = { x1: 0, x2: 2, y1: 0, y2: 0, z1: 0, z2: 3 };
  const floor: SceneXb = { x1: 0, x2: 2, y1: 0, y2: 2, z1: 0, z2: 0 };

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('tolerates the visibility button being clicked before anything is rendered', () => {
    expect(() => service.toogleVisibility()).not.toThrow();
  });

  it('tolerates a clip slider being dragged before anything is rendered', () => {
    expect(() => service.clip(1.5, 'x')).not.toThrow();
  });

  describe('renderOpens', () => {
    it('draws every opening on one mesh', async () => {
      service.opens = [makeOpen('OPEN_1', wall), makeOpen('OPEN_2', floor)];

      await service.renderOpens();

      // Two openings, two rectangles, one buffer - four vertices apiece
      expect(service.mesh.getTotalVertices()).toBe(8);
      expect(service.mesh.getIndices().length).toBe(12);
    });

    it('draws the opening where the scenario put it, in metres', async () => {
      service.opens = [makeOpen('OPEN_1', wall)];

      await service.renderOpens();

      const positions = Array.from(service.mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind));
      const xs = positions.filter((_, i) => i % 3 === 0);
      const zs = positions.filter((_, i) => i % 3 === 2);
      expect(Math.min(...xs)).toBeCloseTo(0, 6);
      expect(Math.max(...xs)).toBeCloseTo(2, 6);
      expect(Math.max(...zs)).toBeCloseTo(3, 6);
    });

    it('does not grow the scene on repeated renders', async () => {
      service.opens = [makeOpen('OPEN_1', wall), makeOpen('OPEN_2', floor)];

      await service.renderOpens();
      const afterFirst = scene.meshes.length;

      await service.renderOpens();
      await service.renderOpens();

      expect(scene.meshes.length).toBe(afterFirst);
    });

    it('builds its material once rather than orphaning one per render', async () => {
      service.opens = [makeOpen('OPEN_1', wall)];

      await service.renderOpens();
      await service.renderOpens();

      expect(materials.length).toBe(1);
    });
  });

  describe('identity', () => {
    it('registers every opening it draws, by uuid', async () => {
      service.opens = [makeOpen('OPEN_1', wall), makeOpen('OPEN_2', floor)];

      await service.renderOpens();

      expect(registry.entryFor('OPEN_1-uuid').mesh).toBe(service.mesh);
      expect(registry.entryFor('OPEN_2-uuid').mesh).toBe(service.mesh);
    });

    it('maps a face back to the opening that owns it', async () => {
      service.opens = [makeOpen('OPEN_1', wall), makeOpen('OPEN_2', floor)];

      await service.renderOpens();

      const second = registry.entryFor('OPEN_2-uuid').faces;
      expect(registry.uuidAt(service.mesh, 0)).toBe('OPEN_1-uuid');
      expect(registry.uuidAt(service.mesh, second.first)).toBe('OPEN_2-uuid');
    });

    it('forgets the openings when the scenario has none left', async () => {
      service.opens = [makeOpen('OPEN_1', wall)];
      await service.renderOpens();

      service.opens = [];
      await service.renderOpens();

      expect(registry.entryFor('OPEN_1-uuid')).toBeUndefined();
    });
  });

  describe('clipping', () => {
    // Openings used to be drawn with a StandardMaterial and no clipping at all,
    // so a plane dragged through the model cut everything except them.

    it('cuts the openings along with the rest of the model', async () => {
      service.opens = [makeOpen('OPEN_1', wall)];
      await service.renderOpens();

      service.clip(1.5, 'x');

      expect(lastUniform(materials[0], 'clipX')).toBeCloseTo(1.5, 6);
    });

    it('applies a plane moved before the material arrived', async () => {
      // The sliders are live from the first frame, while the shader sources are
      // still being fetched
      service.clip(2.5, 'z');

      service.opens = [makeOpen('OPEN_1', wall)];
      await service.renderOpens();

      expect(lastUniform(materials[0], 'clipZ')).toBeCloseTo(2.5, 6);
    });
  });

  describe('toogleVisibility', () => {
    it('cycles the fill through the three states and back', async () => {
      service.opens = [makeOpen('OPEN_1', wall)];
      await service.renderOpens();
      const started = service.visibility;

      service.toogleVisibility();
      service.toogleVisibility();
      service.toogleVisibility();

      expect(service.visibility).toBe(started);
    });

    it('hides the outline in exactly one of the three states', async () => {
      service.opens = [makeOpen('OPEN_1', wall)];
      await service.renderOpens();

      // Read off the cycle rather than off a state number: which number means
      // what is the layer's business, and the button's job is to reach all three
      const widths: number[] = [];
      for (let step = 0; step < 3; step++) {
        widths.push(service.mesh.edgesWidth);
        service.toogleVisibility();
      }

      expect(widths.filter(width => width === 0).length)
        .withContext(`outline widths around the cycle: ${widths}`)
        .toBe(1);
      expect(widths.filter(width => width > 0).length).toBe(2);
    });

    it('does not rebuild the outline geometry when only the button is pressed', async () => {
      // enableEdgesRendering() walks every edge of the mesh to work out which
      // ones to draw. Pressing the button moves no geometry, and on a real
      // scenario that walk is measured in seconds.
      service.opens = [makeOpen('OPEN_1', wall), makeOpen('OPEN_2', floor)];
      await service.renderOpens();
      const renderer = service.mesh.edgesRenderer;

      service.toogleVisibility();

      expect(service.mesh.edgesRenderer).toBe(renderer);
    });

    it('builds the outline again when the openings themselves change', async () => {
      // The buffer was refilled, so an outline built against the old one would
      // draw edges that are no longer there
      service.opens = [makeOpen('OPEN_1', wall)];
      await service.renderOpens();
      const renderer = service.mesh.edgesRenderer;

      service.opens = [makeOpen('OPEN_1', wall), makeOpen('OPEN_2', floor)];
      await service.renderOpens();

      expect(service.mesh.edgesRenderer).not.toBe(renderer);
    });

    it('comes back to where it started after a full cycle', async () => {
      service.opens = [makeOpen('OPEN_1', wall)];
      await service.renderOpens();
      const started = service.mesh.edgesWidth;

      service.toogleVisibility();
      service.toogleVisibility();
      service.toogleVisibility();

      expect(service.mesh.edgesWidth).toBe(started);
    });
  });

  describe('resetSceneState', () => {
    it('lets go of everything that belonged to the disposed scene', async () => {
      service.opens = [makeOpen('OPEN_1', wall)];
      await service.renderOpens();

      service.resetSceneState();

      expect(service.mesh).toBeUndefined();
    });

    it('leaves the service able to draw into the next scene', async () => {
      service.opens = [makeOpen('OPEN_1', wall)];
      await service.renderOpens();

      service.resetSceneState();
      await service.renderOpens();

      expect(registry.entryFor('OPEN_1-uuid').mesh).toBe(service.mesh);
    });
  });
});
