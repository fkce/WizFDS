import { SmvMeshGrid, SmvSliceBounds } from '../../parsers/smv/smv-file';

export interface SliceGeometry {
    /** xyz per node, in the same Fortran order the `.sf` writes its values. */
    readonly positions: Float32Array,
    readonly indices: Uint32Array
}

/**
 * The plane of one slice, as triangles on the solver's own grid planes.
 *
 * Vertices walk the node box in Fortran order - i fastest, then j, then k -
 * which is exactly the order `.sf` frames come in, so `slice_value` maps onto
 * them one-to-one with no reindexing. Positions come straight off TRNX/TRNY/
 * TRNZ (`SmvMeshGrid`), so stretched meshes and metres (ADR-0002) are both
 * the parser's gift, not this function's problem.
 *
 * A planar slice has one axis flattened (i1==i2 or j1==j2 or k1==k2); the two
 * that vary make the quad grid, two triangles per cell.
 */
export function buildSliceGeometry(bounds: SmvSliceBounds, grid: SmvMeshGrid): SliceGeometry {
    const ni = bounds.i2 - bounds.i1 + 1;
    const nj = bounds.j2 - bounds.j1 + 1;
    const nk = bounds.k2 - bounds.k1 + 1;

    const positions = new Float32Array(ni * nj * nk * 3);
    let at = 0;
    for (let k = bounds.k1; k <= bounds.k2; k++) {
        for (let j = bounds.j1; j <= bounds.j2; j++) {
            for (let i = bounds.i1; i <= bounds.i2; i++) {
                positions[at++] = grid.x[i];
                positions[at++] = grid.y[j];
                positions[at++] = grid.z[k];
            }
        }
    }

    // In Fortran order the flattened axis drops out: the flat node index is
    // v * nu + u, with u the faster of the two varying axes (i before j
    // before k). nu/nv are node counts along them.
    const nu = ni > 1 ? ni : nj;
    const nv = nk > 1 ? nk : (ni > 1 && nj > 1 ? nj : 1);

    const indices = new Uint32Array((nu - 1) * (nv - 1) * 6);
    let out = 0;
    for (let v = 0; v < nv - 1; v++) {
        for (let u = 0; u < nu - 1; u++) {
            const n00 = v * nu + u;
            const n10 = n00 + 1;
            const n01 = n00 + nu;
            const n11 = n01 + 1;
            indices[out++] = n00; indices[out++] = n10; indices[out++] = n11;
            indices[out++] = n00; indices[out++] = n11; indices[out++] = n01;
        }
    }
    return { positions: positions, indices: indices };
}
