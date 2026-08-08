import { visibleExtent } from './slice-extent';

/**
 * What one `.sf` file contributes to its quantity's range ("Zakres wielkości",
 * CONTEXT.md): the extremes of the values that can actually be seen, over every
 * frame of the file.
 *
 * The blank mask is the one from computeSliceBlank() - 1.0 visible, 0.0 buried
 * in matter - and skipping it is the decision in ADR-0019 that keeps a value
 * nobody can see from setting the colour of the values everybody can.
 */
describe('visibleExtent', () => {

    /** Two frames of four nodes each, in the flat layout the parser produces. */
    const frames = (...values: number[]) => new Float32Array(values);
    const visible = (...flags: number[]) => new Float32Array(flags);

    it('spans the values of every frame, not only the first', () => {
        const extent = visibleExtent(frames(20, 30, 40, 50, 15, 30, 40, 512),
            visible(1, 1, 1, 1), 4);

        expect(extent).toEqual({ min: 15, max: 512 });
    });

    it('leaves out the nodes buried in matter', () => {
        // The 853 sits under an obst; the gas around it runs 20..40.
        const extent = visibleExtent(frames(20, 853, 40, 30), visible(1, 0, 1, 1), 4);

        expect(extent).toEqual({ min: 20, max: 40 });
    });

    it('leaves them out in every frame, not only where they were found', () => {
        const extent = visibleExtent(frames(20, 853, 40, 30, 25, 900, 45, 35),
            visible(1, 0, 1, 1), 4);

        expect(extent).toEqual({ min: 20, max: 45 });
    });

    it('has no answer when every node is buried', () => {
        expect(visibleExtent(frames(853, 900, 870, 880), visible(0, 0, 0, 0), 4))
            .toBeNull();
    });

    it('has no answer for a file with no frames behind its header', () => {
        expect(visibleExtent(frames(), visible(1, 1, 1, 1), 4)).toBeNull();
        expect(visibleExtent(frames(20, 30), visible(), 0)).toBeNull();
    });

    it('reports a constant field as the one value it is', () => {
        expect(visibleExtent(frames(20, 20, 20, 20), visible(1, 1, 1, 1), 4))
            .toEqual({ min: 20, max: 20 });
    });

    it('ignores a value that is not one', () => {
        // A NaN anywhere would otherwise poison both ends of the scale.
        const extent = visibleExtent(frames(20, Number.NaN, 40, 30),
            visible(1, 1, 1, 1), 4);

        expect(extent).toEqual({ min: 20, max: 40 });
    });

    it('reads a trailing partial frame the parser did not drop', () => {
        // Whole frames only: half a frame is half a picture, and the values in
        // it belong to nodes this file cannot place.
        const extent = visibleExtent(frames(20, 30, 40, 50, 900),
            visible(1, 1, 1, 1), 4);

        expect(extent).toEqual({ min: 20, max: 50 });
    });
});
