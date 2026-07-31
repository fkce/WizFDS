/**
 * The numbers a gesture is showing, and the ones the user typed over them.
 *
 * The dynamic input is what stands in for an AutoCAD command line here
 * (ADR-0010): a panel at the cursor, live while the mouse moves, and a field the
 * user can take over as soon as they know the number they want. This is its
 * whole model - no Babylon, no DOM, so what "typing overrides the mouse" means
 * is settled in one testable place rather than inside a drag handler.
 */

import { SceneFace } from './face-drag';

/**
 * The names a gesture knows its numbers by.
 *
 * A closed set rather than a bare string: a translate has three deltas and a
 * face drag has the one coordinate it drags, and both the panel and the gizmo
 * index by these - a typo in either would read as `undefined` at run time
 * rather than fail to compile.
 */
export type GestureKey = 'dx' | 'dy' | 'dz' | SceneFace;

/** The numbers a gesture holds, by the names it knows them by. */
export type GestureValues = Partial<Record<GestureKey, number>>;

/** One field of the panel: what it is called, and what it currently reads. */
export interface GestureField {
    /** The name the gesture knows this number by - `dx`, or a face like `x2`. */
    readonly key: GestureKey,
    /** What the user sees. */
    readonly label: string,
    /** The number now in force, whether from the mouse or from the keyboard. */
    readonly value: number,
    /** Whether the keyboard has taken this field over from the mouse. */
    readonly typed: boolean
}

/** How many digits a field shows - a millimetre, finer than any FDS geometry. */
const DECIMALS = 3;

export class GestureInput {

    /** A move is three deltas; a face drag is the one coordinate it changes. */
    private readonly keys: readonly GestureKey[];
    private readonly labels: ReadonlyMap<GestureKey, string>;

    private live: GestureValues = {};
    private overrides: GestureValues = {};

    /** Which field the keyboard is in - what Tab moves along. */
    private active = 0;

    private constructor(keys: readonly GestureKey[], labels: ReadonlyMap<GestureKey, string>) {
        this.keys = keys;
        this.labels = labels;
        keys.forEach(key => this.live[key] = 0);
    }

    /** The panel a translate shows: how far, on each axis. */
    public static forMove(): GestureInput {
        return new GestureInput(['dx', 'dy', 'dz'], new Map([
            ['dx', 'dX'], ['dy', 'dY'], ['dz', 'dZ']
        ]));
    }

    /**
     * The panel a face drag shows: the coordinate being dragged, by its own
     * name, and as an absolute position rather than a delta - it is the number
     * that will end up in the `.fds` file.
     */
    public static forFace(face: SceneFace): GestureInput {
        return new GestureInput([face], new Map([[face, face.toUpperCase()]]));
    }

    /** What the panel draws. */
    public get fields(): readonly GestureField[] {
        return this.keys.map(key => ({
            key: key,
            label: this.labels.get(key),
            value: this.valueOf(key),
            typed: this.overrides[key] !== undefined
        }));
    }

    /** The numbers in force, whichever of the two the user is steering with. */
    public get resolved(): GestureValues {
        const values: GestureValues = {};
        this.keys.forEach(key => values[key] = this.valueOf(key));
        return values;
    }

    /** Where the mouse currently has the gesture. */
    public setLive(values: GestureValues): void {
        this.keys.forEach(key => {
            if (values[key] !== undefined) { this.live[key] = values[key]; }
        });
    }

    /** Which field the keyboard is in - what the panel focuses. */
    public get activeKey(): GestureKey {
        return this.keys[this.active];
    }

    /**
     * Take a field over from the mouse, or hand it back.
     *
     * Text rather than a number, because that is what a field holds: `-` and
     * `1.` are both on the way to a coordinate and neither is one yet, so they
     * leave the mouse in charge instead of reading as zero. Emptying the field
     * is how a user changes their mind.
     */
    public type(key: GestureKey, text: string): void {
        const trimmed = (text ?? '').trim();

        if (trimmed === '' || !Number.isFinite(Number(trimmed))) {
            delete this.overrides[key];
            return;
        }

        this.overrides[key] = Number(trimmed);
    }

    /** Move to the next field, wrapping - what Tab does. */
    public next(): void {
        this.active = (this.active + 1) % this.keys.length;
    }

    private valueOf(key: GestureKey): number {
        const typed = this.overrides[key];
        return typed !== undefined ? typed : round(this.live[key] ?? 0);
    }
}

/** To the millimetre the panel shows, so a readout does not jitter. */
function round(value: number): number {
    const factor = Math.pow(10, DECIMALS);
    return Math.round(value * factor) / factor;
}
