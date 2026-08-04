import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { DrawToolService } from './draw-tool.service';
import { SnapService } from './snap.service';
import { EditStreamService } from './edit-stream.service';
import { SceneEditCommand } from './edit-command';
import { PickService, PickedAt } from '../picking/pick.service';
import { SceneBoundsService } from '../scene-bounds/scene-bounds.service';
import { BabylonService } from '../babylon/babylon.service';
import { SceneInput, SceneMesh, SceneXb } from '../drawing/scene-input';

/** The domain the tests draw in: ten by six by three metres, kwarter-metre cells. */
const DOMAIN: SceneXb = { x1: 0, x2: 10, y1: 0, y2: 6, z1: 0, z2: 3 };

/** A wall an element can land on, its inner face at x = 0.2. */
const WALL: SceneXb = { x1: 0, x2: 0.2, y1: 0, y2: 6, z1: 0, z2: 3 };

function emptyScene(): SceneInput {
  return {
    meshes: [], obsts: [], holes: [], opens: [], vents: [], fires: [],
    jetfans: [], devcs: [], geoms: [], inits: [], zones: []
  };
}

function meshOver(xb: SceneXb): SceneMesh {
  return { uuid: 'uuid-mesh', id: 'MESH1', xb: xb, cell: { i: 0.25, j: 0.25, k: 0.25 } };
}

/** A ray looking straight down at a point of the plan, from above the model. */
function down(x: number, y: number): BABYLON.Ray {
  return new BABYLON.Ray(
    new BABYLON.Vector3(x, y, 10), new BABYLON.Vector3(0, 0, -1), 100);
}

/** A ray looking horizontally at a height - what aims the third step. */
function levelAt(z: number, x: number, y: number): BABYLON.Ray {
  return new BABYLON.Ray(
    new BABYLON.Vector3(x, y + 10, z), new BABYLON.Vector3(0, -1, 0), 100);
}

/**
 * The draw gesture, from the ribbon's button to the one command it leaves
 * behind (#125): a corner, the opposite corner of the base, a height - and a
 * flat &VENT finishing at step two.
 *
 * Driven through the lifecycle the pointer handlers call - track, click,
 * commit - exactly as the gizmo's spec drives a drag: the command is a
 * decision, not a mesh.
 */
describe('DrawToolService', () => {

  let tool: DrawToolService;
  let picking: PickService;
  let snapping: SnapService;
  let commands: SceneEditCommand[];
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);

    // A real camera, as in the gizmo's spec: over an 800 px canvas some 11 m
    // away, the ten-pixel snap tolerance comes to about 28 cm.
    const camera = new BABYLON.ArcRotateCamera(
      'camera', 0, Math.PI / 2, 10, new BABYLON.Vector3(5, 3, 1.5), scene);
    camera.fov = Math.PI / 2;
    camera.setPosition(new BABYLON.Vector3(5, -10, 1.5));

    TestBed.configureTestingModule({
      providers: [{
        provide: BabylonService,
        useValue: {
          scene: scene, camera: camera,
          canvas: { clientHeight: 800, style: {} }, engine: engine
        }
      }]
    });

    TestBed.inject(SceneBoundsService).setFrom([DOMAIN]);
    picking = TestBed.inject(PickService);
    snapping = TestBed.inject(SnapService);
    tool = TestBed.inject(DrawToolService);

    commands = [];
    TestBed.inject(EditStreamService).commands$.subscribe(command => commands.push(command));

    // A domain to land on; nothing under the cursor unless a test says otherwise
    snapping.setScene({ ...emptyScene(), meshes: [meshOver(DOMAIN)] });
    spyOn(picking, 'surfaceUnder').and.returnValue(undefined);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  /** Say what stands under the cursor, as a pick would have answered. */
  function landOn(picked: PickedAt | undefined): void {
    (picking.surfaceUnder as jasmine.Spy).and.returnValue(picked);
  }

  describe('an OBST, clicked out in three steps', () => {

    it('says nothing at all until the gesture completes', () => {
      tool.start('obst');
      tool.click(down(1, 1));
      tool.track(down(3, 4));
      tool.click(down(3, 4));

      expect(commands).toEqual([]);
    });

    it('emits one create for the box the three clicks described', () => {
      tool.start('obst');
      tool.click(down(1, 1));
      tool.click(down(3, 4));
      tool.click(levelAt(2, 3, 4));

      expect(commands).toEqual([{
        kind: 'create', type: 'obst',
        xb: { x1: 1, x2: 3, y1: 1, y2: 4, z1: 0, z2: 2 },
        surfId: undefined
      }]);
    });

    it('lands the first corner on the floor of the &MESH under the cursor', () => {
      const raised = { ...DOMAIN, z1: 0.5 };
      snapping.setScene({ ...emptyScene(), meshes: [meshOver(raised)] });

      tool.start('obst');
      tool.click(down(1, 1));
      tool.click(down(3, 4));
      tool.commit();

      expect(commands[0].kind).toBe('create');
      expect((commands[0] as any).xb.z1).toBe(0.5);
    });

    it('carries the current &SURF from the ribbon into the command', () => {
      tool.start('obst', 'concrete');
      tool.click(down(1, 1));
      tool.click(down(3, 4));
      tool.click(levelAt(2, 3, 4));

      expect((commands[0] as any).surfId).toBe('concrete');
    });

    it('switches itself off once the element is asked for', () => {
      // A tool is a gesture, not a mode (ADR-0010)
      tool.start('obst');
      expect(tool.active).toBe('obst');

      tool.click(down(1, 1));
      tool.click(down(3, 4));
      tool.click(levelAt(2, 3, 4));

      expect(tool.active).toBeNull();
      expect(tool.gesture).toBeNull();
    });
  });

  describe('the dynamic input', () => {

    it('offers the corner absolutely, then the base deltas, then the height', () => {
      tool.start('obst');
      expect(tool.gesture.fields.map(field => field.key)).toEqual(['x', 'y', 'z']);

      tool.click(down(1, 1));
      expect(tool.gesture.fields.map(field => field.key)).toEqual(['dx', 'dy']);

      tool.click(down(3, 4));
      expect(tool.gesture.fields.map(field => field.key)).toEqual(['dz']);

      expect(tool.gesture.kind).toBe('draw');
    });

    it('lets a typed value take a step over from the mouse', () => {
      tool.start('obst');
      tool.click(down(1, 1));

      tool.track(down(2.9, 3.8));
      tool.type('dx', '2');
      tool.type('dy', '3');
      tool.commit();

      tool.type('dz', '2.5');
      tool.commit();

      expect(commands).toEqual([{
        kind: 'create', type: 'obst',
        xb: { x1: 1, x2: 3, y1: 1, y2: 4, z1: 0, z2: 2.5 },
        surfId: undefined
      }]);
    });

    it('types the first corner as the numbers that will open the XB', () => {
      tool.start('obst');
      tool.type('x', '1.5');
      tool.type('y', '2');
      tool.type('z', '0');
      tool.commit();

      tool.type('dx', '1');
      tool.type('dy', '1');
      tool.commit();
      tool.type('dz', '3');
      tool.commit();

      expect((commands[0] as any).xb).toEqual({ x1: 1.5, x2: 2.5, y1: 2, y2: 3, z1: 0, z2: 3 });
    });
  });

  describe('snapping', () => {

    it('catches the first corner on a nearby corner of existing geometry', () => {
      const obst: SceneXb = { x1: 2, x2: 4, y1: 2, y2: 4, z1: 0, z2: 1 };
      snapping.setScene({
        ...emptyScene(),
        meshes: [meshOver(DOMAIN)],
        obsts: [{ uuid: 'uuid-obst', id: 'OBST1', xb: obst, color: { r: 1, g: 1, b: 1, a: 1 }, surfId: '', permitHole: true }]
      });

      // The cursor lands a decimetre off the obst's corner, well inside tolerance
      tool.start('obst');
      tool.click(down(2.1, 2.05));
      tool.click(down(3, 3));
      tool.click(levelAt(1, 3, 3));

      const xb = (commands[0] as any).xb;
      expect(xb.x1).toBe(2);
      expect(xb.y1).toBe(2);
    });

    it('snaps a clicked point to the grid of the active &MESH', () => {
      tool.start('obst');
      tool.click(down(1.02, 0.98));
      tool.click(down(3, 4));
      tool.click(levelAt(2, 3, 4));

      const xb = (commands[0] as any).xb;
      expect(xb.x1).toBe(1);
      expect(xb.y1).toBe(1);
    });
  });

  describe('a VENT', () => {

    it('finishes at step two, flat on the floor it landed on', () => {
      tool.start('vent');
      tool.click(down(1, 1));
      tool.click(down(3, 4));

      expect(commands).toEqual([{
        kind: 'create', type: 'vent',
        xb: { x1: 1, x2: 3, y1: 1, y2: 4, z1: 0, z2: 0 },
        surfId: undefined
      }]);
      expect(tool.active).toBeNull();
    });

    it('lies in the plane of the wall its first corner landed on', () => {
      landOn({
        element: { uuid: 'uuid-wall', type: 'obst', id: 'WALL', xb: WALL },
        point: { x: 0.2, y: 2, z: 1 }
      });

      tool.start('vent');
      tool.click(down(0, 0));

      // The base is free on y and z now - the wall's own axis is not a field
      expect(tool.gesture.fields.map(field => field.key)).toEqual(['dy', 'dz']);

      tool.type('dy', '2');
      tool.type('dz', '1');
      tool.commit();

      expect(commands).toEqual([{
        kind: 'create', type: 'vent',
        xb: { x1: 0.2, x2: 0.2, y1: 2, y2: 4, z1: 1, z2: 2 },
        surfId: undefined
      }]);
    });
  });

  describe('abandoning', () => {

    it('Escape abandons the whole operation, at whichever step', () => {
      tool.start('obst');
      tool.click(down(1, 1));
      tool.click(down(3, 4));

      tool.cancel();

      expect(commands).toEqual([]);
      expect(tool.active).toBeNull();
      expect(tool.gesture).toBeNull();
    });

    it('a base that never opened up asks for nothing', () => {
      // The same contract as a move that never moved (GizmoService.commandFor):
      // an accidental double click must not leave a degenerate element behind.
      tool.start('obst');
      tool.click(down(1, 1));
      tool.click(down(1, 1));
      tool.click(levelAt(2, 1, 1));

      expect(commands).toEqual([]);
      expect(tool.active).toBeNull();
    });

    it('starting another element abandons the one being drawn', () => {
      tool.start('obst');
      tool.click(down(1, 1));

      tool.start('hole');

      expect(commands).toEqual([]);
      expect(tool.active).toBe('hole');
      expect(tool.gesture.fields.map(field => field.key)).toEqual(['x', 'y', 'z']);
    });
  });

  describe('the snap latch', () => {

    it('holds the suspension for the rest of the gesture (ADR-0011)', () => {
      tool.start('obst');
      tool.click(down(1, 1));

      tool.setSnapSuspended(true);
      tool.setSnapSuspended(false);

      expect(snapping.suspended).toBeTrue();
    });

    it('lets go once the gesture is over', () => {
      tool.start('obst');
      tool.setSnapSuspended(true);

      tool.cancel();

      expect(snapping.suspended).toBeFalse();
    });
  });
});
