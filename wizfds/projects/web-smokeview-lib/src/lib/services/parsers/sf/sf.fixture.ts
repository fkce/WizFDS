import { SmvSliceBounds } from '../smv/smv-file';

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

    const framed = records.map(payload => record(payload, le));
    const total = framed.reduce((sum, part) => sum + part.length, 0) - (spec.truncateBytes ?? 0);
    const out = new Uint8Array(total);
    let at = 0;
    for (const part of framed) {
        const take = Math.min(part.length, total - at);
        if (take <= 0) break;
        out.set(part.subarray(0, take), at);
        at += take;
    }
    return out.buffer;
}

function label(text: string): Uint8Array {
    const bytes = new Uint8Array(30).fill(0x20);
    for (let at = 0; at < Math.min(text.length, 30); at++) bytes[at] = text.charCodeAt(at);
    return bytes;
}

function ints(values: number[], le: boolean): Uint8Array {
    const bytes = new Uint8Array(values.length * 4);
    const view = new DataView(bytes.buffer);
    values.forEach((value, at) => view.setInt32(at * 4, value, le));
    return bytes;
}

function floats(values: number[], le: boolean): Uint8Array {
    const bytes = new Uint8Array(values.length * 4);
    const view = new DataView(bytes.buffer);
    values.forEach((value, at) => view.setFloat32(at * 4, value, le));
    return bytes;
}

function record(payload: Uint8Array, le: boolean): Uint8Array {
    const bytes = new Uint8Array(payload.length + 8);
    const view = new DataView(bytes.buffer);
    view.setUint32(0, payload.length, le);
    bytes.set(payload, 4);
    view.setUint32(payload.length + 4, payload.length, le);
    return bytes;
}
