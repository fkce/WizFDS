import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { MeasureToolService } from './measure-tool.service';
import { SceneMeasurement } from './measure';
import { SnapService } from './snap.service';
import { PickService, PickedAt } from '../picking/pick.service';
import { SceneBoundsService } from '../scene-bounds/scene-bounds.service';
import { BabylonService } from '../babylon/babylon.service';
import { SceneInput, SceneMesh, SceneXb } from '../drawing/scene-input';

/** The domain the tests measure in: ten by six by three metres. */
const DOMAIN: SceneXb = { x1: 0, x2: 10, y1: 0, y2: 6, z1: 0, z2: 3 };

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

/**
 * The distance tool (#127): two snapped points, a live readout, and nothing
 * changed in the scenario. Driven through the lifecycle the pointer handlers
 * call - start, track, click, cancel - exactly as the draw tool's spec is.
 */
describe('MeasureToolService', () => {

  let tool: MeasureToolService;
  let picking: PickService;
  let snapping: SnapService;
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;
  let measurements: (SceneMeasurement | null)[];

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);

    // A real camera, as in the draw tool's spec: over an 800 px canvas some
    // 11 m away, the ten-pixel snap tolerance comes to about 28 cm.
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
    tool = TestBed.inject(MeasureToolService);

    measurements = [];
    tool.measurement$.subscribe(measurement => measurements.push(measurement));

    // A domain floor to land on; nothing under the cursor unless a test says so
    snapping.setScene({ ...emptyScene(), meshes: [meshOver(DOMAIN)] });
    spyOn(picking, 'surfaceUnder').and.returnValue(undefined);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  /** The last thing the status bar was told. */
  function lastMeasurement(): SceneMeasurement | null {
    return measurements[measurements.length - 1];
  }

  describe('a distance, clicked out in two points', () => {

    it('is off until the ribbon starts it', () => {
      expect(tool.active).toBeFalse();
    });

    it('reads the distance and its components off the two clicks', () => {
      tool.start();
      tool.click(down(1, 1));
      tool.click(down(4, 5));

      expect(lastMeasurement()).toEqual({ distance: 5, dx: 3, dy: 4, dz: 0 });
    });

    it('reads out live while the second point is being chosen', () => {
      tool.start();
      tool.click(down(1, 1));

      tool.track(down(3, 1));

      expect(lastMeasurement()).toEqual({ distance: 2, dx: 2, dy: 0, dz: 0 });
    });

    it('shows a label at the cursor only between the points', () => {
      tool.start();
      expect(tool.label).toBeNull();

      tool.click(down(1, 1));
      tool.track(down(3, 1));
      expect(tool.label.text).toBe('2.000 m');

      tool.click(down(3, 1));
      expect(tool.label).toBeNull();
    });

    it('stays on after a measurement, ready for the next pair', () => {
      // Unlike drawing, measuring is usually done in runs - the tool ends on
      // Esc, as the issue asks, not after each answer.
      tool.start();
      tool.click(down(1, 1));
      tool.click(down(4, 5));
      expect(tool.active).toBeTrue();

      tool.click(down(2, 2));
      tool.click(down(2, 4));

      expect(lastMeasurement()).toEqual({ distance: 2, dx: 0, dy: 2, dz: 0 });
    });

    it('draws the measured line, and drops it when the next pair begins', () => {
      tool.start();
      tool.click(down(1, 1));
      tool.click(down(4, 5));
      expect(scene.getMeshByName('measureLine')).toBeTruthy();

      tool.click(down(2, 2));

      // The old answer would otherwise read as part of the new question
      expect(lastMeasurement()).toBeNull();
    });
  });

  describe('snapping', () => {

    it('catches a point on a nearby corner, in all three axes', () => {
      const obst: SceneXb = { x1: 2, x2: 4, y1: 2, y2: 4, z1: 0, z2: 1 };
      snapping.setScene({
        ...emptyScene(),
        meshes: [meshOver(DOMAIN)],
        obsts: [{
          uuid: 'uuid-obst', id: 'OBST1', xb: obst,
          color: { r: 1, g: 1, b: 1, a: 1 }, surfId: '', permitHole: true
        }]
      });

      // Both clicks land a few centimetres off opposite corners of the obst -
      // the corner-to-corner answer has to be exact (#127)
      tool.start();
      tool.click(down(2.05, 2.1));
      tool.click(down(3.95, 4.05));

      expect(lastMeasurement()).toEqual({
        distance: Math.hypot(2, 2), dx: 2, dy: 2, dz: 0
      });
    });

    it('holds the ctrl suspension for the rest of the tool (ADR-0011)', () => {
      tool.start();
      tool.setSnapSuspended(true);
      tool.setSnapSuspended(false);

      expect(snapping.suspended).toBeTrue();
    });
  });

  describe('ending', () => {

    it('Escape ends the tool and the measurement disappears with it', () => {
      tool.start();
      tool.click(down(1, 1));
      tool.click(down(4, 5));

      tool.cancel();

      expect(tool.active).toBeFalse();
      expect(lastMeasurement()).toBeNull();
      expect(tool.label).toBeNull();
      expect(scene.getMeshByName('measureLine')).toBeNull();
      expect(snapping.suspended).toBeFalse();
    });

    it('a click into a void places no point at all', () => {
      // No surface, no &MESH: nothing under the cursor means nothing to
      // measure from - the same contract as the draw tool's first corner
      snapping.setScene(emptyScene());

      tool.start();
      tool.click(down(1, 1));
      tool.track(down(3, 1));

      expect(lastMeasurement()).toBeNull();
      expect(tool.label).toBeNull();
    });

    it('changes nothing about the scenario', () => {
      // The definition of done in #127: a measurement is presentation only
      // (ADR-0004) - there is no command stream in this spec to hear from,
      // and the tool does not import one.
      tool.start();
      tool.click(down(1, 1));
      tool.click(down(4, 5));

      expect(scene.getMeshByName('measureLine').isPickable).toBeFalse();
    });
  });
});
