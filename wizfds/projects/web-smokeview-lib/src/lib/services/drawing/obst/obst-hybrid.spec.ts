import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { ObstService } from './obst.service';
import { BabylonService } from '../../babylon/babylon.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { ObstSelectionService } from './obst-selection.service';
import { SceneColor, SceneHole, SceneObst, SceneXb } from '../scene-input';

/**
 * The hybrid representation of ADR-0006: the bulk of the obsts as thin
 * instances of one base box, and a mesh of its own for anything that box cannot
 * express - an opening cut into it, or being singled out for editing.
 *
 * Picking goes through Babylon's own mechanisms here, so every test that asks
 * what a click selects builds a real ray and lets the scene answer.
 */

const OPAQUE: SceneColor = { r: 1, g: 208 / 255, b: 0, a: 1 };
const GLAZED: SceneColor = { r: 0, g: 128 / 255, b: 1, a: 0.4 };

/** Three walls, well apart, so a ray can single any of them out. */
const WEST: SceneXb = { x1: 0, x2: 0.2, y1: 0, y2: 6, z1: 0, z2: 3 };
const EAST: SceneXb = { x1: 10, x2: 10.2, y1: 0, y2: 6, z1: 0, z2: 3 };
const MIDDLE: SceneXb = { x1: 5, x2: 5.2, y1: 0, y2: 6, z1: 0, z2: 3 };

function makeObst(id: string, xb: SceneXb, color: SceneColor = OPAQUE): SceneObst {
  return { id: id, uuid: `${id}-uuid`, xb: xb, surfId: 'SURF_1', permitHole: true, color: color };
}

function makeHole(id: string, xb: SceneXb): SceneHole {
  return { id: id, uuid: `${id}-uuid`, xb: xb };
}

/** A ray running along +x at mid-height, crossing every wall above in turn. */
function rayAlongX(from = -5): BABYLON.Ray {
  return new BABYLON.Ray(
    new BABYLON.Vector3(from, 3, 1.5), new BABYLON.Vector3(1, 0, 0), 100
  );
}

describe('ObstService - the hybrid representation', () => {
  let service: ObstService;
  let selection: ObstSelectionService;
  let registry: SceneRegistryService;
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;

  beforeAll(async () => {
    // Without the CSG backend an obst carrying an opening is drawn solid, and
    // the two paths under test collapse into one.
    await BABYLON.InitializeCSG2Async({ manifoldUrl: '/assets/manifold' });
  });

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
    service = TestBed.inject(ObstService);
    selection = TestBed.inject(ObstSelectionService);
    registry = TestBed.inject(SceneRegistryService);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  function render(obsts: SceneObst[], holes: SceneHole[] = []): void {
    service.obsts = obsts;
    service.holes = holes;
    service.renderObsts();
  }

  describe('which path an obst takes', () => {
    it('draws plain obsts as instances of one base box', () => {
      render([makeObst('W', WEST), makeObst('E', EAST), makeObst('M', MIDDLE)]);

      expect(service.opaqueMesh.thinInstanceCount).toBe(3);
      expect(service.opaqueMesh.getTotalVertices())
        .withContext('three obsts, one box in the buffer')
        .toBe(24);
    });

    it('keeps the obsts short of fully opaque in a pool of their own', () => {
      // Alpha blending is a property of the material, so the two cannot share one
      render([makeObst('W', WEST, OPAQUE), makeObst('E', EAST, GLAZED)]);

      expect(service.opaqueMesh.thinInstanceCount).toBe(1);
      expect(service.transparentMesh.thinInstanceCount).toBe(1);
    });

    it('gives an obst with an opening a mesh of its own', () => {
      // Cutting a doorway leaves geometry that is no longer a box, so there is
      // nothing left to instance
      render(
        [makeObst('W', WEST), makeObst('DOOR', MIDDLE)],
        [makeHole('H', { x1: 4.9, x2: 5.3, y1: 2, y2: 3, z1: 0, z2: 2.1 })]
      );

      expect(service.ownMeshFor('DOOR-uuid')).toBeTruthy();
      expect(service.opaqueMesh.thinInstanceCount)
        .withContext('only the plain wall stays in the pool')
        .toBe(1);
    });

    it('registers every obst, whichever path it took', () => {
      render(
        [makeObst('W', WEST, OPAQUE), makeObst('E', EAST, GLAZED), makeObst('DOOR', MIDDLE)],
        [makeHole('H', { x1: 4.9, x2: 5.3, y1: 2, y2: 3, z1: 0, z2: 2.1 })]
      );

      expect(registry.entryFor('W-uuid').mesh).toBe(service.opaqueMesh);
      expect(registry.entryFor('E-uuid').mesh).toBe(service.transparentMesh);
      expect(registry.entryFor('DOOR-uuid').mesh).toBe(service.ownMeshFor('DOOR-uuid'));
    });

    it('lets go of an obst taken out of the scenario', () => {
      render([makeObst('W', WEST), makeObst('E', EAST)]);
      render([makeObst('W', WEST)]);

      expect(registry.entryFor('E-uuid')).toBeUndefined();
      expect(service.opaqueMesh.thinInstanceCount).toBe(1);
    });

    it('takes the mesh of an obst that no longer has an opening with it', () => {
      render(
        [makeObst('DOOR', MIDDLE)],
        [makeHole('H', { x1: 4.9, x2: 5.3, y1: 2, y2: 3, z1: 0, z2: 2.1 })]
      );
      const cut = service.ownMeshFor('DOOR-uuid');

      render([makeObst('DOOR', MIDDLE)]);

      expect(cut.isDisposed()).toBe(true);
      expect(service.ownMeshFor('DOOR-uuid')).toBeUndefined();
      expect(service.opaqueMesh.thinInstanceCount).toBe(1);
    });
  });




  describe('promotion and demotion', () => {
    // Driven through the selection, because being chosen is what promotes an
    // obst - see ObstSelectionService.
    /** The box an obst is actually drawn as, whichever path it is on. */
    function drawnBounds(uuid: string): { min: BABYLON.Vector3, max: BABYLON.Vector3 } {
      const own = service.ownMeshFor(uuid);
      if (own) {
        own.refreshBoundingInfo();
        const box = own.getBoundingInfo().boundingBox;
        return { min: box.minimumWorld, max: box.maximumWorld };
      }
      const entry = registry.entryFor(uuid);
      const matrix = (entry.mesh as BABYLON.Mesh).thinInstanceGetWorldMatrices()[entry.instance];
      const at = (x: number, y: number, z: number) =>
        BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(x, y, z), matrix);
      return { min: at(-0.5, -0.5, -0.5), max: at(0.5, 0.5, 0.5) };
    }

    it('gives a selected obst a mesh of its own', () => {
      // Editing changes an obst every frame; doing that inside a pool of ten
      // thousand would rewrite the buffer of all the others (ADR-0006).
      render([makeObst('W', WEST), makeObst('E', EAST)]);

      selection.selectObst(rayAlongX());

      expect(service.ownMeshFor('W-uuid')).toBeTruthy();
      expect(service.opaqueMesh.thinInstanceCount)
        .withContext('and takes it out of the pool')
        .toBe(1);
    });

    it('draws it in exactly the same place', () => {
      render([makeObst('W', WEST), makeObst('E', EAST)]);
      const before = drawnBounds('W-uuid');

      selection.selectObst(rayAlongX());

      const after = drawnBounds('W-uuid');
      ['x', 'y', 'z'].forEach(axis => {
        expect(after.min[axis]).withContext(`min ${axis}`).toBeCloseTo(before.min[axis], 5);
        expect(after.max[axis]).withContext(`max ${axis}`).toBeCloseTo(before.max[axis], 5);
      });
    });

    it('leaves the obsts that stay behind exactly where they were', () => {
      render([makeObst('W', WEST), makeObst('E', EAST), makeObst('M', MIDDLE)]);
      const before = drawnBounds('E-uuid');

      selection.selectObst(rayAlongX());

      const after = drawnBounds('E-uuid');
      expect(after.min.x).toBeCloseTo(before.min.x, 5);
      expect(after.max.x).toBeCloseTo(before.max.x, 5);
    });

    it('still answers a pick while the obst is promoted', () => {
      render([makeObst('W', WEST), makeObst('E', EAST)]);
      selection.selectObst(rayAlongX());

      selection.selectObst(rayAlongX());

      expect(selection.pickedObst.id).toBe('W');
    });

    it('puts it back in the pool when the selection is dropped', () => {
      render([makeObst('W', WEST), makeObst('E', EAST)]);
      selection.selectObst(rayAlongX());

      selection.clearSelection();

      expect(service.ownMeshFor('W-uuid')).toBeUndefined();
      expect(service.opaqueMesh.thinInstanceCount).toBe(2);
      expect(registry.entryFor('W-uuid').mesh).toBe(service.opaqueMesh);
    });

    it('does not promote an obst that already has a mesh of its own', () => {
      render(
        [makeObst('DOOR', MIDDLE)],
        [makeHole('H', { x1: 4.9, x2: 5.3, y1: 0, y2: 1, z1: 0, z2: 2.1 })]
      );
      const cut = service.ownMeshFor('DOOR-uuid');

      selection.selectObst(rayAlongX());

      expect(service.ownMeshFor('DOOR-uuid'))
        .withContext('an obst with an opening is already off the pool')
        .toBe(cut);
    });

    it('does not leave a promoted obst behind when the scenario is drawn again', () => {
      render([makeObst('W', WEST), makeObst('E', EAST)]);
      selection.selectObst(rayAlongX());

      render([makeObst('W', WEST), makeObst('E', EAST)]);

      expect(service.opaqueMesh.thinInstanceCount).toBe(2);
      expect(service.ownMeshFor('W-uuid')).toBeUndefined();
    });
  });

  describe('a scene of ten thousand obsts', () => {
    it('draws them from one base box', () => {
      // The scale #87 is about: multi-storey car parks and fitted-out tunnels
      const obsts: SceneObst[] = [];
      for (let i = 0; i < 10000; i++) {
        obsts.push(makeObst(`W${i}`, {
          x1: i * 0.5, x2: i * 0.5 + 0.4, y1: 0, y2: 4, z1: 0, z2: 3
        }));
      }

      render(obsts);

      expect(service.opaqueMesh.thinInstanceCount).toBe(10000);
      expect(service.opaqueMesh.getTotalVertices()).toBe(24);
      expect(scene.meshes.filter(mesh => !mesh.isDisposed()).length)
        .withContext('one base box, one back cap, and nothing per obst')
        .toBeLessThan(10);
    });

    it('draws the same scenario a second time without a quadratic pass', () => {
      // Re-entering the view redraws what is already there. What that costs is
      // pinned in box-instance-pool.spec.ts; this is about the whole scenario
      // still resolving to the same pool afterwards.
      const obsts: SceneObst[] = [];
      for (let i = 0; i < 10000; i++) {
        obsts.push(makeObst(`W${i}`, {
          x1: i * 0.5, x2: i * 0.5 + 0.4, y1: 0, y2: 4, z1: 0, z2: 3
        }));
      }

      render(obsts);
      render(obsts);

      expect(service.opaqueMesh.thinInstanceCount).toBe(10000);
      expect(registry.entryFor('W9999-uuid').mesh).toBe(service.opaqueMesh);
    });
  });
});
