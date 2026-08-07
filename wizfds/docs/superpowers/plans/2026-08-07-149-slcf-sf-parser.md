# Plan implementacji #149: parser `.sf` + prawdziwy shader WGSL dla slice'ów

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Slice'y (SLCF) czytane z binarnych `.sf` w przeglądarce i renderowane przez poprawny shader WGSL — z blank cullingiem, w metrach, ładowane grupami wielkości z katalogu wyników.

**Architecture:** Czysty parser `.sf` (`services/parsers/sf/`) → `SliceService` orkiestruje ładowanie grupy (odczyt całych plików przez `ResultsDirectory`, zakres min/max z grupy, jeden `ShaderMaterial` na grupę tworzony przed budową siatek) → klasa `Slice` trzyma mesh z atrybutami `slice_value`/`blank` i podmienia klatki przez `updateVerticesData`. Wartości jadą na GPU jako surowe `f32`; mapowanie wartość→kolor robi shader z uniformów `range_min`/`range_max` (ADR-0017). Blank liczony w TS z zakresów węzłowych OBST-ów `.smv`. Decyzje: issue #149, sekcja „Decisions".

**Tech Stack:** TypeScript (DataView, Fortran unformatted records), BabylonJS WebGPU + WGSL, Angular 20, Karma/Jasmine.

**Testy:** `npx ng test webSmokeviewLib --watch=false --browsers=ChromeHeadless` (z katalogu `wizfds/`).

**Gałąź:** `feat/149-slcf-sf-parser` od `master`. Pierwszy commit zabiera już zmodyfikowane `CONTEXT.md` + `docs/adr/0017-*.md` + ten plan.

---

## Format `.sf` (prawda: `Source/shared/readslice.c` w firemodels/smv)

Plik to ciąg rekordów Fortran unformatted: `[u32 len][payload][u32 len]` (oba markery równe długości payloadu). Kolejno:

1. rekord: long label — 30 bajtów ASCII (padding spacjami)
2. rekord: short label — 30 bajtów
3. rekord: unit — 30 bajtów
4. rekord: 6 × i32 — `i1 i2 j1 j2 k1 k2` (indeksy węzłów w siatce)
5. dalej klatki, każda to dwa rekordy:
   - rekord: 1 × f32 — czas [s]
   - rekord: `(i2-i1+1)*(j2-j1+1)*(k2-k1+1)` × f32 — wartości w porządku Fortrana (i najszybciej)

Endianness: pierwszy marker musi czytać się jako 30 (LE albo BE — sprawdzić oba, inaczej twardy błąd). Uwaga: 30-bajtowe etykiety psują 4-bajtowe wyrównanie — payloadów f32 **nie wolno** czytać przez `new Float32Array(buffer, offset, n)`; przy LE kopiować bajty do wyrównanego bufora, przy BE czytać `DataView.getFloat32`.

---

### Task 1: Typy i fixture binarny `.sf`

**Files:**
- Create: `projects/web-smokeview-lib/src/lib/services/parsers/sf/sf-file.ts`
- Create: `projects/web-smokeview-lib/src/lib/services/parsers/sf/sf.fixture.ts`

- [ ] **Step 1.1: Typy wyniku parsowania**

`sf-file.ts`:

```typescript
import { SmvSliceBounds } from '../smv/smv-file';

/**
 * One parsed `.sf` slice file - the header FDS wrote and every complete frame.
 *
 * Values stay raw f32 (ADR-0017): the value->colour mapping happens in the
 * shader against the quantity group's range, so nothing here depends on any
 * range. Frames sit in one flat array, `pointsPerFrame` apart, in the Fortran
 * order the solver wrote (i fastest, then j, then k).
 */
export interface SfFile {
    readonly longLabel: string,
    readonly shortLabel: string,
    readonly unit: string,
    /** Node-index bounds within the mesh, as the file itself states them. */
    readonly bounds: SmvSliceBounds,
    readonly pointsPerFrame: number,
    /** Simulation seconds of each complete frame, ready for #150. */
    readonly times: Float32Array,
    /** `times.length * pointsPerFrame` values; frame k starts at `k * pointsPerFrame`. */
    readonly values: Float32Array
}
```

- [ ] **Step 1.2: Budowniczy fixture'ów binarnych**

`sf.fixture.ts`:

```typescript
import { SmvSliceBounds } from '../smv/smv-file';

/** What a fixture `.sf` should contain; every field has a sane default. */
export interface SfFixtureSpec {
    longLabel?: string,
    shortLabel?: string,
    unit?: string,
    bounds?: SmvSliceBounds,
    /** One entry per frame. */
    frames?: readonly { time: number, values: readonly number[] }[],
    littleEndian?: boolean,
    /** Cut this many bytes off the end, to fake a killed solver. */
    truncateBytes?: number
}

/**
 * A `.sf` built byte-by-byte the way `dump.f90` writes one: Fortran
 * unformatted records ([u32 len][payload][u32 len]), 30-byte space-padded
 * labels, then (time, data) record pairs per frame.
 */
export function sfFixture(spec: SfFixtureSpec = {}): ArrayBuffer {
    const le = spec.littleEndian ?? true;
    const bounds = spec.bounds ?? { i1: 0, i2: 4, j1: 1, j2: 1, k1: 0, k2: 2 };
    const points = (bounds.i2 - bounds.i1 + 1) * (bounds.j2 - bounds.j1 + 1) * (bounds.k2 - bounds.k1 + 1);
    const frames = spec.frames ?? [
        { time: 0, values: Array.from({ length: points }, (_, at) => at) },
        { time: 1, values: Array.from({ length: points }, (_, at) => at + 100) }
    ];

    const records: Uint8Array[] = [
        label(spec.longLabel ?? 'TEMPERATURE'),
        label(spec.shortLabel ?? 'temp'),
        label(spec.unit ?? 'C'),
        ints([bounds.i1, bounds.i2, bounds.j1, bounds.j2, bounds.k1, bounds.k2], le)
    ];
    for (const frame of frames) {
        records.push(floats([frame.time], le));
        records.push(floats([...frame.values], le));
    }

    const framed = records.map(payload => record(payload, le));
    const total = framed.reduce((sum, part) => sum + part.length, 0) - (spec.truncateBytes ?? 0);
    const out = new Uint8Array(total);
    let at = 0;
    for (const part of framed) {
        const take = Math.min(part.length, total - at);
        if (take <= 0) break;
        out.set(part.subarray(0, take), at);
        at += take;
    }
    return out.buffer;
}

function label(text: string): Uint8Array {
    const bytes = new Uint8Array(30).fill(0x20);
    for (let at = 0; at < Math.min(text.length, 30); at++) bytes[at] = text.charCodeAt(at);
    return bytes;
}

function ints(values: number[], le: boolean): Uint8Array {
    const bytes = new Uint8Array(values.length * 4);
    const view = new DataView(bytes.buffer);
    values.forEach((value, at) => view.setInt32(at * 4, value, le));
    return bytes;
}

function floats(values: number[], le: boolean): Uint8Array {
    const bytes = new Uint8Array(values.length * 4);
    const view = new DataView(bytes.buffer);
    values.forEach((value, at) => view.setFloat32(at * 4, value, le));
    return bytes;
}

function record(payload: Uint8Array, le: boolean): Uint8Array {
    const bytes = new Uint8Array(payload.length + 8);
    const view = new DataView(bytes.buffer);
    view.setUint32(0, payload.length, le);
    bytes.set(payload, 4);
    view.setUint32(payload.length + 4, payload.length, le);
    return bytes;
}
```

- [ ] **Step 1.3: Commit**

```bash
git add projects/web-smokeview-lib/src/lib/services/parsers/sf/
git commit -m "feat(results): .sf slice file types and a binary fixture builder (#149)"
```

---

### Task 2: Parser `.sf` (TDD)

**Files:**
- Create: `projects/web-smokeview-lib/src/lib/services/parsers/sf/sf-parser.spec.ts`
- Create: `projects/web-smokeview-lib/src/lib/services/parsers/sf/sf-parser.ts`

- [ ] **Step 2.1: Failing spec**

`sf-parser.spec.ts`:

```typescript
import { parseSf } from './sf-parser';
import { sfFixture } from './sf.fixture';

describe('parseSf', () => {

  it('reads the header labels, trimmed of their padding', () => {
    const sf = parseSf(sfFixture({ longLabel: 'TEMPERATURE', shortLabel: 'temp', unit: 'C' }));
    expect(sf.longLabel).toBe('TEMPERATURE');
    expect(sf.shortLabel).toBe('temp');
    expect(sf.unit).toBe('C');
  });

  it('reads the node bounds and sizes a frame from them', () => {
    const sf = parseSf(sfFixture({ bounds: { i1: 0, i2: 4, j1: 1, j2: 1, k1: 0, k2: 2 } }));
    expect(sf.bounds).toEqual({ i1: 0, i2: 4, j1: 1, j2: 1, k1: 0, k2: 2 });
    expect(sf.pointsPerFrame).toBe(5 * 1 * 3);
  });

  it('reads every complete frame with its time', () => {
    const sf = parseSf(sfFixture({
      bounds: { i1: 0, i2: 1, j1: 0, j2: 0, k1: 0, k2: 1 },
      frames: [
        { time: 0.0, values: [1, 2, 3, 4] },
        { time: 2.5, values: [5, 6, 7, 8] }
      ]
    }));
    expect(Array.from(sf.times)).toEqual([0.0, 2.5]);
    expect(Array.from(sf.values)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('reads a big-endian file the same way', () => {
    const sf = parseSf(sfFixture({
      littleEndian: false,
      bounds: { i1: 0, i2: 1, j1: 0, j2: 0, k1: 0, k2: 0 },
      frames: [{ time: 1.5, values: [10, 20] }]
    }));
    expect(Array.from(sf.times)).toEqual([1.5]);
    expect(Array.from(sf.values)).toEqual([10, 20]);
  });

  it('drops a truncated final frame instead of failing', () => {
    const sf = parseSf(sfFixture({
      bounds: { i1: 0, i2: 1, j1: 0, j2: 0, k1: 0, k2: 0 },
      frames: [
        { time: 0, values: [1, 2] },
        { time: 1, values: [3, 4] }
      ],
      truncateBytes: 5
    }));
    expect(Array.from(sf.times)).toEqual([0]);
    expect(Array.from(sf.values)).toEqual([1, 2]);
  });

  it('refuses bytes that are not a .sf at all', () => {
    const junk = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;
    expect(() => parseSf(junk)).toThrowError(/\.sf/);
  });

  it('refuses a file too short for its own header', () => {
    const whole = sfFixture({ frames: [] });
    const cut = whole.slice(0, 40);
    expect(() => parseSf(cut)).toThrowError();
  });
});
```

- [ ] **Step 2.2: Uruchom spec — ma się wywalić** (brak `sf-parser.ts`)

Run: `npx ng test webSmokeviewLib --watch=false --browsers=ChromeHeadless`
Expected: FAIL (cannot resolve `./sf-parser`)

- [ ] **Step 2.3: Implementacja**

`sf-parser.ts`:

```typescript
import { SfFile } from './sf-file';

/**
 * Read one `.sf` slice file (ADR-0016) - Fortran unformatted records, per
 * `readslice.c` in firemodels/smv: three 30-byte labels, the node bounds,
 * then (time, data) record pairs until the file ends.
 *
 * A pure function, deliberately free of Angular and Babylon: the whole file
 * is already in memory (#149 reads it in one go), and everything it returns
 * is plain data a spec can assert on.
 *
 * The byte order is whatever machine ran the solver. The first record is a
 * 30-byte label, so the first marker read as the wrong endianness is
 * 0x1E000000 rather than 0x0000001E - which is how the right one is found,
 * and how bytes that are no `.sf` at all are refused.
 */
export function parseSf(buffer: ArrayBuffer): SfFile {
    const view = new DataView(buffer);
    if (buffer.byteLength < 4) throw new Error('not a .sf file: shorter than one record marker');

    let littleEndian: boolean;
    if (view.getUint32(0, true) === 30) littleEndian = true;
    else if (view.getUint32(0, false) === 30) littleEndian = false;
    else throw new Error('not a .sf file: the first record is not a 30-byte label');

    const walk = new RecordWalk(view, littleEndian);
    const longLabel = asciiOf(walk.demand(30));
    const shortLabel = asciiOf(walk.demand(30));
    const unit = asciiOf(walk.demand(30));

    const boundsBytes = walk.demand(24);
    const bounds = {
        i1: boundsBytes.getInt32(0), i2: boundsBytes.getInt32(4),
        j1: boundsBytes.getInt32(8), j2: boundsBytes.getInt32(12),
        k1: boundsBytes.getInt32(16), k2: boundsBytes.getInt32(20)
    };
    const readInt = (offset: number) => view.getInt32(boundsBytes.byteOffset + offset, littleEndian);
    const nodeBounds = {
        i1: readInt(0), i2: readInt(4), j1: readInt(8), j2: readInt(12), k1: readInt(16), k2: readInt(20)
    };
    const pointsPerFrame =
        (nodeBounds.i2 - nodeBounds.i1 + 1) *
        (nodeBounds.j2 - nodeBounds.j1 + 1) *
        (nodeBounds.k2 - nodeBounds.k1 + 1);

    // Frames until the bytes run out. A killed solver routinely leaves half a
    // frame at the end; an incomplete (time, data) pair is dropped whole.
    const times: number[] = [];
    const frames: DataView[] = [];
    for (; ;) {
        const time = walk.tryNext(4);
        if (time === null) break;
        const data = walk.tryNext(pointsPerFrame * 4);
        if (data === null) break;
        times.push(time.getFloat32(0, littleEndian));
        frames.push(data);
    }

    const values = new Float32Array(frames.length * pointsPerFrame);
    frames.forEach((frame, frameAt) => {
        if (littleEndian) {
            // Typed arrays are little-endian on every platform we run on, so a
            // LE file is a straight byte copy - the payload is not 4-aligned
            // (30-byte labels), which rules out a Float32Array view instead.
            new Uint8Array(values.buffer, frameAt * pointsPerFrame * 4, pointsPerFrame * 4)
                .set(new Uint8Array(frame.buffer, frame.byteOffset, frame.byteLength));
        } else {
            for (let at = 0; at < pointsPerFrame; at++) {
                values[frameAt * pointsPerFrame + at] = frame.getFloat32(at * 4, false);
            }
        }
    });

    return {
        longLabel: longLabel, shortLabel: shortLabel, unit: unit,
        bounds: nodeBounds, pointsPerFrame: pointsPerFrame,
        times: new Float32Array(times), values: values
    };
}

/** The record cursor: each step checks both markers and hands back the payload. */
class RecordWalk {

    private at = 0;

    constructor(
        private readonly view: DataView,
        private readonly littleEndian: boolean
    ) { }

    /** The next record, which must be whole and `expected` bytes long. */
    public demand(expected: number): DataView {
        const record = this.tryNext(expected);
        if (record === null) throw new Error('.sf file ends inside its header');
        return record;
    }

    /** The next record, or null when the bytes run out or the length differs. */
    public tryNext(expected: number): DataView | null {
        const total = this.view.byteLength;
        if (this.at + 8 + expected > total) return null;
        const length = this.view.getUint32(this.at, this.littleEndian);
        if (length !== expected) return null;
        const trailing = this.view.getUint32(this.at + 4 + expected, this.littleEndian);
        if (trailing !== length) return null;

        const payload = new DataView(this.view.buffer, this.view.byteOffset + this.at + 4, expected);
        this.at += 8 + expected;
        return payload;
    }
}

function asciiOf(bytes: DataView): string {
    let text = '';
    for (let at = 0; at < bytes.byteLength; at++) text += String.fromCharCode(bytes.getUint8(at));
    return text.trim();
}
```

**Uwaga dla wykonawcy:** w kodzie wyżej `boundsBytes`/`readInt`/`nodeBounds` dublują odczyt — przy implementacji zostaw **jedną** ścieżkę: `const b = walk.demand(24)` i sześć `b.getInt32(offset, littleEndian)` wprost do obiektu `bounds` (payload `DataView` nie niesie endianness — przekazuj ją jawnie). To pozostałość redakcyjna planu, nie projekt.

- [ ] **Step 2.4: Testy na zielono**

Run: `npx ng test webSmokeviewLib --watch=false --browsers=ChromeHeadless`
Expected: PASS (wszystkie spec-i `parseSf`)

- [ ] **Step 2.5: Commit**

```bash
git add projects/web-smokeview-lib/src/lib/services/parsers/sf/
git commit -m "feat(results): parse .sf slice files in the browser (#149)"
```

---

### Task 3: Zakresy węzłowe OBST-ów w parserze `.smv` (TDD)

**Files:**
- Modify: `projects/web-smokeview-lib/src/lib/services/parsers/smv/smv-file.ts`
- Modify: `projects/web-smokeview-lib/src/lib/services/parsers/smv/smv-parser.service.ts`
- Test: `projects/web-smokeview-lib/src/lib/services/parsers/smv/smv-parser.service.spec.ts`

- [ ] **Step 3.1: Failing spec** — do bloku `describe` parsera dopisz:

```typescript
    it('keeps each obst node-index range for blank culling (#149)', () => {
      const blockages = parser.parse(smvFixture()).blockages;
      expect(blockages.length).toBe(2);
      expect(blockages[0]).toEqual({ meshIndex: 1, i1: 0, i2: 1, j1: 0, j2: 2, k1: 0, k2: 1 });
      expect(blockages[1]).toEqual({ meshIndex: 1, i1: 2, i2: 3, j1: 0, j2: 1, k1: 0, k2: 1 });
    });
```

- [ ] **Step 3.2: Uruchom — FAIL** (brak `blockages` w `SmvFile`)

- [ ] **Step 3.3: Implementacja**

`smv-file.ts` — nowy typ i pole:

```typescript
/**
 * One obst's node-index box within its mesh, straight off the OBST block's
 * second line. What #149 computes blank from: a slice node inside one of
 * these is hidden by matter (GEOM deliberately does not occlude).
 */
export interface SmvBlockage {
    /** 1-based, as every mesh reference in the `.smv` counts. */
    readonly meshIndex: number,
    readonly i1: number, readonly i2: number,
    readonly j1: number, readonly j2: number,
    readonly k1: number, readonly k2: number
}
```

oraz w `SmvFile`:

```typescript
    readonly grids: readonly SmvMeshGrid[],
    readonly blockages: readonly SmvBlockage[],
    readonly results: readonly SmvResultFile[]
```

`smv-parser.service.ts` — w `SmvWalk` dodaj pole `private readonly blockages: SmvBlockage[] = [];` (import typu z `./smv-file`), w `run()` dołóż `blockages: this.blockages` do zwracanego obiektu, a w drugiej pętli `readObsts()` (ta po liniach indeksów) dopisz przed `this.obsts.push(...)`:

```typescript
      // The OBST block sits inside its mesh's section, so the mesh being
      // built last is the one these node indices count in.
      this.blockages.push({
        meshIndex: this.meshes.length,
        i1: values[0], i2: values[1], j1: values[2], j2: values[3], k1: values[4], k2: values[5]
      });
```

- [ ] **Step 3.4: Testy na zielono** — jak w 2.4.

- [ ] **Step 3.5: Commit**

```bash
git add projects/web-smokeview-lib/src/lib/services/parsers/smv/
git commit -m "feat(results): expose obst node-index ranges from the .smv for blank culling (#149)"
```

---

### Task 4: Geometria płaszczyzny slice'a (TDD, czysty moduł)

**Files:**
- Create: `projects/web-smokeview-lib/src/lib/services/drawing/slice/slice-geometry.ts`
- Create: `projects/web-smokeview-lib/src/lib/services/drawing/slice/slice-geometry.spec.ts`

- [ ] **Step 4.1: Failing spec**

```typescript
import { buildSliceGeometry } from './slice-geometry';

describe('buildSliceGeometry', () => {

  // 4x2x2-cell fixture mesh: the grids the .smv parser hands over.
  const grid = {
    meshIndex: 1,
    x: [0, 0.5, 1, 1.5, 2],
    y: [0, 0.5, 1],
    z: [0, 0.5, 1]
  };

  it('lays vertices on the grid planes, in Fortran order (i fastest)', () => {
    // A y-plane (ior=2) at j=1: 5 x-nodes times 3 z-nodes.
    const geometry = buildSliceGeometry({ i1: 0, i2: 4, j1: 1, j2: 1, k1: 0, k2: 2 }, grid);
    expect(geometry.positions.length).toBe(5 * 3 * 3);
    // First node (i=0,k=0), second (i=1,k=0) - i runs fastest.
    expect(Array.from(geometry.positions.slice(0, 6))).toEqual([0, 0.5, 0, 0.5, 0.5, 0]);
    // Last node (i=4,k=2).
    expect(Array.from(geometry.positions.slice(-3))).toEqual([2, 0.5, 1]);
  });

  it('triangulates two triangles per grid cell', () => {
    const geometry = buildSliceGeometry({ i1: 0, i2: 4, j1: 1, j2: 1, k1: 0, k2: 2 }, grid);
    // 4 x 2 cells, 2 triangles each, 3 indices per triangle.
    expect(geometry.indices.length).toBe(4 * 2 * 2 * 3);
    // First cell: nodes 0,1 in the first row, 5,6 in the second (nu=5).
    expect(Array.from(geometry.indices.slice(0, 6))).toEqual([0, 1, 6, 0, 6, 5]);
  });

  it('handles an x-plane (ior=1) the same way', () => {
    const geometry = buildSliceGeometry({ i1: 2, i2: 2, j1: 0, j2: 2, k1: 0, k2: 2 }, grid);
    expect(geometry.positions.length).toBe(3 * 3 * 3);
    // First node (j=0,k=0) at x=1; j runs fastest.
    expect(Array.from(geometry.positions.slice(0, 3))).toEqual([1, 0, 0]);
    expect(Array.from(geometry.positions.slice(3, 6))).toEqual([1, 0.5, 0]);
  });
});
```

- [ ] **Step 4.2: Uruchom — FAIL**

- [ ] **Step 4.3: Implementacja**

`slice-geometry.ts`:

```typescript
import { SmvMeshGrid, SmvSliceBounds } from '../../parsers/smv/smv-file';

export interface SliceGeometry {
    /** xyz per node, in the same Fortran order the `.sf` writes its values. */
    readonly positions: Float32Array,
    readonly indices: Uint32Array
}

/**
 * The plane of one slice, as triangles on the solver's own grid planes.
 *
 * Vertices walk the node box in Fortran order - i fastest, then j, then k -
 * which is exactly the order `.sf` frames come in, so `slice_value` maps onto
 * them one-to-one with no reindexing. Positions come straight off TRNX/TRNY/
 * TRNZ (`SmvMeshGrid`), so stretched meshes and metres (ADR-0002) are both
 * the parser's gift, not this function's problem.
 *
 * A planar slice has one axis flattened (i1==i2 or j1==j2 or k1==k2); the two
 * that vary make the quad grid, two triangles per cell.
 */
export function buildSliceGeometry(bounds: SmvSliceBounds, grid: SmvMeshGrid): SliceGeometry {
    const ni = bounds.i2 - bounds.i1 + 1;
    const nj = bounds.j2 - bounds.j1 + 1;
    const nk = bounds.k2 - bounds.k1 + 1;

    const positions = new Float32Array(ni * nj * nk * 3);
    let at = 0;
    for (let k = bounds.k1; k <= bounds.k2; k++) {
        for (let j = bounds.j1; j <= bounds.j2; j++) {
            for (let i = bounds.i1; i <= bounds.i2; i++) {
                positions[at++] = grid.x[i];
                positions[at++] = grid.y[j];
                positions[at++] = grid.z[k];
            }
        }
    }

    // In Fortran order the flattened axis drops out: the flat node index is
    // v * nu + u, with u the faster of the two varying axes (i before j
    // before k). nu/nv are node counts along them.
    const nu = ni > 1 ? ni : nj;
    const nv = nk > 1 ? nk : (ni > 1 && nj > 1 ? nj : 1);

    const indices = new Uint32Array((nu - 1) * (nv - 1) * 6);
    let out = 0;
    for (let v = 0; v < nv - 1; v++) {
        for (let u = 0; u < nu - 1; u++) {
            const n00 = v * nu + u;
            const n10 = n00 + 1;
            const n01 = n00 + nu;
            const n11 = n01 + 1;
            indices[out++] = n00; indices[out++] = n10; indices[out++] = n11;
            indices[out++] = n00; indices[out++] = n11; indices[out++] = n01;
        }
    }
    return { positions: positions, indices: indices };
}
```

- [ ] **Step 4.4: Testy na zielono**

- [ ] **Step 4.5: Commit**

```bash
git add projects/web-smokeview-lib/src/lib/services/drawing/slice/slice-geometry.*
git commit -m "feat(results): build slice plane geometry from the mesh grid planes (#149)"
```

---

### Task 5: Blank per węzeł (TDD, czysty moduł)

**Files:**
- Create: `projects/web-smokeview-lib/src/lib/services/drawing/slice/slice-blank.ts`
- Create: `projects/web-smokeview-lib/src/lib/services/drawing/slice/slice-blank.spec.ts`

**Reguła** (decyzja z grillowania, doprecyzowana): węzeł slice'a jest blank (0.0), gdy istnieje OBST tej samej siatki, który na **osi płaszczyzny** obejmuje ją **ściśle** (`a1 < p < a2`), a w obu osiach w płaszczyźnie zawiera węzeł **domknięcie** (`b1 <= n <= b2`). Ścisłość na osi płaszczyzny jest tym, co ratuje najczęstszy przypadek użycia: slice położony na licu obsta (podłoga, ściana) nie znika — blank dotyczy tylko materii, którą płaszczyzna faktycznie przecina.

- [ ] **Step 5.1: Failing spec**

```typescript
import { computeSliceBlank } from './slice-blank';

describe('computeSliceBlank', () => {

  // A y-plane slice at j=1 over the fixture mesh, 5x3 nodes.
  const bounds = { i1: 0, i2: 4, j1: 1, j2: 1, k1: 0, k2: 2 };

  it('marks nodes inside an obst the plane cuts through', () => {
    // A wall crossing the plane: y-range 0..2 strictly contains j=1.
    const blank = computeSliceBlank(bounds, [
      { meshIndex: 1, i1: 1, i2: 2, j1: 0, j2: 2, k1: 0, k2: 1 }
    ]);
    // Node (i,k) is at flat index k*5+i; blocked are i in 1..2, k in 0..1.
    const blocked = [0 * 5 + 1, 0 * 5 + 2, 1 * 5 + 1, 1 * 5 + 2];
    Array.from(blank).forEach((value, at) => {
      expect(value).toBe(blocked.includes(at) ? 0 : 1);
    });
  });

  it('leaves a slice lying on an obst face alone', () => {
    // The obst's top face is the plane itself: j2 == plane, not strictly inside.
    const blank = computeSliceBlank(bounds, [
      { meshIndex: 1, i1: 0, i2: 4, j1: 0, j2: 1, k1: 0, k2: 2 }
    ]);
    expect(Array.from(blank).every(value => value === 1)).toBeTrue();
  });

  it('is all-visible with no obsts at all', () => {
    const blank = computeSliceBlank(bounds, []);
    expect(blank.length).toBe(5 * 1 * 3);
    expect(Array.from(blank).every(value => value === 1)).toBeTrue();
  });
});
```

- [ ] **Step 5.2: Uruchom — FAIL**

- [ ] **Step 5.3: Implementacja**

`slice-blank.ts`:

```typescript
import { SmvBlockage, SmvSliceBounds } from '../../parsers/smv/smv-file';

/**
 * Which slice nodes are buried in matter: 1.0 visible, 0.0 blank.
 *
 * Computed here rather than read from anywhere, because no result file
 * carries it - SmokeView derives its iblank from the geometry too. The
 * blockages are the `.smv` OBST node boxes of the slice's own mesh; GEOM
 * deliberately does not occlude (see "Blank" in CONTEXT.md).
 *
 * On the plane's own axis the obst must contain the plane *strictly*: a
 * slice lying exactly on an obst face - a floor slice, a wall-surface slice,
 * the everyday cases - is data about the gas beside that face, not about the
 * matter under it. In the plane the box closes: face nodes shared with free
 * cells zero out only at measure-zero points once the varying interpolates,
 * so a cell is discarded exactly when the matter covers it whole.
 *
 * Order matches buildSliceGeometry(): Fortran, i fastest.
 */
export function computeSliceBlank(
    bounds: SmvSliceBounds, blockages: readonly SmvBlockage[]
): Float32Array {
    const ni = bounds.i2 - bounds.i1 + 1;
    const nj = bounds.j2 - bounds.j1 + 1;
    const nk = bounds.k2 - bounds.k1 + 1;

    const blank = new Float32Array(ni * nj * nk).fill(1);

    // Which axis the plane flattens; a volume slice never gets here (#160).
    const axis: 'i' | 'j' | 'k' = ni === 1 ? 'i' : nj === 1 ? 'j' : 'k';
    const plane = axis === 'i' ? bounds.i1 : axis === 'j' ? bounds.j1 : bounds.k1;

    for (const box of blockages) {
        const through = axis === 'i'
            ? box.i1 < plane && plane < box.i2
            : axis === 'j'
                ? box.j1 < plane && plane < box.j2
                : box.k1 < plane && plane < box.k2;
        if (!through) continue;

        const i1 = Math.max(axis === 'i' ? bounds.i1 : box.i1, bounds.i1);
        const i2 = Math.min(axis === 'i' ? bounds.i2 : box.i2, bounds.i2);
        const j1 = Math.max(axis === 'j' ? bounds.j1 : box.j1, bounds.j1);
        const j2 = Math.min(axis === 'j' ? bounds.j2 : box.j2, bounds.j2);
        const k1 = Math.max(axis === 'k' ? bounds.k1 : box.k1, bounds.k1);
        const k2 = Math.min(axis === 'k' ? bounds.k2 : box.k2, bounds.k2);

        for (let k = k1; k <= k2; k++) {
            for (let j = j1; j <= j2; j++) {
                for (let i = i1; i <= i2; i++) {
                    blank[((k - bounds.k1) * nj + (j - bounds.j1)) * ni + (i - bounds.i1)] = 0;
                }
            }
        }
    }
    return blank;
}
```

- [ ] **Step 5.4: Testy na zielono**

- [ ] **Step 5.5: Commit**

```bash
git add projects/web-smokeview-lib/src/lib/services/drawing/slice/slice-blank.*
git commit -m "feat(results): compute per-node blank from the .smv obst boxes (#149)"
```

---

### Task 6: Shadery WGSL + interfejs materiału

**Files:**
- Modify: `projects/web-smokeview-lib/src/assets/shaders/slice.vertex.wgsl` (całość)
- Modify: `projects/web-smokeview-lib/src/assets/shaders/slice.fragment.wgsl` (całość)
- Modify: `projects/web-smokeview-lib/src/lib/services/babylon/babylon.service.ts` (wpis `slice` w `SHADER_INTERFACES`, ~linia 110)

- [ ] **Step 6.1: Vertex stage** — `slice.vertex.wgsl`, cała zawartość:

```wgsl
#include<sceneUboDeclaration>
#include<meshUboDeclaration>

attribute position : vec3<f32>;
attribute slice_value : f32;
attribute blank : f32;

// The quantity group's range (ADR-0017): raw values map to the colorbar here,
// so a range change is a uniform update, never a data rewrite.
uniform range_min: f32;
uniform range_max: f32;

varying vcolorbar : f32;
varying vblank : f32;

@vertex
fn main(input : VertexInputs) -> FragmentInputs {
    vertexOutputs.position = scene.viewProjection * mesh.world * vec4<f32>(vertexInputs.position, 1.0);
    let span = max(uniforms.range_max - uniforms.range_min, 1e-30);
    vertexOutputs.vcolorbar = clamp((vertexInputs.slice_value - uniforms.range_min) / span, 0.0, 1.0);
    vertexOutputs.vblank = vertexInputs.blank;
    return vertexOutputs;
}
```

- [ ] **Step 6.2: Fragment stage** — `slice.fragment.wgsl`, cała zawartość:

```wgsl
varying vcolorbar : f32;
varying vblank : f32;

// 1 culls the cells buried in obsts, 0 shows the data underneath - the
// "Blank" toggle of CONTEXT.md. The GLSL this reproduces was removed in #82.
uniform is_blank: i32;
var texture_colorbar_sampler_tex: texture_2d<f32>;
var texture_colorbar_sampler_texSampler: sampler;

@fragment
fn main(input : FragmentInputs) -> FragmentOutputs {
    // vblank interpolates: it reaches 0.0 only where every vertex of the
    // cell is buried, so exactly the covered cells disappear.
    if (fragmentInputs.vblank == 0.0 && uniforms.is_blank == 1) {
        discard;
    }
    // The colorbar is a 1-wide, 256-tall strip: v walks the colours.
    let uv = vec2<f32>(0.5, fragmentInputs.vcolorbar);
    return FragmentOutputs(textureSample(texture_colorbar_sampler_tex, texture_colorbar_sampler_texSampler, uv));
}
```

- [ ] **Step 6.3: Interfejs materiału** — w `SHADER_INTERFACES` (babylon.service.ts) podmień wpis `slice`:

```typescript
  slice: { attributes: ['position', 'slice_value', 'blank'], uniforms: ['is_blank', 'range_min', 'range_max'] }
```

- [ ] **Step 6.4: Harness shaderów** — `node projects/web-smokeview-lib/tools/shader-harness/server.js`, otwórz `http://localhost:4599`, sprawdź że para `slice` kompiluje się bez błędów (harness kompiluje każdy shader w izolacji). Zamknij serwer.

- [ ] **Step 6.5: Commit**

```bash
git add projects/web-smokeview-lib/src/assets/shaders/slice.* projects/web-smokeview-lib/src/lib/services/babylon/babylon.service.ts
git commit -m "feat(results): real slice WGSL pair - value to colorbar, blank culling (#149)"
```

---

### Task 7: Klasa `Slice` (przepisana)

**Files:**
- Modify: `projects/web-smokeview-lib/src/lib/services/drawing/slice/slice.ts` (całość od nowa)

- [ ] **Step 7.1: Implementacja** — cała nowa zawartość `slice.ts`:

```typescript
import * as BABYLON from 'babylonjs';
import { SliceGeometry } from './slice-geometry';

/**
 * One slice plane on screen: the mesh of one `.sf` file on one FDS mesh.
 *
 * Everything asynchronous happened before this constructor: the material is
 * built and configured by SliceService per quantity group, the geometry and
 * blank are computed, the values parsed. What is left is strictly synchronous
 * mesh assembly - which is the fix for the old slice.ts, whose constructor
 * raced its own material against the first setInt (#149).
 */
export class Slice {

    public readonly mesh: BABYLON.Mesh;
    public readonly frameCount: number;

    private frame = -1;

    constructor(
        material: BABYLON.ShaderMaterial,
        geometry: SliceGeometry,
        blank: Float32Array,
        /** All frames, `pointsPerFrame` apart, in vertex order. */
        private readonly values: Float32Array,
        private readonly pointsPerFrame: number,
        scene: BABYLON.Scene
    ) {
        this.frameCount = pointsPerFrame > 0 ? Math.floor(values.length / pointsPerFrame) : 0;

        this.mesh = new BABYLON.Mesh('slice', scene);
        const vertexData = new BABYLON.VertexData();
        vertexData.positions = geometry.positions;
        vertexData.indices = geometry.indices;
        vertexData.applyToMesh(this.mesh, false);

        this.mesh.setVerticesData('blank', blank, false, 1);
        // Updatable: setFrame() rewrites it for as long as the slice lives.
        this.mesh.setVerticesData('slice_value', new Float32Array(pointsPerFrame), true, 1);
        this.mesh.material = material;

        this.setFrame(0);
    }

    /**
     * Show frame `index`, clamped to this file's last frame - a shorter file
     * of the group holds its last known state rather than vanishing (#149;
     * the step-function semantics "Oś czasu" in CONTEXT.md asks for).
     */
    public setFrame(index: number): void {
        const clamped = Math.min(Math.max(index, 0), this.frameCount - 1);
        if (clamped === this.frame || clamped < 0) return;
        this.frame = clamped;
        this.mesh.updateVerticesData('slice_value',
            this.values.subarray(clamped * this.pointsPerFrame, (clamped + 1) * this.pointsPerFrame) as any);
    }

    public dispose(): void {
        this.mesh.dispose();
    }
}
```

(`as any` przy `subarray`: typings Babylona chcą `FloatArray = number[] | Float32Array`, a `subarray` zwraca `Float32Array` — jeśli kompilator nie protestuje, rzutowanie usunąć.)

- [ ] **Step 7.2: Kompilacja** — `npx ng test webSmokeviewLib --watch=false --browsers=ChromeHeadless` jeszcze się nie skompiluje do zielonego, bo `slice.service.ts` używa starego konstruktora — to naprawia Task 8. Na tym etapie wystarczy, że `slice.ts` nie ma własnych błędów; commit razem z Taskiem 8.

---

### Task 8: `SliceService` (przepisany) + pomocnik ładowalności grupy

**Files:**
- Modify: `projects/web-smokeview-lib/src/lib/services/results/quantity-groups.ts` (dopisek na końcu)
- Test: `projects/web-smokeview-lib/src/lib/services/results/quantity-groups.spec.ts` (dopisek)
- Modify: `projects/web-smokeview-lib/src/lib/services/drawing/slice/slice.service.ts` (całość od nowa)
- Modify: `projects/web-smokeview-lib/src/lib/services/drawing/slice/slice.service.spec.ts` (całość od nowa)

- [ ] **Step 8.1: Failing spec pomocnika** — do `quantity-groups.spec.ts` dopisz:

```typescript
  describe('isLoadableSliceGroup', () => {
    const fileOf = (over: Partial<SmvResultFile>): SmvResultFile => ({
      kind: 'slcf', meshIndex: 1, filename: 'demo_1.sf', longLabel: 'TEMPERATURE',
      shortLabel: 'temp', unit: 'C', cellCentered: false, ior: 2, ...over
    });

    it('accepts a node-centered plane slice', () => {
      expect(isLoadableSliceGroup({ label: 'T', unit: 'C', files: [fileOf({})] })).toBeTrue();
    });

    it('rejects cell-centered groups until #159', () => {
      expect(isLoadableSliceGroup({ label: 'T', unit: 'C', files: [fileOf({ cellCentered: true })] })).toBeFalse();
    });

    it('rejects volume slices until #160', () => {
      expect(isLoadableSliceGroup({ label: 'T', unit: 'C', files: [fileOf({ ior: 0 })] })).toBeFalse();
    });

    it('rejects other formats', () => {
      expect(isLoadableSliceGroup({ label: 'T', unit: 'C', files: [fileOf({ kind: 'bndf' })] })).toBeFalse();
    });
  });
```

(dopasuj do faktycznego kształtu `QuantityGroup` w tym pliku — jeśli ma więcej pól, uzupełnij literale).

- [ ] **Step 8.2: Pomocnik** — na końcu `quantity-groups.ts`:

```typescript
/**
 * Whether #149's reader can open this group: node-centered plane slices only.
 * Cell-centered rendering is #159, volume slices (ior 0) are #160 - both are
 * listed in the catalog but stay unloadable until their issue lands.
 */
export function isLoadableSliceGroup(group: QuantityGroup): boolean {
    const first = group.files[0];
    return !!first && first.kind === 'slcf' && !first.cellCentered
        && (first.ior === 1 || first.ior === 2 || first.ior === 3);
}
```

- [ ] **Step 8.3: Nowy `slice.service.ts`** — cała zawartość:

```typescript
import { Injectable, isDevMode } from '@angular/core';
import * as BABYLON from 'babylonjs';
import { BabylonService, tryCreateShaderMaterial } from '../../babylon/babylon.service';
import { SceneLifecycleService, SceneScoped } from '../../babylon/scene-lifecycle.service';
import { colorbars as Colorbars } from '../../../consts/colorbars';
import { ResultsDirectory } from '../../results/results-directory';
import { QuantityGroup, isLoadableSliceGroup } from '../../results/quantity-groups';
import { SmvBlockage, SmvFile, SmvMeshGrid, SmvResultFile } from '../../parsers/smv/smv-file';
import { SfFile } from '../../parsers/sf/sf-file';
import { parseSf } from '../../parsers/sf/sf-parser';
import { buildSliceGeometry } from './slice-geometry';
import { computeSliceBlank } from './slice-blank';
import { Slice } from './slice';

/** One loaded quantity group: its shared material and its per-mesh planes. */
interface LoadedGroup {
    readonly material: BABYLON.ShaderMaterial;
    readonly colorbar: BABYLON.RawTexture;
    readonly slices: readonly Slice[];
    readonly frameCount: number;
}

/**
 * Loads and shows SLCF results (#149).
 *
 * The unit of loading is the quantity group ("Grupa wielkości", CONTEXT.md):
 * one call opens every available file of the group - all meshes at once -
 * through the results directory, parses them whole (ADR-0016), and puts them
 * on screen at the current frame. Loading again disposes it: two states, not
 * three.
 *
 * One ShaderMaterial per group, built with await *before* any Slice exists:
 * the uniforms - the value range (computed over the whole group, per
 * "Zakres wielkości"), the colorbar, the blank toggle - are exactly the
 * things the group's planes share. #151 will replace the computed range with
 * the global per-quantity one; the uniforms are its seam.
 */
@Injectable({
  providedIn: 'root'
})
export class SliceService implements SceneScoped {

  private grids: readonly SmvMeshGrid[] = [];
  private blockages: readonly SmvBlockage[] = [];
  private directory: ResultsDirectory | null = null;

  private readonly loaded = new Map<QuantityGroup, LoadedGroup>();
  private readonly loading = new Set<QuantityGroup>();

  private frameCur = 0;
  /** 1 culls blanked cells, 0 shows the data under them - the shader toggle. */
  private cullBlank = true;

  constructor(
    private babylonService: BabylonService,
    sceneLifecycle: SceneLifecycleService
  ) {
    sceneLifecycle.register(this);
  }

  /** Everything belongs to the scene that has just been disposed - drop it. */
  public resetSceneState(): void {
    this.loaded.forEach(group => this.disposeGroup(group));
    this.loaded.clear();
    this.loading.clear();
    this.grids = [];
    this.blockages = [];
    this.directory = null;
    this.frameCur = 0;
    this.cullBlank = true;
  }

  /**
   * The case the slices come from: the parsed `.smv` (grids in metres, obst
   * boxes for blank) and the directory its bytes sit in. Replacing the case
   * disposes whatever the previous one had loaded.
   */
  public setCase(smv: SmvFile, directory: ResultsDirectory): void {
    this.loaded.forEach(group => this.disposeGroup(group));
    this.loaded.clear();
    this.loading.clear();
    this.grids = smv.grids;
    this.blockages = smv.blockages;
    this.directory = directory;
  }

  public canLoad(group: QuantityGroup): boolean {
    return this.directory !== null && isLoadableSliceGroup(group);
  }

  public isLoaded(group: QuantityGroup): boolean {
    return this.loaded.has(group);
  }

  public isLoading(group: QuantityGroup): boolean {
    return this.loading.has(group);
  }

  /** Load the group, or - loaded already - put it away. The panel's click. */
  public async toggleGroup(group: QuantityGroup): Promise<void> {
    const held = this.loaded.get(group);
    if (held) {
      this.disposeGroup(held);
      this.loaded.delete(group);
      return;
    }
    if (!this.canLoad(group) || this.loading.has(group)) return;

    this.loading.add(group);
    try {
      await this.load(group);
    } catch (e) {
      if (isDevMode()) { try { console.error('[SliceService] Failed to load a slice group', e); } catch { } }
    } finally {
      this.loading.delete(group);
    }
  }

  /** The longest loaded file, which is what the interim frame slider runs over. */
  public get frameCount(): number {
    let count = 0;
    this.loaded.forEach(group => { count = Math.max(count, group.frameCount); });
    return count;
  }

  public get frame(): number {
    return this.frameCur;
  }

  /** Show frame `index` everywhere; a shorter file clamps to its last frame. */
  public setFrame(index: number): void {
    this.frameCur = index;
    this.loaded.forEach(group => group.slices.forEach(slice => slice.setFrame(index)));
  }

  /** The "Blank" toggle (CONTEXT.md): culled matter against visible data. */
  public toggleBlank(): void {
    this.cullBlank = !this.cullBlank;
    this.loaded.forEach(group => group.material.setInt('is_blank', this.cullBlank ? 1 : 0));
  }

  private async load(group: QuantityGroup): Promise<void> {
    // Whole files, one read each (#149): frames land in memory for #150's
    // timeline, and the group range comes out of the same pass.
    const parsed: { file: SmvResultFile, sf: SfFile }[] = [];
    for (const file of group.files) {
      const handle = await this.directory!.open(file.filename);
      // Not there is an ordinary answer - the .smv lists optimistically.
      if (handle === null) continue;
      parsed.push({ file: file, sf: parseSf(await handle.read(0, handle.size)) });
    }
    if (parsed.length === 0) return;

    const material = await this.createGroupMaterial(group, parsed);
    if (material === null) return;

    const scene = this.babylonService.scene;
    const slices: Slice[] = [];
    for (const { file, sf } of parsed) {
      const grid = this.grids.find(candidate => candidate.meshIndex === file.meshIndex);
      if (!grid) continue;
      const geometry = buildSliceGeometry(sf.bounds, grid);
      const blank = computeSliceBlank(sf.bounds,
        this.blockages.filter(box => box.meshIndex === file.meshIndex));
      slices.push(new Slice(material.material, geometry, blank, sf.values, sf.pointsPerFrame, scene));
    }
    if (slices.length === 0) {
      material.material.dispose();
      material.colorbar.dispose();
      return;
    }

    this.loaded.set(group, {
      material: material.material, colorbar: material.colorbar, slices: slices,
      frameCount: Math.max(...slices.map(slice => slice.frameCount))
    });
    this.setFrame(this.frameCur);
  }

  /** The group's material, fully configured before any mesh may use it. */
  private async createGroupMaterial(
    group: QuantityGroup, parsed: readonly { sf: SfFile }[]
  ): Promise<{ material: BABYLON.ShaderMaterial, colorbar: BABYLON.RawTexture } | null> {
    const material = await tryCreateShaderMaterial(this.babylonService,
      { name: `slice:${group.label}`, shader: 'slice' }, 'SliceService');
    if (material === null) return null;

    const colorbar = new BABYLON.RawTexture(
      Colorbars.rainbow.colors, 1, Colorbars.rainbow.number,
      BABYLON.Engine.TEXTUREFORMAT_RGBA, this.babylonService.scene,
      false, false, BABYLON.Texture.LINEAR_LINEAR, BABYLON.Engine.TEXTURETYPE_UNSIGNED_BYTE);
    // Sampling walks V: without the clamp the range's top wraps back to its
    // bottom colour. (The old code clamped U and R - and sampled a constant.)
    colorbar.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    colorbar.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

    const range = valueRangeOf(parsed.map(entry => entry.sf));
    material.setFloat('range_min', range.min);
    material.setFloat('range_max', range.max);
    material.setInt('is_blank', this.cullBlank ? 1 : 0);
    material.setTexture('texture_colorbar_sampler_tex', colorbar);
    material.backFaceCulling = false;
    material.zOffset = 0.2;
    return { material: material, colorbar: colorbar };
  }

  private disposeGroup(group: LoadedGroup): void {
    group.slices.forEach(slice => slice.dispose());
    group.material.dispose();
    group.colorbar.dispose();
  }
}

/**
 * The interim colour range: min/max over every frame of every file of the
 * loaded group - "Zakres wielkości" without #151's override and legend yet.
 */
function valueRangeOf(files: readonly SfFile[]): { min: number, max: number } {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const file of files) {
        for (let at = 0; at < file.values.length; at++) {
            const value = file.values[at];
            if (value < min) min = value;
            if (value > max) max = value;
        }
    }
    if (min > max) return { min: 0, max: 1 };
    return { min: min, max: max };
}
```

- [ ] **Step 8.4: Nowy `slice.service.spec.ts`** — cała zawartość (serwis wymaga sceny do faktycznego ładowania; spec trzyma się czystej logiki stanu):

```typescript
import { TestBed } from '@angular/core/testing';

import { SliceService } from './slice.service';
import { QuantityGroup } from '../../results/quantity-groups';

describe('SliceService', () => {

  let service: SliceService;

  const group: QuantityGroup = {
    label: 'TEMPERATURE y=0.5', unit: 'C',
    files: [{
      kind: 'slcf', meshIndex: 1, filename: 'demo_1.sf', longLabel: 'TEMPERATURE',
      shortLabel: 'temp', unit: 'C', cellCentered: false,
      bounds: { i1: 0, i2: 4, j1: 1, j2: 1, k1: 0, k2: 2 }, ior: 2
    }]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SliceService);
  });

  it('cannot load anything before a case is set', () => {
    expect(service.canLoad(group)).toBeFalse();
    expect(service.isLoaded(group)).toBeFalse();
    expect(service.frameCount).toBe(0);
  });

  it('remembers the frame it was asked for', () => {
    service.setFrame(7);
    expect(service.frame).toBe(7);
  });

  it('resets to nothing with the scene', () => {
    service.setFrame(7);
    service.resetSceneState();
    expect(service.frame).toBe(0);
    expect(service.frameCount).toBe(0);
    expect(service.canLoad(group)).toBeFalse();
  });
});
```

(dopasuj literał `QuantityGroup` do faktycznego kształtu typu; sprawdź, że `scene-lifecycle.integration.spec.ts` nadal przechodzi — rejestracja w `SceneLifecycleService` zostaje).

- [ ] **Step 8.5: Testy na zielono** — `npx ng test webSmokeviewLib --watch=false --browsers=ChromeHeadless`
Expected: PASS — w tym stare spec-i lifecycle.

- [ ] **Step 8.6: Commit**

```bash
git add projects/web-smokeview-lib/src/lib/services/drawing/slice/ projects/web-smokeview-lib/src/lib/services/results/quantity-groups.*
git commit -m "feat(results): load slice quantity groups through the .sf parser and the new material lifecycle (#149)"
```

---

### Task 9: Host webSmokeview — klik w grupę, stan, suwak

**Files:**
- Modify: `projects/webSmokeview/src/app/views/tree/tree.component.ts`
- Modify: `projects/webSmokeview/src/app/views/tree/tree.component.html`

- [ ] **Step 9.1: Komponent** — dodaj importy:

```typescript
import { SliceService } from 'projects/web-smokeview-lib/src/lib/services/drawing/slice/slice.service';
import { QuantityGroup, groupResults, ResultFormatGroup, isLoadableSliceGroup } from 'projects/web-smokeview-lib/src/lib/services/results/quantity-groups';
```

do konstruktora: `public sliceService: SliceService,`. W `loadSmv()`, po `void this.smvApiService.render(smv.scene);` dodaj:

```typescript
      // The slices of Phase 6 come out of the same parsed master file and the
      // same byte source the catalog was read from (#149).
      this.sliceService.setCase(smv, directory);
```

oraz metody:

```typescript
  public canLoadGroup(group: QuantityGroup): boolean {
    return isLoadableSliceGroup(group);
  }

  public onGroupClick(group: QuantityGroup): void {
    if (!this.canLoadGroup(group)) return;
    void this.sliceService.toggleGroup(group);
  }

  public onFrameInput(event: Event): void {
    this.sliceService.setFrame(Number((event.target as HTMLInputElement).value));
  }
```

- [ ] **Step 9.2: Template** — w `tree.component.html` znajdź wiersz grupy wielkości (odpowiednik `<div class="row quantity">` z katalogu wizfds; w tym pliku analogiczna pętla po `format.groups`). Podmień na klikalny z klasami stanu:

```html
        <div class="row quantity" [class.loadable]="canLoadGroup(group)"
          [class.loaded]="sliceService.isLoaded(group)"
          [class.loading]="sliceService.isLoading(group)"
          (click)="onGroupClick(group)">
          <span class="label">{{ group.label }}</span>
          <span class="unit" *ngIf="group.unit">{{ group.unit }}</span>
          <mat-icon *ngIf="sliceService.isLoaded(group)" svgIcon="eye-outline" aria-label="loaded"></mat-icon>
        </div>
```

a na końcu bloku katalogu (po pętli formatów) dodaj tymczasowy suwak (rusztowanie do #150):

```html
    <!-- Interim frame picker - #150 replaces it with the shared timeline. -->
    <div class="row frame-picker" *ngIf="sliceService.frameCount > 0">
      <input type="range" min="0" [max]="sliceService.frameCount - 1"
        [value]="sliceService.frame" (input)="onFrameInput($event)" aria-label="Frame">
      <span class="mono">{{ sliceService.frame + 1 }} / {{ sliceService.frameCount }}</span>
    </div>
```

(dopasuj do faktycznej struktury szablonu; klasa `.loadable` powinna dawać kursor pointer, `.loaded` — akcent lazurowy `#3B82F6`, nie zielony; grupa nieładowalna zostaje wyszarzona bez kursora).

- [ ] **Step 9.3: Build hosta** — `npx ng build webSmokeview` (dev build wystarczy, żeby złapać błędy szablonu).
Expected: kompiluje się.

- [ ] **Step 9.4: Commit**

```bash
git add projects/webSmokeview/src/app/views/tree/
git commit -m "feat(webSmokeview): load slice groups from the results tree, interim frame slider (#149)"
```

---

### Task 10: Host wizfds — katalog wyników ładuje grupy

**Files:**
- Modify: `projects/wizfds/src/app/services/results-directory/results-directory.service.ts`
- Modify: `projects/wizfds/src/app/views/main/fds/visualize/results-catalog/results-catalog.component.ts`
- Modify: `projects/wizfds/src/app/views/main/fds/visualize/results-catalog/results-catalog.component.html`

- [ ] **Step 10.1: Serwis zapamiętuje `SmvFile` i wystawia źródło** — w `ResultsDirectoryService`:

pole (przy `private directory`):

```typescript
  /** The parsed master file behind the catalog - grids and obst boxes for #149. */
  private smvFile: SmvFile | null = null;
```

(import `SmvFile` z `.../parsers/smv/smv-file`). W `read()` po sparsowaniu (`const smv = ...`) dodaj `this.smvFile = smv;` (przed `catalogSubject.next`). W `reset()` dodaj `this.smvFile = null;`. Gettery obok `catalog`:

```typescript
  public get smv(): SmvFile | null { return this.smvFile; }

  /** The byte source of the case on screen, for the format readers (#149...). */
  public get source(): LocalResultsDirectory | null { return this.directory; }
```

Uwaga: `reset()` czyści też `directory` — sprawdź, że tak jest; jeśli nie, wyczyść oba.

- [ ] **Step 10.2: Komponent katalogu** — importy:

```typescript
import { SliceService } from '../../../../../../../../web-smokeview-lib/src/lib/services/drawing/slice/slice.service';
import { QuantityGroup, isLoadableSliceGroup } from '../../../../../../../../web-smokeview-lib/src/lib/services/results/quantity-groups';
```

konstruktor:

```typescript
  constructor(public results: ResultsDirectoryService, public sliceService: SliceService) {
    // Rebind the readers whenever the catalog changes folder or case; the
    // service disposes whatever the previous case had loaded.
    this.results.catalog$.subscribe(() => {
      if (this.results.smv && this.results.source) {
        this.sliceService.setCase(this.results.smv, this.results.source);
      }
    });
  }
```

metody:

```typescript
  canLoadGroup(group: QuantityGroup): boolean {
    return isLoadableSliceGroup(group);
  }

  onGroupClick(group: QuantityGroup): void {
    if (!this.canLoadGroup(group)) return;
    void this.sliceService.toggleGroup(group);
  }

  onFrameInput(event: Event): void {
    this.sliceService.setFrame(Number((event.target as HTMLInputElement).value));
  }
```

(Komponent nie jest niszczony razem ze sceną — subskrypcję sprzątnij w `ngOnDestroy` przez `Subscription`.)

- [ ] **Step 10.3: Template** — w `results-catalog.component.html` podmień wiersz grupy:

```html
        <div class="row quantity" [class.loadable]="canLoadGroup(group)"
          [class.loaded]="sliceService.isLoaded(group)"
          [class.loading]="sliceService.isLoading(group)"
          (click)="onGroupClick(group)">
          <span class="label">{{ group.label }}</span>
          <span class="unit" *ngIf="group.unit">{{ group.unit }}</span>
          <mat-icon *ngIf="sliceService.isLoaded(group)" svgIcon="eye-outline" aria-label="loaded"></mat-icon>
        </div>
```

przed `<p class="note">` dodaj:

```html
    <!-- Interim frame picker - #150 replaces it with the shared timeline. -->
    <div class="row frame-picker" *ngIf="sliceService.frameCount > 0">
      <input type="range" min="0" [max]="sliceService.frameCount - 1"
        [value]="sliceService.frame" (input)="onFrameInput($event)" aria-label="Frame">
      <span class="mono">{{ sliceService.frame + 1 }} / {{ sliceService.frameCount }}</span>
    </div>
```

i zaktualizuj notkę:

```html
    <p class="note">
      Click a slice quantity to load it; other formats arrive with their readers.
    </p>
```

- [ ] **Step 10.4: Build** — `npx ng build wizfds` (dev).
Expected: kompiluje się.

- [ ] **Step 10.5: Commit**

```bash
git add projects/wizfds/src/app/services/results-directory/ projects/wizfds/src/app/views/main/fds/visualize/results-catalog/
git commit -m "feat(wizfds): load slice groups from the results catalog, interim frame slider (#149)"
```

---

### Task 11: Wyrzucenie ścieżki JSON-upload

**Files:**
- Modify: `projects/web-smokeview-lib/src/lib/views/smokeview/smokeview.component.ts`
- Modify: `projects/web-smokeview-lib/src/lib/views/smokeview/smokeview.component.html`

- [ ] **Step 11.1:** Z `smokeview.component.ts` usuń metody `onSliceFileSelected()` i `control()` (linie ~600-626), injekcje `public sliceService: SliceService` i `public playerService: PlayerService` z konstruktora oraz ich importy. `PlayerService` sam w sobie zostaje w bibliotece (#150 go zastąpi) — znika tylko z tego komponentu.

- [ ] **Step 11.2:** Z `smokeview.component.html` usuń cały blok `<div class="player" ...>` wraz z komentarzem nad nim (linie ~70-86) — odtwarzanie wraca w #150 jako oś czasu.

- [ ] **Step 11.3:** `grep -rn "fileSlice\|onSliceFileSelected\|playSlice\|getFromFile" projects/` — ma nie zwrócić nic. `npx ng build webSmokeview && npx ng build wizfds` — kompilują się.

- [ ] **Step 11.4: Commit**

```bash
git add projects/web-smokeview-lib/src/lib/views/smokeview/
git commit -m "feat(results): retire the hand-made JSON slice upload (#149)"
```

---

### Task 12: Eksporty, dokumentacja, finalna weryfikacja

**Files:**
- Modify: `projects/web-smokeview-lib/src/public-api.ts`
- Modify: `docs/reference/fds-smv-structure.md`

- [ ] **Step 12.1: Public API** — dopisz:

```typescript
 export * from './lib/services/parsers/sf/sf-file';
 export * from './lib/services/parsers/sf/sf-parser';
 export * from './lib/services/drawing/slice/slice.service';
```

- [ ] **Step 12.2: Dokument referencyjny** — w tabeli sekcji ② w wierszu `.sf` kolumnę „Nasz serwis" uzupełnij o parser: `[parsers/sf/sf-parser.ts](...) + [drawing/slice/slice.service.ts](...) (#149)`.

- [ ] **Step 12.3: Pełne testy i buildy**

```bash
npx ng test webSmokeviewLib --watch=false --browsers=ChromeHeadless
npx ng test wizfds --watch=false --browsers=ChromeHeadless
npx ng build webSmokeview
npx ng build wizfds
```

Expected: wszystko zielone. (Testów wizfds nie ruszaliśmy — to regresja całości.)

- [ ] **Step 12.4: Weryfikacja wizualna** — NIE odpalać Playwrighta (pamięć projektu). Uruchomić `npm run webSmv:start`, załadować przypadek z wynikami slice, sprawdzić ręcznie albo poprosić Mateusza. Weryfikacja UI własnej gałęzi w razie równoległych sesji: git worktree + `ng serve` na 4201 (pamięć projektu).

- [ ] **Step 12.5: Commit + PR**

```bash
git add projects/web-smokeview-lib/src/public-api.ts docs/reference/fds-smv-structure.md
git commit -m "docs(results): map the .sf parser in the reference and the public API (#149)"
```

PR (po angielsku) na `master`: tytuł `feat(results): parse .sf in the browser and render slices through a real WGSL shader (#149)`; w opisie odhaczyć zakres #149.

---

## Self-review (wykonany przy pisaniu planu)

- **Pokrycie zakresu #149:** parser (Task 1-2) ✓; node-centered only + nieładowalne SLCC/volume (Task 8 `isLoadableSliceGroup`) ✓; para WGSL z blank cullingiem (Task 6) ✓; cykl życia materiału (Task 7-8) ✓; klatka po indeksie (Task 8-10 suwak) ✓; metry z TRN* przez `SmvMeshGrid` — **już w parserze #115**, więc bez zmian parsera poza `blockages` (Task 3) ✓; katalog wyników jako źródło (Task 8-10) ✓; usunięcie JSON-upload (Task 11) ✓.
- **Typy spójne:** `SfFile.bounds` to `SmvSliceBounds`; `Slice` przyjmuje gotowy `ShaderMaterial`; `QuantityGroup` w spec-ach do dopasowania z faktycznym kształtem (zaznaczone w krokach).
- **Znane miejsce do poprawy przy implementacji:** Task 2 Step 2.3 — usunąć zdublowany odczyt bounds (adnotacja w kroku); `demand/tryNext` zwracają `DataView` payloadu, a endianness przekazywana jawnie.
