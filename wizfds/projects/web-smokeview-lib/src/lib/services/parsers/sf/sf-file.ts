import { SmvSliceBounds } from '../smv/smv-file';

/**
 * One parsed `.sf` slice file - the header FDS wrote and every complete frame.
 *
 * Values stay raw f32 (ADR-0017): the value->colour mapping happens in the
 * shader against the quantity group's range, so nothing here depends on any
 * range. Frames sit in one flat array, `pointsPerFrame` apart, in the Fortran
 * order the solver wrote (i fastest, then j, then k).
 */
export interface SfFile {
    readonly longLabel: string,
    readonly shortLabel: string,
    readonly unit: string,
    /** Node-index bounds within the mesh, as the file itself states them. */
    readonly bounds: SmvSliceBounds,
    readonly pointsPerFrame: number,
    /** Simulation seconds of each complete frame, ready for #150. */
    readonly times: Float32Array,
    /** `times.length * pointsPerFrame` values; frame k starts at `k * pointsPerFrame`. */
    readonly values: Float32Array
}
