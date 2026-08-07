import { SfFile } from './sf-file';

/**
 * Read one `.sf` slice file (ADR-0016) - Fortran unformatted records, per
 * `readslice.c` in firemodels/smv: three 30-byte labels, the node bounds,
 * then (time, data) record pairs until the file ends.
 *
 * A pure function, deliberately free of Angular and Babylon: the whole file
 * is already in memory (#149 reads it in one go), and everything it returns
 * is plain data a spec can assert on.
 *
 * The byte order is whatever machine ran the solver. The first record is a
 * 30-byte label, so the first marker read as the wrong endianness is
 * 0x1E000000 rather than 0x0000001E - which is how the right one is found,
 * and how bytes that are no `.sf` at all are refused.
 */
export function parseSf(buffer: ArrayBuffer): SfFile {
    if (buffer.byteLength < 4) throw new Error('not a .sf file: shorter than one record marker');
    const view = new DataView(buffer);

    let littleEndian: boolean;
    if (view.getUint32(0, true) === 30) littleEndian = true;
    else if (view.getUint32(0, false) === 30) littleEndian = false;
    else throw new Error('not a .sf file: the first record is not a 30-byte label');

    const walk = new RecordWalk(view, littleEndian);
    const longLabel = asciiOf(walk.demand(30));
    const shortLabel = asciiOf(walk.demand(30));
    const unit = asciiOf(walk.demand(30));

    const boundsRecord = walk.demand(24);
    const bounds = {
        i1: boundsRecord.getInt32(0, littleEndian), i2: boundsRecord.getInt32(4, littleEndian),
        j1: boundsRecord.getInt32(8, littleEndian), j2: boundsRecord.getInt32(12, littleEndian),
        k1: boundsRecord.getInt32(16, littleEndian), k2: boundsRecord.getInt32(20, littleEndian)
    };
    const pointsPerFrame =
        (bounds.i2 - bounds.i1 + 1) * (bounds.j2 - bounds.j1 + 1) * (bounds.k2 - bounds.k1 + 1);

    // Frames until the bytes run out. A killed solver routinely leaves half a
    // frame at the end; an incomplete (time, data) pair is dropped whole.
    const times: number[] = [];
    const frames: DataView[] = [];
    for (; ;) {
        const time = walk.tryNext(4);
        if (time === null) break;
        const data = walk.tryNext(pointsPerFrame * 4);
        if (data === null) break;
        times.push(time.getFloat32(0, littleEndian));
        frames.push(data);
    }

    const values = new Float32Array(frames.length * pointsPerFrame);
    frames.forEach((frame, frameAt) => {
        if (littleEndian) {
            // Typed arrays are little-endian on every platform we run on, so a
            // LE file is a straight byte copy - the payload is not 4-aligned
            // (30-byte labels), which rules out a Float32Array view instead.
            new Uint8Array(values.buffer, frameAt * pointsPerFrame * 4, pointsPerFrame * 4)
                .set(new Uint8Array(frame.buffer, frame.byteOffset, frame.byteLength));
        } else {
            for (let at = 0; at < pointsPerFrame; at++) {
                values[frameAt * pointsPerFrame + at] = frame.getFloat32(at * 4, false);
            }
        }
    });

    return {
        longLabel: longLabel, shortLabel: shortLabel, unit: unit,
        bounds: bounds, pointsPerFrame: pointsPerFrame,
        times: new Float32Array(times), values: values
    };
}

/** The record cursor: each step checks both markers and hands back the payload. */
class RecordWalk {

    private at = 0;

    constructor(
        private readonly view: DataView,
        private readonly littleEndian: boolean
    ) { }

    /** The next record, which must be whole and `expected` bytes long. */
    public demand(expected: number): DataView {
        const record = this.tryNext(expected);
        if (record === null) throw new Error('.sf file ends inside its header');
        return record;
    }

    /** The next record, or null when the bytes run out or the length differs. */
    public tryNext(expected: number): DataView | null {
        const total = this.view.byteLength;
        if (this.at + 8 + expected > total) return null;
        const length = this.view.getUint32(this.at, this.littleEndian);
        if (length !== expected) return null;
        const trailing = this.view.getUint32(this.at + 4 + expected, this.littleEndian);
        if (trailing !== length) return null;

        const payload = new DataView(this.view.buffer, this.view.byteOffset + this.at + 4, expected);
        this.at += 8 + expected;
        return payload;
    }
}

function asciiOf(bytes: DataView): string {
    let text = '';
    for (let at = 0; at < bytes.byteLength; at++) text += String.fromCharCode(bytes.getUint8(at));
    return text.trim();
}
