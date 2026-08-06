import { dimensionLabelsFor } from './dimension-labels';
import { SceneXb } from '../drawing/scene-input';

/**
 * Where a selected element's extent labels stand, and what they say (#127).
 *
 * Three labels per box - one per axis - each anchored to the midpoint of an
 * edge of the box, so the number sits on the dimension it names rather than
 * floating in the middle of the body.
 */
describe('dimensionLabelsFor', () => {

  const BOX: SceneXb = { x1: 1, x2: 4, y1: 2, y2: 4, z1: 0, z2: 3 };

  it('answers one label per axis, with the extent as its length', () => {
    const labels = dimensionLabelsFor(BOX);

    expect(labels.map(label => label.axis)).toEqual(['x', 'y', 'z']);
    expect(labels.map(label => label.length)).toEqual([3, 2, 3]);
  });

  it('anchors each label to the midpoint of an edge running along its axis', () => {
    const [width, depth, height] = dimensionLabelsFor(BOX);

    // The width along the front bottom edge, the depth along the right bottom
    // edge, the height up the far right vertical - the three edges nearest a
    // viewer standing at the model's default south-west look.
    expect(width.at).toEqual({ x: 2.5, y: 2, z: 0 });
    expect(depth.at).toEqual({ x: 4, y: 3, z: 0 });
    expect(height.at).toEqual({ x: 4, y: 4, z: 1.5 });
  });

  it('orders a box whose faces arrive swapped', () => {
    // A resize preview can carry x2 dragged past x1; the label still has to
    // say how long the thing is, not a negative number.
    const swapped: SceneXb = { x1: 4, x2: 1, y1: 2, y2: 4, z1: 0, z2: 3 };

    const [width] = dimensionLabelsFor(swapped);

    expect(width.length).toBe(3);
    expect(width.at).toEqual({ x: 2.5, y: 2, z: 0 });
  });

  it('keeps a zero extent - a flat VENT still has three dimensions to name', () => {
    const flat: SceneXb = { x1: 0, x2: 2, y1: 0, y2: 1, z1: 1, z2: 1 };

    const labels = dimensionLabelsFor(flat);

    expect(labels[2].length).toBe(0);
    expect(labels[2].at).toEqual({ x: 2, y: 1, z: 1 });
  });
});
