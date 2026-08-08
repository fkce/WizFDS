/**
 * The palettes a result quantity can be drawn with ("Paleta", CONTEXT.md).
 *
 * A port of SmokeView's twenty default colorbars (`Source/shared/colorbar_defs.c`),
 * kept under SMV's own menu names so a figure from this viewer and a figure from
 * SmokeView can be put side by side and read as the same scale.
 *
 * Stored as the handful of nodes SMV states them in rather than as expanded
 * texels: a palette is then five lines of data instead of a thousand
 * transcribed numbers, and the expansion is one function with one test against
 * what SmokeView itself produced.
 */

/** One stop of a palette: a colour pinned to a place on the 0..255 ramp. */
export interface ColorbarNode {
    readonly at: number;
    readonly rgb: readonly [number, number, number];
}

export interface Colorbar {
    /** SmokeView's menu label, verbatim. */
    readonly name: string;
    /** Ascending by `at`; two nodes may share an index - see colorbarTexels(). */
    readonly nodes: readonly ColorbarNode[];
}

/** Texels in the expanded ramp - the height of the 1 x N colorbar texture. */
export const COLORBAR_TEXELS = 256;

/**
 * SmokeView's default, and ours. Note it is *not* what this library shipped
 * before #151: that was `Rainbow_orig`, one entry down, which SMV keeps only
 * for continuity with its own older figures.
 */
export const DEFAULT_COLORBAR = 'Rainbow';

export const COLORBARS: readonly Colorbar[] = [
    {
        name: "Rainbow",
        nodes: [
            { at: 0, rgb: [0, 0, 255] },
            { at: 64, rgb: [0, 192, 192] },
            { at: 128, rgb: [0, 255, 0] },
            { at: 192, rgb: [192, 192, 0] },
            { at: 255, rgb: [255, 0, 0] }
        ]
    },
    {
        name: "Rainbow_orig",
        nodes: [
            { at: 0, rgb: [0, 0, 255] },
            { at: 64, rgb: [0, 255, 255] },
            { at: 128, rgb: [0, 255, 0] },
            { at: 192, rgb: [255, 255, 0] },
            { at: 255, rgb: [255, 0, 0] }
        ]
    },
    {
        name: "Rainbow 2",
        nodes: [
            { at: 0, rgb: [4, 0, 108] },
            { at: 20, rgb: [6, 3, 167] },
            { at: 60, rgb: [24, 69, 240] },
            { at: 70, rgb: [31, 98, 214] },
            { at: 80, rgb: [5, 125, 170] },
            { at: 96, rgb: [48, 155, 80] },
            { at: 112, rgb: [82, 177, 8] },
            { at: 163, rgb: [240, 222, 3] },
            { at: 170, rgb: [249, 214, 7] },
            { at: 200, rgb: [252, 152, 22] },
            { at: 230, rgb: [254, 67, 13] },
            { at: 255, rgb: [215, 5, 13] }
        ]
    },
    {
        name: "yellow->red",
        nodes: [
            { at: 0, rgb: [255, 255, 0] },
            { at: 255, rgb: [255, 0, 0] }
        ]
    },
    {
        name: "blue->green->red",
        nodes: [
            { at: 0, rgb: [0, 0, 255] },
            { at: 128, rgb: [0, 255, 0] },
            { at: 255, rgb: [255, 0, 0] }
        ]
    },
    {
        name: "blue->yellow->white",
        nodes: [
            { at: 0, rgb: [0, 151, 255] },
            { at: 113, rgb: [255, 0, 0] },
            { at: 212, rgb: [255, 255, 0] },
            { at: 255, rgb: [255, 255, 255] }
        ]
    },
    {
        name: "blue->red split",
        nodes: [
            { at: 0, rgb: [0, 0, 255] },
            { at: 127, rgb: [0, 255, 255] },
            { at: 128, rgb: [255, 255, 0] },
            { at: 255, rgb: [255, 0, 0] }
        ]
    },
    {
        name: "AFAC split",
        nodes: [
            { at: 0, rgb: [0, 178, 90] },
            { at: 80, rgb: [0, 178, 90] },
            { at: 81, rgb: [255, 243, 0] },
            { at: 100, rgb: [255, 243, 0] },
            { at: 101, rgb: [250, 150, 38] },
            { at: 140, rgb: [250, 150, 38] },
            { at: 141, rgb: [209, 34, 41] },
            { at: 255, rgb: [209, 34, 41] }
        ]
    },
    {
        name: "black->white",
        nodes: [
            { at: 0, rgb: [0, 0, 0] },
            { at: 255, rgb: [255, 255, 255] }
        ]
    },
    {
        name: "FED",
        nodes: [
            { at: 0, rgb: [96, 96, 255] },
            { at: 26, rgb: [96, 96, 255] },
            { at: 26, rgb: [255, 255, 0] },
            { at: 85, rgb: [255, 255, 0] },
            { at: 85, rgb: [255, 155, 0] },
            { at: 255, rgb: [255, 155, 0] }
        ]
    },
    {
        name: "fire",
        nodes: [
            { at: 0, rgb: [0, 0, 0] },
            { at: 127, rgb: [0, 0, 0] },
            { at: 128, rgb: [255, 128, 0] },
            { at: 255, rgb: [255, 128, 0] }
        ]
    },
    {
        name: "fire 2",
        nodes: [
            { at: 0, rgb: [0, 0, 0] },
            { at: 127, rgb: [38, 0, 0] },
            { at: 128, rgb: [219, 68, 21] },
            { at: 160, rgb: [255, 125, 36] },
            { at: 183, rgb: [255, 157, 52] },
            { at: 198, rgb: [255, 170, 63] },
            { at: 214, rgb: [255, 198, 93] },
            { at: 229, rgb: [255, 208, 109] },
            { at: 244, rgb: [255, 234, 161] },
            { at: 255, rgb: [255, 255, 238] }
        ]
    },
    {
        name: "fire 3",
        nodes: [
            { at: 0, rgb: [0, 0, 0] },
            { at: 108, rgb: [255, 127, 0] },
            { at: 156, rgb: [255, 255, 0] },
            { at: 255, rgb: [255, 255, 255] }
        ]
    },
    {
        name: "cool",
        nodes: [
            { at: 0, rgb: [0, 0, 0] },
            { at: 90, rgb: [64, 64, 255] },
            { at: 110, rgb: [155, 35, 33] },
            { at: 120, rgb: [108, 19, 43] },
            { at: 130, rgb: [208, 93, 40] },
            { at: 160, rgb: [255, 178, 0] },
            { at: 255, rgb: [255, 255, 255] }
        ]
    },
    {
        name: "fire line (level set)",
        nodes: [
            { at: 0, rgb: [0, 1, 2] },
            { at: 120, rgb: [0, 1, 2] },
            { at: 120, rgb: [255, 0, 0] },
            { at: 136, rgb: [255, 0, 0] },
            { at: 136, rgb: [64, 64, 64] },
            { at: 255, rgb: [64, 64, 64] }
        ]
    },
    {
        name: "fire line (wall thickness)",
        nodes: [
            { at: 0, rgb: [0, 0, 0] },
            { at: 32, rgb: [0, 0, 0] },
            { at: 32, rgb: [253, 254, 255] },
            { at: 255, rgb: [253, 254, 255] }
        ]
    },
    {
        name: "split",
        nodes: [
            { at: 0, rgb: [0, 0, 0] },
            { at: 127, rgb: [64, 64, 255] },
            { at: 128, rgb: [0, 192, 0] },
            { at: 255, rgb: [255, 0, 0] }
        ]
    },
    {
        name: "Methanol",
        nodes: [
            { at: 0, rgb: [9, 190, 255] },
            { at: 192, rgb: [9, 190, 255] },
            { at: 200, rgb: [9, 190, 255] },
            { at: 255, rgb: [9, 190, 255] }
        ]
    },
    {
        name: "Propane",
        nodes: [
            { at: 0, rgb: [0, 0, 0] },
            { at: 140, rgb: [235, 120, 0] },
            { at: 160, rgb: [250, 180, 0] },
            { at: 190, rgb: [252, 248, 70] },
            { at: 255, rgb: [255, 255, 255] }
        ]
    },
    {
        name: "CO2",
        nodes: [
            { at: 0, rgb: [0, 0, 255] },
            { at: 192, rgb: [0, 0, 255] },
            { at: 255, rgb: [255, 255, 255] }
        ]
    },];

/** The palette of that name, falling back to the default rather than to nothing. */
export function colorbarByName(name: string): Colorbar {
    const found = COLORBARS.find(colorbar => colorbar.name === name);
    if (found) { return found; }
    return COLORBARS.find(colorbar => colorbar.name === DEFAULT_COLORBAR) ?? COLORBARS[0];
}

/**
 * The palette expanded to `COLORBAR_TEXELS` RGBA texels, ready for a RawTexture.
 *
 * A transcription of `UpdateColorbarSplits()` in SMV's `colorbars.c`, down to
 * its arithmetic, because the point of the port is that a figure from here and
 * a figure from SmokeView are the same figure. Three details carry that:
 *
 * - **Segments are half-open** and the ramp is flat outside the outermost
 *   nodes, so each index is written by exactly one segment.
 * - **A pair of nodes sharing an index is skipped, not interpolated.** That
 *   pair is how SMV spells a scale that jumps rather than blends: `FED` breaks
 *   at 26 and 85, `fire line (level set)` at 120 and 136, `fire line (wall
 *   thickness)` at 32. The segment starting on the shared index is what fills
 *   it, with the later colour. (The `split` palettes read as breaks too, but
 *   spell theirs as adjacent indices - 127 and 128 - which needs nothing
 *   special.)
 * - **The factor is single-precision, the mix is not, and the result is
 *   truncated.** Not pedantry: at exact thirds the double-precision factor
 *   lands on 170.0000000003 where the float lands on 169.9999975, and
 *   `Rainbow_orig` differs from SmokeView's own bytes in two texels if this is
 *   got wrong. The spec's golden array is what pins it.
 */
export function colorbarTexels(colorbar: Colorbar): Uint8Array {
    const texels = new Uint8Array(COLORBAR_TEXELS * 4);
    const nodes = colorbar.nodes;
    if (nodes.length === 0) { return texels; }

    const paint = (at: number, rgb: readonly number[]): void => {
        const texel = at * 4;
        texels[texel] = rgb[0];
        texels[texel + 1] = rgb[1];
        texels[texel + 2] = rgb[2];
        texels[texel + 3] = 255;
    };

    for (let at = 0; at < nodes[0].at && at < COLORBAR_TEXELS; at++) {
        paint(at, nodes[0].rgb);
    }

    for (let node = 0; node + 1 < nodes.length; node++) {
        const from = nodes[node];
        const to = nodes[node + 1];
        if (to.at === from.at) { continue; }

        for (let at = from.at; at < to.at && at < COLORBAR_TEXELS; at++) {
            const along = Math.fround(Math.fround(at - from.at) / Math.fround(to.at - from.at));
            const texel = at * 4;
            for (let channel = 0; channel < 3; channel++) {
                texels[texel + channel] = Math.trunc(
                    along * to.rgb[channel] + (1 - along) * from.rgb[channel]);
            }
            texels[texel + 3] = 255;
        }
    }

    const last = nodes[nodes.length - 1];
    for (let at = last.at; at < COLORBAR_TEXELS; at++) {
        paint(at, last.rgb);
    }

    return texels;
}
