import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { ObstSelectionService } from './obst-selection.service';
import { ObstService } from './obst.service';
import { BabylonService } from '../../babylon/babylon.service';
import { SceneColor, SceneHole, SceneObst, SceneXb } from '../scene-input';

/**
 * Choosing an obst: what a ctrl+click lands on, what the pointer is over, and
 * what happens when several are picked in turn.
 *
 * Driven against a real ObstService, because a pick is a question about what is
 * actually drawn - every test here builds a ray and lets the scene answer.
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
function rayAlongX(): BABYLON.Ray {
  return new BABYLON.Ray(new BABYLON.Vector3(-5, 3, 1.5), new BABYLON.Vector3(1, 0, 0), 100);
}

/** The same, from the far side. */
function rayBackAlongX(): BABYLON.Ray {
  return new BABYLON.Ray(new BABYLON.Vector3(15, 3, 1.5), new BABYLON.Vector3(-1, 0, 0), 100);
}

/** A ray well above everything. */
function rayOverhead(): BABYLON.Ray {
  return new BABYLON.Ray(new BABYLON.Vector3(-5, 3, 50), new BABYLON.Vector3(1, 0, 0), 100);
}

describe('ObstSelectionService', () => {
  let selection: ObstSelectionService;
  let obsts: ObstService;
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;

  beforeAll(async () => {
    // Without the CSG backend an obst carrying an opening is drawn solid, and
    // the two drawing paths a pick has to cross collapse into one.
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
    obsts = TestBed.inject(ObstService);
    selection = TestBed.inject(ObstSelectionService);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  function render(scenario: SceneObst[], holes: SceneHole[] = []): void {
    obsts.obsts = scenario;
    obsts.holes = holes;
    obsts.renderObsts();
  }

  describe('picking', () => {
    it('selects the obst the ray reaches first', () => {
      render([makeObst('W', WEST), makeObst('M', MIDDLE), makeObst('E', EAST)]);

      selection.selectObst(rayAlongX());

      expect(selection.pickedObst.id).toBe('W');
    });

    it('selects an obst behind one the clipping plane has hidden', () => {
      // The shader keeps what is above the plane on x, so a plane at 2 m hides
      // the west wall - and a click has to reach the wall behind it, not stop at
      // geometry that is not on screen.
      render([makeObst('W', WEST), makeObst('M', MIDDLE), makeObst('E', EAST)]);
      obsts.clip(2, 'x');

      selection.selectObst(rayAlongX());

      expect(selection.pickedObst.id).toBe('M');
    });

    it('selects a transparent obst', () => {
      // The manual raycast this replaces walked the opaque buffer only, so a
      // glazed wall could not be clicked at all - which is what a real scenario
      // showed: nothing in it was selectable.
      render([makeObst('GLASS', MIDDLE, GLAZED)]);

      selection.selectObst(rayAlongX());

      expect(selection.pickedObst.id).toBe('GLASS');
    });

    it('selects an obst with an opening', () => {
      render(
        [makeObst('DOOR', MIDDLE)],
        [makeHole('H', { x1: 4.9, x2: 5.3, y1: 0, y2: 1, z1: 0, z2: 2.1 })]
      );

      // Aimed at y = 3, well clear of the doorway at y = 0..1
      selection.selectObst(rayAlongX());

      expect(selection.pickedObst.id).toBe('DOOR');
    });

    it('reaches through the doorway to the wall behind', () => {
      render(
        [makeObst('DOOR', MIDDLE), makeObst('E', EAST)],
        [makeHole('H', { x1: 4.9, x2: 5.3, y1: 2, y2: 4, z1: 0, z2: 2.1 })]
      );

      // Straight through the opening: y = 3 and z = 1.5 are both inside it
      selection.selectObst(rayAlongX());

      expect(selection.pickedObst.id).toBe('E');
    });

    it('drops the selection when the ray hits nothing', () => {
      render([makeObst('W', WEST)]);
      selection.selectObst(rayAlongX());

      selection.selectObst(rayOverhead());

      expect(selection.pickedObst).toBeUndefined();
    });

    it('picks against a scene that has not been drawn yet without throwing', () => {
      expect(() => selection.selectObst(rayAlongX())).not.toThrow();
      expect(() => selection.hoverObst(rayAlongX())).not.toThrow();
    });
  });

  describe('hovering', () => {
    it('names the obst under the pointer without selecting it', () => {
      render([makeObst('W', WEST)]);

      selection.hoverObst(rayAlongX());

      expect(selection.hoveredObst.id).toBe('W');
      expect(selection.pickedObst).toBeUndefined();
    });

    it('forgets it once the pointer moves off', () => {
      render([makeObst('W', WEST)]);
      selection.hoverObst(rayAlongX());

      selection.hoverObst(rayOverhead());

      expect(selection.hoveredObst).toBeUndefined();
    });

    it('leaves the obst in its pool - hovering is not choosing', () => {
      // The pointer crosses hundreds of obsts on the way anywhere; singling each
      // of them out in turn would be pure churn.
      render([makeObst('W', WEST), makeObst('E', EAST)]);

      selection.hoverObst(rayAlongX());

      expect(obsts.ownMeshFor('W-uuid')).toBeUndefined();
      expect(obsts.opaqueMesh.thinInstanceCount).toBe(2);
    });
  });

  describe('selecting more than one', () => {
    it('replaces the selection by default', () => {
      render([makeObst('W', WEST), makeObst('E', EAST)]);
      selection.selectObst(rayAlongX());

      selection.selectObst(rayBackAlongX());

      expect(selection.pickedObsts.map(obst => obst.id)).toEqual(['E']);
    });

    it('adds to it when asked to', () => {
      render([makeObst('W', WEST), makeObst('E', EAST)]);
      selection.selectObst(rayAlongX());

      selection.selectObst(rayBackAlongX(), { add: true });

      expect(selection.pickedObsts.map(obst => obst.id).sort()).toEqual(['E', 'W']);
    });

    it('takes an obst back out when it is picked again', () => {
      render([makeObst('W', WEST), makeObst('E', EAST)]);
      selection.selectObst(rayAlongX(), { add: true });

      selection.selectObst(rayAlongX(), { add: true });

      expect(selection.pickedObsts).toEqual([]);
      expect(selection.pickedObst).toBeUndefined();
    });

    it('puts every one of them back in the pool when the selection is dropped', () => {
      render([makeObst('W', WEST), makeObst('E', EAST)]);
      selection.selectObst(rayAlongX());
      selection.selectObst(rayBackAlongX(), { add: true });

      selection.clearSelection();

      expect(obsts.opaqueMesh.thinInstanceCount).toBe(2);
      expect(obsts.ownMeshFor('W-uuid')).toBeUndefined();
      expect(obsts.ownMeshFor('E-uuid')).toBeUndefined();
    });
  });

  describe('the highlight boxes', () => {
    it('shares one material however many obsts are selected', () => {
      // One apiece is what left a StandardMaterial behind on every ctrl+click.
      render([makeObst('W', WEST), makeObst('E', EAST)]);

      selection.selectObst(rayAlongX());
      const afterFirst = scene.materials.length;
      selection.selectObst(rayBackAlongX(), { add: true });

      expect(scene.materials.length).toBe(afterFirst);
    });

    it('never shadows the obst it marks', () => {
      // It sits exactly on top of it, so a pickable highlight would answer every
      // pick after the first.
      render([makeObst('W', WEST)]);

      selection.selectObst(rayAlongX());

      const highlight = scene.getMeshByName('pickedObst_W-uuid');
      expect(highlight).toBeTruthy();
      expect(highlight.isPickable).toBe(false);
    });

    it('takes the box away with the selection', () => {
      render([makeObst('W', WEST)]);
      selection.selectObst(rayAlongX());
      const highlight = scene.getMeshByName('pickedObst_W-uuid');

      selection.clearSelection();

      expect(highlight.isDisposed()).toBe(true);
    });
  });

  describe('resetSceneState', () => {
    it('lets go of everything that belonged to the disposed scene', () => {
      render([makeObst('W', WEST)]);
      selection.selectObst(rayAlongX());
      selection.hoverObst(rayAlongX());

      selection.resetSceneState();

      expect(selection.pickedObst).toBeUndefined();
      expect(selection.pickedObsts).toEqual([]);
      expect(selection.hoveredObst).toBeUndefined();
    });
  });
});
