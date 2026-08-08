import { SfFile } from './sf-file';
import { asciiOf, detectEndianness, RecordWalk } from '../fortran-record';

/**
 * Read one `.sf` slice file (ADR-0016) - Fortran unformatted records, per
 * `readslice.c` in firemodels/smv: three 30-byte labels, the node bounds,
 * then (time, data) record pairs until the file ends.
 *
 * A pure function, deliberately free of Angular and Babylon: the whole file
 * is already in memory (#149 reads it in one go), and everything it returns
 * is plain data a spec can assert on.
 */
export function parseSf(buffer: ArrayBuffer): SfFile {
    const view = new DataView(buffer);
    const littleEndian = detectEndianness(view, 30, '.sf');

    const walk = new RecordWalk(view, littleEndian, '.sf');
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
