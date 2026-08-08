import { BfFile, BfPatch } from '../../parsers/bf/bf-file';
import { SmvBlockage, SmvMeshGrid } from '../../parsers/smv/smv-file';
import { Extent } from '../../scale/quantity-scale.service';
import { visibleExtent } from '../../scale/visible-extent';

/** Everything one `.bf` file needs to become a mesh on screen. */
export interface BoundaryBuild {
    /** xyz per node, patch after patch, in the order the file writes them. */
    readonly positions: Float32Array,
    /** Triangles of the cells that have something real behind them. */
    readonly indices: Uint32Array,
    /** What the drawn nodes span across every frame; null when nothing is drawn. */
    readonly extent: Extent | null
}

/**
 * Turn one parsed `.bf` into the geometry of every patch it holds, and say what
 * the part of it that can be seen is worth to the quantity's range.
 *
 * Geometry, blank and range in one function rather than three, unlike the slice
 * side, because here they are one decision: a cell with nothing behind it
 * contributes no triangles, and the nodes only such cells touch must not set
 * the scale. Splitting them would leave the coupling for the caller - and for
 * every spec - to reassemble.
 *
 * **Vertices keep the file's order** - patch by patch, and inside a patch the
 * Fortran walk `buildSliceGeometry` makes (i fastest, then j, then k). A frame
 * of a `.bf` is exactly the patch records back to back, so showing a frame is a
 * contiguous copy into the value buffer with no reindexing. Vertices of a patch
 * with no area are still written, for the same reason: the layout has to keep
 * matching the file even where nothing is drawn.
 *
 * **A patch faces the way its `ior` points** - outward from an obst, inward for
 * a tile of the mesh's own exterior wall - and is drawn from that side only
 * (ADR-0020). Triangles are wound so that the right-hand rule gives the `ior`
 * direction; which winding the engine then treats as front-facing is the
 * material's business, set once in BndfService.
 *
 * **A cell is dropped when the gas cell behind it is buried in matter.** That
 * is FDS's own test, from `DUMP_BNDF`: it fills a patch cell only where a wall
 * cell exists, and writes the ambient value everywhere else - so a face half
 * covered by another obst comes back with a slab of 20 °C in the middle of a
 * fire. The gas cell sits one layer off the patch plane, on the side `ior`
 * points to, and `blockages` are the `.smv` node boxes of this file's own mesh
 * (a node box `[n1,n2]` holds cells `n1+1 … n2`).
 */
export function buildBoundary(
    bf: BfFile, grid: SmvMeshGrid, blockages: readonly SmvBlockage[]
): BoundaryBuild {
    const positions = new Float32Array(bf.pointsPerFrame * 3);
    const indices: number[] = [];
    // 1 for a node some surviving cell touches. The same mask decides what is
    // drawn and what may set the scale, so the two cannot drift apart (#149).
    const visible = new Uint8Array(bf.pointsPerFrame);

    for (const patch of bf.patches) {
        let at = patch.valueOffset * 3;
        for (let k = patch.k1; k <= patch.k2; k++) {
            for (let j = patch.j1; j <= patch.j2; j++) {
                for (let i = patch.i1; i <= patch.i2; i++) {
                    positions[at++] = grid.x[i];
                    positions[at++] = grid.y[j];
                    positions[at++] = grid.z[k];
                }
            }
        }
        appendPatch(patch, blockages, indices, visible);
    }

    return {
        positions: positions,
        indices: new Uint32Array(indices),
        extent: visibleExtent(bf.values, visible, bf.pointsPerFrame)
    };
}

/** The triangles of one patch, and the nodes they put on screen. */
function appendPatch(
    patch: BfPatch, blockages: readonly SmvBlockage[], indices: number[], visible: Uint8Array
): void {
    const axis = Math.abs(patch.ior);
    if (axis < 1 || axis > 3) { return; }

    // The two axes that vary, in Fortran order: the faster one walks u, the
    // slower one v - which is what makes the flat node index `v * nu + u`.
    const ni = patch.i2 - patch.i1 + 1;
    const nj = patch.j2 - patch.j1 + 1;
    const nk = patch.k2 - patch.k1 + 1;
    const nu = axis === 1 ? nj : ni;
    const nv = axis === 3 ? nj : nk;
    const u1 = axis === 1 ? patch.j1 : patch.i1;
    const v1 = axis === 3 ? patch.j1 : patch.k1;

    // The gas cell layer this patch reports on: one off the plane, on the side
    // ior points to. A node box [n1,n2] holds cells n1+1 … n2, so the cell just
    // past the plane is `plane + 1` and the one just before it is `plane`.
    const plane = axis === 1 ? patch.i1 : axis === 2 ? patch.j1 : patch.k1;
    const gas = patch.ior > 0 ? plane + 1 : plane;

    // Winding, so that the right-hand rule points along ior. With u and v as
    // above the cross product of the two edges is +x for a patch normal to i,
    // -y for one normal to j and +z for one normal to k - so only the j case
    // agrees with a negative ior.
    const forward = axis === 2 ? patch.ior < 0 : patch.ior > 0;

    const cellsU = nu - 1;
    const cellsV = nv - 1;
    if (cellsU <= 0 || cellsV <= 0) { return; }

    const blank = blankCells(blockages, axis, gas, u1, v1, cellsU, cellsV);
    for (let v = 0; v < cellsV; v++) {
        for (let u = 0; u < cellsU; u++) {
            if (blank[v * cellsU + u] === 1) { continue; }

            const n00 = patch.valueOffset + v * nu + u;
            const n10 = n00 + 1;
            const n01 = n00 + nu;
            const n11 = n01 + 1;
            if (forward) {
                indices.push(n00, n10, n11, n00, n11, n01);
            } else {
                indices.push(n00, n11, n10, n00, n01, n11);
            }
            visible[n00] = 1; visible[n10] = 1; visible[n01] = 1; visible[n11] = 1;
        }
    }
}

/**
 * Which cells of one patch are blank ("Blank", CONTEXT.md): those with an
 * obstruction where their gas cell should be, so FDS wrote the ambient value.
 *
 * Blockage-first, as computeSliceBlank() is, rather than asking every cell
 * about every block: a `.bf` covers the whole model, so the cell-first loop
 * would be the cell count times the obst count on the load path. Most blocks
 * fail the first test - they are nowhere near this patch's layer - and cost one
 * comparison each.
 *
 * A node box `[n1,n2]` holds cells `n1+1 … n2`, and the patch's own cell `c`
 * along an axis is `start + c + 1`; both conversions are that one rule.
 */
function blankCells(
    blockages: readonly SmvBlockage[], axis: number, gas: number,
    u1: number, v1: number, cellsU: number, cellsV: number
): Uint8Array {
    const blank = new Uint8Array(cellsU * cellsV);

    for (const box of blockages) {
        const throughLow = axis === 1 ? box.i1 : axis === 2 ? box.j1 : box.k1;
        const throughHigh = axis === 1 ? box.i2 : axis === 2 ? box.j2 : box.k2;
        if (!(throughLow < gas && gas <= throughHigh)) { continue; }

        const boxU1 = axis === 1 ? box.j1 : box.i1;
        const boxU2 = axis === 1 ? box.j2 : box.i2;
        const boxV1 = axis === 3 ? box.j1 : box.k1;
        const boxV2 = axis === 3 ? box.j2 : box.k2;

        const fromU = Math.max(0, boxU1 - u1);
        const toU = Math.min(cellsU - 1, boxU2 - u1 - 1);
        const fromV = Math.max(0, boxV1 - v1);
        const toV = Math.min(cellsV - 1, boxV2 - v1 - 1);

        for (let v = fromV; v <= toV; v++) {
            for (let u = fromU; u <= toU; u++) { blank[v * cellsU + u] = 1; }
        }
    }
    return blank;
}
