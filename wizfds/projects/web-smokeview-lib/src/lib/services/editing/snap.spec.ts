import { activeGrid, metresPerPixel, snapPoint, SnapWorld } from './snap';
import { SceneMesh } from '../drawing/scene-input';

/** A &MESH, as the app hands one over: a box and the size of one cell in it. */
function mesh(id: string, xb: number[], cell: number[]): SceneMesh {
  return {
    uuid: `${id}-uuid`, id: id,
    xb: { x1: xb[0], x2: xb[1], y1: xb[2], y2: xb[3], z1: xb[4], z2: xb[5] },
    cell: { i: cell[0], j: cell[1], k: cell[2] }
  };
}

/**
 * Which &MESH's grid a snap rounds to (#124).
 *
 * A scenario normally holds several meshes at different resolutions, so "the
 * grid" is not a property of the scenario - it is a question about a point. This
 * mirrors FDS, where an object belongs to the mesh it sits in.
 */
describe('activeGrid', () => {

  const ROOM = mesh('ROOM', [0, 10, 0, 6, 0, 3], [0.25, 0.25, 0.2]);
  const CORRIDOR = mesh('CORRIDOR', [10, 20, 0, 6, 0, 3], [0.5, 0.5, 0.5]);

  it('takes the grid of the mesh the point is in', () => {
    const grid = activeGrid([ROOM, CORRIDOR], { x: 2.5, y: 1, z: 1.5 });

    expect(grid.meshId).toBe('ROOM');
    expect(grid.cell).toEqual({ i: 0.25, j: 0.25, k: 0.2 });
  });

  it('measures the grid from the mesh\'s own corner, not from the origin', () => {
    // FDS divides XB into IJK equal cells, so a mesh that does not start at a
    // round number has no cell boundary at one either.
    const offset = mesh('SHIFTED', [0.15, 10.15, 0, 6, 0, 3], [0.25, 0.25, 0.25]);

    const grid = activeGrid([offset], { x: 2, y: 1, z: 1.5 });

    expect(grid.origin).toEqual({ x: 0.15, y: 0, z: 0 });
  });

  it('takes the finer of two meshes that overlap', () => {
    // Refining a region means laying a finer mesh over a coarser one, and the
    // finer is the one the user is working to. Meshes also share their boundary
    // faces by construction, so this decides a point on a face as well - and
    // decides it the same way each time, so the readout does not flicker.
    const coarse = mesh('COARSE', [0, 20, 0, 6, 0, 3], [0.5, 0.5, 0.5]);
    const fine = mesh('FINE', [4, 8, 0, 6, 0, 3], [0.1, 0.1, 0.1]);

    expect(activeGrid([coarse, fine], { x: 6, y: 1, z: 1.5 }).meshId).toBe('FINE');
    expect(activeGrid([fine, coarse], { x: 6, y: 1, z: 1.5 }).meshId).toBe('FINE');
  });

  it('notices a mesh refined on one axis alone', () => {
    // A mesh stretched fine over z and coarse over x and y is a storey model,
    // and comparing the first axis alone would call it the coarser of the two.
    const uniform = mesh('UNIFORM', [0, 20, 0, 6, 0, 3], [0.4, 0.4, 0.4]);
    const layered = mesh('LAYERED', [0, 20, 0, 6, 0, 3], [0.4, 0.4, 0.05]);

    expect(activeGrid([uniform, layered], { x: 6, y: 1, z: 1.5 }).meshId).toBe('LAYERED');
  });

  it('falls back on the nearest mesh outside every one of them', () => {
    // A wall dragged towards a domain it has not reached yet still has a grid it
    // is going to have to obey, and it is that domain's.
    const grid = activeGrid([ROOM, CORRIDOR], { x: 25, y: 1, z: 1.5 });

    expect(grid.meshId).toBe('CORRIDOR');
  });

  it('has no grid in a scenario with no mesh', () => {
    expect(activeGrid([], { x: 1, y: 1, z: 1 })).toBeNull();
  });
});

/**
 * Where a point lands once the three snap modes have had their say (#124).
 *
 * The tolerance arrives in metres and is measured in screen pixels, so how near
 * "near" is depends on the zoom and not on the model - see metresPerPixel().
 */
describe('snapPoint', () => {

  const ROOM = mesh('ROOM', [0, 10, 0, 6, 0, 3], [0.25, 0.25, 0.2]);

  /** Everything on, nothing to snap to but the grid, and a wide tolerance. */
  function world(over: Partial<SnapWorld> = {}): SnapWorld {
    return {
      grid: activeGrid([ROOM], { x: 0, y: 0, z: 0 }),
      boxes: [],
      modes: { corner: true, edge: true, grid: true },
      tolerance: 0.2,
      ...over
    };
  }

  it('rounds a point onto the nearest cell boundaries of the active grid', () => {
    // 2.62 m is between the boundaries at 2.50 and 2.75; the other two
    // coordinates already stand on one.
    const hit = snapPoint({ x: 2.62, y: 1, z: 1.4 }, world());

    expect(hit.mode).toBe('grid');
    expect(hit.point.x).toBeCloseTo(2.5, 6);
    expect(hit.point.y).toBeCloseTo(1, 6);
    expect(hit.point.z).toBeCloseTo(1.4, 6);
  });

  it('catches a corner of existing geometry exactly', () => {
    // A column from the floor to 3 m; its top far corner is at (4.4, 2.4, 3).
    const column = { x1: 4, x2: 4.4, y1: 2, y2: 2.4, z1: 0, z2: 3 };

    const hit = snapPoint({ x: 4.38, y: 2.42, z: 2.97 },
      world({ boxes: [column], modes: { corner: true, edge: false, grid: false } }));

    expect(hit.mode).toBe('corner');
    expect(hit.point).toEqual({ x: 4.4, y: 2.4, z: 3 });
  });

  it('catches an edge anywhere along its length', () => {
    // Half way up the column's vertical edge, which is a metre and a half from
    // either of the corners that end it.
    const column = { x1: 4, x2: 4.4, y1: 2, y2: 2.4, z1: 0, z2: 3 };

    const hit = snapPoint({ x: 4.42, y: 2.38, z: 1.5 },
      world({ boxes: [column], modes: { corner: false, edge: true, grid: false } }));

    expect(hit.mode).toBe('edge');
    expect(hit.point.x).toBeCloseTo(4.4, 6);
    expect(hit.point.y).toBeCloseTo(2.4, 6);
    expect(hit.point.z).toBeCloseTo(1.5, 6);
  });

  it('lets a corner win over an edge that is nearer', () => {
    // Priority is not a distance contest: the point stands 20 mm from the edge
    // running up to the corner and 35 mm from the corner itself, and corner mode
    // is what the user asked for.
    const column = { x1: 4, x2: 4.4, y1: 2, y2: 2.4, z1: 0, z2: 3 };

    const hit = snapPoint({ x: 4.4, y: 2.42, z: 2.97 },
      world({ boxes: [column], modes: { corner: true, edge: true, grid: false } }));

    expect(hit.mode).toBe('corner');
    expect(hit.point).toEqual({ x: 4.4, y: 2.4, z: 3 });
  });

  it('lets an edge win over the grid', () => {
    // The grid node is 10 mm away and the edge 20 mm, and the edge still takes
    // it - same rule, one step down the order.
    const column = { x1: 4, x2: 4.4, y1: 2, y2: 2.4, z1: 0, z2: 3 };

    const hit = snapPoint({ x: 4.42, y: 2.4, z: 1.5 },
      world({ boxes: [column], modes: { corner: false, edge: true, grid: true } }));

    expect(hit.mode).toBe('edge');
    expect(hit.point.x).toBeCloseTo(4.4, 6);
  });

  it('leaves the point alone when nothing is near enough', () => {
    // The ordinary answer at a zoom where a pixel is a millimetre: the tolerance
    // is measured on screen, so fine work is not dragged onto the grid.
    const hit = snapPoint({ x: 2.62, y: 1, z: 1.4 }, world({ tolerance: 0.01 }));

    expect(hit).toBeNull();
  });

  it('moves one coordinate alone when the gesture is on one axis', () => {
    // What a face handle drags: six handles exist so that a drag changes exactly
    // one number, and a snap must not quietly take the other two with it.
    const hit = snapPoint({ x: 2.62, y: 1.03, z: 1.44 }, world(), ['x']);

    expect(hit.point.x).toBeCloseTo(2.5, 6);
    expect(hit.point.y).toBe(1.03);
    expect(hit.point.z).toBe(1.44);
  });

  it('still asks the candidate to be near in all three axes', () => {
    // Otherwise a corner right across the model, which happens to share an x
    // with the wall being nudged, would catch it.
    const distant = { x1: 4, x2: 4.4, y1: 40, y2: 40.4, z1: 0, z2: 3 };

    const hit = snapPoint({ x: 4.42, y: 1, z: 1.4 },
      world({ boxes: [distant], modes: { corner: true, edge: true, grid: false } }), ['x']);

    expect(hit).toBeNull();
  });
});

/**
 * The tolerance, which is measured in screen pixels and applied in metres.
 *
 * Ten pixels is ten pixels whether the camera is in the room or across the
 * tunnel from it; ten centimetres is a doorway in one and a rounding error in
 * the other.
 */
describe('metresPerPixel', () => {

  it('covers twice the distance over the height of the canvas at a right angle', () => {
    // At a 90 degree field of view the frustum is as tall as it is deep: what
    // fits on screen at 400 m away is 800 m of model, over 800 px of canvas.
    expect(metresPerPixel(400, Math.PI / 2, 800)).toBeCloseTo(1, 9);
  });

  it('halves as the camera comes twice as close', () => {
    expect(metresPerPixel(200, Math.PI / 2, 800)).toBeCloseTo(0.5, 9);
  });

  it('halves again on a canvas of twice the height', () => {
    expect(metresPerPixel(400, Math.PI / 2, 1600)).toBeCloseTo(0.5, 9);
  });

  it('says nothing is measurable on a canvas of no height', () => {
    // Which is what an element that has not been laid out yet reports, and it
    // must not come back as an infinite tolerance that snaps everything.
    expect(metresPerPixel(400, Math.PI / 2, 0)).toBe(0);
  });
});
