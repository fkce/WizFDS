import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { SnapService } from './snap.service';
import { BabylonService } from '../babylon/babylon.service';
import { SceneInput } from '../drawing/scene-input';

/** Nothing in it - each test puts in the two or three lists it is about. */
function emptyScene(): SceneInput {
  return {
    meshes: [], obsts: [], holes: [], opens: [], vents: [], fires: [],
    jetfans: [], devcs: [], geoms: [], inits: [], zones: []
  };
}

const OPAQUE = { r: 1, g: 1, b: 1, a: 1 };

/**
 * A camera 10 m from the model, at a right angle, over an 800 px canvas.
 *
 * At a 90 degree field of view what fits on screen at 10 m away is 20 m of
 * model, so one pixel is 25 mm and the ten-pixel tolerance is a quarter of a
 * metre - wide enough for a test to state its distances in centimetres.
 */
function babylonAt(distance: number): any {
  return {
    camera: { position: new BABYLON.Vector3(0, -distance, 0), fov: Math.PI / 2 },
    canvas: { clientHeight: 800 },
    scene: null
  };
}

/**
 * What the scene is snapped against, and who is allowed to turn it off (#124).
 *
 * The arithmetic lives in snap.ts, which knows nothing of a scene; this is what
 * hands it the model, the tolerance the current zoom implies, and the modes the
 * user left switched on.
 */
describe('SnapService', () => {

  let service: SnapService;

  function build(distance = 10): void {
    TestBed.configureTestingModule({
      providers: [{ provide: BabylonService, useValue: babylonAt(distance) }]
    });
    service = TestBed.inject(SnapService);
  }

  beforeEach(() => build());

  it('starts with all three modes on, as OSNAP does', () => {
    expect(service.isOn('corner')).toBe(true);
    expect(service.isOn('edge')).toBe(true);
    expect(service.isOn('grid')).toBe(true);
  });

  it('turns one mode off without touching the others', () => {
    service.toggle('grid');

    expect(service.isOn('grid')).toBe(false);
    expect(service.isOn('corner')).toBe(true);
  });

  it('names the mesh whose grid is in force at a point', () => {
    service.setScene({
      ...emptyScene(),
      meshes: [{
        uuid: 'm', id: 'ROOM', xb: { x1: 0, x2: 10, y1: 0, y2: 6, z1: 0, z2: 3 },
        cell: { i: 0.25, j: 0.25, k: 0.2 }
      }]
    });

    expect(service.gridAt({ x: 2, y: 1, z: 1 }).meshId).toBe('ROOM');
  });

  it('catches a point on the corner of an obst', () => {
    service.setScene({
      ...emptyScene(),
      obsts: [{
        uuid: 'w', id: 'W1', surfId: 'WALL', permitHole: true, color: OPAQUE,
        xb: { x1: 0, x2: 4, y1: 0, y2: 0.2, z1: 0, z2: 3 }
      }]
    });

    const hit = service.snap({ x: 4.02, y: 0.21, z: 2.98 });

    expect(hit.mode).toBe('corner');
    expect(hit.point).toEqual({ x: 4, y: 0.2, z: 3 });
  });

  it('does not let an element catch on itself', () => {
    // The wall being dragged is on screen, and its own corners travel with it -
    // snapping to them would pin the gesture where it started.
    service.setScene({
      ...emptyScene(),
      obsts: [{
        uuid: 'w', id: 'W1', surfId: 'WALL', permitHole: true, color: OPAQUE,
        xb: { x1: 0, x2: 4, y1: 0, y2: 0.2, z1: 0, z2: 3 }
      }]
    });

    const hit = service.snap({ x: 4.02, y: 0.21, z: 2.98 }, { exclude: new Set(['w']) });

    expect(hit).toBeNull();
  });

  it('answers nothing at all while it is suspended', () => {
    // Holding ctrl suspends snapping for the rest of the gesture, which is how a
    // user places something the grid will not let them place.
    service.setScene({
      ...emptyScene(),
      obsts: [{
        uuid: 'w', id: 'W1', surfId: 'WALL', permitHole: true, color: OPAQUE,
        xb: { x1: 0, x2: 4, y1: 0, y2: 0.2, z1: 0, z2: 3 }
      }]
    });
    service.suspended = true;

    expect(service.snap({ x: 4.02, y: 0.21, z: 2.98 })).toBeNull();
  });

  it('brings a corner of the moved box onto the corner it was dragged near', () => {
    // What a translate snaps: not the point the pointer is over, but the box
    // itself - any of its eight corners may be the one the user is aiming with,
    // and the nearest catch is the one they meant.
    service.setScene({
      ...emptyScene(),
      obsts: [{
        uuid: 'column', id: 'C1', surfId: 'STEEL', permitHole: true, color: OPAQUE,
        xb: { x1: 5, x2: 5.4, y1: 0, y2: 0.4, z1: 0, z2: 3 }
      }]
    });

    // A wall from the origin, dragged 4.9 m east: its far bottom corner lands at
    // (4.9, 0, 0) - a tenth of a metre short of the column's near corner.
    const wall = { x1: 0, x2: 1, y1: 0, y2: 0.2, z1: 0, z2: 3 };
    const moved = service.snapMove(
      wall, { dx: 4.9, dy: 0, dz: 0 }, ['x'], new Set(['wall']));

    expect(moved.hit.mode).toBe('corner');
    expect(moved.delta.dx).toBeCloseTo(5, 6);
    expect(moved.delta.dy).toBe(0);
    expect(moved.delta.dz).toBe(0);
  });

  it('leaves the delta alone when nothing catches the box', () => {
    service.setScene(emptyScene());

    const wall = { x1: 0, x2: 1, y1: 0, y2: 0.2, z1: 0, z2: 3 };
    const moved = service.snapMove(wall, { dx: 4.9, dy: 0, dz: 0 }, ['x'], new Set());

    expect(moved.hit).toBeNull();
    expect(moved.delta).toEqual({ dx: 4.9, dy: 0, dz: 0 });
  });

  it('keeps a one-axis drag on its axis', () => {
    // The arrow the user grabbed is the promise that nothing else moves; a
    // corner a little off in z must not drag the wall down to it.
    service.setScene({
      ...emptyScene(),
      obsts: [{
        uuid: 'column', id: 'C1', surfId: 'STEEL', permitHole: true, color: OPAQUE,
        xb: { x1: 5, x2: 5.4, y1: 0, y2: 0.4, z1: 0.05, z2: 3 }
      }]
    });

    const wall = { x1: 0, x2: 1, y1: 0, y2: 0.2, z1: 0, z2: 3 };
    const moved = service.snapMove(
      wall, { dx: 4.9, dy: 0, dz: 0 }, ['x'], new Set(['wall']));

    expect(moved.delta.dz).toBe(0);
  });

  it('catches a face on geometry beside it, not only opposite its middle', () => {
    // A ten-metre wall dragged out towards a column standing at one end of it.
    // The middle of the face being dragged is five metres from that column, so
    // asking the snap about the middle alone would never find it - the face's
    // own corners are what the user is aiming with.
    service.setScene({
      ...emptyScene(),
      obsts: [{
        uuid: 'column', id: 'C1', surfId: 'STEEL', permitHole: true, color: OPAQUE,
        xb: { x1: 1, x2: 1.4, y1: 0, y2: 0.4, z1: 0, z2: 3 }
      }]
    });

    const wall = { x1: 0, x2: 0.9, y1: 0, y2: 10, z1: 0, z2: 3 };
    const dragged = service.snapFace(wall, 'x2', 0.9, new Set(['wall']));

    expect(dragged.hit.mode).toBe('corner');
    expect(dragged.coordinate).toBeCloseTo(1, 6);
  });

  it('leaves a face where it was dragged when nothing catches it', () => {
    service.setScene(emptyScene());

    const wall = { x1: 0, x2: 0.9, y1: 0, y2: 10, z1: 0, z2: 3 };
    const dragged = service.snapFace(wall, 'x2', 0.9, new Set());

    expect(dragged.hit).toBeNull();
    expect(dragged.coordinate).toBe(0.9);
  });

  it('rounds a dragged face onto the grid, and moves nothing else', () => {
    // Six handles exist so that a drag changes exactly one number; a snap that
    // shifted the face sideways would undo the whole point of them. The wall
    // stands clear of the mesh's own faces, so the grid is what catches it and
    // not an edge of the domain.
    service.setScene({
      ...emptyScene(),
      meshes: [{
        uuid: 'm', id: 'ROOM', xb: { x1: 0, x2: 10, y1: 0, y2: 10, z1: 0, z2: 3 },
        cell: { i: 0.25, j: 0.25, k: 0.25 }
      }]
    });

    const wall = { x1: 0.5, x2: 0.9, y1: 1, y2: 9, z1: 0.5, z2: 2.5 };
    const dragged = service.snapFace(wall, 'x2', 0.9, new Set(['wall']));

    expect(dragged.hit.mode).toBe('grid');
    expect(dragged.coordinate).toBeCloseTo(1, 6);
  });

  it('measures its tolerance on screen, so it narrows as the camera comes in', () => {
    // Ten pixels at 10 m away is a quarter of a metre; at 1 m away it is 25 mm.
    const wide = service.toleranceAt({ x: 0, y: 0, z: 0 });

    TestBed.resetTestingModule();
    build(1);
    const close = service.toleranceAt({ x: 0, y: 0, z: 0 });

    expect(wide).toBeCloseTo(0.25, 6);
    expect(close).toBeCloseTo(0.025, 6);
  });
});
