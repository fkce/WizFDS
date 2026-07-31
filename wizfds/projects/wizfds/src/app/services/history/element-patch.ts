import { FdsElementType } from '@services/elements/elements.service';

/**
 * One element, before and after - the whole of what an edit did to it.
 *
 * `before` and `after` are the element's own `toJSON()`, or `null`: a creation
 * has no before, a deletion has no after. Undo swaps in one, redo the other, so
 * one mechanism covers every kind of command and no command type has to write
 * its own inverse (ADR-0009).
 *
 * The alternative was a snapshot of the whole `Fds` per step. It would have
 * covered form edits too, but a scenario with ten thousand obsts is megabytes
 * per step - not something to keep fifty of.
 */
export interface ElementPatch {
    /** Which element (ADR-0005). */
    readonly uuid: string;
    /** Which of the scenario's lists it belongs to. */
    readonly collection: FdsElementType;
    /**
     * Where in that list it stood.
     *
     * Not in ADR-0009's `{uuid, collection, before, after}`, and needed all the
     * same: FDS reads a namelist file in order and a later &OBST wins where two
     * overlap, so an element restored at the end of the list is not the scenario
     * the user undid to. It is also the order their form lists them in.
     */
    readonly index: number;
    /** What the element was, or null when it did not exist. */
    readonly before: any | null;
    /** What it became, or null when it was deleted. */
    readonly after: any | null;
}

/**
 * One gesture, however many elements it touched.
 *
 * A drag of a multiple selection or an array of a hundred copies is one entry:
 * the user made one movement and expects one Ctrl+Z to take it back (ADR-0009).
 */
export interface HistoryEntry {
    /** What the undo button says it would take back - "Move", "Delete OBST". */
    readonly label: string;
    readonly patches: readonly ElementPatch[];
}
