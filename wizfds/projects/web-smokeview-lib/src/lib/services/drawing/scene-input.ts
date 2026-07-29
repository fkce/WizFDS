/**
 * What the app hands the library to draw.
 *
 * The scenario itself lives in the app - the `Fds` object is the only source of
 * truth (ADR-0004) - so nothing here is a domain class. Everything is flat,
 * already resolved and read-only: the library never looks a &SURF up, never
 * follows a reference it was not given, and never writes back. That is what lets
 * the app serialise and auto-save while the preview is on screen.
 *
 * `uuid` identifies an element everywhere in the system (ADR-0005). `idAC` is a
 * link to the CAD plugin and means nothing for drawing, so it does not cross.
 */

/**
 * An axis-aligned box, in FDS metres.
 *
 * There is no second coordinate system: the scene is drawn in metres 1:1 with
 * its origin at the FDS origin (ADR-0002), so this is both what crosses the
 * boundary and what the library draws.
 */
export interface SceneXb {
    readonly x1: number,
    readonly x2: number,
    readonly y1: number,
    readonly y2: number,
    readonly z1: number,
    readonly z2: number
}

/**
 * A colour ready for a vertex buffer: every component in 0..1, alpha included.
 *
 * The app does the conversion from the 0..255 rgb it stores, so the library has
 * one representation to deal with rather than one per element type.
 */
export interface SceneColor {
    readonly r: number,
    readonly g: number,
    readonly b: number,
    readonly a: number
}

/** Everything the library draws has an identity, an FDS name and a box. */
export interface SceneElement {
    readonly uuid: string,
    /** The FDS `ID`, shown to the user. Not an identity - it need not be unique. */
    readonly id: string,
    /** Where the element stands, in FDS metres. */
    readonly xb: SceneXb
}

/** A &MESH. Drawn as an outline, in a colour the library picks itself. */
export type SceneMesh = SceneElement;

/** A &HOLE. Cut out of the obsts it overlaps; never drawn on its own. */
export type SceneHole = SceneElement;

/** An `OPEN` vent. Drawn as a plane, in a colour the library picks itself. */
export type SceneOpen = SceneElement;

/** An &OBST, with its &SURF already resolved to a colour. */
export interface SceneObst extends SceneElement {
    readonly color: SceneColor,
    /**
     * The &SURF this obst names, shown in the pick panel. `''` when it names none
     * - which includes an obst with one &SURF per face, since that has no single
     * name to show and no single colour to draw it in.
     */
    readonly surfId: string,
    /** `PERMIT_HOLE`. An obst that forbids holes is drawn solid. */
    readonly permitHole: boolean
}

/** A &VENT from the ventilation system, coloured by its &SURF. */
export interface SceneVent extends SceneElement {
    readonly color: SceneColor
}

/** A fire, drawn as the plane of its &VENT in the colour of its &SURF. */
export interface SceneFire extends SceneElement {
    readonly color: SceneColor
}

/** Which way a jetfan blows. */
export type SceneJetfanDirection = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';

export const SCENE_JETFAN_DIRECTIONS: readonly SceneJetfanDirection[] =
    ['+x', '-x', '+y', '-y', '+z', '-z'];

/** Narrow a stored direction onto the six the library can draw. */
export function isSceneJetfanDirection(value: string): value is SceneJetfanDirection {
    return SCENE_JETFAN_DIRECTIONS.indexOf(value as SceneJetfanDirection) !== -1;
}

/**
 * A jet fan. The library derives its inlet and outlet planes and its flow arrow
 * from `direction` - those are drawings, not elements of the scenario.
 */
export interface SceneJetfan extends SceneElement {
    readonly color: SceneColor,
    readonly direction: SceneJetfanDirection
}

/**
 * How much space a &DEVC takes up, which is what decides how it is drawn.
 *
 * FDS lets a device be a single point, a line of points, a plane or a volume,
 * and the four are different drawings rather than one drawing at four sizes.
 */
export type SceneDevcExtent = 'point' | 'linear' | 'plane' | 'volume';

/**
 * What kind of device a point one is, which decides the shape of its marker.
 *
 * The four names are the `SMOKEVIEW_ID`s the app offers on a &PROP, but that is
 * not where they are read from: `PROP_ID` never reaches the input file and the
 * device form does not offer it, so the app works the kind out from the QUANTITY
 * the device measures. SmokeView draws each of these from an object script in
 * `smv_objects.tex`; the library draws a recognisable primitive apiece instead.
 * Both decisions are ADR-0008.
 */
export type SceneDevcMarker = 'sensor' | 'smoke detector' | 'nozzle' | 'sprinkler';

export const SCENE_DEVC_MARKERS: readonly SceneDevcMarker[] =
    ['sensor', 'smoke detector', 'nozzle', 'sprinkler'];

/**
 * A &DEVC - a detector, a sprinkler, a thermocouple.
 *
 * A point device carries a box with no extent, centred where it stands, so that
 * one field says where every device is however much space it takes up. How big
 * its marker is drawn is the library's business, because that follows from how
 * big the model is (ADR-0002).
 */
export interface SceneDevc extends SceneElement {
    readonly color: SceneColor,
    readonly extent: SceneDevcExtent,
    /** Only meaningful for a point device; the others are drawn from their box. */
    readonly marker: SceneDevcMarker
}

/**
 * A &GEOM - an arbitrary triangle mesh.
 *
 * The only element whose geometry does not follow from a box, so it is the one
 * that has to carry its own (ADR-0006, the separate-mesh path). `xb` is the box
 * the triangles occupy, worked out by the app, so that measuring the scene does
 * not mean walking every vertex of every geom.
 */
export interface SceneGeom extends SceneElement {
    readonly color: SceneColor,
    /** Vertex positions as flat x, y, z triples, in FDS metres. */
    readonly vertices: readonly number[],
    /**
     * Triangles as flat, **zero-based** indices into `vertices`.
     *
     * FDS counts them from one, as Fortran does; the app converts, because it is
     * the app that holds the scenario in the form FDS reads it.
     */
    readonly faces: readonly number[]
}

/**
 * One scenario, as the library receives it. Every element type crosses the
 * boundary this way and no other.
 */
export interface SceneInput {
    readonly meshes: readonly SceneMesh[],
    readonly obsts: readonly SceneObst[],
    readonly holes: readonly SceneHole[],
    readonly opens: readonly SceneOpen[],
    readonly vents: readonly SceneVent[],
    readonly fires: readonly SceneFire[],
    readonly jetfans: readonly SceneJetfan[],
    readonly devcs: readonly SceneDevc[],
    readonly geoms: readonly SceneGeom[]
}
