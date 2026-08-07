import { frameAt, NO_FRAME } from './frame-at';

/**
 * The step function of "Oś czasu" (CONTEXT.md), in one place: the last frame at
 * or before t. Its two ends are not symmetric, and that asymmetry is the point.
 * After the last frame the answer is still the last frame - that is the step
 * function, not extrapolation. Before the first there is no answer at all.
 */
describe('frameAt', () => {

    // Whole and half seconds: every value here is exact in f32, so a failure is
    // never the parser's float and always the search.
    const times = [0, 0.5, 1, 2.5, 4];

    it('has no answer before the first frame', () => {
        expect(frameAt([1, 2, 3], 0.999)).toBe(NO_FRAME);
    });

    it('has no answer for a file with no frames', () => {
        expect(frameAt([], 0)).toBe(NO_FRAME);
        expect(frameAt([], 17)).toBe(NO_FRAME);
    });

    it('lands on a frame asked for by its own time', () => {
        expect(frameAt(times, 0)).toBe(0);
        expect(frameAt(times, 0.5)).toBe(1);
        expect(frameAt(times, 1)).toBe(2);
        expect(frameAt(times, 2.5)).toBe(3);
        expect(frameAt(times, 4)).toBe(4);
    });

    it('holds the earlier frame between two frames', () => {
        expect(frameAt(times, 0.25)).toBe(0);
        expect(frameAt(times, 2.49)).toBe(2);
        expect(frameAt(times, 3.9)).toBe(3);
    });

    it('holds the last frame after the file ends', () => {
        expect(frameAt(times, 4.1)).toBe(4);
        expect(frameAt(times, 10_000)).toBe(4);
    });

    it('answers for a single-frame file on both sides of it', () => {
        expect(frameAt([7], 6.9)).toBe(NO_FRAME);
        expect(frameAt([7], 7)).toBe(0);
        expect(frameAt([7], 7.1)).toBe(0);
    });

    it('reads a Float32Array, which is what the parsers hand over', () => {
        expect(frameAt(new Float32Array([0, 1, 2]), 1.5)).toBe(1);
        expect(frameAt(new Float32Array([]), 1.5)).toBe(NO_FRAME);
    });

    it('finds the same frame a linear scan would, across a long file', () => {
        // The binary search is the only thing here that can be subtly wrong,
        // so it is checked against the obvious implementation rather than
        // against hand-picked indices.
        const many = Array.from({ length: 501 }, (_, at) => at * 0.25);
        for (const t of [0, 0.1, 6.25, 6.3, 62.4, 124.9, 125, 125.1]) {
            let expected = NO_FRAME;
            many.forEach((time, at) => { if (time <= t) expected = at; });
            expect(frameAt(many, t)).withContext(`at t=${t}`).toBe(expected);
        }
    });
});
