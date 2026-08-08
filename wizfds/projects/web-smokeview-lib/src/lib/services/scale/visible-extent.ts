import { Extent } from './quantity-scale.service';

/**
 * What one result file contributes to its quantity's range: the extremes of the
 * values that can be seen, across every frame it holds (ADR-0019).
 *
 * Blank nodes are skipped ("Blank", CONTEXT.md). FDS writes a value at every
 * node of a plane, including the ones inside obstructions, and at every node of
 * a patch, including the ones with no wall cell behind them - but nothing solves
 * those and nothing draws them, so letting them set the scale would have the
 * invisible decide the colour of the visible. One value from under a wall is
 * enough to push the whole field into the bottom third of the palette.
 *
 * Null when there is nothing to see: a header with no frames behind it, which
 * an interrupted run leaves, or a surface buried whole.
 *
 * Shared by the formats rather than written per reader, because the rule is the
 * quantity's and not the file's: `visible` is one entry per node of one frame -
 * zero for a node that is not drawn - and `values` is the parser's flat run of
 * whole frames, `pointsPerFrame` apart. The mask is read as numbers so that
 * each format may keep it in whatever array it already had (a slice hands its
 * shader the same Float32Array it masks with).
 */
export function visibleExtent(
    values: Float32Array, visible: ArrayLike<number>, pointsPerFrame: number
): Extent | null {
    if (pointsPerFrame <= 0) { return null; }

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    // Whole frames only: a torn last frame holds values whose nodes the file
    // cannot place, and the mask would be read past its end.
    const frames = Math.floor(values.length / pointsPerFrame);
    for (let frame = 0; frame < frames; frame++) {
        const start = frame * pointsPerFrame;
        for (let node = 0; node < pointsPerFrame; node++) {
            if (visible[node] === 0) { continue; }
            const value = values[start + node];
            // Written as two comparisons rather than Math.min/max because a NaN
            // fails both, which is how it stays out of the scale entirely.
            if (value < min) { min = value; }
            if (value > max) { max = value; }
        }
    }

    return min <= max ? { min: min, max: max } : null;
}
