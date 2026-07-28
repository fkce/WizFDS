import { Xb } from './primitives';

/** Build an Xb the way the domain model does - from stored JSON. */
function xb(values: object): Xb {
  return new Xb(JSON.stringify(values));
}

describe('Xb', () => {

  describe('hasGeometry', () => {
    // A CAD import can hand over an element that never got geometry. FDS ignores
    // it, and the preview refuses to measure the scene by it (ADR-0002), so the
    // editor is the only place the user can find it.

    it('accepts an ordinary box', () => {
      expect(xb({ x1: 0, x2: 4, y1: 2, y2: 2.2, z1: 0, z2: 3 }).hasGeometry).toBeTrue();
    });

    it('accepts a box standing below the origin', () => {
      expect(xb({ x1: -39.9, x2: 27.6, y1: -25.5, y2: 10.8, z1: -4.2, z2: 6.9 }).hasGeometry).toBeTrue();
    });

    it('accepts a zero-thickness box - that is a thin obstruction', () => {
      expect(xb({ x1: 0, x2: 4, y1: 2, y2: 2, z1: 0, z2: 3 }).hasGeometry).toBeTrue();
    });

    it('rejects an empty bounding box that was never filled in', () => {
      // What the CAD plugin produced for OBST680 of a real scenario: minimum at
      // +1e20, maximum at -1e20, the initial values of a box nothing was added to.
      expect(xb({
        x1: 1e20, x2: -1e20, y1: 1e20, y2: -1e20, z1: 1e20, z2: -1e20
      }).hasGeometry).toBeFalse();
    });

    it('rejects a box left at the sentinel even the right way round', () => {
      expect(xb({ x1: -1e20, x2: 1e20, y1: -1e20, y2: 1e20, z1: -1e20, z2: 1e20 }).hasGeometry).toBeFalse();
    });

    it('rejects an inverted box', () => {
      expect(xb({ x1: 4, x2: 0, y1: 0, y2: 1, z1: 0, z2: 1 }).hasGeometry).toBeFalse();
    });

    it('rejects a coordinate stored as something that is not a number', () => {
      expect(xb({ x1: 'nonsense', x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 }).hasGeometry).toBeFalse();
    });

    it('rejects a coordinate the editor has just made infinite', () => {
      // JSON has no Infinity - it survives a round trip as null - so this can
      // only arrive by assignment, which is exactly what the XB fields do.
      const box = xb({ x1: 0, x2: 4, y1: 0, y2: 1, z1: 0, z2: 1 });

      box.x2 = Infinity;

      expect(box.hasGeometry).toBeFalse();
    });
  });
});
