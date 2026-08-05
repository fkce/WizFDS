import { measurementBetween } from './measure';

/**
 * The arithmetic of a distance measurement (#127): two points in, a distance
 * and its axis components out. Plain numbers, like draw.ts and snap.ts - the
 * numbers a fire engineer will check against the `.fds` file.
 */
describe('measurementBetween', () => {

  it('reads the components off the two points, signed', () => {
    const result = measurementBetween({ x: 1, y: 2, z: 3 }, { x: 4, y: 0, z: 3 });

    expect(result.dx).toBe(3);
    expect(result.dy).toBe(-2);
    expect(result.dz).toBe(0);
  });

  it('measures the straight-line distance', () => {
    const result = measurementBetween({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 });

    expect(result.distance).toBe(5);
  });

  it('measures nothing between a point and itself', () => {
    const result = measurementBetween({ x: 2, y: 2, z: 2 }, { x: 2, y: 2, z: 2 });

    expect(result.distance).toBe(0);
    expect(result.dx).toBe(0);
  });
});
