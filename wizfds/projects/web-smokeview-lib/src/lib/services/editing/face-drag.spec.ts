import { dragFace, faceAxis, faceCentre } from './face-drag';
import { SceneXb } from '../drawing/scene-input';

/** A wall two decimetres thick, ten metres long and three high. */
const WALL: SceneXb = { x1: 0, x2: 0.2, y1: 0, y2: 10, z1: 0, z2: 3 };

/**
 * What dragging one of the six face handles does to an `XB` (#124).
 *
 * Six handles of our own rather than a bounding-box gizmo, because each face is
 * exactly one `XB` coordinate: a drag changes one number, which is what makes
 * the command, the snap and the dynamic input unambiguous.
 */
describe('dragFace', () => {

  it('moves the one coordinate its handle stands on', () => {
    const resized = dragFace(WALL, 'x2', 0.4);

    expect(resized).toEqual({ x1: 0, x2: 0.4, y1: 0, y2: 10, z1: 0, z2: 3 });
  });

  it('stops a face flat against its opposite rather than turning the box inside out', () => {
    // An XB with x1 above x2 is not a box FDS can read; one of no thickness is
    // one it reads and warns about, and warning is what a doubtful edit gets
    // here (ADR-0009).
    const collapsed = dragFace(WALL, 'x1', 0.5);

    expect(collapsed.x1).toBe(0.2);
    expect(collapsed.x2).toBe(0.2);
  });

  it('stops the far face at the near one the same way', () => {
    const collapsed = dragFace(WALL, 'z2', -1);

    expect(collapsed.z1).toBe(0);
    expect(collapsed.z2).toBe(0);
  });
});

/** Where the six handles stand, and which way each of them slides. */
describe('faceCentre', () => {

  it('puts a handle in the middle of the face it drives', () => {
    expect(faceCentre(WALL, 'x2')).toEqual({ x: 0.2, y: 5, z: 1.5 });
  });

  it('puts the opposite handle on the opposite face, at the same middle', () => {
    expect(faceCentre(WALL, 'x1')).toEqual({ x: 0, y: 5, z: 1.5 });
  });

  it('slides each handle along the axis its coordinate belongs to', () => {
    expect(faceAxis('x1')).toBe('x');
    expect(faceAxis('y2')).toBe('y');
    expect(faceAxis('z1')).toBe('z');
  });
});
