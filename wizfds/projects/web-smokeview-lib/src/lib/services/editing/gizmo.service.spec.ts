import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { GizmoService } from './gizmo.service';
import { SnapService } from './snap.service';
import { EditStreamService } from './edit-stream.service';
import { SceneEditCommand } from './edit-command';
import { PickService } from '../picking/pick.service';
import { SceneRegistryService } from '../babylon/scene-registry.service';
import { SceneBoundsService } from '../scene-bounds/scene-bounds.service';
import { BabylonService } from '../babylon/babylon.service';
import { SceneInput, SceneXb } from '../drawing/scene-input';

/** A wall two decimetres thick, and a second one parallel to it. */
const WEST: SceneXb = { x1: 0, x2: 0.2, y1: 0, y2: 6, z1: 0, z2: 3 };
const EAST: SceneXb = { x1: 10, x2: 10.2, y1: 0, y2: 6, z1: 0, z2: 3 };

function emptyScene(): SceneInput {
  return {
    meshes: [], obsts: [], holes: [], opens: [], vents: [], fires: [],
    jetfans: [], devcs: [], geoms: [], inits: [], zones: []
  };
}

/**
 * The gesture, from the moment it starts to the command it leaves behind (#124).
 *
 * Driven through the lifecycle the drag handlers call rather than through
 * Babylon's own drag events: what a gizmo is for is producing one edit command
 * out of a hundred mouse moves, and that is a decision, not a mesh. The gizmo
 * meshes are the adapter over this, and they need a real GPU to be worth
 * testing.
 */
describe('GizmoService', () => {

  let gizmo: GizmoService;
  let picking: PickService;
  let registry: SceneRegistryService;
  let snapping: SnapService;
  let commands: SceneEditCommand[];
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);

    // A real camera, because the panel is placed by projecting a point through
    // it. Standing off the model rather than in it: at a right angle, some 11 m
    // from the walls, over an 800 px canvas, the ten-pixel tolerance is about
    // 28 cm - see SnapService.
    const camera = new BABYLON.ArcRotateCamera(
      'camera', 0, Math.PI / 2, 10, new BABYLON.Vector3(5, 3, 1.5), scene);
    camera.fov = Math.PI / 2;
    camera.setPosition(new BABYLON.Vector3(5, -10, 1.5));

    TestBed.configureTestingModule({
      providers: [{
        provide: BabylonService,
        useValue: {
          scene: scene, camera: camera, canvas: { clientHeight: 800 }, engine: engine
        }
      }]
    });

    TestBed.inject(SceneBoundsService).setFrom([{ ...WEST, x2: 10.2 }]);
    registry = TestBed.inject(SceneRegistryService);
    picking = TestBed.inject(PickService);
    snapping = TestBed.inject(SnapService);
    gizmo = TestBed.inject(GizmoService);

    commands = [];
    TestBed.inject(EditStreamService).commands$.subscribe(command => commands.push(command));

    // Nothing to catch on unless a test says otherwise
    snapping.setScene(emptyScene());

    // What the app turns on, and the standalone viewer does not (#88)
    gizmo.enabled = true;
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  /** Put an element on screen, as a drawing service would. */
  function draw(uuid: string, xb: SceneXb): void {
    registry.register(uuid, {
      mesh: new BABYLON.Mesh(uuid, scene), type: 'obst', id: uuid.toUpperCase(), xb: xb
    });
  }

  function select(...uuids: string[]): void {
    picking.setSelected(uuids);
  }

  describe('a translate', () => {

    beforeEach(() => {
      draw('west', WEST);
      select('west');
    });

    it('says nothing at all while the pointer is still down', () => {
      // The round trip through the app would have to fit inside a frame; the
      // preview is drawn here instead and one command lands at the end
      // (ADR-0004).
      gizmo.beginMove();
      gizmo.trackMove({ dx: 1, dy: 0, dz: 0 }, ['x']);
      gizmo.trackMove({ dx: 2, dy: 0, dz: 0 }, ['x']);

      expect(commands).toEqual([]);
    });

    it('emits one move when the gesture ends', () => {
      gizmo.beginMove();
      gizmo.trackMove({ dx: 2, dy: 0, dz: 0 }, ['x']);

      gizmo.commit();

      expect(commands).toEqual([
        { kind: 'move', uuids: ['west'], delta: { dx: 2, dy: 0, dz: 0 } }
      ]);
    });

    it('carries the whole selection in the one command', () => {
      // A gesture over a hundred elements is one entry in the history, however
      // many it touched (ADR-0009).
      draw('east', EAST);
      select('west', 'east');

      gizmo.beginMove();
      gizmo.trackMove({ dx: 2, dy: 0, dz: 0 }, ['x']);
      gizmo.commit();

      expect(commands.length).toBe(1);
      expect((commands[0] as any).uuids).toEqual(['west', 'east']);
    });

    it('emits nothing at all when the gesture is abandoned', () => {
      gizmo.beginMove();
      gizmo.trackMove({ dx: 2, dy: 0, dz: 0 }, ['x']);

      gizmo.cancel();

      expect(commands).toEqual([]);
    });

    it('emits nothing when the element was put back where it started', () => {
      gizmo.beginMove();
      gizmo.trackMove({ dx: 2, dy: 0, dz: 0 }, ['x']);
      gizmo.trackMove({ dx: 0, dy: 0, dz: 0 }, ['x']);

      gizmo.commit();

      expect(commands).toEqual([]);
    });

    it('takes the number the user typed over the one the mouse reported', () => {
      gizmo.beginMove();
      gizmo.trackMove({ dx: 2.37, dy: 0, dz: 0 }, ['x']);

      gizmo.type('dx', '3');
      gizmo.commit();

      expect((commands[0] as any).delta).toEqual({ dx: 3, dy: 0, dz: 0 });
    });

    it('catches on the geometry it was dragged near', () => {
      // The east wall's near face is at x = 10; the west wall dragged 9.7 m
      // leaves its own far face at 9.9, a tenth of a metre short of it. The
      // gesture closes the gap and the two walls meet.
      snapping.setScene({
        ...emptyScene(),
        obsts: [{
          uuid: 'east', id: 'EAST', surfId: '', permitHole: true,
          color: { r: 1, g: 1, b: 1, a: 1 }, xb: EAST
        }]
      });

      gizmo.beginMove();
      gizmo.trackMove({ dx: 9.7, dy: 0, dz: 0 }, ['x']);
      gizmo.commit();

      expect((commands[0] as any).delta.dx).toBeCloseTo(9.8, 6);
    });

    it('shows what the gesture is doing while it runs, and nothing after', () => {
      gizmo.beginMove();
      gizmo.trackMove({ dx: 2, dy: 0, dz: 0 }, ['x']);

      expect(gizmo.gesture.fields.map(field => field.label)).toEqual(['dX', 'dY', 'dZ']);
      expect(gizmo.gesture.fields[0].value).toBe(2);

      gizmo.commit();

      expect(gizmo.gesture).toBeNull();
    });
  });

  describe('a face drag', () => {

    beforeEach(() => {
      draw('west', WEST);
      select('west');
    });

    it('emits the whole box, with the one coordinate the handle drags', () => {
      gizmo.beginResize('x2');
      gizmo.trackResize(0.5);

      gizmo.commit();

      expect(commands).toEqual([
        { kind: 'setXb', uuid: 'west', xb: { x1: 0, x2: 0.5, y1: 0, y2: 6, z1: 0, z2: 3 } }
      ]);
    });

    it('names the coordinate in the panel, as an absolute position', () => {
      gizmo.beginResize('z1');
      gizmo.trackResize(0.4);

      expect(gizmo.gesture.fields.map(field => field.label)).toEqual(['Z1']);
      expect(gizmo.gesture.fields[0].value).toBe(0.4);
    });

    it('takes a typed coordinate over the dragged one', () => {
      gizmo.beginResize('x2');
      gizmo.trackResize(0.5);

      gizmo.type('x2', '1.25');
      gizmo.commit();

      expect((commands[0] as any).xb.x2).toBe(1.25);
    });

    it('stops the face flat rather than turning the box inside out', () => {
      gizmo.beginResize('x1');
      gizmo.trackResize(5);

      gizmo.commit();

      expect((commands[0] as any).xb).toEqual({ x1: 0.2, x2: 0.2, y1: 0, y2: 6, z1: 0, z2: 3 });
    });

    it('has no handles to offer when several elements are selected', () => {
      // Which face of which element a drag would be is not a question the six
      // handles can answer, so the ribbon offers Move instead.
      draw('east', EAST);
      select('west', 'east');

      expect(gizmo.canResize).toBe(false);
    });
  });

  describe('the manipulator on screen', () => {

    it('is drawn through the camera the model is drawn with', () => {
      // The scene has two: the view cube renders through a second one into a
      // corner of the canvas, and `activeCamera` is left on whichever went
      // last. A manipulator sized against that one comes out at a negative
      // scale - which flips the winding of every triangle and hands the whole
      // gizmo to backface culling, so nothing is on screen at all (#124).
      const viewCube = new BABYLON.ArcRotateCamera(
        'cameraView', 0, Math.PI / 2, 3, BABYLON.Vector3.Zero(), scene);
      scene.activeCamera = viewCube;

      draw('west', WEST);
      select('west');

      expect((gizmo as any).layer.getRenderCamera().name).toBe('camera');
    });

    it('offers nothing while nothing is selected', () => {
      expect(gizmo.canResize).toBe(false);
      expect(gizmo.gesture).toBeNull();
    });

    it('offers nothing at all to a host that has not asked for editing', () => {
      // The standalone viewer has no `Fds` to apply a command to and nothing
      // subscribed to the command stream, so a gesture there would move an
      // outline that snapped back the moment the pointer came up (#88).
      gizmo.enabled = false;
      draw('west', WEST);
      select('west');

      gizmo.beginMove();
      gizmo.trackMove({ dx: 2, dy: 0, dz: 0 }, ['x']);
      gizmo.commit();

      expect(gizmo.canResize).toBe(false);
      expect(gizmo.gesture).toBeNull();
      expect(commands).toEqual([]);
    });

    it('drops a gesture the host switches editing off under', () => {
      draw('west', WEST);
      select('west');
      gizmo.beginMove();

      gizmo.enabled = false;

      expect(gizmo.gesture).toBeNull();
      expect(commands).toEqual([]);
    });

    it('drops a running gesture when the selection goes', () => {
      // Deleting what is being dragged, or switching scenario mid-gesture.
      draw('west', WEST);
      select('west');
      gizmo.beginMove();

      select();

      expect(gizmo.gesture).toBeNull();
      expect(commands).toEqual([]);
    });
  });
});
