import { BfFile, BfPatch } from './bf-file';
import { asciiOf, detectEndianness, RecordWalk } from '../fortran-record';

/** Nine integers, as `INITIALIZE_MESH_DUMPS` writes one patch header. */
const PATCH_HEADER_BYTES = 9 * 4;

/**
 * Read one `.bf` boundary file (ADR-0016) - Fortran unformatted records, per
 * `DUMP_BNDF` in firemodels/fds: three 30-byte labels, the patch count, one
 * nine-integer header per patch, then per frame a time record followed by one
 * data record per patch, in patch order.
 *
 * A pure function, deliberately free of Angular and Babylon, exactly as
 * `parseSf` is: the whole file is in memory (#152 reads it in one go) and
 * everything it returns is plain data a spec can assert on.
 *
 * The patch order is load-bearing. A frame is the patch records back to back,
 * so laying the vertices out in the same order makes showing a frame a
 * contiguous copy rather than a scatter - see buildBoundary().
 */
export function parseBf(buffer: ArrayBuffer): BfFile {
    const view = new DataView(buffer);
    const littleEndian = detectEndianness(view, 30, '.bf');

    const walk = new RecordWalk(view, littleEndian, '.bf');
    const longLabel = asciiOf(walk.demand(30));
    const shortLabel = asciiOf(walk.demand(30));
    const unit = asciiOf(walk.demand(30));

    const count = walk.demand(4).getInt32(0, littleEndian);
    const patches: BfPatch[] = [];
    let pointsPerFrame = 0;
    for (let at = 0; at < count; at++) {
        const header = walk.demand(PATCH_HEADER_BYTES);
        const field = (index: number) => header.getInt32(index * 4, littleEndian);
        const patch = {
            i1: field(0), i2: field(1), j1: field(2), j2: field(3), k1: field(4), k2: field(5),
            ior: field(6), obstIndex: field(7), meshIndex: field(8),
            nodeCount: 0, valueOffset: pointsPerFrame
        };
        patch.nodeCount =
            (patch.i2 - patch.i1 + 1) * (patch.j2 - patch.j1 + 1) * (patch.k2 - patch.k1 + 1);
        pointsPerFrame += patch.nodeCount;
        patches.push(patch);
    }

    // Frames until the bytes run out. A killed solver routinely leaves a frame
    // half written; unlike a slice, half a boundary frame is several whole
    // patch records followed by a torn one, and the whole frame goes - a frame
    // missing its last patches would draw the previous instant on those
    // surfaces while the rest of the model had moved on.
    const times: number[] = [];
    const frames: DataView[][] = [];
    for (; ;) {
        const time = walk.tryNext(4);
        if (time === null) break;

        const records: DataView[] = [];
        for (const patch of patches) {
            const data = walk.tryNext(patch.nodeCount * 4);
            if (data === null) break;
            records.push(data);
        }
        if (records.length !== patches.length) break;

        times.push(time.getFloat32(0, littleEndian));
        frames.push(records);
    }

    const values = new Float32Array(frames.length * pointsPerFrame);
    frames.forEach((records, frameAt) => {
        const base = frameAt * pointsPerFrame;
        records.forEach((data, patchAt) => {
            const patch = patches[patchAt];
            const start = base + patch.valueOffset;
            if (littleEndian) {
                // Typed arrays are little-endian everywhere we run, so a LE file
                // is a straight byte copy. The payload is not 4-aligned (30-byte
                // labels), which rules out a Float32Array view over it instead.
                new Uint8Array(values.buffer, start * 4, patch.nodeCount * 4)
                    .set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
            } else {
                for (let at = 0; at < patch.nodeCount; at++) {
                    values[start + at] = data.getFloat32(at * 4, false);
                }
            }
        });
    });

    return {
        longLabel: longLabel, shortLabel: shortLabel, unit: unit,
        patches: patches, pointsPerFrame: pointsPerFrame,
        times: new Float32Array(times), values: values
    };
}
