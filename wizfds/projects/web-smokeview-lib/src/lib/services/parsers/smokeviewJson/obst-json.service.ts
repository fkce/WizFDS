import { Injectable, isDevMode } from '@angular/core';
import { SceneColor, SceneGeom, SceneInput, SceneObst, SceneXb } from '../../drawing/scene-input';

/**
 * How many vertices SmokeView writes per blockage.
 *
 * The eight corners of the box, written out three times over - once per pair of
 * opposite faces - so that each face can carry its own normal. See
 * `GetBlockNodes()` in `Source/smokeview/renderhtml.c`.
 */
const VERTICES_PER_BLOCKAGE = 24;

/** Three coordinates per vertex. */
const FLOATS_PER_BLOCKAGE = VERTICES_PER_BLOCKAGE * 3;

/** Four colour components per vertex - SmokeView writes rgba. */
const COLOR_FLOATS_PER_BLOCKAGE = VERTICES_PER_BLOCKAGE * 4;

/** Six faces, two triangles apiece, three indices per triangle. */
const INDICES_PER_BLOCKAGE = 6 * 2 * 3;

/**
 * How many different values a coordinate may take within one blockage.
 *
 * Two: a box has a minimum and a maximum on each axis, and every one of its 24
 * vertices is a copy of one or the other. Fewer for a blockage flattened onto a
 * plane. More means the buffer is not blockages, whatever its length says.
 */
const VALUES_PER_AXIS = 2;

/**
 * Drawn where the export says nothing about colour. The same amber the app uses
 * for an obst whose &SURF cannot be resolved, and opaque for the same reason -
 * so that an element the adapter could not read stays visible.
 */
const FALLBACK_COLOR: SceneColor = { r: 255 / 255, g: 208 / 255, b: 0, a: 1 };

/** An export with nothing in it, and what every scene is built out from. */
function emptyScene(): SceneInput {
  return {
    meshes: [], obsts: [], holes: [], opens: [], vents: [],
    fires: [], jetfans: [], devcs: [], geoms: []
  };
}

/** The three buffers a Smokeview export is made of, once they are known good. */
interface ExportBuffers {
  readonly vertices: number[],
  readonly colors: number[],
  readonly indices: number[]
}

/**
 * Builds what the 3D preview draws out of a Smokeview geometry export.
 *
 * The standalone viewer has no `Fds` object to hand over, so this is its half of
 * ADR-0004: the one place where a loaded file turns into the same `SceneInput`
 * the app builds from a scenario. Everything then goes through
 * `SmokeviewApiService.render()`, which is what gets the viewer the scene
 * registry, selection by `uuid` (ADR-0005) and a scene measured before it is
 * drawn - none of which the old raw-buffer path had.
 *
 * **The file.** `GET /api/loadSmv` runs `smokeview -runhtmlscript`, whose
 * `RENDERHTMLOBST` command writes `<chid>_obst.json`. `Obst2Data()` in
 * `Source/smokeview/renderhtml.c` writes exactly three arrays:
 *
 * - `vertices` - flat x, y, z triples, 24 vertices per blockage;
 * - `colors` - flat rgba, one per vertex, every vertex of a blockage the same;
 * - `indices` - flat, zero-based, 36 per blockage.
 *
 * Blockages are concatenated in order, so the file decomposes back into the
 * boxes it was written from. That is what gives each obst its own identity here
 * rather than one name for the whole model.
 *
 * **Obsts and nothing else.** Every other list of `SceneInput` comes back empty
 * because the file holds nothing else - no &MESH, no &VENT, no device. Drawing
 * those in the standalone viewer means reading the `.smv` itself, which is a
 * different source and a different change.
 *
 * **The coordinates are not metres.** SmokeView normalises the grid it reads
 * from the `.smv` file - `NORMALIZE_X(x)` is `(x - xbar0) / xyzmaxdiff` - and
 * the export carries neither `xbar0` nor `xyzmaxdiff`, so there is nothing to
 * undo it with. The scene is therefore drawn in SmokeView's own units, with its
 * longest side one unit long: the camera, the clip sliders and the edge widths
 * are all measured off the model itself and work regardless, but a coordinate
 * read off this viewer is not the metre figure ADR-0002 promises in the app.
 * Undoing it means changing what the server sends, which #106 does not.
 */
@Injectable({
  providedIn: 'root'
})
export class ObstJsonService {

  /**
   * Flatten a loaded export into the state the library renders.
   *
   * @param data whatever `JSON.parse` returned - the response is gunzipped and
   *             parsed before it gets here, and neither step promises a shape
   */
  public toScene(data: unknown): SceneInput {
    const buffers = this.readBuffers(data);
    if (!buffers) { return emptyScene(); }

    const obsts = this.blockages(buffers);
    if (obsts) { return { ...emptyScene(), obsts: obsts }; }

    // Not the file this adapter was written for. Drawn as the triangles it is
    // rather than as boxes it is not: `loadJson` opens any `.json` the file
    // tree lists, and RENDERHTMLOBST has siblings - RENDERHTMLGEOM and the
    // slice ones write the same three arrays at a different stride.
    if (isDevMode()) {
      try {
        console.warn('[ObstJsonService] The export does not decompose into blockages, ' +
          'so it is drawn as a single geometry:', buffers.vertices.length / 3, 'vertices');
      } catch { }
    }
    return { ...emptyScene(), geoms: [this.soup(buffers)] };
  }

  /**
   * The three buffers, or null when there is nothing to draw.
   *
   * Numbers are coerced the same way the app's adapter coerces them: a value
   * that is not a finite number becomes zero rather than NaN, because a single
   * NaN takes the whole scene's bounding box with it.
   *
   * The arrays are copied rather than aliased, because they go on to be the
   * `readonly` buffers of a `SceneGeom`: the contract promises the library
   * cannot write into what it was handed (ADR-0004), and that is easier to keep
   * than to prove about arrays the caller still holds.
   */
  private readBuffers(data: unknown): ExportBuffers | null {
    if (!data || typeof data !== 'object') { return null; }

    const source = data as { vertices?: unknown, colors?: unknown, indices?: unknown };
    if (!Array.isArray(source.vertices) || !Array.isArray(source.indices)) { return null; }
    if (source.vertices.length === 0 || source.indices.length === 0) { return null; }

    return {
      vertices: source.vertices.map((value: unknown) => this.asNumber(value)),
      colors: this.readColors(source.colors, source.vertices.length / 3),
      indices: source.indices.map((value: unknown) => this.asNumber(value))
    };
  }

  /**
   * The colour buffer, or an empty one when it is not rgba per vertex.
   *
   * Length is the only thing that says which stride a flat array of floats was
   * written at, and reading it at the wrong one is silent: an rgb buffer read
   * four at a time gives the first blockage the next vertex's red for its
   * alpha - drawing a solid wall see-through - and shifts every blockage after
   * it into somebody else's colour. Better to draw the fallback and be wrong
   * visibly.
   */
  private readColors(colors: unknown, vertexCount: number): number[] {
    if (!Array.isArray(colors)) { return []; }
    if (colors.length !== vertexCount * 4) {
      if (isDevMode() && colors.length > 0) {
        try {
          console.warn('[ObstJsonService] The colour buffer holds', colors.length,
            'floats for', vertexCount, 'vertices rather than', vertexCount * 4,
            '- drawing the export in one fallback colour.');
        } catch { }
      }
      return [];
    }

    return colors.map((value: unknown) => this.asNumber(value));
  }

  /**
   * The blockages this export was written from, or null when it holds none.
   *
   * Both the counts and the geometry have to agree: 24 vertices and 36 indices
   * apiece is a weak test that a soup can pass by coincidence, and a box drawn
   * where the file has none is worse than the triangles it really holds.
   */
  private blockages(buffers: ExportBuffers): SceneObst[] | null {
    const { vertices, colors, indices } = buffers;

    if (vertices.length % FLOATS_PER_BLOCKAGE !== 0) { return null; }
    const count = vertices.length / FLOATS_PER_BLOCKAGE;
    if (indices.length !== count * INDICES_PER_BLOCKAGE) { return null; }

    const obsts: SceneObst[] = [];
    for (let block = 0; block < count; block++) {
      const xb = this.boxAt(vertices, block * FLOATS_PER_BLOCKAGE);
      if (!xb) { return null; }

      obsts.push({
        // The export carries no identity, so the adapter is where one comes
        // from (ADR-0005). Its position in the file is the only thing there is
        // to key on, which is enough: the registry is rebuilt on every render.
        uuid: `smv-obst-${block}`,
        id: `OBST ${block + 1}`,
        xb: xb,
        color: this.colorAt(colors, block * COLOR_FLOATS_PER_BLOCKAGE),
        // Neither crosses in a Smokeview export: it is drawn geometry, and the
        // openings were cut out of it before it was written.
        surfId: '',
        permitHole: false
      });
    }

    return obsts;
  }

  /**
   * The box one blockage occupies, or null when those 24 vertices are not one.
   *
   * See VALUES_PER_AXIS: every vertex of a blockage is a copy of the box's
   * minimum or its maximum, so anything else came from somewhere else.
   *
   * Compared exactly, tolerance and all: SmokeView writes the same
   * `xminmax[0]` over and over rather than computing each vertex, and a decimal
   * literal parses to the same double every time it appears. A tolerance here
   * would only widen what counts as a box.
   */
  private boxAt(vertices: number[], start: number): SceneXb | null {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    const seen: Set<number>[] = [new Set(), new Set(), new Set()];

    for (let vertex = 0; vertex < VERTICES_PER_BLOCKAGE; vertex++) {
      for (let axis = 0; axis < 3; axis++) {
        const value = vertices[start + vertex * 3 + axis];
        seen[axis].add(value);
        if (seen[axis].size > VALUES_PER_AXIS) { return null; }
        min[axis] = Math.min(min[axis], value);
        max[axis] = Math.max(max[axis], value);
      }
    }

    return {
      x1: min[0], x2: max[0],
      y1: min[1], y2: max[1],
      z1: min[2], z2: max[2]
    };
  }

  /** The colour of one blockage, read off the first of its vertices. */
  private colorAt(colors: number[], start: number): SceneColor {
    if (start + 3 >= colors.length) { return FALLBACK_COLOR; }

    return {
      r: colors[start], g: colors[start + 1], b: colors[start + 2], a: colors[start + 3]
    };
  }

  /** The whole export as one triangle mesh, for a file that is not blockages. */
  private soup(buffers: ExportBuffers): SceneGeom {
    return {
      uuid: 'smv-geom-0',
      id: 'Smokeview export',
      xb: this.boundsOf(buffers.vertices),
      vertices: buffers.vertices,
      faces: buffers.indices,
      // A geom carries one colour for the whole mesh, so per-vertex colours
      // cannot survive the fallback; the first one is closer than nothing.
      color: this.colorAt(buffers.colors, 0)
    };
  }

  /** The box a flat position buffer occupies. */
  private boundsOf(vertices: readonly number[]): SceneXb {
    let xMin = Infinity, yMin = Infinity, zMin = Infinity;
    let xMax = -Infinity, yMax = -Infinity, zMax = -Infinity;

    for (let i = 0; i + 2 < vertices.length; i += 3) {
      xMin = Math.min(xMin, vertices[i]); xMax = Math.max(xMax, vertices[i]);
      yMin = Math.min(yMin, vertices[i + 1]); yMax = Math.max(yMax, vertices[i + 1]);
      zMin = Math.min(zMin, vertices[i + 2]); zMax = Math.max(zMax, vertices[i + 2]);
    }

    if (xMin === Infinity) { return { x1: 0, x2: 0, y1: 0, y2: 0, z1: 0, z2: 0 }; }
    return { x1: xMin, x2: xMax, y1: yMin, y2: yMax, z1: zMin, z2: zMax };
  }

  /** One number, as the contract promises. See readBuffers(). */
  private asNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
