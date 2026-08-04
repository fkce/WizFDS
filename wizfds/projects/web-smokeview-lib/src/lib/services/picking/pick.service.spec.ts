import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { PickService, ScenePicked } from './pick.service';
import { ObstService } from '../drawing/obst/obst.service';
import { MeshService } from '../drawing/mesh/mesh.service';
import { InitService } from '../drawing/init/init.service';
import { HoleRegionService } from '../drawing/hole/hole-region.service';
import { BabylonService } from '../babylon/babylon.service';
import { SceneBoundsService } from '../scene-bounds/scene-bounds.service';
import {
  SceneColor, SceneHole, SceneInit, SceneMesh, SceneObst, SceneXb
} from '../drawing/scene-input';

/**
 * Picking: what a click lands on, what the pointer is over, and what happens
 * when several elements are picked in turn.
 *
 * Driven against the real drawing services, because a pick is a question about
 * what is actually drawn - every test here builds a ray and lets the scene
 * answer. #121 widened it from obsts to every type the library draws, so the
 * answer now has to say *what* was hit as well as which one.
 */

const OPAQUE: SceneColor = { r: 1, g: 208 / 255, b: 0, a: 1 };
const GLAZED: SceneColor = { r: 0, g: 128 / 255, b: 1, a: 0.4 };
const VIOLET: SceneColor = { r: 0.67, g: 0.39, b: 1, a: 0.25 };

/** Three walls, well apart, so a ray can single any of them out. */
const WEST: SceneXb = { x1: 0, x2: 0.2, y1: 0, y2: 6, z1: 0, z2: 3 };
const EAST: SceneXb = { x1: 10, x2: 10.2, y1: 0, y2: 6, z1: 0, z2: 3 };
const MIDDLE: SceneXb = { x1: 5, x2: 5.2, y1: 0, y2: 6, z1: 0, z2: 3 };

/** The domain, around everything above. */
const DOMAIN: SceneXb = { x1: -1, x2: 12, y1: -1, y2: 7, z1: 0, z2: 4 };

function makeObst(id: string, xb: SceneXb, color: SceneColor = OPAQUE): SceneObst {
  return { id: id, uuid: `${id}-uuid`, xb: xb, surfId: 'SURF_1', permitHole: true, color: color };
}

function makeHole(id: string, xb: SceneXb): SceneHole {
  return { id: id, uuid: `${id}-uuid`, xb: xb, color: { r: 0.59, g: 0.9, b: 0.27, a: 0.35 } };
}

function makeMesh(id: string, xb: SceneXb): SceneMesh {
  return { id: id, uuid: `${id}-uuid`, xb: xb, cell: { i: 0.25, j: 0.25, k: 0.25 } };
}

function makeInit(id: string, xb: SceneXb): SceneInit {
  return { id: id, uuid: `${id}-uuid`, xb: xb, color: VIOLET };
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

/**
 * A ray skimming the domain's floor, so it meets the near face of the DOMAIN
 * box within the edge-pick tolerance of its bottom edge. The scene under test
 * has no camera, so the tolerance is the fixed fallback of a few centimetres.
 */
function rayNearMeshEdge(): BABYLON.Ray {
  return new BABYLON.Ray(new BABYLON.Vector3(-5, 3, 0.03), new BABYLON.Vector3(1, 0, 0), 100);
}

describe('PickService', () => {
  let picking: PickService;
  let obsts: ObstService;
  let meshes: MeshService;
  let inits: InitService;
  let holeRegions: HoleRegionService;
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
          // No WGSL is served in the suite, so hand out a bare ShaderMaterial
          createShaderMaterial: (spec: { name: string }) => Promise.resolve(
            new BABYLON.ShaderMaterial(spec.name, scene, { vertexSource: '', fragmentSource: '' }, {})
          )
        }
      }]
    });
    TestBed.inject(SceneBoundsService).setFrom([DOMAIN]);
    obsts = TestBed.inject(ObstService);
    meshes = TestBed.inject(MeshService);
    inits = TestBed.inject(InitService);
    holeRegions = TestBed.inject(HoleRegionService);
    picking = TestBed.inject(PickService);
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
    it('selects the element the ray reaches first', () => {
      render([makeObst('W', WEST), makeObst('M', MIDDLE), makeObst('E', EAST)]);

      picking.pick(rayAlongX());

      expect(picking.lastSelected.id).toBe('W');
    });

    it('selects an element behind one the clipping plane has hidden', () => {
      // The shader keeps what is above the plane on x, so a plane at 2 m hides
      // the west wall - and a click has to reach the wall behind it, not stop at
      // geometry that is not on screen.
      render([makeObst('W', WEST), makeObst('M', MIDDLE), makeObst('E', EAST)]);
      obsts.clip(2, 'x');

      picking.pick(rayAlongX());

      expect(picking.lastSelected.id).toBe('M');
    });

    it('selects a transparent obst', () => {
      // The manual raycast this replaces walked the opaque buffer only, so a
      // glazed wall could not be clicked at all - which is what a real scenario
      // showed: nothing in it was selectable.
      render([makeObst('GLASS', MIDDLE, GLAZED)]);

      picking.pick(rayAlongX());

      expect(picking.lastSelected.id).toBe('GLASS');
    });

    it('selects an obst with an opening', () => {
      render(
        [makeObst('DOOR', MIDDLE)],
        [makeHole('H', { x1: 4.9, x2: 5.3, y1: 0, y2: 1, z1: 0, z2: 2.1 })]
      );

      // Aimed at y = 3, well clear of the doorway at y = 0..1
      picking.pick(rayAlongX());

      expect(picking.lastSelected.id).toBe('DOOR');
    });

    it('reaches through the doorway to the wall behind', () => {
      render(
        [makeObst('DOOR', MIDDLE), makeObst('E', EAST)],
        [makeHole('H', { x1: 4.9, x2: 5.3, y1: 2, y2: 4, z1: 0, z2: 2.1 })]
      );

      // Straight through the opening: y = 3 and z = 1.5 are both inside it
      picking.pick(rayAlongX());

      expect(picking.lastSelected.id).toBe('E');
    });

    it('drops the selection when the ray hits nothing', () => {
      render([makeObst('W', WEST)]);
      picking.pick(rayAlongX());

      picking.pick(rayOverhead());

      expect(picking.lastSelected).toBeUndefined();
    });

    it('picks against a scene that has not been drawn yet without throwing', () => {
      expect(() => picking.pick(rayAlongX())).not.toThrow();
      expect(() => picking.hover(rayAlongX())).not.toThrow();
    });
  });

  describe('every drawn type', () => {
    it('says what kind of element was picked, not only which one', () => {
      render([makeObst('W', WEST)]);

      picking.pick(rayAlongX());

      expect(picking.lastSelected.type).toBe('obst');
      expect(picking.lastSelected.uuid).toBe('W-uuid');
    });

    it('picks a &MESH - what was obst-only before #121', () => {
      // At its edge: a &MESH starts in the edges state, and an edges-only
      // layer answers the cursor only at its outline (CONTEXT.md, "Reguła
      // wskazywania").
      meshes.meshes = [makeMesh('MESH1', DOMAIN)];
      meshes.renderMeshes();

      picking.pick(rayNearMeshEdge());

      expect(picking.lastSelected.type).toBe('mesh');
      expect(picking.lastSelected.id).toBe('MESH1');
    });

    it('picks an &INIT', async () => {
      inits.inits = [makeInit('HOT', { x1: 2, x2: 4, y1: 2, y2: 4, z1: 1, z2: 2 })];
      await inits.renderInits();

      picking.pick(rayAlongX());

      expect(picking.lastSelected.type).toBe('init');
      expect(picking.lastSelected.id).toBe('HOT');
    });

    it('reaches the wall inside a &MESH rather than the domain around it', () => {
      // The domain encloses everything, so its near face is nearer than any wall.
      // Nearest-first alone would make it answer nearly every click in the scene.
      meshes.meshes = [makeMesh('MESH1', DOMAIN)];
      meshes.renderMeshes();
      render([makeObst('W', WEST)]);

      picking.pick(rayAlongX());

      expect(picking.lastSelected.type).toBe('obst');
      expect(picking.lastSelected.id).toBe('W');
    });

    it('reaches the wall inside an &INIT rather than the region over it', async () => {
      inits.inits = [makeInit('HOT', { x1: -1, x2: 6, y1: -1, y2: 7, z1: 0, z2: 4 })];
      await inits.renderInits();
      render([makeObst('W', WEST)]);

      picking.pick(rayAlongX());

      expect(picking.lastSelected.id).toBe('W');
    });

    it('picks a &HOLE, which is drawn only so that it can be', async () => {
      // An opening is cut out of the wall, so nothing else puts anything on
      // screen where it is - the box drawn for it is the only thing to click.
      const doorway = { x1: 4.9, x2: 5.3, y1: 2, y2: 4, z1: 0, z2: 2.1 };
      render([makeObst('DOOR', MIDDLE)], [makeHole('H', doorway)]);
      holeRegions.holes = [makeHole('H', doorway)];
      await holeRegions.renderHoles();

      // Straight through the opening: y = 3 and z = 1.5 are both inside it
      picking.pick(rayAlongX());

      expect(picking.lastSelected.type).toBe('hole');
      expect(picking.lastSelected.id).toBe('H');
    });

    it('still picks the region where nothing solid is behind it', async () => {
      inits.inits = [makeInit('HOT', { x1: 6, x2: 8, y1: 2, y2: 4, z1: 1, z2: 2 })];
      await inits.renderInits();
      // A wall the ray never crosses: yielding is about what is behind the region
      // along the ray, not about a wall existing somewhere in the scenario
      render([makeObst('W', { x1: 0, x2: 0.2, y1: 0, y2: 6, z1: 3.5, z2: 3.9 })]);

      picking.pick(rayBackAlongX());

      expect(picking.lastSelected.type).toBe('init');
    });
  });

  describe('what the layer buttons hide', () => {
    // The cursor only sees what the user can (CONTEXT.md, "Reguła
    // wskazywania"): hidden answers nothing, edges answers at the outline.

    it('ignores the middle of a layer drawn as edges', () => {
      // The &MESH starts as edges, and this ray crosses its face over a metre
      // from any edge - what a click there means is whatever is behind
      meshes.meshes = [makeMesh('MESH1', DOMAIN)];
      meshes.renderMeshes();

      picking.pick(rayAlongX());

      expect(picking.lastSelected).toBeUndefined();
    });

    it('picks a filled layer anywhere on its face', () => {
      meshes.meshes = [makeMesh('MESH1', DOMAIN)];
      meshes.renderMeshes();
      meshes.visibility = 2;

      picking.pick(rayAlongX());

      expect(picking.lastSelected.id).toBe('MESH1');
    });

    it('refuses a hidden layer even at its edge', () => {
      meshes.meshes = [makeMesh('MESH1', DOMAIN)];
      meshes.renderMeshes();
      meshes.visibility = 0;

      picking.pick(rayNearMeshEdge());

      expect(picking.lastSelected).toBeUndefined();
    });

    it('refuses a hidden region, which yielding alone would still have picked', async () => {
      // Nothing solid behind it, so before the layer rule this pick was the
      // region's - see "still picks the region where nothing solid is behind it"
      inits.inits = [makeInit('HOT', { x1: 2, x2: 4, y1: 2, y2: 4, z1: 1, z2: 2 })];
      await inits.renderInits();
      inits.toggleVisibility();

      picking.pick(rayAlongX());

      expect(picking.lastSelected).toBeUndefined();
    });

    it('answers an edges-only region at its outline', async () => {
      inits.inits = [makeInit('HOT', { x1: 2, x2: 4, y1: 2, y2: 4, z1: 1, z2: 2 })];
      await inits.renderInits();
      // filled → hidden → edges
      inits.toggleVisibility();
      inits.toggleVisibility();

      // Meets the region's near face 3 cm above its bottom edge at z = 1
      picking.pick(new BABYLON.Ray(
        new BABYLON.Vector3(-5, 3, 1.03), new BABYLON.Vector3(1, 0, 0), 100));

      expect(picking.lastSelected.type).toBe('init');
    });

    it('reads the pointer coordinate off what is actually seen', () => {
      // Over a hidden layer the pointer is over nothing: no element, no
      // coordinate - the status bar goes quiet rather than naming a ghost
      meshes.meshes = [makeMesh('MESH1', DOMAIN)];
      meshes.renderMeshes();
      meshes.visibility = 0;

      picking.hover(rayAlongX());

      let at: unknown = 'unset';
      picking.pointerAt$.subscribe(point => at = point).unsubscribe();
      expect(picking.hovered).toBeUndefined();
      expect(at).toBeNull();
    });
  });

  describe('dropping the selection outright - the Escape route', () => {
    it('clears what is selected and says so, like a click on empty space', () => {
      render([makeObst('W', WEST)]);
      picking.pick(rayAlongX());
      const seen: ScenePicked[] = [];
      picking.picked$.subscribe(pick => seen.push(pick));

      picking.dropSelection();

      expect(picking.selected).toEqual([]);
      expect(seen).toEqual([{ element: undefined, add: false }]);
    });

    it('takes the hover outline with it', () => {
      render([makeObst('W', WEST)]);
      picking.hover(rayAlongX());

      picking.dropSelection();

      expect(picking.hovered).toBeUndefined();
    });
  });

  describe('telling whoever owns the selection', () => {
    it('emits what the user picked', () => {
      render([makeObst('W', WEST)]);
      const seen: ScenePicked[] = [];
      picking.picked$.subscribe(pick => seen.push(pick));

      picking.pick(rayAlongX());

      expect(seen.length).toBe(1);
      expect(seen[0].element.uuid).toBe('W-uuid');
      expect(seen[0].element.type).toBe('obst');
      expect(seen[0].add).toBeFalse();
    });

    it('emits a miss, which is how a user drops a selection', () => {
      render([makeObst('W', WEST)]);
      const seen: ScenePicked[] = [];
      picking.picked$.subscribe(pick => seen.push(pick));

      picking.pick(rayOverhead());

      expect(seen).toEqual([{ element: undefined, add: false }]);
    });

    it('highlights exactly the uuids it is told to', () => {
      // The way in for the app, which is what owns the selection (ADR-0004).
      // Uuids alone: where to draw the box is the registry's business.
      render([makeObst('W', WEST), makeObst('E', EAST)]);
      picking.pick(rayAlongX());

      picking.setSelected(['E-uuid']);

      expect(picking.selected.map(element => element.id)).toEqual(['E']);
      expect(scene.getMeshByName('picked_W-uuid')).toBeNull();
      expect(scene.getMeshByName('picked_E-uuid')).toBeTruthy();
    });

    it('skips a uuid the scene does not draw', () => {
      // The app's selection can name a &SURF, or an element of a scenario that
      // has since been replaced. Neither is something to highlight.
      render([makeObst('W', WEST)]);

      expect(() => picking.setSelected(['W-uuid', 'surf-uuid'])).not.toThrow();
      expect(picking.selected.map(element => element.uuid)).toEqual(['W-uuid']);
    });

    it('leaves the selection alone when the app owns it', () => {
      // Both applying would make the two disagree as soon as a selection reached
      // the app by any route other than a click - a form, or the CAD plugin.
      render([makeObst('W', WEST)]);
      picking.applyOwnPicks = false;
      const seen: ScenePicked[] = [];
      picking.picked$.subscribe(pick => seen.push(pick));

      picking.pick(rayAlongX());

      expect(seen.length).toBe(1);
      expect(picking.selected).toEqual([]);
    });
  });

  describe('hovering', () => {
    it('names the element under the pointer without selecting it', () => {
      render([makeObst('W', WEST)]);

      picking.hover(rayAlongX());

      expect(picking.hovered.id).toBe('W');
      expect(picking.lastSelected).toBeUndefined();
    });

    it('forgets it once the pointer moves off', () => {
      render([makeObst('W', WEST)]);
      picking.hover(rayAlongX());

      picking.hover(rayOverhead());

      expect(picking.hovered).toBeUndefined();
    });

    it('leaves the obst in its pool - hovering is not choosing', () => {
      // The pointer crosses hundreds of obsts on the way anywhere; singling each
      // of them out in turn would be pure churn.
      render([makeObst('W', WEST), makeObst('E', EAST)]);

      picking.hover(rayAlongX());

      expect(obsts.ownMeshFor('W-uuid')).toBeUndefined();
      expect(obsts.opaqueMesh.thinInstanceCount).toBe(2);
    });
  });

  describe('where the pointer is', () => {
    // What the status bar reads, in the metres the user would type into a `.fds`
    // file (ADR-0002). The point is where the ray met the model, so it is a
    // coordinate on a real surface rather than somewhere on an imagined plane.

    function pointerAt(): { x: number, y: number, z: number } | null {
      let at: { x: number, y: number, z: number } | null;
      picking.pointerAt$.subscribe(point => at = point).unsubscribe();
      return at;
    }

    it('is the point on the model the pointer is over', () => {
      render([makeObst('W', WEST)]);

      picking.hover(rayAlongX());

      // The ray runs along +x at y = 3, z = 1.5 and meets the west wall's face
      expect(pointerAt().x).toBeCloseTo(0, 5);
      expect(pointerAt().y).toBeCloseTo(3, 5);
      expect(pointerAt().z).toBeCloseTo(1.5, 5);
    });

    it('is nothing when the pointer is over empty space', () => {
      render([makeObst('W', WEST)]);
      picking.hover(rayAlongX());

      picking.hover(rayOverhead());

      expect(pointerAt()).toBeNull();
    });

    it('keeps answering while the pointer travels over one element', () => {
      // Hovering stops short of redrawing the outline when the element has not
      // changed, but the coordinate has - so it is published before that.
      render([makeObst('W', WEST)]);
      picking.hover(rayAlongX());

      picking.hover(new BABYLON.Ray(
        new BABYLON.Vector3(-5, 4.5, 2.5), new BABYLON.Vector3(1, 0, 0), 100));

      expect(pointerAt().y).toBeCloseTo(4.5, 5);
      expect(pointerAt().z).toBeCloseTo(2.5, 5);
    });

    it('is nothing once the pointer has left the canvas', () => {
      render([makeObst('W', WEST)]);
      picking.hover(rayAlongX());

      picking.clearHover();

      expect(pointerAt()).toBeNull();
    });
  });

  describe('selecting more than one', () => {
    it('replaces the selection by default', () => {
      render([makeObst('W', WEST), makeObst('E', EAST)]);
      picking.pick(rayAlongX());

      picking.pick(rayBackAlongX());

      expect(picking.selected.map(element => element.id)).toEqual(['E']);
    });

    it('adds to it when asked to', () => {
      render([makeObst('W', WEST), makeObst('E', EAST)]);
      picking.pick(rayAlongX());

      picking.pick(rayBackAlongX(), { add: true });

      expect(picking.selected.map(element => element.id).sort()).toEqual(['E', 'W']);
    });

    it('takes an element back out when it is picked again', () => {
      render([makeObst('W', WEST), makeObst('E', EAST)]);
      picking.pick(rayAlongX(), { add: true });

      picking.pick(rayAlongX(), { add: true });

      expect(picking.selected).toEqual([]);
      expect(picking.lastSelected).toBeUndefined();
    });

    it('puts every one of them back in the pool when the selection is dropped', () => {
      render([makeObst('W', WEST), makeObst('E', EAST)]);
      picking.pick(rayAlongX());
      picking.pick(rayBackAlongX(), { add: true });

      picking.clearSelection();

      expect(obsts.opaqueMesh.thinInstanceCount).toBe(2);
      expect(obsts.ownMeshFor('W-uuid')).toBeUndefined();
      expect(obsts.ownMeshFor('E-uuid')).toBeUndefined();
    });
  });

  describe('the highlight boxes', () => {
    it('shares one material however many elements are selected', () => {
      // One apiece is what left a StandardMaterial behind on every click.
      render([makeObst('W', WEST), makeObst('E', EAST)]);

      picking.pick(rayAlongX());
      const afterFirst = scene.materials.length;
      picking.pick(rayBackAlongX(), { add: true });

      expect(scene.materials.length).toBe(afterFirst);
    });

    it('never shadows the element it marks', () => {
      // It sits exactly on top of it, so a pickable highlight would answer every
      // pick after the first.
      render([makeObst('W', WEST)]);

      picking.pick(rayAlongX());

      const highlight = scene.getMeshByName('picked_W-uuid');
      expect(highlight).toBeTruthy();
      expect(highlight.isPickable).toBe(false);
    });

    it('takes the box away with the selection', () => {
      render([makeObst('W', WEST)]);
      picking.pick(rayAlongX());
      const highlight = scene.getMeshByName('picked_W-uuid');

      picking.clearSelection();

      expect(highlight.isDisposed()).toBe(true);
    });
  });

  describe('a gesture in progress', () => {
    /**
     * The preview a drag draws (#124).
     *
     * Nothing is committed until the pointer comes up (ADR-0004), so what moves
     * under the user's hand is the outline and not the model. The element itself
     * is left exactly where the scenario says it is.
     */
    it('draws the outline where the gesture has the element', () => {
      render([makeObst('W', WEST)]);
      picking.setSelected(['W-uuid']);

      picking.previewMove({ dx: 3, dy: 0, dz: 0 });

      // WEST spans x 0 to 0.2, so its outline is centred on 0.1 and lands on 3.1
      expect(scene.getMeshByName('picked_W-uuid').position.x).toBeCloseTo(3.1, 6);
    });

    it('leaves what the scenario says alone while it does', () => {
      render([makeObst('W', WEST)]);
      picking.setSelected(['W-uuid']);

      picking.previewMove({ dx: 3, dy: 0, dz: 0 });

      expect(picking.lastSelected.xb.x1).toBe(0);
    });

    it('draws one element at a box of its own, which is what a face drag is', () => {
      render([makeObst('W', WEST)]);
      picking.setSelected(['W-uuid']);

      picking.previewBox('W-uuid', { x1: 0, x2: 1, y1: 0, y2: 6, z1: 0, z2: 3 });

      const outline = scene.getMeshByName('picked_W-uuid');
      expect(outline.position.x).toBeCloseTo(0.5, 6);
      expect(outline.getBoundingInfo().boundingBox.extendSize.x).toBeCloseTo(0.5, 6);
    });

    it('puts the outline back where the model has it when the gesture ends', () => {
      render([makeObst('W', WEST)]);
      picking.setSelected(['W-uuid']);
      picking.previewMove({ dx: 3, dy: 0, dz: 0 });

      picking.endPreview();

      expect(scene.getMeshByName('picked_W-uuid').position.x).toBeCloseTo(0.1, 6);
    });
  });

  describe('telling a tool what is selected', () => {
    it('replays the selection, so a gizmo attaches to what is already picked', () => {
      // A tool is switched on long after the click that made the selection.
      render([makeObst('W', WEST)]);
      picking.setSelected(['W-uuid']);

      let seen: readonly { uuid: string }[] = [];
      picking.selection$.subscribe(selected => seen = selected);

      expect(seen.map(element => element.uuid)).toEqual(['W-uuid']);
    });

    it('says so again once an edit has moved what is selected', () => {
      // The gizmo stands on the selection, so it has to be told to follow it.
      render([makeObst('W', WEST)]);
      picking.setSelected(['W-uuid']);

      let times = 0;
      picking.selection$.subscribe(() => times++);
      picking.redrawSelection();

      expect(times).toBe(2);
    });
  });

  describe('resetSceneState', () => {
    it('lets go of everything that belonged to the disposed scene', () => {
      render([makeObst('W', WEST)]);
      picking.pick(rayAlongX());
      picking.hover(rayAlongX());

      picking.resetSceneState();

      expect(picking.lastSelected).toBeUndefined();
      expect(picking.selected).toEqual([]);
      expect(picking.hovered).toBeUndefined();
    });
  });
});
