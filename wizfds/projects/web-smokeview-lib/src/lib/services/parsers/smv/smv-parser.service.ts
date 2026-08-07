import { Injectable } from '@angular/core';
import {
  SceneColor, SceneDevc, SceneDevcExtent, SceneDevcMarker, SceneInput, SceneMesh,
  SceneObst, SceneOpen, SceneVent, SceneXb
} from '../../drawing/scene-input';
import { SmvFile, SmvMeshGrid, SmvResultFile } from './smv-file';

/**
 * Reads the `.smv` master file FDS writes, straight in the browser (ADR-0016).
 *
 * The format truth is `WRITE_SMOKEVIEW_FILE` in FDS's `dump.f90` - a flat
 * stream of keyword lines, each followed by a known shape of data lines. This
 * parser walks that stream once and produces two things: the geometry as a
 * `SceneInput` in FDS metres (ADR-0002, which the retired JSON export could
 * not honour), and the catalog of result files Phase 6 reads (#89, #148).
 *
 * What it deliberately skips it skips silently - SmokeView's own reader does
 * the same, and an `.smv` is full of tokens a viewer of our scope never needs
 * (CSVF, VENTORIG, HVAC...). A GEOM entry points at a separate binary file, so
 * immersed geometry stays out until that reader exists (Phase 6).
 */
@Injectable({
  providedIn: 'root'
})
export class SmvParserService {

  public parse(text: string): SmvFile {
    return new SmvWalk(text.split('\n').map(line => line.replace(/\r$/, ''))).run();
  }
}

/** One surface definition, as far as drawing cares: its name and colour. */
interface SmvSurface {
  readonly id: string,
  readonly color: SceneColor
}

/** What GRID starts and PDIM/TRN* fill in, per mesh, in file order. */
interface MeshUnderConstruction {
  name: string,
  ibar: number, jbar: number, kbar: number,
  x: number[], y: number[], z: number[]
}

/**
 * One pass over the lines. A class rather than closures so the token handlers
 * can share the cursor and the accumulating lists without threading them
 * through every call.
 */
class SmvWalk {

  private at = 0;

  private chid = '';
  private title = '';
  /** In file order; an OBST/VENT surf index points into this list. */
  private readonly surfaces: SmvSurface[] = [];
  private readonly meshes: MeshUnderConstruction[] = [];

  private readonly sceneMeshes: SceneMesh[] = [];
  private readonly obsts: SceneObst[] = [];
  private readonly vents: SceneVent[] = [];
  private readonly opens: SceneOpen[] = [];
  private readonly devcs: SceneDevc[] = [];
  private readonly results: SmvResultFile[] = [];

  constructor(private readonly lines: string[]) { }

  public run(): SmvFile {
    while (this.at < this.lines.length) {
      const line = this.lines[this.at];
      this.at++;

      if (/^TITLE\b/.test(line)) { this.title = this.next().trim(); continue; }
      if (/^CHID\b/.test(line)) { this.chid = this.next().trim(); continue; }
      if (/^SURFACE\b/.test(line)) { this.readSurface(); continue; }
      if (/^DEVICE\b/.test(line)) { this.readDevice(); continue; }
      if (/^GRID\b/.test(line)) { this.readGrid(line); continue; }
      if (/^PDIM\b/.test(line)) { this.readPdim(); continue; }
      if (/^TRN([XYZ])\b/.test(line)) { this.readTrn(line); continue; }
      if (/^OBST\b/.test(line)) { this.readObsts(); continue; }
      if (/^VENT\b/.test(line)) { this.readVents(); continue; }
      if (/^(SLCF|SLCC)\b/.test(line)) { this.readSlice(line); continue; }
      if (/^(BNDF|BNDC)\b/.test(line)) { this.readBoundary(line); continue; }
      if (/^PRT5\b/.test(line)) { this.readParticles(line); continue; }
      if (/^(SMOKF3D|SMOKG3D)\b/.test(line)) { this.readSmoke(line); continue; }
      if (/^(ISOG|TISOG)\b/.test(line)) { this.readIso(line); continue; }
      // Every other token: not ours. The shapes are self-delimiting enough
      // that skipping just the keyword line is safe - data lines never match
      // the ^KEYWORD tests above, because FDS indents them.
    }

    const scene: SceneInput = {
      meshes: this.sceneMeshes, obsts: this.obsts, holes: [], opens: this.opens,
      vents: this.vents, fires: [], jetfans: [], devcs: this.devcs,
      geoms: [], inits: [], zones: []
    };
    return {
      chid: this.chid, title: this.title, scene: scene,
      grids: this.meshes.map((mesh, index): SmvMeshGrid => ({
        meshIndex: index + 1, x: mesh.x, y: mesh.y, z: mesh.z
      })),
      results: this.results
    };
  }

  private next(): string {
    return this.lines[this.at++] ?? '';
  }

  /** Whitespace-separated numbers of a line, up to a `!` if one is there. */
  private numbers(line: string): number[] {
    const data = line.split('!')[0];
    return data.split(/\s+/).filter(token => token.length > 0).map(Number);
  }

  // SURFACE: id / TMPM+emissivity / type, texture w+h, rgb, transparency / texture map
  private readSurface(): void {
    const id = this.next().trim();
    this.next();
    const style = this.numbers(this.next());
    this.next();
    this.surfaces.push({
      id: id,
      color: { r: style[3], g: style[4], b: style[5], a: style[6] }
    });
  }

  // DEVICE: "id % quantity" / x y z nx ny nz state 0 [ # xb ] [ % prop ]
  private readDevice(): void {
    const head = this.next().split('%');
    const id = head[0].trim();
    const quantity = (head[1] ?? '').trim();

    const body = this.next().split('%')[0];
    const parts = body.split('#');
    const position = this.numbers(parts[0]);
    const xb = parts.length > 1 ? this.numbers(parts[1]) : null;

    const box: SceneXb = xb
      ? { x1: xb[0], y1: xb[1], z1: xb[2], x2: xb[3], y2: xb[4], z2: xb[5] }
      : {
        x1: position[0], x2: position[0], y1: position[1], y2: position[1],
        z1: position[2], z2: position[2]
      };

    this.devcs.push({
      uuid: `smv:devc:${this.devcs.length + 1}`, id: id, xb: box,
      color: DEVC_COLOR, extent: extentOf(box), marker: markerFor(quantity)
    });
  }

  // GRID <name> / ibar jbar kbar ...
  private readGrid(line: string): void {
    const bars = this.numbers(this.next());
    this.meshes.push({
      name: line.replace(/^GRID/, '').trim(),
      ibar: bars[0], jbar: bars[1], kbar: bars[2], x: [], y: [], z: []
    });
  }

  // PDIM: xs xf ys yf zs zf r g b - the metres the JSON export dropped
  private readPdim(): void {
    const mesh = this.meshes[this.meshes.length - 1];
    const dims = this.numbers(this.next());
    this.sceneMeshes.push({
      uuid: `smv:mesh:${this.meshes.length}`, id: mesh.name,
      xb: { x1: dims[0], x2: dims[1], y1: dims[2], y2: dims[3], z1: dims[4], z2: dims[5] },
      cell: {
        i: (dims[1] - dims[0]) / mesh.ibar,
        j: (dims[3] - dims[2]) / mesh.jbar,
        k: (dims[5] - dims[4]) / mesh.kbar
      }
    });
  }

  // TRNX: noc / noc stretch lines / bar+1 lines of "index coordinate"
  private readTrn(line: string): void {
    const mesh = this.meshes[this.meshes.length - 1];
    const axis = line[3] === 'X' ? 'x' : line[3] === 'Y' ? 'y' : 'z';
    const bar = axis === 'x' ? mesh.ibar : axis === 'y' ? mesh.jbar : mesh.kbar;

    const stretches = this.numbers(this.next())[0];
    for (let i = 0; i < stretches; i++) this.next();

    const planes: number[] = [];
    for (let i = 0; i <= bar; i++) planes.push(this.numbers(this.next())[1]);
    mesh[axis] = planes;
  }

  // OBST: n / n lines of xb + ordinal + 6 surf indices ! label
  //           / n lines of cells + colour indicator + type [rgba] ! flags
  private readObsts(): void {
    const count = this.numbers(this.next())[0];

    const boxes: { xb: SceneXb, label: string, faceSurfs: number[] }[] = [];
    for (let i = 0; i < count; i++) {
      const line = this.next();
      const values = this.numbers(line);
      boxes.push({
        xb: { x1: values[0], x2: values[1], y1: values[2], y2: values[3], z1: values[4], z2: values[5] },
        label: (line.split('!')[1] ?? '').trim(),
        faceSurfs: values.slice(7, 13)
      });
    }

    for (let i = 0; i < count; i++) {
      const values = this.numbers(this.next());
      const box = boxes[i];

      // -3 says the obst was painted over - COLOR on the &OBST itself - and
      // carries its own rgba; anything else colours from the faces' surface
      const painted = values[6] === -3;
      const surf = this.oneSurfaceOf(box.faceSurfs);
      const color: SceneColor = painted
        ? { r: values[8], g: values[9], b: values[10], a: values[11] }
        : (surf ?? this.surfaces[box.faceSurfs[0]])?.color ?? FALLBACK_COLOR;

      this.obsts.push({
        uuid: `smv:obst:${this.obsts.length + 1}`, id: box.label, xb: box.xb,
        color: color, surfId: !painted && surf ? surf.id : '',
        permitHole: true
      });
    }
  }

  /** The one surface all six faces name, if they agree on one. */
  private oneSurfaceOf(faceSurfs: number[]): SmvSurface | undefined {
    const first = faceSurfs[0];
    if (faceSurfs.some(index => index !== first)) return undefined;
    return this.surfaces[first];
  }

  // VENT: total npatch / total xb lines / total index lines. The last npatch
  // entries are the dummies FDS appends to fill the mesh boundary around the
  // real vents - wall paint, not scenario elements - and are dropped.
  private readVents(): void {
    const counts = this.numbers(this.next());
    const total = counts[0];
    const real = total - counts[1];

    const boxes: SceneXb[] = [];
    const surfs: number[] = [];
    for (let i = 0; i < total; i++) {
      const values = this.numbers(this.next());
      boxes.push({ x1: values[0], x2: values[1], y1: values[2], y2: values[3], z1: values[4], z2: values[5] });
      surfs.push(values[7]);
    }

    for (let i = 0; i < total; i++) {
      const values = this.numbers(this.next());
      if (i >= real) continue;

      const colorIndex = values[6];
      // An OPEN or MIRROR boundary is written with its indicator negated
      if (colorIndex < 0) {
        this.opens.push({ uuid: `smv:open:${this.opens.length + 1}`, id: '', xb: boxes[i] });
        continue;
      }
      // A vent the model says not to draw crosses as a dummy: type -2
      if (values[7] === -2) continue;

      const color: SceneColor = values.length >= 12
        ? { r: values[8], g: values[9], b: values[10], a: values[11] }
        : this.surfaces[surfs[i]]?.color ?? FALLBACK_COLOR;
      this.vents.push({ uuid: `smv:vent:${this.vents.length + 1}`, id: '', xb: boxes[i], color: color });
    }
  }

  // SLCF nm # STRUCTURED [%id] & i1 i2 j1 j2 k1 k2 ! index cc ior
  //  / filename / long label / short label / unit
  private readSlice(line: string): void {
    const head = line.match(/^(SLCF|SLCC)\s+(\d+).*&((?:\s+-?\d+){6})\s*!\s*(-?\d+)\s+(-?\d+)\s+(-?\d+)/);
    const filename = this.next().trim();
    const longLabel = this.next().trim();
    const shortLabel = this.next().trim();
    const unit = this.next().trim();
    if (!head) return;

    const bounds = head[3].trim().split(/\s+/).map(Number);
    this.results.push({
      kind: 'slcf', meshIndex: Number(head[2]), filename: filename,
      longLabel: longLabel, shortLabel: shortLabel, unit: unit,
      cellCentered: head[1] === 'SLCC',
      bounds: { i1: bounds[0], i2: bounds[1], j1: bounds[2], j2: bounds[3], k1: bounds[4], k2: bounds[5] },
      ior: Number(head[6])
    });
  }

  // BNDF nm 1 / filename / long label / short label / unit
  private readBoundary(line: string): void {
    const head = this.numbers(line.replace(/^(BNDF|BNDC)/, ''));
    this.results.push({
      kind: 'bndf', meshIndex: head[0], filename: this.next().trim(),
      longLabel: this.next().trim(), shortLabel: this.next().trim(), unit: this.next().trim(),
      cellCentered: /^BNDC/.test(line)
    });
  }

  // PRT5 nm / filename / n classes / n class-index lines. The classes' labels
  // live under CLASS_OF_PARTICLES; the catalog only needs the file.
  private readParticles(line: string): void {
    const meshIndex = this.numbers(line.replace(/^PRT5/, ''))[0];
    const filename = this.next().trim();
    const classes = this.numbers(this.next())[0];
    for (let i = 0; i < classes; i++) this.next();
    this.results.push({
      kind: 'prt5', meshIndex: meshIndex, filename: filename,
      longLabel: '', shortLabel: '', unit: '', cellCentered: false
    });
  }

  // SMOKF3D nm coefficient / filename / long label / short label / unit
  private readSmoke(line: string): void {
    const head = this.numbers(line.replace(/^(SMOKF3D|SMOKG3D)/, ''));
    this.results.push({
      kind: 'smoke3d', meshIndex: head[0], filename: this.next().trim(),
      longLabel: this.next().trim(), shortLabel: this.next().trim(), unit: this.next().trim(),
      cellCentered: false, extinctionCoefficient: head[1]
    });
  }

  // ISOG nm skip delta / filename [/ data filename] / labels; TISOG carries a
  // second file and a second label triple for the quantity draped on it.
  private readIso(line: string): void {
    const textured = /^TISOG/.test(line);
    const head = this.numbers(line.replace(/^T?ISOG/, ''));
    const filename = this.next().trim();
    if (textured) this.next();
    const longLabel = this.next().trim();
    const shortLabel = this.next().trim();
    const unit = this.next().trim();
    if (textured) { this.next(); this.next(); this.next(); }
    this.results.push({
      kind: 'isof', meshIndex: head[0], filename: filename,
      longLabel: longLabel, shortLabel: shortLabel, unit: unit, cellCentered: false
    });
  }
}

/** How much of the box a device actually spans. */
function extentOf(xb: SceneXb): SceneDevcExtent {
  const spans = [xb.x2 - xb.x1, xb.y2 - xb.y1, xb.z2 - xb.z1].filter(span => span > 0).length;
  return spans === 0 ? 'point' : spans === 1 ? 'linear' : spans === 2 ? 'plane' : 'volume';
}

/**
 * The marker shape, worked out from what the device measures - the same
 * fallback the app uses when no `SMOKEVIEW_ID` names one (ADR-0008).
 */
function markerFor(quantity: string): SceneDevcMarker {
  const upper = quantity.toUpperCase();
  if (upper.includes('OBSCURATION') || upper.includes('SMOKE')) return 'smoke detector';
  if (upper.includes('SPRINKLER') || upper.includes('LINK')) return 'sprinkler';
  if (upper.includes('NOZZLE')) return 'nozzle';
  return 'sensor';
}

/** A &DEVC has no colour in FDS; the parser picks the app's device blue. */
const DEVC_COLOR: SceneColor = { r: 0.23, g: 0.51, b: 0.96, a: 1 };

/** For an obst or vent whose surface index points outside the SURFACE list. */
const FALLBACK_COLOR: SceneColor = { r: 0.8, g: 0.8, b: 0.8, a: 1 };
