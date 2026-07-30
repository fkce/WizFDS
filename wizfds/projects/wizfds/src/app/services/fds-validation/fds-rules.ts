import { FdsElementType } from '@services/elements/elements.service';

/**
 * The FDS rules an edit can break - and every one of them warns, none blocks.
 *
 * The command is applied to `Fds` whatever these say (ADR-0009). Blocking would
 * be wrong: FDS itself snaps a misaligned &OBST to the nearest cell boundaries
 * and carries on, overlapping obsts are legal, and drawing a wall before adding
 * a &MESH is a normal way to start. Silent correction would be worse still -
 * typing 3.15 and getting 3.20 with no explanation is the worst kind of surprise
 * in an engineering tool.
 *
 * The rules are plain functions over plain boxes rather than methods on a
 * service: they are the part that has to be right, they depend on nothing but
 * their arguments, and this is what lets each of them be tested on its own.
 */

/** A box in FDS metres (ADR-0002). */
export interface RuleBox {
    readonly x1: number, readonly x2: number,
    readonly y1: number, readonly y2: number,
    readonly z1: number, readonly z2: number
}

/** An element as the rules see it: an identity, a kind and a box. */
export interface RuleElement {
    readonly uuid: string;
    readonly type: FdsElementType;
    readonly xb: RuleBox;
}

/** A &MESH and how fine its grid is, in metres per cell. */
export interface RuleMesh {
    readonly uuid: string;
    readonly id: string;
    readonly xb: RuleBox;
    readonly cell: { readonly i: number, readonly j: number, readonly k: number };
}

/** As much of the scenario as the rules need to judge one element. */
export interface RuleModel {
    readonly meshes: readonly RuleMesh[];
    /** What a &VENT can lie on, besides the boundary of a mesh. */
    readonly obsts: readonly { readonly uuid: string, readonly xb: RuleBox }[];
}

/** Which rule was broken. The palette groups by these; the status bar counts them. */
export type FdsRule = 'outside-mesh' | 'off-grid' | 'zero-thickness' | 'vent-in-mid-air';

/** One thing wrong with one element. */
export interface FdsWarning {
    readonly uuid: string;
    readonly rule: FdsRule;
    /** What the palette shows, in the user's terms. */
    readonly message: string;
}

/**
 * How close to a cell boundary counts as on it, in metres.
 *
 * A tenth of a micrometre: far below anything a fire model resolves, and far
 * above what binary floating point does to a round number - 0.1 + 0.2 is not
 * 0.3, and a user who typed one is not asking to be told their wall is off the
 * grid.
 */
const TOLERANCE = 1e-7;

/**
 * The kinds of element that are an FDS &VENT underneath.
 *
 * A ventilation vent, an `OPEN`, the vent a fire burns on and a specie
 * injection are all `&VENT` in the input file, and two of these rules follow
 * from that one fact: each covers a rectangle of a surface, so exactly one of
 * its three extents is zero by construction - the very thing that would be a
 * fault in a body - and each has to lie on something solid or on the edge of
 * the domain, or the solver quietly ignores it.
 *
 * One list, because it is one fact about them and not two that coincide.
 */
const VENT_TYPES: readonly FdsElementType[] = ['vent', 'open', 'fire', 'spec'];

/**
 * Everything wrong with one element, in the order the rules are declared here.
 *
 * All of them, not the first: the palette lists what is wrong with what is
 * selected, and a wall that is both off the grid and flat has two things wrong
 * with it.
 */
export function checkElement(element: RuleElement, model: RuleModel): FdsWarning[] {
    const warnings: FdsWarning[] = [];
    const mesh = meshOf(element, model.meshes);

    // A &MESH is the domain rather than something in it: it cannot be outside
    // itself, and it is what the grid is measured from.
    const isMesh = element.type === 'mesh';

    if (!isMesh && model.meshes.length > 0 && !mesh) {
        warnings.push(warn(element, 'outside-mesh',
            'Outside every &MESH - FDS will not see this element'));
    }

    if (!isMesh && mesh && !alignedTo(element.xb, mesh)) {
        warnings.push(warn(element, 'off-grid',
            `Not on the cells of ${mesh.id} - FDS will snap it to the nearest boundaries`));
    }

    if (isFlattened(element)) {
        warnings.push(warn(element, 'zero-thickness',
            isVent(element.type)
                ? 'No area - the plane is flattened onto a line'
                : 'Zero thickness in one direction'));
    }

    if (isVent(element.type) && !liesOnSurface(element, model)) {
        warnings.push(warn(element, 'vent-in-mid-air',
            'On no surface - a &VENT has to lie on an &OBST or on a mesh boundary'));
    }

    return warnings;
}

/** Every warning about every one of these elements. */
export function checkAll(
    elements: readonly RuleElement[], model: RuleModel
): FdsWarning[] {
    const warnings: FdsWarning[] = [];
    elements.forEach(element => warnings.push(...checkElement(element, model)));
    return warnings;
}

/** Whether this kind of element is an &VENT, and so judged as a plane. */
function isVent(type: FdsElementType): boolean {
    return VENT_TYPES.indexOf(type) !== -1;
}

function warn(element: RuleElement, rule: FdsRule, message: string): FdsWarning {
    return { uuid: element.uuid, rule: rule, message: message };
}

/**
 * The &MESH this element is in, if any is.
 *
 * The first that its box reaches at all, rather than the one that contains it
 * outright: a wall running out through the boundary of the domain is how models
 * are drawn, and FDS computes with the part that is inside.
 */
function meshOf(element: RuleElement, meshes: readonly RuleMesh[]): RuleMesh | undefined {
    return meshes.find(mesh => mesh.uuid !== element.uuid && overlaps(element.xb, mesh.xb));
}

/** Whether two boxes meet at all, touching along a face included. */
function overlaps(a: RuleBox, b: RuleBox): boolean {
    return a.x1 <= b.x2 + TOLERANCE && a.x2 >= b.x1 - TOLERANCE
        && a.y1 <= b.y2 + TOLERANCE && a.y2 >= b.y1 - TOLERANCE
        && a.z1 <= b.z2 + TOLERANCE && a.z2 >= b.z1 - TOLERANCE;
}

/** Whether all six coordinates land on cell boundaries of this mesh. */
function alignedTo(xb: RuleBox, mesh: RuleMesh): boolean {
    return onGrid(xb.x1, mesh.xb.x1, mesh.cell.i) && onGrid(xb.x2, mesh.xb.x1, mesh.cell.i)
        && onGrid(xb.y1, mesh.xb.y1, mesh.cell.j) && onGrid(xb.y2, mesh.xb.y1, mesh.cell.j)
        && onGrid(xb.z1, mesh.xb.z1, mesh.cell.k) && onGrid(xb.z2, mesh.xb.z1, mesh.cell.k);
}

/**
 * Whether a coordinate falls on a cell boundary.
 *
 * Measured from the mesh's own origin and not from zero: a domain that starts at
 * 0.1 m has its boundaries at 0.1, 0.35, 0.6 - and a wall at a round 0.5 is the
 * one that is off the grid there.
 */
function onGrid(value: number, origin: number, cell: number): boolean {
    // A mesh with no cell size says nothing about where anything should be
    if (!Number.isFinite(cell) || cell <= 0) { return true; }

    const cells = (value - origin) / cell;
    return Math.abs(cells - Math.round(cells)) * cell <= TOLERANCE;
}

/**
 * Whether an element has been flattened past what its kind allows.
 *
 * A body needs all three extents, a plane needs two of them, and a &DEVC needs
 * none at all - a point device stands at a coordinate on purpose.
 */
function isFlattened(element: RuleElement): boolean {
    if (element.type === 'devc') { return false; }

    const extents = extentsOf(element.xb);
    const needed = isVent(element.type) ? 2 : 3;
    return extents.filter(extent => extent > TOLERANCE).length < needed;
}

function extentsOf(xb: RuleBox): number[] {
    return [Math.abs(xb.x2 - xb.x1), Math.abs(xb.y2 - xb.y1), Math.abs(xb.z2 - xb.z1)];
}

/**
 * Whether a plane element rests on something.
 *
 * FDS ignores a &VENT that touches neither a solid nor the edge of the domain -
 * silently, which is what makes it worth saying here. It has to overlap what it
 * lies on in the other two directions: a coordinate that matches a wall standing
 * elsewhere in the room leaves the vent in mid-air all the same.
 */
function liesOnSurface(element: RuleElement, model: RuleModel): boolean {
    const xb = element.xb;
    const extents = extentsOf(xb);
    // The axis it is flat in is the one it lies against. A vent that is not flat
    // at all is already reported as such, and has no face to rest on.
    const axis = extents.findIndex(extent => extent <= TOLERANCE);
    if (axis < 0) { return true; }

    const at = [xb.x1, xb.y1, xb.z1][axis];

    const onMeshBoundary = model.meshes.some(mesh =>
        overlaps(xb, mesh.xb) && touchesFace(at, axis, mesh.xb));

    const onObst = model.obsts.some(obst =>
        obst.uuid !== element.uuid && overlaps(xb, obst.xb) && touchesFace(at, axis, obst.xb));

    return onMeshBoundary || onObst;
}

/** Whether a coordinate falls on either face of a box along one axis. */
function touchesFace(at: number, axis: number, box: RuleBox): boolean {
    const faces = axis === 0 ? [box.x1, box.x2]
        : axis === 1 ? [box.y1, box.y2] : [box.z1, box.z2];
    return faces.some(face => Math.abs(face - at) <= TOLERANCE);
}
