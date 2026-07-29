import { TestBed } from '@angular/core/testing';

import { ObstJsonService } from './obst-json.service';
import { SceneObst } from '../../drawing/scene-input';

/**
 * The buffers SmokeView writes for one blockage, in its own order.
 *
 * Faithful to `ObstLitTriangles2Geom()` / `GetBlockNodes()` in
 * `Source/smokeview/renderhtml.c`: the eight corners of the box, written out
 * three times over - once per pair of opposite faces - so that each face can
 * carry its own normal. Twelve triangles index into them.
 */
function blockage(
  xb: { x1: number, x2: number, y1: number, y2: number, z1: number, z2: number },
  rgba: [number, number, number, number],
  offset = 0
): { vertices: number[], colors: number[], indices: number[] } {
  const ii = [0, 1, 1, 0, 0, 1, 1, 0];
  const jj = [0, 0, 1, 1, 0, 0, 1, 1];
  const kk = [0, 0, 0, 0, 1, 1, 1, 1];
  const x = [xb.x1, xb.x2], y = [xb.y1, xb.y2], z = [xb.z1, xb.z2];

  const vertices: number[] = [];
  const colors: number[] = [];
  for (let group = 0; group < 3; group++) {
    for (let n = 0; n < 8; n++) {
      vertices.push(x[ii[n]], y[jj[n]], z[kk[n]]);
      colors.push(rgba[0], rgba[1], rgba[2], rgba[3]);
    }
  }

  const corners = [
    0, 1, 5, 0, 5, 4,
    2, 3, 7, 2, 7, 6,
    1, 2, 6, 1, 6, 5,
    3, 0, 4, 3, 4, 7,
    4, 5, 6, 4, 6, 7,
    0, 2, 1, 0, 3, 2
  ];
  const indices = corners.map((corner, n) => {
    const face = n < 12 ? 0 : n < 24 ? 8 : 16;
    return offset + face + corner;
  });

  return { vertices: vertices, colors: colors, indices: indices };
}

/** Several blockages in one export, as SmokeView concatenates them. */
function exportOf(...blocks: ReturnType<typeof blockage>[]) {
  return {
    vertices: blocks.flatMap(block => block.vertices),
    colors: blocks.flatMap(block => block.colors),
    indices: blocks.flatMap(block => block.indices)
  };
}

const ROOM = { x1: 0, x2: 4, y1: 0, y2: 0.2, z1: 0, z2: 3 };
const RED: [number, number, number, number] = [1, 0, 0, 1];
const BLUE: [number, number, number, number] = [0, 0, 1, 0.5];

describe('ObstJsonService', () => {
  let service: ObstJsonService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ObstJsonService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('a Smokeview obst export', () => {
    // What `smokeview -runhtmlscript` writes for RENDERHTMLOBST: one blockage
    // per 24 vertices, 36 indices and 96 colour floats - see the service.

    it('gives back one obst per blockage', () => {
      const scene = service.toScene(exportOf(
        blockage(ROOM, RED),
        blockage({ x1: 1, x2: 2, y1: 1, y2: 2, z1: 0, z2: 2.5 }, BLUE, 24)
      ));

      expect(scene.obsts.length).toBe(2);
    });

    it('reads each blockage back as the box it was written from', () => {
      const scene = service.toScene(exportOf(blockage(ROOM, RED)));

      expect(scene.obsts[0].xb).toEqual(ROOM);
    });

    it('takes an obst colour off its own vertices', () => {
      const scene = service.toScene(exportOf(
        blockage(ROOM, RED),
        blockage({ x1: 1, x2: 2, y1: 1, y2: 2, z1: 0, z2: 2.5 }, BLUE, 24)
      ));

      expect(scene.obsts[0].color).toEqual({ r: 1, g: 0, b: 0, a: 1 });
      expect(scene.obsts[1].color).toEqual({ r: 0, g: 0, b: 1, a: 0.5 });
    });

    it('gives every obst a uuid of its own, so it can be selected', () => {
      // ADR-0005: uuid is what identifies an element everywhere in the system.
      // The export carries none, so the adapter is where they come from.
      const scene = service.toScene(exportOf(
        blockage(ROOM, RED),
        blockage({ x1: 1, x2: 2, y1: 1, y2: 2, z1: 0, z2: 2.5 }, BLUE, 24)
      ));

      const uuids = scene.obsts.map((obst: SceneObst) => obst.uuid);
      expect(uuids[0]).toBeTruthy();
      expect(uuids[1]).toBeTruthy();
      expect(uuids[0]).not.toBe(uuids[1]);
    });

    it('gives every obst a name the user can tell apart', () => {
      const scene = service.toScene(exportOf(
        blockage(ROOM, RED),
        blockage({ x1: 1, x2: 2, y1: 1, y2: 2, z1: 0, z2: 2.5 }, BLUE, 24)
      ));

      expect(scene.obsts[0].id).toBe('OBST 1');
      expect(scene.obsts[1].id).toBe('OBST 2');
    });

    it('names no &SURF and forbids holes - the export carries neither', () => {
      const scene = service.toScene(exportOf(blockage(ROOM, RED)));

      expect(scene.obsts[0].surfId).toBe('');
      expect(scene.obsts[0].permitHole).toBe(false);
    });

    it('leaves every other element type empty', () => {
      // A Smokeview obst export is blockages and nothing else: no &MESH, no
      // &VENT, no devices. Saying so is what lets render() draw it whole.
      const scene = service.toScene(exportOf(blockage(ROOM, RED)));

      expect(scene.meshes).toEqual([]);
      expect(scene.holes).toEqual([]);
      expect(scene.opens).toEqual([]);
      expect(scene.vents).toEqual([]);
      expect(scene.fires).toEqual([]);
      expect(scene.jetfans).toEqual([]);
      expect(scene.devcs).toEqual([]);
      expect(scene.geoms).toEqual([]);
    });

    it('reads a blockage flattened onto a plane', () => {
      // A thin plate is still written as 24 vertices; two of its six faces have
      // no extent at all.
      const plate = { x1: 0, x2: 4, y1: 1, y2: 1, z1: 0, z2: 3 };

      const scene = service.toScene(exportOf(blockage(plate, RED)));

      expect(scene.obsts.length).toBe(1);
      expect(scene.obsts[0].xb).toEqual(plate);
    });

    it('draws a blockage whose colours are missing rather than dropping it', () => {
      const data = exportOf(blockage(ROOM, RED));
      data.colors = [];

      const scene = service.toScene(data);

      expect(scene.obsts.length).toBe(1);
      expect(scene.obsts[0].color.a).toBe(1);
    });
  });

  describe('anything else', () => {
    // The viewer loads whatever file it is pointed at, and `loadJson` will
    // happily hand over a Smokeview export of some other kind.

    it('falls back on a single geom when the buffer is not blockages', () => {
      // Three vertices and one triangle: a soup that cannot be boxes.
      const scene = service.toScene({
        vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0],
        colors: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        indices: [0, 1, 2]
      });

      expect(scene.obsts).toEqual([]);
      expect(scene.geoms.length).toBe(1);
      expect(scene.geoms[0].vertices).toEqual([0, 0, 0, 1, 0, 0, 1, 1, 0]);
      expect(scene.geoms[0].faces).toEqual([0, 1, 2]);
    });

    it('measures the box a fallback geom occupies, so the scene can be sized', () => {
      const scene = service.toScene({
        vertices: [0, 0, 0, 1, 0, 0, 1, 2, -3],
        colors: [],
        indices: [0, 1, 2]
      });

      expect(scene.geoms[0].xb).toEqual({ x1: 0, x2: 1, y1: 0, y2: 2, z1: -3, z2: 0 });
    });

    it('gives the fallback geom a uuid too', () => {
      const scene = service.toScene({
        vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0],
        colors: [],
        indices: [0, 1, 2]
      });

      expect(scene.geoms[0].uuid).toBeTruthy();
    });

    it('falls back when the vertices divide into blockages but are not boxes', () => {
      // 24 vertices and 36 indices, but no two of them share a coordinate -
      // counting alone would have called this a blockage and drawn a box that
      // is not in the file.
      const vertices: number[] = [];
      for (let i = 0; i < 24; i++) { vertices.push(i, i * 2, i * 3); }

      const scene = service.toScene({
        vertices: vertices,
        colors: new Array(96).fill(1),
        indices: new Array(36).fill(0).map((_, i) => i % 24)
      });

      expect(scene.obsts).toEqual([]);
      expect(scene.geoms.length).toBe(1);
    });

    it('falls back when there are more triangles than blockages account for', () => {
      const data = exportOf(blockage(ROOM, RED));
      data.indices = [...data.indices, 0, 1, 2];

      const scene = service.toScene(data);

      expect(scene.obsts).toEqual([]);
      expect(scene.geoms.length).toBe(1);
    });
  });

  describe('nothing to draw', () => {
    // The response is gunzipped and JSON.parsed before it reaches here, and
    // neither step promises what came out - see GeometryLoaderService.

    it('gives back an empty scene for an empty export', () => {
      const scene = service.toScene({ vertices: [], colors: [], indices: [] });

      expect(scene.obsts).toEqual([]);
      expect(scene.geoms).toEqual([]);
    });

    it('gives back an empty scene rather than throwing on rubbish', () => {
      [null, undefined, 42, 'obsts', {}, { vertices: 'no' }, { indices: [0, 1, 2] }]
        .forEach((rubbish: unknown) => {
          const scene = service.toScene(rubbish);

          expect(scene.obsts).withContext(JSON.stringify(rubbish)).toEqual([]);
          expect(scene.geoms).withContext(JSON.stringify(rubbish)).toEqual([]);
        });
    });

    it('copies the buffers it was handed, so the caller keeps its own', () => {
      // The drawing services empty their buffers in place on the next render,
      // which would otherwise truncate what the loader parsed.
      const data = {
        vertices: [0, 0, 0, 1, 0, 0, 1, 1, 0],
        colors: [],
        indices: [0, 1, 2]
      };

      const scene = service.toScene(data);

      expect(scene.geoms[0].vertices).not.toBe(data.vertices);
      expect(scene.geoms[0].faces).not.toBe(data.indices);
    });
  });
});
