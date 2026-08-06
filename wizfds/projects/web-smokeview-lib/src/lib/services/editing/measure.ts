/**
 * The arithmetic of a distance measurement (#127).
 *
 * Two points in, the distance and its axis components out - the numbers a fire
 * engineer checks against a `.fds` file, in FDS metres (ADR-0002). Plain
 * numbers with no Babylon in them, the same split draw.ts and snap.ts make.
 */

import { ScenePoint } from '../scene-bounds/scene-bounds.service';

/**
 * One measurement, as the status bar reads it out.
 *
 * The components are signed, from the first point to the second: which way a
 * corridor runs is part of the answer, not just how far.
 */
export interface SceneMeasurement {
    readonly distance: number,
    readonly dx: number,
    readonly dy: number,
    readonly dz: number
}

/** What lies between two picked points. */
export function measurementBetween(from: ScenePoint, to: ScenePoint): SceneMeasurement {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;

    return { distance: Math.hypot(dx, dy, dz), dx: dx, dy: dy, dz: dz };
}
