/**
 * One patch of a `.bf` file: a rectangle of surface the solver wrote values on.
 *
 * The node-index box has one axis collapsed, exactly as a slice's does, so the
 * same geometry builder applies. `ior` names the axis the rectangle is normal
 * to and, by its sign, the side it faces - outward from an obst, inward into
 * the domain for a tile of the mesh's own exterior wall.
 */
export interface BfPatch {
    readonly i1: number, readonly i2: number,
    readonly j1: number, readonly j2: number,
    readonly k1: number, readonly k2: number,
    /** ±1, ±2, ±3. */
    readonly ior: number,
    /**
     * 1-based within its own mesh, 0 for a tile of the mesh's exterior wall.
     *
     * Read but unused: geometry comes from the index box and `ior`, and both
     * kinds of patch are drawn. Beware if that ever changes - for a patch of an
     * obst belonging to a neighbouring mesh, this indexes *that* mesh's list.
     */
    readonly obstIndex: number,
    /** 1-based, and not always the mesh whose file this is - see `obstIndex`. */
    readonly meshIndex: number,
    /** `(i2-i1+1)(j2-j1+1)(k2-k1+1)` - the nodes the solver wrote per frame. */
    readonly nodeCount: number,
    /** Where this patch's values start within a frame. */
    readonly valueOffset: number
}

/**
 * One parsed `.bf` boundary file - the header FDS wrote, its patch list, and
 * every complete frame.
 *
 * Values stay raw f32 (ADR-0017); the value->colour mapping happens in the
 * shader against the quantity's range. A frame is the patches' records back to
 * back, in patch order, so laying vertices out in that same order makes showing
 * a frame a contiguous copy.
 */
export interface BfFile {
    readonly longLabel: string,
    readonly shortLabel: string,
    readonly unit: string,
    readonly patches: readonly BfPatch[],
    /** Every patch's nodes together. */
    readonly pointsPerFrame: number,
    /** Simulation seconds of each complete frame (#150). */
    readonly times: Float32Array,
    /** `times.length * pointsPerFrame` values; frame k starts at `k * pointsPerFrame`. */
    readonly values: Float32Array
}
