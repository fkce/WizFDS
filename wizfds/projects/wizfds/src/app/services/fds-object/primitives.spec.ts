import { Xb, Xyz } from './primitives';

/** Build an Xb the way the domain model does - from stored JSON. */
function xb(values: object): Xb {
  return new Xb(JSON.stringify(values));
}

describe('Xb', () => {

  describe('a coordinate assigned from a form', () => {
    // `ngModel` on a text input writes a **string**, and the decimalInput
    // directive only validates and reformats the DOM value. Every coordinate
    // the user edits therefore arrives here as text, and everything downstream
    // does arithmetic on it: `x1 + x2` on two strings concatenates, which drew
    // a mesh spanning 10..40 m centred on 520 m, and `Number.isFinite('40')` is
    // false, which left the whole scene measured as a default ten-metre box.

    it('is stored as the number it reads as', () => {
      const box = xb({ x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 });

      box.x1 = '10' as any;

      expect(box.x1).toBe(10);
      expect(typeof box.x1).toBe('number');
    });

    it('is stored as a number on every one of the six', () => {
      const box = xb({ x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 });

      box.x1 = '1' as any; box.x2 = '2' as any;
      box.y1 = '3' as any; box.y2 = '4' as any;
      box.z1 = '5' as any; box.z2 = '6' as any;

      expect([box.x1, box.x2, box.y1, box.y2, box.z1, box.z2]).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('adds rather than concatenates', () => {
      // The bug itself: '10' + '40' is '1040', so the centre of the box came out
      // at 520 m and the model left the screen
      const box = xb({ x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 });

      box.x1 = '10' as any;
      box.x2 = '40' as any;

      expect((box.x1 + box.x2) / 2).toBe(25);
    });

    it('is finite, so the scene can be measured by it', () => {
      const box = xb({ x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 });

      box.x2 = '40' as any;

      expect(Number.isFinite(box.x2)).toBeTrue();
    });

    it('keeps a decimal', () => {
      const box = xb({ x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 });

      box.z2 = '2.75' as any;

      expect(box.z2).toBe(2.75);
    });

    it('reads a field the user cleared as nothing rather than as text', () => {
      const box = xb({ x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 });

      box.x1 = '' as any;

      expect(box.x1).toBe(0);
    });

    it('leaves something that is not a number at all findable as a fault', () => {
      // Same as what the constructor already does with stored nonsense: the
      // editor marks the field, and hasGeometry refuses to measure by it
      const box = xb({ x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 });

      box.x1 = 'nonsense' as any;

      expect(box.hasGeometry).toBeFalse();
    });
  });

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

describe('Xyz', () => {

  /** Build an Xyz the way the domain model does - from stored JSON. */
  function xyz(values: object): Xyz {
    return new Xyz(JSON.stringify(values));
  }

  describe('a coordinate assigned from a form', () => {
    it('is stored as the number it reads as', () => {
      const point = xyz({ x: 0, y: 0, z: 0 });

      point.x = '5' as any;
      point.y = '4.5' as any;
      point.z = '' as any;

      expect([point.x, point.y, point.z]).toEqual([5, 4.5, 0]);
    });

    it('adds rather than concatenates', () => {
      const point = xyz({ x: 0, y: 0, z: 0 });

      point.x = '10' as any;

      expect(point.x + 5).toBe(15);
    });
  });

  it('converts what it was stored as, the way Xb does', () => {
    // A device written before this was fixed can hold text in the database
    expect(xyz({ x: '5', y: '4', z: '3.8' }).x).toBe(5);
  });

  describe('recalc', () => {
    it('puts the point at the centre of the box', () => {
      const point = xyz({ x: 0, y: 0, z: 0 });

      point.recalc(new Xb(JSON.stringify({ x1: 10, x2: 40, y1: 0, y2: 30, z1: 0, z2: 12 })));

      expect([point.x, point.y, point.z]).toEqual([25, 15, 6]);
    });

    it('puts it there even for a box the user typed', () => {
      const box = new Xb(JSON.stringify({ x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 }));
      box.x1 = '10' as any; box.x2 = '40' as any;
      const point = xyz({ x: 0, y: 0, z: 0 });

      point.recalc(box);

      expect(point.x).toBe(25);
    });
  });
});
