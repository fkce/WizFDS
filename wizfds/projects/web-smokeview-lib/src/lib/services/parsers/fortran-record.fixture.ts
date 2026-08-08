/**
 * The pieces every FDS result file is built out of, for the fixtures that fake
 * one: fixed-width labels, integer and float payloads, and the Fortran record
 * frame around each ([u32 len][payload][u32 len]).
 *
 * Shared by the `.sf` and `.bf` fixtures, for the same reason RecordWalk is
 * shared by their readers - if a fixture and the reader are both wrong about
 * where a record's markers go, the spec proves nothing.
 */

/** A 30-byte label, space-padded as `dump.f90` writes one. */
export function label(text: string): Uint8Array {
    const bytes = new Uint8Array(30).fill(0x20);
    for (let at = 0; at < Math.min(text.length, 30); at++) bytes[at] = text.charCodeAt(at);
    return bytes;
}

export function ints(values: readonly number[], littleEndian: boolean): Uint8Array {
    const bytes = new Uint8Array(values.length * 4);
    const view = new DataView(bytes.buffer);
    values.forEach((value, at) => view.setInt32(at * 4, value, littleEndian));
    return bytes;
}

export function floats(values: readonly number[], littleEndian: boolean): Uint8Array {
    const bytes = new Uint8Array(values.length * 4);
    const view = new DataView(bytes.buffer);
    values.forEach((value, at) => view.setFloat32(at * 4, value, littleEndian));
    return bytes;
}

/** One payload with its length marker either side. */
export function record(payload: Uint8Array, littleEndian: boolean): Uint8Array {
    const bytes = new Uint8Array(payload.length + 8);
    const view = new DataView(bytes.buffer);
    view.setUint32(0, payload.length, littleEndian);
    bytes.set(payload, 4);
    view.setUint32(payload.length + 4, payload.length, littleEndian);
    return bytes;
}

/**
 * The payloads as one file, each in its record, with `truncateBytes` cut off
 * the end - which is what a solver killed mid-write leaves behind.
 */
export function assemble(
    payloads: readonly Uint8Array[], littleEndian: boolean, truncateBytes = 0
): ArrayBuffer {
    const framed = payloads.map(payload => record(payload, littleEndian));
    const total = framed.reduce((sum, part) => sum + part.length, 0) - truncateBytes;
    const out = new Uint8Array(Math.max(total, 0));

    let at = 0;
    for (const part of framed) {
        const take = Math.min(part.length, out.length - at);
        if (take <= 0) break;
        out.set(part.subarray(0, take), at);
        at += take;
    }
    return out.buffer;
}
