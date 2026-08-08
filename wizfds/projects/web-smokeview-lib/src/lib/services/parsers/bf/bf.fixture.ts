import { assemble, floats, ints, label } from '../fortran-record.fixture';

/** One patch header, as a fixture states it. */
export interface BfFixturePatch {
    i1: number, i2: number,
    j1: number, j2: number,
    k1: number, k2: number,
    ior: number,
    obstIndex?: number,
    meshIndex?: number
}

/** One frame: its time, and one array of values per patch, in patch order. */
export interface BfFixtureFrame {
    time: number,
    patches: readonly (readonly number[])[]
}

/** What a fixture `.bf` should contain; every field has a sane default. */
export interface BfFixtureSpec {
    longLabel?: string,
    shortLabel?: string,
    unit?: string,
    patches?: readonly BfFixturePatch[],
    frames?: readonly BfFixtureFrame[],
    littleEndian?: boolean,
    /** Cut this many bytes off the end, to fake a killed solver. */
    truncateBytes?: number
}

/**
 * A `.bf` built byte-by-byte the way `dump.f90` writes one: Fortran unformatted
 * records ([u32 len][payload][u32 len]), three 30-byte space-padded labels, the
 * patch count, nine integers per patch, then per frame a time record followed
 * by one record per patch.
 */
export function bfFixture(spec: BfFixtureSpec = {}): ArrayBuffer {
    const le = spec.littleEndian ?? true;
    const patches = spec.patches ?? [
        { i1: 0, i2: 2, j1: 0, j2: 1, k1: 3, k2: 3, ior: 3, obstIndex: 1, meshIndex: 1 }
    ];
    const sizes = patches.map(nodeCountOf);
    const frames = spec.frames ?? [
        { time: 0, patches: sizes.map(size => Array.from({ length: size }, (_, at) => at)) },
        { time: 1, patches: sizes.map(size => Array.from({ length: size }, (_, at) => at + 100)) }
    ];

    const records: Uint8Array[] = [
        label(spec.longLabel ?? 'WALL TEMPERATURE'),
        label(spec.shortLabel ?? 'temp'),
        label(spec.unit ?? 'C'),
        ints([patches.length], le)
    ];
    for (const patch of patches) {
        records.push(ints([
            patch.i1, patch.i2, patch.j1, patch.j2, patch.k1, patch.k2,
            patch.ior, patch.obstIndex ?? 0, patch.meshIndex ?? 1
        ], le));
    }
    for (const frame of frames) {
        records.push(floats([frame.time], le));
        frame.patches.forEach(values => records.push(floats([...values], le)));
    }

    return assemble(records, le, spec.truncateBytes);
}

/** The nodes a fixture patch holds - the same count the parser derives. */
export function nodeCountOf(patch: BfFixturePatch): number {
    return (patch.i2 - patch.i1 + 1) * (patch.j2 - patch.j1 + 1) * (patch.k2 - patch.k1 + 1);
}
