import { SmvBlockage, SmvSliceBounds } from '../../parsers/smv/smv-file';

/**
 * Which slice nodes are buried in matter: 1.0 visible, 0.0 blank.
 *
 * Computed here rather than read from anywhere, because no result file
 * carries it - SmokeView derives its iblank from the geometry too. The
 * blockages are the `.smv` OBST node boxes of the slice's own mesh; GEOM
 * deliberately does not occlude (see "Blank" in CONTEXT.md).
 *
 * On the plane's own axis the obst must contain the plane *strictly*: a
 * slice lying exactly on an obst face - a floor slice, a wall-surface slice,
 * the everyday cases - is data about the gas beside that face, not about the
 * matter under it. In the plane the box closes: face nodes shared with free
 * cells zero out only at measure-zero points once the varying interpolates,
 * so a cell is discarded exactly when the matter covers it whole.
 *
 * Order matches buildSliceGeometry(): Fortran, i fastest.
 */
export function computeSliceBlank(
    bounds: SmvSliceBounds, blockages: readonly SmvBlockage[]
): Float32Array {
    const ni = bounds.i2 - bounds.i1 + 1;
    const nj = bounds.j2 - bounds.j1 + 1;
    const nk = bounds.k2 - bounds.k1 + 1;

    const blank = new Float32Array(ni * nj * nk).fill(1);

    // Which axis the plane flattens; a volume slice never gets here (#160).
    const axis: 'i' | 'j' | 'k' = ni === 1 ? 'i' : nj === 1 ? 'j' : 'k';
    const plane = axis === 'i' ? bounds.i1 : axis === 'j' ? bounds.j1 : bounds.k1;

    for (const box of blockages) {
        const through = axis === 'i'
            ? box.i1 < plane && plane < box.i2
            : axis === 'j'
                ? box.j1 < plane && plane < box.j2
                : box.k1 < plane && plane < box.k2;
        if (!through) continue;

        const i1 = Math.max(axis === 'i' ? bounds.i1 : box.i1, bounds.i1);
        const i2 = Math.min(axis === 'i' ? bounds.i2 : box.i2, bounds.i2);
        const j1 = Math.max(axis === 'j' ? bounds.j1 : box.j1, bounds.j1);
        const j2 = Math.min(axis === 'j' ? bounds.j2 : box.j2, bounds.j2);
        const k1 = Math.max(axis === 'k' ? bounds.k1 : box.k1, bounds.k1);
        const k2 = Math.min(axis === 'k' ? bounds.k2 : box.k2, bounds.k2);

        for (let k = k1; k <= k2; k++) {
            for (let j = j1; j <= j2; j++) {
                for (let i = i1; i <= i2; i++) {
                    blank[((k - bounds.k1) * nj + (j - bounds.j1)) * ni + (i - bounds.i1)] = 0;
                }
            }
        }
    }
    return blank;
}
