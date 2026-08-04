/**
 * Where an edit lands, when it is not left exactly where the pointer let go.
 *
 * The arithmetic of snapping, with no Babylon in it: a grid is three numbers and
 * a corner, a candidate is a point, and a tolerance is a distance. That is what
 * makes the rules here testable without a scene - which matters, because they
 * are the rules a user will argue with when a wall does not go where they meant.
 *
 * Everything is in FDS metres (ADR-0002), including the tolerance - which is
 * *measured* in screen pixels and converted before it arrives here, so that it
 * behaves the same at every zoom level.
 */

import { SceneCell, SceneMesh, SceneXb } from '../drawing/scene-input';
import { SceneAxis, ScenePoint } from '../scene-bounds/scene-bounds.service';

/**
 * The grid in force at a point: whose it is, where it starts, and how big a
 * cell is.
 *
 * The origin is the mesh's own low corner, because that is what FDS measures
 * its cells from - a mesh from 0.15 m to 10.15 m in steps of 0.25 m has its cell
 * boundaries at 0.15, 0.40, 0.65 and nowhere near a round number.
 */
export interface SnapGrid {
    /** The FDS `ID` of the &MESH, so the status bar can name it. */
    readonly meshId: string,
    readonly origin: ScenePoint,
    readonly cell: SceneCell
}

/**
 * How much of the model one screen pixel covers, in metres.
 *
 * What turns a tolerance measured on screen into one the geometry can be
 * compared against. A perspective frustum is as tall as `2 · d · tan(fov/2)` at
 * distance `d`, and the canvas divides that height into its own pixels - so the
 * same ten pixels are a centimetre in a corridor and a metre across a tunnel,
 * which is exactly what makes snapping feel the same at every zoom.
 *
 * @param distance   how far the point is from the camera, in metres
 * @param fov        the camera's vertical field of view, in radians
 * @param canvasHeight the canvas height in CSS pixels; zero before layout
 */
export function metresPerPixel(
    distance: number, fov: number, canvasHeight: number
): number {
    if (!(canvasHeight > 0)) { return 0; }
    return 2 * distance * Math.tan(fov / 2) / canvasHeight;
}

/** The three things an edit can be caught by, in the order they are tried. */
export type SnapMode = 'corner' | 'edge' | 'grid';

/** Which of them the user has switched on, in the manner of OSNAP. */
export interface SnapModes {
    readonly corner: boolean,
    readonly edge: boolean,
    readonly grid: boolean
}

/** Where a snap wants a point, and what caught it. */
export interface SnapHit {
    readonly mode: SnapMode,
    readonly point: ScenePoint
}

/**
 * Everything a snap is measured against.
 *
 * Assembled by whoever owns the gesture, once per drag rather than per frame:
 * the grid follows the pointer, but the boxes and the modes do not change while
 * the button is down.
 */
export interface SnapWorld {
    /** The grid in force, or null in a scenario with no &MESH. */
    readonly grid: SnapGrid | null,
    /** The geometry to catch on - everything drawn but what is being dragged. */
    readonly boxes: readonly SceneXb[],
    readonly modes: SnapModes,
    /** How near a candidate has to be, in metres. See metresPerPixel(). */
    readonly tolerance: number
}

/**
 * Where a point goes once the snap modes have had their say.
 *
 * Corner before edge before grid, and the first mode that has a candidate
 * within tolerance wins outright - a nearer grid line does not beat a corner
 * that qualified. That is the priority the user set, not a distance contest:
 * having asked for corners, they mean the corner.
 *
 * Null when nothing is near enough, which is the ordinary answer at a zoom
 * where a pixel is a millimetre - the tolerance is measured on screen, so fine
 * work is left alone.
 *
 * @param axes when given, only those coordinates move - one for a face handle
 *             or an axis arrow, two for a plane handle. The candidate still has
 *             to be near the point in all three, or a corner across the model
 *             would catch a wall being nudged along one axis.
 */
export function snapPoint(
    target: ScenePoint, world: SnapWorld, axes?: readonly SceneAxis[]
): SnapHit | null {
    // Only the boxes near enough that a corner or an edge of them could
    // possibly qualify. Every point of a box is at least as far away as the box
    // itself, so this throws nothing away - and it is what keeps a drag over ten
    // thousand obsts from measuring eighty thousand corners on every frame.
    const near = world.modes.corner || world.modes.edge
        ? world.boxes.filter(xb => distanceToBox(xb, target) <= world.tolerance)
        : [];

    if (world.modes.corner) {
        const corner = nearestOf(cornersOfAll(near), target);
        if (corner && within(target, corner, world.tolerance)) {
            return { mode: 'corner', point: along(target, corner, axes) };
        }
    }

    if (world.modes.edge) {
        const onEdge = nearestOf(edgePointsOf(near, target), target);
        if (onEdge && within(target, onEdge, world.tolerance)) {
            return { mode: 'edge', point: along(target, onEdge, axes) };
        }
    }

    const gridPoint = world.modes.grid && world.grid
        ? roundToGrid(target, world.grid)
        : null;

    if (gridPoint && within(target, gridPoint, world.tolerance)) {
        return { mode: 'grid', point: along(target, gridPoint, axes) };
    }

    return null;
}

/**
 * The eight corners of a box.
 *
 * What corner mode catches on, and also what a gesture aims *with* - a translate
 * offers the eight of the box it moves, a face drag the four of the face it
 * drags. Exported so those two ask the same question this does.
 */
export function cornersOf(xb: SceneXb): ScenePoint[] {
    const corners: ScenePoint[] = [];

    [xb.x1, xb.x2].forEach(x =>
        [xb.y1, xb.y2].forEach(y =>
            [xb.z1, xb.z2].forEach(z => corners.push({ x: x, y: y, z: z }))));

    return corners;
}

/** The corners of every one of them. */
function cornersOfAll(boxes: readonly SceneXb[]): ScenePoint[] {
    return boxes.reduce<ScenePoint[]>(
        (corners, xb) => corners.concat(cornersOf(xb)), []);
}

/**
 * The point on each box edge that is nearest the target - one candidate per
 * edge, so an edge catches anywhere along its length rather than only at its
 * ends, which is what tells edge mode apart from corner mode.
 *
 * A box has twelve edges, each running along one axis between two opposite
 * corners. Clamping the target's own coordinate to that run is the whole of the
 * projection, because every edge is axis-aligned - there is no rotation to
 * account for (#124).
 */
function edgePointsOf(boxes: readonly SceneXb[], target: ScenePoint): ScenePoint[] {
    const points: ScenePoint[] = [];

    boxes.forEach(xb => {
        // Along x: the y and z of a corner, and x free between the faces
        [xb.y1, xb.y2].forEach(y => [xb.z1, xb.z2].forEach(z =>
            points.push({ x: clamp(target.x, xb.x1, xb.x2), y: y, z: z })));
        [xb.x1, xb.x2].forEach(x => [xb.z1, xb.z2].forEach(z =>
            points.push({ x: x, y: clamp(target.y, xb.y1, xb.y2), z: z })));
        [xb.x1, xb.x2].forEach(x => [xb.y1, xb.y2].forEach(y =>
            points.push({ x: x, y: y, z: clamp(target.z, xb.z1, xb.z2) })));
    });

    return points;
}

function clamp(value: number, low: number, high: number): number {
    return Math.min(Math.max(value, low), high);
}

/** Whichever candidate is nearest the point, if there is one at all. */
function nearestOf(
    candidates: readonly ScenePoint[], target: ScenePoint
): ScenePoint | null {
    return candidates.reduce<ScenePoint | null>((best, candidate) =>
        !best || distance(target, candidate) < distance(target, best) ? candidate : best, null);
}

/** The nearest grid node to a point - each axis rounded on its own. */
function roundToGrid(point: ScenePoint, grid: SnapGrid): ScenePoint {
    return {
        x: roundToStep(point.x, grid.origin.x, grid.cell.i),
        y: roundToStep(point.y, grid.origin.y, grid.cell.j),
        z: roundToStep(point.z, grid.origin.z, grid.cell.k)
    };
}

/** The nearest multiple of `step` from `origin`. */
function roundToStep(value: number, origin: number, step: number): number {
    if (!(step > 0)) { return value; }
    return origin + Math.round((value - origin) / step) * step;
}

/** Whether a candidate is near enough to catch the point. */
function within(target: ScenePoint, candidate: ScenePoint, tolerance: number): boolean {
    return distance(target, candidate) <= tolerance;
}

function distance(a: ScenePoint, b: ScenePoint): number {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/**
 * The candidate, or as much of it as the gesture is allowed to take.
 *
 * A face handle moves one coordinate and must not quietly move the other two
 * with it: the whole point of six handles is that a drag changes exactly one
 * number (#124). An axis arrow is the same one coordinate; a plane handle is
 * two of them.
 */
function along(
    target: ScenePoint, candidate: ScenePoint, axes?: readonly SceneAxis[]
): ScenePoint {
    if (!axes) { return candidate; }

    const point = { ...target };
    axes.forEach(axis => point[axis] = candidate[axis]);
    return point;
}

/**
 * Which &MESH's grid applies at a point.
 *
 * Three rules, in order:
 *
 * - the mesh the point is inside;
 * - where several are, the one with the finer cell. Meshes share their boundary
 *   faces by construction, so a point on a face is inside both, and overlapping
 *   meshes at different resolutions are how a model is refined where it matters
 *   - the finer of the two is the one the user is working to;
 * - outside every mesh, the nearest one. An object being dragged towards a
 *   domain it is not yet in still has a grid it is going to have to obey.
 *
 * Null only when the scenario has no mesh at all, which is a scenario nothing
 * can be snapped in.
 */
export function activeGrid(
    meshes: readonly SceneMesh[], point: ScenePoint
): SnapGrid | null {
    if (meshes.length === 0) { return null; }

    const inside = meshes.filter(mesh => contains(mesh.xb, point));

    const chosen = inside.length > 0
        ? finest(inside)
        : nearest(meshes, point);

    return {
        meshId: chosen.id,
        origin: { x: chosen.xb.x1, y: chosen.xb.y1, z: chosen.xb.z1 },
        cell: chosen.cell
    };
}

/** Whether a box holds a point, its faces included. */
function contains(xb: SceneXb, point: ScenePoint): boolean {
    return point.x >= xb.x1 && point.x <= xb.x2
        && point.y >= xb.y1 && point.y <= xb.y2
        && point.z >= xb.z1 && point.z <= xb.z2;
}

/**
 * The mesh with the smallest cell, by the volume of one cell.
 *
 * By volume rather than by any one axis: a mesh may be refined on z alone, and
 * comparing only i would not notice.
 */
function finest(meshes: readonly SceneMesh[]): SceneMesh {
    return meshes.reduce((best, candidate) =>
        cellVolume(candidate.cell) < cellVolume(best.cell) ? candidate : best);
}

function cellVolume(cell: SceneCell): number {
    return cell.i * cell.j * cell.k;
}

/** The mesh whose box the point is least far from. */
function nearest(meshes: readonly SceneMesh[], point: ScenePoint): SceneMesh {
    return meshes.reduce((best, candidate) =>
        distanceToBox(candidate.xb, point) < distanceToBox(best.xb, point) ? candidate : best);
}

/** How far a point is from a box - zero inside it. */
function distanceToBox(xb: SceneXb, point: ScenePoint): number {
    const dx = Math.max(xb.x1 - point.x, 0, point.x - xb.x2);
    const dy = Math.max(xb.y1 - point.y, 0, point.y - xb.y2);
    const dz = Math.max(xb.z1 - point.z, 0, point.z - xb.z2);
    return Math.hypot(dx, dy, dz);
}
