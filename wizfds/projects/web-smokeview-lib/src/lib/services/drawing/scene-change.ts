/**
 * What changed in the scenario since it was drawn - the second way in.
 *
 * `render(SceneInput)` rebuilds everything: the instance pools, the CSG
 * subtraction for every &HOLE, the shader materials. At the ten thousand obsts
 * this module is built for that is seconds of work, so calling it because one
 * wall moved is not an option (ADR-0004, the 2026-07-30 note).
 *
 * The app knows exactly what it changed - it applied the command itself - so it
 * says so, and only that much is redrawn. `render()` stays the full entry point,
 * for entering the view and for switching scenario.
 *
 * Everything here is addressed by `uuid` (ADR-0005) and carries its type, so the
 * library knows which layer to touch without scanning eleven lists.
 */

import {
    SceneDevc, SceneElementType, SceneFire, SceneGeom, SceneHole, SceneInit, SceneInput,
    SceneJetfan, SceneMesh, SceneObst, SceneOpen, SceneVent, SceneZone
} from './scene-input';

/** Any one of the elements the library draws. */
export type SceneAnyElement =
    SceneMesh | SceneObst | SceneHole | SceneOpen | SceneVent | SceneFire |
    SceneJetfan | SceneDevc | SceneGeom | SceneInit | SceneZone;

/**
 * One element, named by kind.
 *
 * The type travels with the element because the union above cannot be told apart
 * by its fields - a &HOLE, an &INIT and a &ZONE are the same shape - and because
 * the element alone would not say which list it belongs in.
 */
export interface SceneDrawnElement {
    readonly type: SceneElementType,
    readonly element: SceneAnyElement
}

/** An element that has left the scenario. */
export interface SceneRemovedElement {
    readonly type: SceneElementType,
    readonly uuid: string
}

/**
 * A batch of changes, applied as one.
 *
 * One gesture is one change however many elements it touched, so that moving a
 * hundred obsts redraws the scene once rather than a hundred times.
 */
export interface SceneChange {
    /** Elements that are still there, with new coordinates or a new colour. */
    readonly changed?: readonly SceneDrawnElement[],
    /** Elements the scenario did not have when it was drawn. */
    readonly added?: readonly SceneDrawnElement[],
    /** Elements it no longer has. */
    readonly removed?: readonly SceneRemovedElement[]
}

/** Whether a change asks for anything at all to be redrawn. */
export function isEmptyChange(change: SceneChange | null | undefined): boolean {
    if (!change) { return true; }
    return (change.changed?.length ?? 0) === 0
        && (change.added?.length ?? 0) === 0
        && (change.removed?.length ?? 0) === 0;
}

/** Every element type a change touches, each named once. */
export function typesIn(change: SceneChange): SceneElementType[] {
    const types = new Set<SceneElementType>();
    (change.changed ?? []).forEach(drawn => types.add(drawn.type));
    (change.added ?? []).forEach(drawn => types.add(drawn.type));
    (change.removed ?? []).forEach(gone => types.add(gone.type));
    return Array.from(types);
}

/** Which list of a `SceneInput` each kind of element lives in. */
const LIST_OF: Readonly<Record<SceneElementType, keyof SceneInput>> = {
    mesh: 'meshes', obst: 'obsts', hole: 'holes', open: 'opens', vent: 'vents',
    fire: 'fires', jetfan: 'jetfans', devc: 'devcs', geom: 'geoms', init: 'inits', zone: 'zones'
};

/**
 * The scenario as it stands after a change, from the one that was drawn.
 *
 * The library is told what changed, not what everything now looks like - so it
 * keeps the last state it drew and folds each change into it. That is what lets
 * a layer be redrawn from its own list without the app having to hand the whole
 * scenario back for a one-element edit.
 *
 * Only the lists the change touches are rebuilt; the rest are carried over as
 * they are, references included.
 */
export function applyChange(previous: SceneInput, change: SceneChange): SceneInput {
    const next: any = { ...previous };

    typesIn(change).forEach(type => {
        const key = LIST_OF[type];
        const removed = new Set((change.removed ?? [])
            .filter(gone => gone.type === type).map(gone => gone.uuid));

        const list: SceneAnyElement[] = (previous[key] as readonly SceneAnyElement[])
            .filter(element => !removed.has(element.uuid))
            .slice();

        [...(change.changed ?? []), ...(change.added ?? [])]
            .filter(drawn => drawn.type === type)
            .forEach(drawn => {
                const index = list.findIndex(element => element.uuid === drawn.element.uuid);
                // An element announced as changed that the drawn scene never had
                // is an addition all the same - the two differ only in wording
                if (index >= 0) { list[index] = drawn.element; } else { list.push(drawn.element); }
            });

        next[key] = list;
    });

    return next as SceneInput;
}
