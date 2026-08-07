import { buildSliceGeometry } from './slice-geometry';

describe('buildSliceGeometry', () => {

  // 4x2x2-cell fixture mesh: the grids the .smv parser hands over.
  const grid = {
    meshIndex: 1,
    x: [0, 0.5, 1, 1.5, 2],
    y: [0, 0.5, 1],
    z: [0, 0.5, 1]
  };

  it('lays vertices on the grid planes, in Fortran order (i fastest)', () => {
    // A y-plane (ior=2) at j=1: 5 x-nodes times 3 z-nodes.
    const geometry = buildSliceGeometry({ i1: 0, i2: 4, j1: 1, j2: 1, k1: 0, k2: 2 }, grid);
    expect(geometry.positions.length).toBe(5 * 3 * 3);
    // First node (i=0,k=0), second (i=1,k=0) - i runs fastest.
    expect(Array.from(geometry.positions.slice(0, 6))).toEqual([0, 0.5, 0, 0.5, 0.5, 0]);
    // Last node (i=4,k=2).
    expect(Array.from(geometry.positions.slice(-3))).toEqual([2, 0.5, 1]);
  });

  it('triangulates two triangles per grid cell', () => {
    const geometry = buildSliceGeometry({ i1: 0, i2: 4, j1: 1, j2: 1, k1: 0, k2: 2 }, grid);
    // 4 x 2 cells, 2 triangles each, 3 indices per triangle.
    expect(geometry.indices.length).toBe(4 * 2 * 2 * 3);
    // First cell: nodes 0,1 in the first row, 5,6 in the second (nu=5).
    expect(Array.from(geometry.indices.slice(0, 6))).toEqual([0, 1, 6, 0, 6, 5]);
  });

  it('handles an x-plane (ior=1) the same way', () => {
    const geometry = buildSliceGeometry({ i1: 2, i2: 2, j1: 0, j2: 2, k1: 0, k2: 2 }, grid);
    expect(geometry.positions.length).toBe(3 * 3 * 3);
    // First node (j=0,k=0) at x=1; j runs fastest.
    expect(Array.from(geometry.positions.slice(0, 3))).toEqual([1, 0, 0]);
    expect(Array.from(geometry.positions.slice(3, 6))).toEqual([1, 0.5, 0]);
  });
});
