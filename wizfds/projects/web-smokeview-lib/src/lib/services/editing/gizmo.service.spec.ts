import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import {
  faceOutward, GizmoService, gripOrientation, MOVE_AXES, moveAnchorOf, RESIZE_FACES
} from './gizmo.service';
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

    it('escapes a snap catch by accumulating the pointer, not the snapped result', () => {
      // The wall shares its corners with the column, so any small push is
      // caught and corrected back to zero. The drag arrives as per-frame
      // pointer increments; if each increment were measured from wherever the
      // snap left the preview, the catch would consume the pointer's progress
      // and a slow drag could never build up the distance to escape (#124).
      snapping.setScene({
        ...emptyScene(),
        obsts: [{
          uuid: 'column', id: 'C1', surfId: '', permitHole: true,
          color: { r: 1, g: 1, b: 1, a: 1 },
          xb: { x1: 0, x2: 0.2, y1: 0, y2: 0.2, z1: 0, z2: 3 }
        }]
      });

      const adapter: any = gizmo;
      adapter.onMoveDragStart('x');
      // A slow, steady push: 12 frames of 5 cm, far past the ~28 cm tolerance
      for (let frame = 0; frame < 12; frame++) {
        adapter.onMoveDrag('x', new BABYLON.Vector3(0.05, 0, 0));
      }
      adapter.onMoveDragEnd();

      expect(commands.length).toBe(1);
      expect((commands[0] as any).delta.dx).toBeGreaterThan(0.5);
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

    it('asks for nothing when the handle was pressed but never moved', () => {
      // A click on a handle delivers a drag start and a drag end with no move
      // between them. The panel has to open on the coordinate the face is
      // already at, or the gesture commits the number it was seeded with and
      // collapses the element to nothing (#124).
      gizmo.beginResize('x2');

      gizmo.commit();

      expect(commands).toEqual([]);
    });

    it('opens the panel on the coordinate the face already stands at', () => {
      gizmo.beginResize('x2');

      expect(gizmo.gesture.fields[0].value).toBe(0.2);
    });

    it('has no handles to offer when several elements are selected', () => {
      // Which face of which element a drag would be is not a question the six
      // handles can answer, so the ribbon offers Move instead.
      draw('east', EAST);
      select('west', 'east');

      expect(gizmo.canResize).toBe(false);
    });
  });

  /**
   * The face handles are AutoCAD's stretch grips: flat triangles, tip pointing
   * the way the face goes, and they do not turn (#124).
   *
   * The x and y grips lie flat on the floor; the one z grip stands
   * perpendicular to it, pointing up. A fixed orientation over a
   * camera-following one: a grip that turns reads as a thing of the screen,
   * and these are things of the model.
   */
  describe('the triangle handles', () => {

    it('points each triangle out of the box, along its own face', () => {
      expect(faceOutward('x1').asArray()).toEqual([-1, 0, 0]);
      expect(faceOutward('x2').asArray()).toEqual([1, 0, 0]);
      expect(faceOutward('z2').asArray()).toEqual([0, 0, 1]);
    });

    it('lays the x and y grips flat on the floor', () => {
      // The triangle's plane normal is straight up: the grip lies in the
      // horizontal plane, tip along its own axis.
      const x2 = gripOrientation('x2');
      expect(x2.right.asArray()).toEqual([1, 0, 0]);
      expect(x2.forward.asArray()).toEqual([0, 0, 1]);

      const y1 = gripOrientation('y1');
      expect(y1.right.asArray()).toEqual([0, -1, 0]);
      expect(y1.forward.asArray()).toEqual([0, 0, 1]);
      // Orthonormal - the up axis is what makes it a rotation and not a shear
      expect(BABYLON.Vector3.Dot(y1.up, y1.right)).toBeCloseTo(0, 6);
      expect(y1.up.length()).toBeCloseTo(1, 6);
    });

    it('stands the z grip perpendicular to the floor, tip up', () => {
      const z2 = gripOrientation('z2');

      expect(z2.right.asArray()).toEqual([0, 0, 1]);
      // A vertical plane - the normal is horizontal
      expect(z2.forward.z).toBe(0);
      expect(z2.forward.length()).toBeCloseTo(1, 6);
      expect(BABYLON.Vector3.Dot(z2.forward, z2.right)).toBeCloseTo(0, 6);
    });

    it('offers one z grip, not two - the up one', () => {
      // The floor of an element is where it stands; what gets pulled is the
      // top. The bottom stays reachable through the palette.
      expect(RESIZE_FACES).not.toContain('z1');
      expect(RESIZE_FACES).toContain('z2');

      draw('west', WEST);
      select('west');
      gizmo.setMode('resize');

      const handles = (gizmo as any).handles;
      expect(handles.size).toBe(5);
      expect(handles.get('z1')).toBeUndefined();

      const handle = handles.get('x2') as BABYLON.Mesh;
      expect(handle.getTotalVertices()).toBe(3);
      expect(handle.rotationQuaternion).not.toBeNull();
    });

    it('gives each grip an invisible aperture wider than its drawing', () => {
      // A flat grip seen at an angle foreshortens to a few pixels - honest to
      // look at, hopeless to click. The sphere takes the hit from any
      // direction; being a child, a press on it starts the same drag.
      draw('west', WEST);
      select('west');
      gizmo.setMode('resize');

      const handle = (gizmo as any).handles.get('x2') as BABYLON.Mesh;
      const apertures = handle.getChildMeshes();

      expect(apertures.length).toBe(1);
      expect(apertures[0].visibility).toBe(0);
      expect(apertures[0].isPickable).toBe(true);
    });
  });

  /**
   * The move manipulator is a family of the same grips as resize: a square on
   * the base that slides the selection in plan, and two arrows for one world
   * axis each. No z handle - the height goes in through the keyboard, which is
   * where it comes from anyway (#124).
   */
  describe('the move handles', () => {

    beforeEach(() => {
      draw('west', WEST);
      select('west');
    });

    it('finds its anchor at the middle of the union base', () => {
      expect(moveAnchorOf([WEST])).toEqual({ x: 0.1, y: 3, z: 0 });
      expect(moveAnchorOf([WEST, EAST])).toEqual({ x: 5.1, y: 3, z: 0 });
    });

    it('frees the plane for the square and one axis for each arrow', () => {
      expect(MOVE_AXES.plan).toEqual(['x', 'y']);
      expect(MOVE_AXES.x).toEqual(['x']);
      expect(MOVE_AXES.y).toEqual(['y']);
    });

    it('offers a square and two arrows, standing on the base of the selection', () => {
      const handles = (gizmo as any).moveHandles as Map<string, BABYLON.Mesh>;
      expect(Array.from(handles.keys()).sort()).toEqual(['plan', 'x', 'y']);

      const square = handles.get('plan');
      expect(square.position.x).toBeCloseTo(0.1, 6);
      expect(square.position.y).toBeCloseTo(3, 6);
      expect(square.position.z).toBeCloseTo(0, 6);

      // Each arrow stands off the square along the one axis it drags
      expect(handles.get('x').position.x).toBeGreaterThan(0.1);
      expect(handles.get('x').position.y).toBeCloseTo(3, 6);
      expect(handles.get('y').position.y).toBeGreaterThan(3);
      expect(handles.get('y').position.x).toBeCloseTo(0.1, 6);
    });

    it('anchors on the union of a multiple selection', () => {
      draw('east', EAST);
      select('west', 'east');

      const square = ((gizmo as any).moveHandles as Map<string, BABYLON.Mesh>).get('plan');
      expect(square.position.x).toBeCloseTo(5.1, 6);
      expect(square.position.y).toBeCloseTo(3, 6);
      expect(square.position.z).toBeCloseTo(0, 6);
    });

    it('gives every handle an invisible aperture wider than its drawing', () => {
      const handles = (gizmo as any).moveHandles as Map<string, BABYLON.Mesh>;

      handles.forEach(handle => {
        const apertures = handle.getChildMeshes();
        expect(apertures.length).toBe(1);
        expect(apertures[0].visibility).toBe(0);
        expect(apertures[0].isPickable).toBe(true);
      });
    });

    it('keeps one manipulator on screen at a time', () => {
      gizmo.setMode('resize');
      expect(((gizmo as any).moveHandles as Map<string, unknown>).size).toBe(0);
      expect(((gizmo as any).handles as Map<string, unknown>).size).toBe(5);

      gizmo.setMode('move');
      expect(((gizmo as any).moveHandles as Map<string, unknown>).size).toBe(3);
      expect(((gizmo as any).handles as Map<string, unknown>).size).toBe(0);
    });

    it('moves the plan and nothing else when the square is dragged', () => {
      // The square slides the selection over the floor; whatever vertical
      // component the pointer ray produces is not the gesture's to spend. The
      // height is typed, and typing is the one way it moves.
      const adapter: any = gizmo;
      adapter.onMoveDragStart('plan');
      adapter.onMoveDrag('plan', new BABYLON.Vector3(0.3, 0.2, 0.7));
      adapter.onMoveDragEnd();

      expect(commands).toEqual([
        { kind: 'move', uuids: ['west'], delta: { dx: 0.3, dy: 0.2, dz: 0 } }
      ]);
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
