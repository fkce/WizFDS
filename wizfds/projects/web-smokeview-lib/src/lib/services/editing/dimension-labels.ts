/**
 * Where a selected element's extent labels stand, and what they say (#127).
 *
 * Three labels per box, one per axis, each anchored to the midpoint of an edge
 * running along the axis it measures - the number sits on the dimension it
 * names, as a drawing's dimension line does, rather than floating in the body.
 * Plain numbers, no Babylon: the drawing of the labels is the service's job.
 */

import { SceneXb } from '../drawing/scene-input';
import { SceneAxis, ScenePoint } from '../scene-bounds/scene-bounds.service';

/** One extent of a box: which axis, how long, and where the label stands. */
export interface DimensionLabel {
    readonly axis: SceneAxis,
    readonly length: number,
    readonly at: ScenePoint
}

/**
 * The three extents of one box.
 *
 * Ordered before measuring: a resize preview can carry a face dragged past its
 * opposite, and the label still has to say how long the thing is. The anchors
 * sit on three edges that share the box's (x2, y1/y2, z1) corner region so the
 * three numbers spread out instead of stacking: width along the front bottom
 * edge, depth along the right bottom edge, height up the far right vertical.
 */
export function dimensionLabelsFor(xb: SceneXb): readonly DimensionLabel[] {
    const box = ordered(xb);

    return [
        {
            axis: 'x', length: box.x2 - box.x1,
            at: { x: (box.x1 + box.x2) / 2, y: box.y1, z: box.z1 }
        },
        {
            axis: 'y', length: box.y2 - box.y1,
            at: { x: box.x2, y: (box.y1 + box.y2) / 2, z: box.z1 }
        },
        {
            axis: 'z', length: box.z2 - box.z1,
            at: { x: box.x2, y: box.y2, z: (box.z1 + box.z2) / 2 }
        }
    ];
}

/** The same box with each pair of faces in `XB` order. */
function ordered(xb: SceneXb): SceneXb {
    return {
        x1: Math.min(xb.x1, xb.x2), x2: Math.max(xb.x1, xb.x2),
        y1: Math.min(xb.y1, xb.y2), y2: Math.max(xb.y1, xb.y2),
        z1: Math.min(xb.z1, xb.z2), z2: Math.max(xb.z1, xb.z2)
    };
}
