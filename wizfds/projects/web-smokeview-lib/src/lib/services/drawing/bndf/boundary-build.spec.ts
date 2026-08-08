import { buildBoundary } from './boundary-build';
import { bfFixture, BfFixturePatch } from '../../parsers/bf/bf.fixture';
import { parseBf } from '../../parsers/bf/bf-parser';
import { SmvBlockage, SmvMeshGrid } from '../../parsers/smv/smv-file';

/** A deliberately stretched mesh: equal indices, unequal metres. */
const GRID: SmvMeshGrid = {
  meshIndex: 1,
  x: [0, 1, 3],
  y: [0, 2],
  z: [0, 4, 9]
};

function built(patches: readonly BfFixturePatch[], frames?: readonly number[][][], blockages: readonly SmvBlockage[] = []) {
  const bytes = bfFixture(frames
    ? { patches: patches, frames: frames.map((patchValues, at) => ({ time: at, patches: patchValues })) }
    : { patches: patches });
  return buildBoundary(parseBf(bytes), GRID, blockages);
}

/** Where the first triangle of a build faces, by the right-hand rule. */
function firstTriangleNormal(positions: Float32Array, indices: Uint32Array): number[] {
  const point = (node: number) => [positions[3 * node], positions[3 * node + 1], positions[3 * node + 2]];
  const a = point(indices[0]);
  const b = point(indices[1]);
  const c = point(indices[2]);
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  return [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0]
  ];
}

describe('buildBoundary', () => {

  it('puts a patch on the solver\'s own grid planes, in the order the file writes it', () => {
    const build = built([{ i1: 0, i2: 2, j1: 0, j2: 1, k1: 1, k2: 1, ior: 3 }]);

    // k fixed at plane 1 (z = 4); j then i, i fastest - the order .bf values come in
    expect(Array.from(build.positions)).toEqual([
      0, 0, 4, 1, 0, 4, 3, 0, 4,
      0, 2, 4, 1, 2, 4, 3, 2, 4
    ]);
  });

  it('flattens whichever axis the patch is normal to, not always k', () => {
    // Normal to i: the plane is x = 1, and j then k vary. Same Fortran walk,
    // so i - which has one value here - is still the innermost loop.
    const build = built([{ i1: 1, i2: 1, j1: 0, j2: 1, k1: 0, k2: 1, ior: 1 }]);
    expect(Array.from(build.positions)).toEqual([
      1, 0, 0, 1, 2, 0,
      1, 0, 4, 1, 2, 4
    ]);

    // Normal to j: the plane is y = 2, and i then k vary.
    const alongJ = built([{ i1: 0, i2: 1, j1: 1, j2: 1, k1: 0, k2: 1, ior: -2 }]);
    expect(Array.from(alongJ.positions)).toEqual([
      0, 2, 0, 1, 2, 0,
      0, 2, 4, 1, 2, 4
    ]);
  });

  it('lays several patches end to end, so a frame maps onto the vertices one-to-one', () => {
    const build = built([
      { i1: 0, i2: 1, j1: 0, j2: 1, k1: 0, k2: 0, ior: 3 },
      { i1: 0, i2: 0, j1: 0, j2: 1, k1: 0, k2: 1, ior: 1 }
    ]);

    // 4 nodes then 4 nodes; the second patch's first vertex is its own corner
    expect(build.positions.length).toBe(8 * 3);
    expect(Array.from(build.positions.subarray(12, 15))).toEqual([0, 0, 0]);
    expect(Array.from(build.positions.subarray(15, 18))).toEqual([0, 2, 0]);
  });

  it('faces a patch the way its ior points', () => {
    const up = built([{ i1: 0, i2: 2, j1: 0, j2: 1, k1: 1, k2: 1, ior: 3 }]);
    expect(firstTriangleNormal(up.positions, up.indices)[2]).toBeGreaterThan(0);

    const down = built([{ i1: 0, i2: 2, j1: 0, j2: 1, k1: 1, k2: 1, ior: -3 }]);
    expect(firstTriangleNormal(down.positions, down.indices)[2]).toBeLessThan(0);

    const east = built([{ i1: 1, i2: 1, j1: 0, j2: 1, k1: 0, k2: 1, ior: 1 }]);
    expect(firstTriangleNormal(east.positions, east.indices)[0]).toBeGreaterThan(0);

    const west = built([{ i1: 1, i2: 1, j1: 0, j2: 1, k1: 0, k2: 1, ior: -1 }]);
    expect(firstTriangleNormal(west.positions, west.indices)[0]).toBeLessThan(0);

    const north = built([{ i1: 0, i2: 2, j1: 1, j2: 1, k1: 0, k2: 1, ior: 2 }]);
    expect(firstTriangleNormal(north.positions, north.indices)[1]).toBeGreaterThan(0);

    const south = built([{ i1: 0, i2: 2, j1: 1, j2: 1, k1: 0, k2: 1, ior: -2 }]);
    expect(firstTriangleNormal(south.positions, south.indices)[1]).toBeLessThan(0);
  });

  it('draws two triangles per cell of a patch nothing covers', () => {
    // 3 x 2 nodes with k flat: two cells across, one along
    const build = built([{ i1: 0, i2: 2, j1: 0, j2: 1, k1: 1, k2: 1, ior: 3 }]);
    expect(build.indices.length).toBe(2 * 6);
  });

  it('leaves out a cell whose gas cell is buried in another obst', () => {
    const patch: BfFixturePatch = { i1: 0, i2: 2, j1: 0, j2: 1, k1: 1, k2: 1, ior: 3, obstIndex: 4 };
    // Facing up from plane k=1, the gas cell is k=2. This block holds cell
    // (i=2, j=1, k=2) - the far half of the patch, and nothing else.
    const blockage: SmvBlockage = { meshIndex: 1, i1: 1, i2: 2, j1: 0, j2: 1, k1: 1, k2: 2 };

    const build = built([patch], undefined, [blockage]);
    expect(build.indices.length).toBe(1 * 6);
  });

  it('applies the same rule to a tile of the mesh\'s own exterior wall', () => {
    // obst_index 0, facing down from the top of the mesh: the gas cell is k=2
    const patch: BfFixturePatch = { i1: 0, i2: 2, j1: 0, j2: 1, k1: 2, k2: 2, ior: -3, obstIndex: 0 };
    const blockage: SmvBlockage = { meshIndex: 1, i1: 1, i2: 2, j1: 0, j2: 1, k1: 1, k2: 2 };

    const build = built([patch], undefined, [blockage]);
    expect(build.indices.length).toBe(1 * 6);
  });

  it('spans what the drawn nodes hold, across every frame', () => {
    const build = built(
      [{ i1: 0, i2: 2, j1: 0, j2: 1, k1: 1, k2: 1, ior: 3 }],
      [[[10, 20, 30, 40, 50, 60]], [[5, 20, 30, 40, 50, 70]]]
    );
    expect(build.extent).toEqual({ min: 5, max: 70 });
  });

  it('keeps the ambient values FDS wrote into buried cells out of the range', () => {
    const patch: BfFixturePatch = { i1: 0, i2: 2, j1: 0, j2: 1, k1: 1, k2: 1, ior: 3 };
    const blockage: SmvBlockage = { meshIndex: 1, i1: 1, i2: 2, j1: 0, j2: 1, k1: 1, k2: 2 };
    // Nodes 2 and 5 belong only to the cell that block covers, and FDS filled
    // them with the ambient value - which must not set the scale.
    const build = built([patch], [[[10, 20, -999, 30, 40, -999]]], [blockage]);

    expect(build.extent).toEqual({ min: 10, max: 40 });
  });

  it('has no range at all when every cell is buried', () => {
    const patch: BfFixturePatch = { i1: 0, i2: 2, j1: 0, j2: 1, k1: 1, k2: 1, ior: 3 };
    const blockage: SmvBlockage = { meshIndex: 1, i1: 0, i2: 2, j1: 0, j2: 1, k1: 1, k2: 2 };
    const build = built([patch], [[[1, 2, 3, 4, 5, 6]]], [blockage]);

    expect(build.indices.length).toBe(0);
    expect(build.extent).toBeNull();
  });

  it('has no range while the file holds no frame', () => {
    const bytes = bfFixture({ patches: [{ i1: 0, i2: 1, j1: 0, j2: 1, k1: 0, k2: 0, ior: 3 }], frames: [] });
    const build = buildBoundary(parseBf(bytes), GRID, []);

    expect(build.positions.length).toBe(4 * 3);
    expect(build.extent).toBeNull();
  });

  it('keeps the vertices of a patch too thin to draw, so the frame still lines up', () => {
    const build = built([
      { i1: 0, i2: 0, j1: 0, j2: 0, k1: 0, k2: 0, ior: 3 },
      { i1: 0, i2: 1, j1: 0, j2: 1, k1: 0, k2: 0, ior: 3 }
    ]);

    expect(build.positions.length).toBe(5 * 3);
    // Only the second patch has any area, and its indices start past the first
    expect(build.indices.length).toBe(6);
    expect(Math.min(...Array.from(build.indices))).toBeGreaterThanOrEqual(1);
  });
});
