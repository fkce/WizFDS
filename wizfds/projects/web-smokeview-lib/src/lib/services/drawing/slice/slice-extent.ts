import { Extent } from '../../scale/quantity-scale.service';

/**
 * What one `.sf` file contributes to its quantity's range: the extremes of the
 * values that can be seen, across every frame it holds.
 *
 * Blanked nodes are skipped (ADR-0019). FDS writes a value at every node of the
 * plane, including the ones inside obstructions, but nothing solves the gas
 * phase in there and nothing draws it - so letting those values set the scale
 * would have the invisible decide the colour of the visible. One value from
 * under a wall is enough to push the whole gas into the bottom third of the
 * palette.
 *
 * Null when there is nothing to see: a header with no frames behind it, which
 * an interrupted run leaves, or a plane buried whole in matter.
 *
 * `blank` is the mask from computeSliceBlank() - one entry per node of one
 * frame, 1.0 visible - and `values` is the parser's flat run of whole frames,
 * `pointsPerFrame` apart.
 */
export function visibleExtent(
    values: Float32Array, blank: Float32Array, pointsPerFrame: number
): Extent | null {
    if (pointsPerFrame <= 0) { return null; }

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    // Whole frames only: a torn last frame holds values whose nodes this file
    // cannot place, and the mask would be read past its end.
    const frames = Math.floor(values.length / pointsPerFrame);
    for (let frame = 0; frame < frames; frame++) {
        const start = frame * pointsPerFrame;
        for (let node = 0; node < pointsPerFrame; node++) {
            if (blank[node] === 0) { continue; }
            const value = values[start + node];
            // Written as two comparisons rather than Math.min/max because a NaN
            // fails both, which is how it stays out of the scale entirely.
            if (value < min) { min = value; }
            if (value > max) { max = value; }
        }
    }

    return min <= max ? { min: min, max: max } : null;
}
