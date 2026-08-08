import {
    COLORBAR_TEXELS, COLORBARS, colorbarByName, colorbarTexels, DEFAULT_COLORBAR
} from './colorbars';

/**
 * The palettes and the node expansion behind them ('Paleta', CONTEXT.md).
 *
 * The palettes are stored as the handful of nodes SmokeView states them in and
 * expanded to 256 texels here, so a palette is data rather than a thousand
 * transcribed numbers. What the expansion has to get right is the pair of nodes
 * sharing one index, which is how SMV spells a hard break in the colour scale
 * (ADR-0019).
 */
describe('colorbars', () => {

    /**
     * The only palette the library shipped before #151, verbatim: SMV's
     * `Rainbow_orig` as SmokeView itself expanded it. An independent golden
     * reference - if the generator reproduces it, the port changed no pixel
     * that was already on screen.
     */
    const RAINBOW_ORIG_TEXELS = new Uint8Array([
        0, 0, 255, 255, 0, 3, 255, 255, 0, 7, 255, 255, 0, 11, 255, 255, 0, 15, 255, 255, 0, 19, 255, 255, 0, 23, 255, 255, 0, 27, 255, 255,
        0, 31, 255, 255, 0, 35, 255, 255, 0, 39, 255, 255, 0, 43, 255, 255, 0, 47, 255, 255, 0, 51, 255, 255, 0, 55, 255, 255, 0, 59, 255, 255,
        0, 63, 255, 255, 0, 67, 255, 255, 0, 71, 255, 255, 0, 75, 255, 255, 0, 79, 255, 255, 0, 83, 255, 255, 0, 87, 255, 255, 0, 91, 255, 255,
        0, 95, 255, 255, 0, 99, 255, 255, 0, 103, 255, 255, 0, 107, 255, 255, 0, 111, 255, 255, 0, 115, 255, 255, 0, 119, 255, 255, 0, 123, 255, 255,
        0, 127, 255, 255, 0, 131, 255, 255, 0, 135, 255, 255, 0, 139, 255, 255, 0, 143, 255, 255, 0, 147, 255, 255, 0, 151, 255, 255, 0, 155, 255, 255,
        0, 159, 255, 255, 0, 163, 255, 255, 0, 167, 255, 255, 0, 171, 255, 255, 0, 175, 255, 255, 0, 179, 255, 255, 0, 183, 255, 255, 0, 187, 255, 255,
        0, 191, 255, 255, 0, 195, 255, 255, 0, 199, 255, 255, 0, 203, 255, 255, 0, 207, 255, 255, 0, 211, 255, 255, 0, 215, 255, 255, 0, 219, 255, 255,
        0, 223, 255, 255, 0, 227, 255, 255, 0, 231, 255, 255, 0, 235, 255, 255, 0, 239, 255, 255, 0, 243, 255, 255, 0, 247, 255, 255, 0, 251, 255, 255,
        0, 255, 255, 255, 0, 255, 251, 255, 0, 255, 247, 255, 0, 255, 243, 255, 0, 255, 239, 255, 0, 255, 235, 255, 0, 255, 231, 255, 0, 255, 227, 255,
        0, 255, 223, 255, 0, 255, 219, 255, 0, 255, 215, 255, 0, 255, 211, 255, 0, 255, 207, 255, 0, 255, 203, 255, 0, 255, 199, 255, 0, 255, 195, 255,
        0, 255, 191, 255, 0, 255, 187, 255, 0, 255, 183, 255, 0, 255, 179, 255, 0, 255, 175, 255, 0, 255, 171, 255, 0, 255, 167, 255, 0, 255, 163, 255,
        0, 255, 159, 255, 0, 255, 155, 255, 0, 255, 151, 255, 0, 255, 147, 255, 0, 255, 143, 255, 0, 255, 139, 255, 0, 255, 135, 255, 0, 255, 131, 255,
        0, 255, 127, 255, 0, 255, 123, 255, 0, 255, 119, 255, 0, 255, 115, 255, 0, 255, 111, 255, 0, 255, 107, 255, 0, 255, 103, 255, 0, 255, 99, 255,
        0, 255, 95, 255, 0, 255, 91, 255, 0, 255, 87, 255, 0, 255, 83, 255, 0, 255, 79, 255, 0, 255, 75, 255, 0, 255, 71, 255, 0, 255, 67, 255,
        0, 255, 63, 255, 0, 255, 59, 255, 0, 255, 55, 255, 0, 255, 51, 255, 0, 255, 47, 255, 0, 255, 43, 255, 0, 255, 39, 255, 0, 255, 35, 255,
        0, 255, 31, 255, 0, 255, 27, 255, 0, 255, 23, 255, 0, 255, 19, 255, 0, 255, 15, 255, 0, 255, 11, 255, 0, 255, 7, 255, 0, 255, 3, 255,
        0, 255, 0, 255, 3, 255, 0, 255, 7, 255, 0, 255, 11, 255, 0, 255, 15, 255, 0, 255, 19, 255, 0, 255, 23, 255, 0, 255, 27, 255, 0, 255,
        31, 255, 0, 255, 35, 255, 0, 255, 39, 255, 0, 255, 43, 255, 0, 255, 47, 255, 0, 255, 51, 255, 0, 255, 55, 255, 0, 255, 59, 255, 0, 255,
        63, 255, 0, 255, 67, 255, 0, 255, 71, 255, 0, 255, 75, 255, 0, 255, 79, 255, 0, 255, 83, 255, 0, 255, 87, 255, 0, 255, 91, 255, 0, 255,
        95, 255, 0, 255, 99, 255, 0, 255, 103, 255, 0, 255, 107, 255, 0, 255, 111, 255, 0, 255, 115, 255, 0, 255, 119, 255, 0, 255, 123, 255, 0, 255,
        127, 255, 0, 255, 131, 255, 0, 255, 135, 255, 0, 255, 139, 255, 0, 255, 143, 255, 0, 255, 147, 255, 0, 255, 151, 255, 0, 255, 155, 255, 0, 255,
        159, 255, 0, 255, 163, 255, 0, 255, 167, 255, 0, 255, 171, 255, 0, 255, 175, 255, 0, 255, 179, 255, 0, 255, 183, 255, 0, 255, 187, 255, 0, 255,
        191, 255, 0, 255, 195, 255, 0, 255, 199, 255, 0, 255, 203, 255, 0, 255, 207, 255, 0, 255, 211, 255, 0, 255, 215, 255, 0, 255, 219, 255, 0, 255,
        223, 255, 0, 255, 227, 255, 0, 255, 231, 255, 0, 255, 235, 255, 0, 255, 239, 255, 0, 255, 243, 255, 0, 255, 247, 255, 0, 255, 251, 255, 0, 255,
        255, 255, 0, 255, 255, 250, 0, 255, 255, 246, 0, 255, 255, 242, 0, 255, 255, 238, 0, 255, 255, 234, 0, 255, 255, 230, 0, 255, 255, 226, 0, 255,
        255, 222, 0, 255, 255, 218, 0, 255, 255, 214, 0, 255, 255, 210, 0, 255, 255, 206, 0, 255, 255, 202, 0, 255, 255, 198, 0, 255, 255, 194, 0, 255,
        255, 190, 0, 255, 255, 186, 0, 255, 255, 182, 0, 255, 255, 178, 0, 255, 255, 174, 0, 255, 255, 169, 0, 255, 255, 165, 0, 255, 255, 161, 0, 255,
        255, 157, 0, 255, 255, 153, 0, 255, 255, 149, 0, 255, 255, 145, 0, 255, 255, 141, 0, 255, 255, 137, 0, 255, 255, 133, 0, 255, 255, 129, 0, 255,
        255, 125, 0, 255, 255, 121, 0, 255, 255, 117, 0, 255, 255, 113, 0, 255, 255, 109, 0, 255, 255, 105, 0, 255, 255, 101, 0, 255, 255, 97, 0, 255,
        255, 93, 0, 255, 255, 89, 0, 255, 255, 84, 0, 255, 255, 80, 0, 255, 255, 76, 0, 255, 255, 72, 0, 255, 255, 68, 0, 255, 255, 64, 0, 255,
        255, 60, 0, 255, 255, 56, 0, 255, 255, 52, 0, 255, 255, 48, 0, 255, 255, 44, 0, 255, 255, 40, 0, 255, 255, 36, 0, 255, 255, 32, 0, 255,
        255, 28, 0, 255, 255, 24, 0, 255, 255, 20, 0, 255, 255, 16, 0, 255, 255, 12, 0, 255, 255, 8, 0, 255, 255, 4, 0, 255, 255, 0, 0, 255
    ]);

    /** The RGB of one texel, which is what every assertion below is about. */
    const texel = (texels: Uint8Array, at: number): number[] =>
        [texels[at * 4], texels[at * 4 + 1], texels[at * 4 + 2]];

    it('expands nodes into exactly what SmokeView expanded them into', () => {
        expect(colorbarTexels(colorbarByName('Rainbow_orig')))
            .toEqual(RAINBOW_ORIG_TEXELS);
    });

    it('breaks hard where two nodes share an index, with no blend across it', () => {
        // FED is flat blue to 26, flat yellow to 85, flat orange to the top -
        // three plateaus and two cliffs, and nothing in between them.
        const fed = colorbarTexels(colorbarByName('FED'));

        expect(texel(fed, 0)).toEqual([96, 96, 255]);
        expect(texel(fed, 25)).toEqual([96, 96, 255]);
        expect(texel(fed, 26)).toEqual([255, 255, 0]);
        expect(texel(fed, 84)).toEqual([255, 255, 0]);
        expect(texel(fed, 85)).toEqual([255, 155, 0]);
        expect(texel(fed, 255)).toEqual([255, 155, 0]);
    });

    it('fills every texel of every palette, opaque, from end node to end node', () => {
        COLORBARS.forEach(colorbar => {
            const texels = colorbarTexels(colorbar);
            const nodes = colorbar.nodes;

            expect(texels.length).toBe(COLORBAR_TEXELS * 4);
            expect(texel(texels, 0)).toEqual([...nodes[0].rgb], colorbar.name);
            expect(texel(texels, COLORBAR_TEXELS - 1))
                .toEqual([...nodes[nodes.length - 1].rgb], colorbar.name);

            for (let at = 0; at < COLORBAR_TEXELS; at++) {
                expect(texels[at * 4 + 3]).toBe(255, `${colorbar.name} alpha at ${at}`);
            }
        });
    });

    it('names the same default SmokeView opens with, which is not the old palette', () => {
        expect(DEFAULT_COLORBAR).toBe('Rainbow');
        expect(colorbarByName(DEFAULT_COLORBAR).name).toBe('Rainbow');
        // The one this library shipped before #151 is a different palette that
        // SMV keeps under its own name - so the default really does change.
        expect(colorbarTexels(colorbarByName('Rainbow')))
            .not.toEqual(RAINBOW_ORIG_TEXELS);
    });

    it('falls back to the default rather than to nothing when a name is unknown', () => {
        // A palette name outliving the palette must not blank the scene.
        expect(colorbarByName('no such palette').name).toBe(DEFAULT_COLORBAR);
    });

});
