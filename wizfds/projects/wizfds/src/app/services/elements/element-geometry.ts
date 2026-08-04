import { FdsElementType } from './elements.service';

/**
 * Where an element keeps its shape, and whether it has one at all.
 *
 * Three questions the app asks in several places and must answer the same way
 * every time: where an element stands, how to put it somewhere else, and whether
 * the 3D preview draws it. They live together because they are the same piece of
 * knowledge - what an element's geometry is - and answering any of them
 * differently in two places is how a fire ends up moving in the history and
 * standing still on screen.
 *
 * Plain functions over plain values: nothing here needs the scenario, and that
 * is what lets the rules, the editor and the palette all use them.
 */

/** A box in FDS metres (ADR-0002). */
export interface ElementBox {
    readonly x1: number, readonly x2: number,
    readonly y1: number, readonly y2: number,
    readonly z1: number, readonly z2: number
}

/**
 * The kinds of element the 3D preview draws.
 *
 * A subset of `FdsElementType`: a &SURF, a &SLCF and a specie &VENT are in the
 * scenario and arrive from CAD, but the preview has no list for them - so
 * naming one in a change would send it looking for a list it has not got.
 * The same set as the library's `SceneElementType`, which is what the preview
 * addresses them by.
 */
export const DRAWN_TYPES: readonly FdsElementType[] = [
    'mesh', 'obst', 'hole', 'open', 'vent', 'fire', 'jetfan', 'devc', 'geom', 'init', 'zone'
];

/** Whether the 3D preview has anything on screen for this kind of element. */
export function isDrawnType(type: FdsElementType): boolean {
    return DRAWN_TYPES.indexOf(type) !== -1;
}

/**
 * Where an element stands, whichever field its kind keeps it in.
 *
 * A fire carries no box of its own - the &VENT beneath it does, which is also
 * what the preview draws it from (see SceneInputService.fire). Undefined for an
 * element with no shape at all, and for a point &DEVC, which has an `xyz`.
 */
export function boxOf(type: FdsElementType, element: any): ElementBox | undefined {
    const xb = type === 'fire' ? element?.vent?.xb : element?.xb;
    if (!xb) { return undefined; }

    return {
        x1: Number(xb.x1), x2: Number(xb.x2),
        y1: Number(xb.y1), y2: Number(xb.y2),
        z1: Number(xb.z1), z2: Number(xb.z2)
    };
}

/**
 * The same element, serialised, standing somewhere else.
 *
 * The counterpart of `boxOf()` and the reason the two are in one file: a patch
 * puts the box back where that kind of element keeps it, or the class that reads
 * the patch will drop it. `Fire.toJSON()` writes no `xb` at all, so a fire moved
 * through a top-level one would go on the undo stack and never move.
 */
export function withBox(type: FdsElementType, json: any, xb: ElementBox): any {
    if (type === 'fire') {
        return { ...json, vent: { ...(json?.vent ?? {}), xb: { ...xb } } };
    }
    return { ...json, xb: { ...xb } };
}

/** A count that means anything: a whole number, at least one. */
export function arrayCount(count: number): number {
    return Math.max(1, Math.floor(count || 1));
}

/**
 * Every slot of a rectangular array except the original's, as index triples.
 *
 * Shared by the command that creates the copies and the ribbon preview that
 * shows them, so the ghosts stand exactly where the array will (#126).
 */
export function arraySlots(
    counts: { x: number, y: number, z: number }
): Array<{ ix: number, iy: number, iz: number }> {
    const slots: Array<{ ix: number, iy: number, iz: number }> = [];
    for (let ix = 0; ix < arrayCount(counts.x); ix++) {
        for (let iy = 0; iy < arrayCount(counts.y); iy++) {
            for (let iz = 0; iz < arrayCount(counts.z); iz++) {
                if (ix === 0 && iy === 0 && iz === 0) { continue; }
                slots.push({ ix: ix, iy: iy, iz: iz });
            }
        }
    }
    return slots;
}

/** The same box, shifted. */
export function shiftedBox(xb: ElementBox, dx: number, dy: number, dz: number): ElementBox {
    return {
        x1: xb.x1 + dx, x2: xb.x2 + dx,
        y1: xb.y1 + dy, y2: xb.y2 + dy,
        z1: xb.z1 + dz, z2: xb.z2 + dz
    };
}

/**
 * The box reflected about the plane `axis = coordinate`, its min and max kept
 * in order: the reflection of the near face is the far face of the mirror.
 */
export function mirroredBox(
    xb: ElementBox, axis: 'x' | 'y' | 'z', coordinate: number
): ElementBox {
    const lo = 2 * coordinate - xb[`${axis}2`];
    const hi = 2 * coordinate - xb[`${axis}1`];
    return {
        x1: axis === 'x' ? lo : xb.x1, x2: axis === 'x' ? hi : xb.x2,
        y1: axis === 'y' ? lo : xb.y1, y2: axis === 'y' ? hi : xb.y2,
        z1: axis === 'z' ? lo : xb.z1, z2: axis === 'z' ? hi : xb.z2
    };
}
