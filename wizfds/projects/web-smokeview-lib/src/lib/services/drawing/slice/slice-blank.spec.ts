import { computeSliceBlank } from './slice-blank';

describe('computeSliceBlank', () => {

  // A y-plane slice at j=1 over the fixture mesh, 5x3 nodes.
  const bounds = { i1: 0, i2: 4, j1: 1, j2: 1, k1: 0, k2: 2 };

  it('marks nodes inside an obst the plane cuts through', () => {
    // A wall crossing the plane: y-range 0..2 strictly contains j=1.
    const blank = computeSliceBlank(bounds, [
      { meshIndex: 1, i1: 1, i2: 2, j1: 0, j2: 2, k1: 0, k2: 1 }
    ]);
    // Node (i,k) is at flat index k*5+i; blocked are i in 1..2, k in 0..1.
    const blocked = [0 * 5 + 1, 0 * 5 + 2, 1 * 5 + 1, 1 * 5 + 2];
    Array.from(blank).forEach((value, at) => {
      expect(value).toBe(blocked.includes(at) ? 0 : 1);
    });
  });

  it('leaves a slice lying on an obst face alone', () => {
    // The obst's top face is the plane itself: j2 == plane, not strictly inside.
    const blank = computeSliceBlank(bounds, [
      { meshIndex: 1, i1: 0, i2: 4, j1: 0, j2: 1, k1: 0, k2: 2 }
    ]);
    expect(Array.from(blank).every(value => value === 1)).toBeTrue();
  });

  it('is all-visible with no obsts at all', () => {
    const blank = computeSliceBlank(bounds, []);
    expect(blank.length).toBe(5 * 1 * 3);
    expect(Array.from(blank).every(value => value === 1)).toBeTrue();
  });
});
