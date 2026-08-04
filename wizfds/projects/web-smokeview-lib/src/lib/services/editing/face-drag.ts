/**
 * The six faces of a box, and what dragging one of them does.
 *
 * An &OBST is always axis-aligned - `XB` is six coordinates and nothing else -
 * so there is no rotation to offer and no reason for a handle that moves more
 * than one of them. `BoundingBoxGizmo` was considered and rejected for exactly
 * that: a corner handle moves two or three faces at once and works by scaling
 * the mesh about its centre, which would have to be translated back into `XB`
 * afterwards, and a snap to the grid stops being obvious (#124).
 *
 * Everything here is arithmetic on a box, so it is testable without a scene.
 */

import { SceneXb } from '../drawing/scene-input';
import { SceneAxis, ScenePoint } from '../scene-bounds/scene-bounds.service';

/**
 * One face of a box, named by the `XB` coordinate it is.
 *
 * The names are the coordinates rather than compass points, because that is the
 * whole design: the handle on `x2` drags `x2` and nothing else.
 */
export type SceneFace = 'x1' | 'x2' | 'y1' | 'y2' | 'z1' | 'z2';

/** The six, in the order `XB` writes them. */
export const SCENE_FACES: readonly SceneFace[] = ['x1', 'x2', 'y1', 'y2', 'z1', 'z2'];

/** Which axis a face slides along. */
export function faceAxis(face: SceneFace): SceneAxis {
    return face.charAt(0) as SceneAxis;
}

/**
 * Where a face handle sits: the middle of the face it drives.
 *
 * The middle rather than a corner, so that the six read as six faces and none
 * of them lands on top of another where a box is thin.
 */
export function faceCentre(xb: SceneXb, face: SceneFace): ScenePoint {
    const centre = {
        x: (xb.x1 + xb.x2) / 2,
        y: (xb.y1 + xb.y2) / 2,
        z: (xb.z1 + xb.z2) / 2
    };

    return { ...centre, [faceAxis(face)]: xb[face] };
}

/**
 * The box that results from dragging one face to a coordinate.
 *
 * Exactly one number changes. A face pushed towards its opposite stops
 * `minimum` short of it rather than turning the box inside out: an `XB` with
 * `x1` above `x2` is not a box FDS can read at all. The caller says what the
 * minimum is - one grid cell, for a resize under a &MESH - and a minimum of
 * zero stops flat, which is a box FDS reads and warns about.
 */
export function dragFace(xb: SceneXb, face: SceneFace, to: number, minimum = 0): SceneXb {
    const axis = faceAxis(face);
    const near = face === `${axis}1`;
    const opposite = xb[near ? `${axis}2` : `${axis}1`];
    const limit = near ? opposite - minimum : opposite + minimum;

    return { ...xb, [face]: near ? Math.min(to, limit) : Math.max(to, limit) };
}
