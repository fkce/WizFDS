import { parseBf } from './bf-parser';
import { bfFixture } from './bf.fixture';

describe('parseBf', () => {

  it('reads the header labels, trimmed of their padding', () => {
    const bf = parseBf(bfFixture({
      longLabel: 'WALL TEMPERATURE', shortLabel: 'temp', unit: 'C'
    }));
    expect(bf.longLabel).toBe('WALL TEMPERATURE');
    expect(bf.shortLabel).toBe('temp');
    expect(bf.unit).toBe('C');
  });

  it('reads every patch header, including which obst and mesh it names', () => {
    const bf = parseBf(bfFixture({
      patches: [
        { i1: 0, i2: 3, j1: 0, j2: 2, k1: 5, k2: 5, ior: 3, obstIndex: 7, meshIndex: 1 },
        { i1: 4, i2: 4, j1: 0, j2: 2, k1: 0, k2: 5, ior: -1, obstIndex: 0, meshIndex: 2 }
      ]
    }));

    expect(bf.patches.length).toBe(2);
    expect(bf.patches[0]).toEqual(jasmine.objectContaining({
      i1: 0, i2: 3, j1: 0, j2: 2, k1: 5, k2: 5, ior: 3, obstIndex: 7, meshIndex: 1
    }));
    expect(bf.patches[1]).toEqual(jasmine.objectContaining({
      i1: 4, i2: 4, j1: 0, j2: 2, k1: 0, k2: 5, ior: -1, obstIndex: 0, meshIndex: 2
    }));
  });

  it('sizes each patch from its own node box and lays them out end to end', () => {
    const bf = parseBf(bfFixture({
      patches: [
        // 4 x 3 x 1 nodes
        { i1: 0, i2: 3, j1: 0, j2: 2, k1: 5, k2: 5, ior: 3 },
        // 1 x 3 x 6 nodes
        { i1: 4, i2: 4, j1: 0, j2: 2, k1: 0, k2: 5, ior: -1 }
      ]
    }));

    expect(bf.patches[0].nodeCount).toBe(12);
    expect(bf.patches[0].valueOffset).toBe(0);
    expect(bf.patches[1].nodeCount).toBe(18);
    expect(bf.patches[1].valueOffset).toBe(12);
    expect(bf.pointsPerFrame).toBe(30);
  });

  it('reads every complete frame with its time, patch after patch', () => {
    const bf = parseBf(bfFixture({
      patches: [
        { i1: 0, i2: 1, j1: 0, j2: 0, k1: 0, k2: 0, ior: 3 },
        { i1: 0, i2: 0, j1: 0, j2: 0, k1: 0, k2: 1, ior: 1 }
      ],
      frames: [
        { time: 0.0, patches: [[1, 2], [3, 4]] },
        { time: 2.5, patches: [[5, 6], [7, 8]] }
      ]
    }));

    expect(Array.from(bf.times)).toEqual([0.0, 2.5]);
    expect(Array.from(bf.values)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('reads a big-endian file the same way', () => {
    const bf = parseBf(bfFixture({
      littleEndian: false,
      patches: [{ i1: 0, i2: 1, j1: 0, j2: 0, k1: 0, k2: 0, ior: 3, obstIndex: 4, meshIndex: 2 }],
      frames: [{ time: 1.5, patches: [[10, 20]] }]
    }));

    expect(bf.patches[0].ior).toBe(3);
    expect(bf.patches[0].obstIndex).toBe(4);
    expect(bf.patches[0].meshIndex).toBe(2);
    expect(Array.from(bf.times)).toEqual([1.5]);
    expect(Array.from(bf.values)).toEqual([10, 20]);
  });

  it('drops a frame whose patches are cut short, rather than showing half of one', () => {
    // Five bytes short is enough to lose the second frame's last patch record;
    // its time and its first patch are whole, and must go with it.
    const bf = parseBf(bfFixture({
      patches: [
        { i1: 0, i2: 1, j1: 0, j2: 0, k1: 0, k2: 0, ior: 3 },
        { i1: 0, i2: 1, j1: 0, j2: 0, k1: 0, k2: 0, ior: -3 }
      ],
      frames: [
        { time: 0, patches: [[1, 2], [3, 4]] },
        { time: 1, patches: [[5, 6], [7, 8]] }
      ],
      truncateBytes: 5
    }));

    expect(Array.from(bf.times)).toEqual([0]);
    expect(Array.from(bf.values)).toEqual([1, 2, 3, 4]);
  });

  it('refuses bytes that are not a .bf at all', () => {
    const junk = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;
    expect(() => parseBf(junk)).toThrowError(/\.bf/);
  });

  it('refuses a file that ends inside its patch list', () => {
    const whole = bfFixture({ frames: [] });
    expect(() => parseBf(whole.slice(0, 130))).toThrowError(/\.bf/);
  });

  it('reads a header with no frames behind it', () => {
    const bf = parseBf(bfFixture({ frames: [] }));
    expect(bf.patches.length).toBe(1);
    expect(bf.times.length).toBe(0);
    expect(bf.values.length).toBe(0);
  });
});
