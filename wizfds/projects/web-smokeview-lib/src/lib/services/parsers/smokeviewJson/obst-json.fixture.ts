/**
 * A Smokeview obst export, built the way SmokeView writes one.
 *
 * Shared by every spec that needs one - the file's layout is a fact about
 * upstream, not about any one test, and three hand-rolled copies of it would
 * drift apart the day SmokeView changes. Not exported from the library's public
 * API: this describes what the adapter reads, and nothing ships it.
 *
 * Faithful to `ObstLitTriangles2Geom()` and `GetBlockNodes()` in
 * `Source/smokeview/renderhtml.c`.
 */

export interface FixtureXb {
  x1: number, x2: number, y1: number, y2: number, z1: number, z2: number
}

/** The three buffers of one blockage, as they appear in `<chid>_obst.json`. */
export interface FixtureBlockage {
  vertices: number[],
  colors: number[],
  indices: number[]
}

/** Which corner each of the eight vertices of a group sits on. */
const CORNER_X = [0, 1, 1, 0, 0, 1, 1, 0];
const CORNER_Y = [0, 0, 1, 1, 0, 0, 1, 1];
const CORNER_Z = [0, 0, 0, 0, 1, 1, 1, 1];

/** The twelve triangles, as offsets into the group each face belongs to. */
const TRIANGLES = [
  0, 1, 5, 0, 5, 4,
  2, 3, 7, 2, 7, 6,
  1, 2, 6, 1, 6, 5,
  3, 0, 4, 3, 4, 7,
  4, 5, 6, 4, 6, 7,
  0, 2, 1, 0, 3, 2
];

/**
 * One blockage: the eight corners of the box written out three times over -
 * once per pair of opposite faces, so each face can carry its own normal.
 *
 * @param offset how many vertices earlier blockages already used, which is what
 *               the indices are counted from
 */
export function blockage(
  xb: FixtureXb, rgba: [number, number, number, number], offset = 0
): FixtureBlockage {
  const x = [xb.x1, xb.x2], y = [xb.y1, xb.y2], z = [xb.z1, xb.z2];

  const vertices: number[] = [];
  const colors: number[] = [];
  for (let group = 0; group < 3; group++) {
    for (let n = 0; n < 8; n++) {
      vertices.push(x[CORNER_X[n]], y[CORNER_Y[n]], z[CORNER_Z[n]]);
      colors.push(rgba[0], rgba[1], rgba[2], rgba[3]);
    }
  }

  const indices = TRIANGLES.map((corner, n) =>
    offset + (n < 12 ? 0 : n < 24 ? 8 : 16) + corner);

  return { vertices: vertices, colors: colors, indices: indices };
}

/** Several blockages in one export, as SmokeView concatenates them. */
export function exportOf(...blocks: FixtureBlockage[]): FixtureBlockage {
  return {
    vertices: blocks.flatMap(block => block.vertices),
    colors: blocks.flatMap(block => block.colors),
    indices: blocks.flatMap(block => block.indices)
  };
}

/**
 * Blockages laid out for the caller, so no spec has to count vertices.
 *
 * Each box takes the next 24-vertex slot, which is the only thing an index in
 * the file is relative to.
 */
export function exportOfBoxes(
  boxes: FixtureXb[], rgba: [number, number, number, number] = [1, 208 / 255, 0, 1]
): FixtureBlockage {
  return exportOf(...boxes.map((xb, index) => blockage(xb, rgba, index * 24)));
}
