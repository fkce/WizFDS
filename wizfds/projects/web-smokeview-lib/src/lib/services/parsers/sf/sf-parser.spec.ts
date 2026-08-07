import { parseSf } from './sf-parser';
import { sfFixture } from './sf.fixture';

describe('parseSf', () => {

  it('reads the header labels, trimmed of their padding', () => {
    const sf = parseSf(sfFixture({ longLabel: 'TEMPERATURE', shortLabel: 'temp', unit: 'C' }));
    expect(sf.longLabel).toBe('TEMPERATURE');
    expect(sf.shortLabel).toBe('temp');
    expect(sf.unit).toBe('C');
  });

  it('reads the node bounds and sizes a frame from them', () => {
    const sf = parseSf(sfFixture({ bounds: { i1: 0, i2: 4, j1: 1, j2: 1, k1: 0, k2: 2 } }));
    expect(sf.bounds).toEqual({ i1: 0, i2: 4, j1: 1, j2: 1, k1: 0, k2: 2 });
    expect(sf.pointsPerFrame).toBe(5 * 1 * 3);
  });

  it('reads every complete frame with its time', () => {
    const sf = parseSf(sfFixture({
      bounds: { i1: 0, i2: 1, j1: 0, j2: 0, k1: 0, k2: 1 },
      frames: [
        { time: 0.0, values: [1, 2, 3, 4] },
        { time: 2.5, values: [5, 6, 7, 8] }
      ]
    }));
    expect(Array.from(sf.times)).toEqual([0.0, 2.5]);
    expect(Array.from(sf.values)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('reads a big-endian file the same way', () => {
    const sf = parseSf(sfFixture({
      littleEndian: false,
      bounds: { i1: 0, i2: 1, j1: 0, j2: 0, k1: 0, k2: 0 },
      frames: [{ time: 1.5, values: [10, 20] }]
    }));
    expect(Array.from(sf.times)).toEqual([1.5]);
    expect(Array.from(sf.values)).toEqual([10, 20]);
  });

  it('drops a truncated final frame instead of failing', () => {
    const sf = parseSf(sfFixture({
      bounds: { i1: 0, i2: 1, j1: 0, j2: 0, k1: 0, k2: 0 },
      frames: [
        { time: 0, values: [1, 2] },
        { time: 1, values: [3, 4] }
      ],
      truncateBytes: 5
    }));
    expect(Array.from(sf.times)).toEqual([0]);
    expect(Array.from(sf.values)).toEqual([1, 2]);
  });

  it('refuses bytes that are not a .sf at all', () => {
    const junk = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;
    expect(() => parseSf(junk)).toThrowError(/\.sf/);
  });

  it('refuses a file too short for its own header', () => {
    const whole = sfFixture({ frames: [] });
    const cut = whole.slice(0, 40);
    expect(() => parseSf(cut)).toThrowError();
  });
});
