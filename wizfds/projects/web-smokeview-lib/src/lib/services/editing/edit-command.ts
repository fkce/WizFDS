/**
 * What the library asks the app to change, and nothing more.
 *
 * The return path of the boundary `SceneInput` opens: the app hands over state to
 * draw, an interaction in 3D hands back an **intent**, and the app validates it
 * and applies it to `Fds` - which stays the only source of truth (ADR-0004). The
 * library never writes to the scenario, so a command is the whole of what it can
 * say about an edit.
 *
 * A command is addressed by `uuid` (ADR-0005), never by array position: the two
 * sides hold different lists, and a position means nothing across the boundary.
 *
 * Every field is in FDS metres, as everything else that crosses here is
 * (ADR-0002). Nothing is emitted while a gesture is in progress - the library
 * draws the preview locally and emits once, when the gesture ends, so the round
 * trip never has to fit inside a frame.
 */

import { SceneElementType, SceneXb } from '../drawing/scene-input';

/** How far something is being moved, in FDS metres. */
export interface SceneDelta {
    readonly dx: number,
    readonly dy: number,
    readonly dz: number
}

/**
 * Move elements by a delta.
 *
 * A delta and not a destination box, and several uuids and not one: a gizmo
 * drags a whole selection by the same amount, and saying so once keeps the
 * hundred boxes it may hold out of the message. The app works each element's new
 * box out from its own.
 */
export interface SceneMoveCommand {
    readonly kind: 'move',
    readonly uuids: readonly string[],
    readonly delta: SceneDelta
}

/**
 * Put one element at an explicit box.
 *
 * What a typed coordinate is - in the properties palette, and in the dynamic
 * input a gizmo will grow (#124). A resize is this too: six coordinates say both
 * where an element is and how big it is, so there is nothing else to express.
 */
export interface SceneSetXbCommand {
    readonly kind: 'setXb',
    readonly uuid: string,
    readonly xb: SceneXb
}

/**
 * Create an element of this kind, occupying this box.
 *
 * No `uuid`: the element does not exist yet, and identity is the app's to hand
 * out (ADR-0005) - as is the FDS `ID`, which has to be unique among elements the
 * library was never told about. `surfId` names a &SURF by the name the app
 * resolved it to when it drew the scene; the app looks it up again, because the
 * scenario may have changed since.
 */
export interface SceneCreateCommand {
    readonly kind: 'create',
    readonly type: SceneElementType,
    readonly xb: SceneXb,
    readonly surfId?: string
}

/** Remove elements from the scenario. */
export interface SceneDeleteCommand {
    readonly kind: 'delete',
    readonly uuids: readonly string[]
}

/**
 * Create a copy of each element: the source's whole state at a shifted box.
 *
 * A delta over uuids, exactly as a move - the gizmo's copy-drag IS a move whose
 * original stays put (#126). Identity is the app's to hand out, copy by copy,
 * and a copy must not inherit the source's CAD link, or the next import would
 * treat two objects as one.
 */
export interface SceneCopyCommand {
    readonly kind: 'copy',
    readonly uuids: readonly string[],
    readonly delta: SceneDelta
}

/**
 * Lay copies of the selection out on a rectangular grid - AutoCAD's ARRAYRECT
 * cut down to what an axis-aligned box needs (#126).
 *
 * Counts say how many stand along each axis, the original included; spacing is
 * the step between neighbours, in FDS metres. The slot the original occupies
 * is not created again, so counts of {2,1,1} make exactly one copy.
 */
export interface SceneArrayCommand {
    readonly kind: 'array',
    readonly uuids: readonly string[],
    readonly counts: { readonly x: number, readonly y: number, readonly z: number },
    readonly spacing: { readonly x: number, readonly y: number, readonly z: number }
}

/**
 * Mirror the selection about a plane perpendicular to one axis (#126).
 *
 * The plane is `axis = coordinate`. With `keepOriginal` the mirrored boxes are
 * copies under fresh identities; without it the elements themselves move.
 */
export interface SceneMirrorCommand {
    readonly kind: 'mirror',
    readonly uuids: readonly string[],
    readonly axis: 'x' | 'y' | 'z',
    readonly coordinate: number,
    readonly keepOriginal: boolean
}

/**
 * One edit, as the user meant it.
 *
 * A closed union rather than an open message: the app has to answer every kind
 * of command it can receive, and a `switch` over this is what makes the compiler
 * say so when a new one is added.
 */
export type SceneEditCommand =
    SceneMoveCommand | SceneSetXbCommand | SceneCreateCommand | SceneDeleteCommand |
    SceneCopyCommand | SceneArrayCommand | SceneMirrorCommand;
