/**
 * The arithmetic of drawing a new element - AutoCAD's `BOX`, in FDS terms.
 *
 * Three steps: a corner, the opposite corner of the base, a height (#125). A
 * flat element finishes at step two. Everything here is geometry on plain
 * numbers - no Babylon, no scene - so where a click lands, which plane a base
 * lies in and what box the gesture produces are all testable on their own, the
 * same split snap.ts makes for snapping.
 *
 * Everything is in FDS metres (ADR-0002).
 */

import { SceneMesh, SceneXb } from '../drawing/scene-input';
import { SceneAxis, ScenePoint } from '../scene-bounds/scene-bounds.service';

/** What the draw tool can draw. The subset of the scene that is born by gesture. */
export type DrawKind = 'obst' | 'hole' | 'vent';

/** Where the gesture has got to. A &VENT never reaches the height. */
export type DrawStep = 'corner' | 'base' | 'height';

/**
 * A ray in plain numbers - what a picking ray is, without Babylon in the
 * signature. The direction need not be normalised; only directions matter here.
 */
export interface DrawRay {
    readonly origin: ScenePoint,
    readonly direction: ScenePoint
}

/** Below this a direction component reads as parallel to a plane. */
const PARALLEL = 1e-9;

/**
 * Which face of a box a point on its surface belongs to.
 *
 * The axis whose face plane the point is nearest: a pick answers with a point
 * on the surface, within floating-point error of it, and the face is not in
 * the answer - it is derived here, the way fds-rules derives the flat axis of
 * a &VENT. This is what makes a &VENT drawn on a wall lie in the wall's plane.
 */
export function landedAxis(xb: SceneXb, point: ScenePoint): SceneAxis {
    const axes: readonly SceneAxis[] = ['x', 'y', 'z'];

    return axes.reduce((best, axis) =>
        distanceToFaces(xb, point, axis) < distanceToFaces(xb, point, best) ? axis : best);
}

/** How far a point is from the nearer of a box's two faces on one axis. */
function distanceToFaces(xb: SceneXb, point: ScenePoint, axis: SceneAxis): number {
    return Math.min(
        Math.abs(point[axis] - xb[`${axis}1`]),
        Math.abs(point[axis] - xb[`${axis}2`]));
}

/** The two axes a base rectangle is free on, given the axis it is flat on. */
export function inPlaneAxes(axis: SceneAxis): readonly [SceneAxis, SceneAxis] {
    if (axis === 'x') { return ['y', 'z']; }
    if (axis === 'y') { return ['x', 'z']; }
    return ['x', 'y'];
}

/**
 * Where a ray meets an axis-aligned plane, or null if it never does.
 *
 * Null both for a ray parallel to the plane and for a plane behind the ray's
 * origin: neither is a point the user is aiming at.
 */
export function rayPlane(ray: DrawRay, axis: SceneAxis, at: number): ScenePoint | null {
    const along = ray.direction[axis];
    if (Math.abs(along) < PARALLEL) { return null; }

    const t = (at - ray.origin[axis]) / along;
    if (t < 0) { return null; }

    return {
        x: ray.origin.x + t * ray.direction.x,
        y: ray.origin.y + t * ray.direction.y,
        z: ray.origin.z + t * ray.direction.z
    };
}

/**
 * Where a first corner lands when nothing is under the cursor: on the floor of
 * a &MESH (#125).
 *
 * The floor whose footprint the cursor is over wins, nearest first when the
 * domains overlap. Over none of them, the fall-back is the nearest mesh's
 * floor *plane*, extended under the cursor - the point stays under the hand,
 * at the height the user is working at, rather than jumping to the domain's
 * edge. Null in a scenario with no &MESH at all, or with the ray looking
 * along the floors.
 */
export function floorUnder(ray: DrawRay, meshes: readonly SceneMesh[]): ScenePoint | null {
    interface Landing { point: ScenePoint, t: number, outside: number }

    const landings: Landing[] = [];
    meshes.forEach(mesh => {
        const point = rayPlane(ray, 'z', mesh.xb.z1);
        if (!point) { return; }

        landings.push({
            point: point,
            t: Math.abs(point.z - ray.origin.z),
            outside: footprintDistance(mesh.xb, point)
        });
    });
    if (landings.length === 0) { return null; }

    const over = landings.filter(landing => landing.outside === 0);
    if (over.length > 0) {
        return over.reduce((best, landing) => landing.t < best.t ? landing : best).point;
    }

    return landings.reduce((best, landing) =>
        landing.outside < best.outside ? landing : best).point;
}

/** How far a point is, in plan, from a box's footprint - zero over it. */
function footprintDistance(xb: SceneXb, point: ScenePoint): number {
    const dx = Math.max(xb.x1 - point.x, 0, point.x - xb.x2);
    const dy = Math.max(xb.y1 - point.y, 0, point.y - xb.y2);
    return Math.hypot(dx, dy);
}

/**
 * The base rectangle between two corners, flat on one axis.
 *
 * Ordered as `XB` demands whichever way round the corners were clicked, and
 * flat at the *first* corner's coordinate: the first click chose the working
 * plane, and the second corner's coordinate on that axis is whatever the
 * pointer happened to resolve to.
 */
export function boxBetween(first: ScenePoint, second: ScenePoint, flatAxis: SceneAxis): SceneXb {
    const box = {
        x1: Math.min(first.x, second.x), x2: Math.max(first.x, second.x),
        y1: Math.min(first.y, second.y), y2: Math.max(first.y, second.y),
        z1: Math.min(first.z, second.z), z2: Math.max(first.z, second.z)
    };

    return { ...box, [`${flatAxis}1`]: first[flatAxis], [`${flatAxis}2`]: first[flatAxis] };
}

/**
 * The base, given a height - signed, so a box can be pulled downwards, and
 * still ordered as `XB` demands. Zero stays flat: FDS warns about a
 * zero-thickness &OBST, it does not forbid one (ADR-0009).
 */
export function extruded(base: SceneXb, axis: SceneAxis, height: number): SceneXb {
    const at = base[`${axis}1`];

    return {
        ...base,
        [`${axis}1`]: Math.min(at, at + height),
        [`${axis}2`]: Math.max(at, at + height)
    };
}

/**
 * The height the pointer is aiming at, read off the vertical line through a
 * point - what step three of the gesture tracks. The coordinate where the ray
 * comes nearest the line; null when the ray runs along it and every height is
 * equally near, which is aiming at a vertical line from straight above.
 */
export function heightAlong(ray: DrawRay, through: ScenePoint): number | null {
    // Closest approach of the ray o + s·d to the line p + t·ẑ, solved for t
    const d = ray.direction;
    const horizontal = d.x * d.x + d.y * d.y;
    if (horizontal < PARALLEL) { return null; }

    const a = d.x * d.x + d.y * d.y + d.z * d.z;
    const w = {
        x: ray.origin.x - through.x,
        y: ray.origin.y - through.y,
        z: ray.origin.z - through.z
    };
    // With e = ẑ: b = d·e, and the denominator a·c − b² reduces to |d_xy|²
    const t = (a * w.z - d.z * (d.x * w.x + d.y * w.y + d.z * w.z)) / horizontal;

    return through.z + t;
}
