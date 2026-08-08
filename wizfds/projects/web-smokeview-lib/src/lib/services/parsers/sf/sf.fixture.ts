import { SmvSliceBounds } from '../smv/smv-file';
import { assemble, floats, ints, label } from '../fortran-record.fixture';

/** What a fixture `.sf` should contain; every field has a sane default. */
export interface SfFixtureSpec {
    longLabel?: string,
    shortLabel?: string,
    unit?: string,
    bounds?: SmvSliceBounds,
    /** One entry per frame. */
    frames?: readonly { time: number, values: readonly number[] }[],
    littleEndian?: boolean,
    /** Cut this many bytes off the end, to fake a killed solver. */
    truncateBytes?: number
}

/**
 * A `.sf` built byte-by-byte the way `dump.f90` writes one: Fortran
 * unformatted records ([u32 len][payload][u32 len]), 30-byte space-padded
 * labels, then (time, data) record pairs per frame.
 */
export function sfFixture(spec: SfFixtureSpec = {}): ArrayBuffer {
    const le = spec.littleEndian ?? true;
    const bounds = spec.bounds ?? { i1: 0, i2: 4, j1: 1, j2: 1, k1: 0, k2: 2 };
    const points = (bounds.i2 - bounds.i1 + 1) * (bounds.j2 - bounds.j1 + 1) * (bounds.k2 - bounds.k1 + 1);
    const frames = spec.frames ?? [
        { time: 0, values: Array.from({ length: points }, (_, at) => at) },
        { time: 1, values: Array.from({ length: points }, (_, at) => at + 100) }
    ];

    const records: Uint8Array[] = [
        label(spec.longLabel ?? 'TEMPERATURE'),
        label(spec.shortLabel ?? 'temp'),
        label(spec.unit ?? 'C'),
        ints([bounds.i1, bounds.i2, bounds.j1, bounds.j2, bounds.k1, bounds.k2], le)
    ];
    for (const frame of frames) {
        records.push(floats([frame.time], le));
        records.push(floats([...frame.values], le));
    }

    return assemble(records, le, spec.truncateBytes);
}
