import { SceneInput } from '../../drawing/scene-input';

/**
 * The stretched-or-not grid planes of one mesh, straight from TRNX/TRNY/TRNZ.
 *
 * Deliberately outside SceneInput: the scene contract stays uniform (cell size
 * from PDIM and GRID), and these arrays wait for the slice work of #149, which
 * positions data on the planes the solver actually used. See #115.
 */
export interface SmvMeshGrid {
    /** 1-based, as every mesh reference in the `.smv` counts. */
    readonly meshIndex: number,
    readonly x: readonly number[],
    readonly y: readonly number[],
    readonly z: readonly number[]
}

/** The result-file kinds Phase 6 reads. `slcf` covers SLCC via `cellCentered`. */
export type SmvResultKind = 'slcf' | 'bndf' | 'prt5' | 'smoke3d' | 'isof';

/** The i/j/k cell range a slice occupies, from the SLCF entry itself. */
export interface SmvSliceBounds {
    readonly i1: number, readonly i2: number,
    readonly j1: number, readonly j2: number,
    readonly k1: number, readonly k2: number
}

/**
 * One result file the `.smv` points at - the catalog #148 lists and the
 * format readers of Phase 6 (#149...#155) open.
 */
export interface SmvResultFile {
    readonly kind: SmvResultKind,
    /** 1-based mesh the data lives on. */
    readonly meshIndex: number,
    /** As written in the `.smv`, relative to the results directory. */
    readonly filename: string,
    /** `TEMPERATURE` - the quantity, as SmokeView labels it. */
    readonly longLabel: string,
    /** `temp` - the colorbar label. */
    readonly shortLabel: string,
    readonly unit: string,
    /** SLCC / BNDC against SLCF / BNDF. */
    readonly cellCentered: boolean,
    /** Slices only. */
    readonly bounds?: SmvSliceBounds,
    /** Slices only: 1|2|3 for an axis-aligned plane, 0 for a volume slice. */
    readonly ior?: number,
    /** SMOKF3D only, m2/kg. */
    readonly extinctionCoefficient?: number
}

/** Everything the viewer takes from one parsed `.smv` master file. */
export interface SmvFile {
    readonly chid: string,
    readonly title: string,
    /** The geometry, in FDS metres (ADR-0002), ready for `render(scene)`. */
    readonly scene: SceneInput,
    readonly grids: readonly SmvMeshGrid[],
    readonly results: readonly SmvResultFile[]
}
