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
 *
 * One producer cannot keep that promise: the standalone viewer reads geometry
 * out of a Smokeview export, which SmokeView normalised on its way in and which
 * carries no scale to undo it with. Its boxes are in SmokeView's units, and the
 * library cannot tell the difference - everything is measured off the model
 * itself, so it draws either way. See ObstJsonService, which is the only place
 * that happens.
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

/**
 * The kinds of element the library draws.
 *
 * A pick answers with one of these next to the `uuid`, so whoever is told about
 * it knows which of the scenario's lists to look in - the app holds eleven of
 * them and scanning all of them for a uuid is work the scene can save it.
 *
 * The names are the app's own words for these elements, which are the FDS
 * namelist names lowercased. Only what is drawn is here.
 */
export type SceneElementType =
    'obst' | 'hole' | 'mesh' | 'open' | 'vent' | 'fire' | 'jetfan' | 'devc' | 'geom' | 'init' | 'zone';

/** Everything the library draws has an identity, an FDS name and a box. */
export interface SceneElement {
    readonly uuid: string,
    /** The FDS `ID`, shown to the user. Not an identity - it need not be unique. */
    readonly id: string,
    /** Where the element stands, in FDS metres. */
    readonly xb: SceneXb
}

/**
 * How big one cell of a &MESH's grid is, in FDS metres, on each axis.
 *
 * An FDS mesh is uniform - `IJK` divides `XB` into equal cells - so three
 * numbers describe the whole grid, and a cell boundary is a multiple of one of
 * them measured from the mesh's own corner.
 *
 * The names are the mesh's own: `i` spans x, `j` spans y, `k` spans z.
 */
export interface SceneCell {
    readonly i: number,
    readonly j: number,
    readonly k: number
}

/**
 * A &MESH. Drawn as an outline, in a colour the library picks itself.
 *
 * It carries its cell size because it is what an edit snaps to (#124), and
 * which mesh's grid applies at a point is a question about boxes that has to be
 * answered while the pointer is moving. The app holds the same three numbers as
 * `isize` / `jsize` / `ksize`.
 */
export interface SceneMesh extends SceneElement {
    readonly cell: SceneCell
}

/**
 * A &HOLE - an opening, cut out of every &OBST it overlaps.
 *
 * It is also drawn in its own right, as a translucent outlined box. Nothing else
 * would put anything on screen where a hole is - that is the point of one - so
 * without a box of its own there is nothing to click, and a doorway could not be
 * selected, moved or deleted from the 3D view at all.
 *
 * Like an &INIT and a &ZONE it has no colour in FDS, so the app picks one.
 */
export interface SceneHole extends SceneElement {
    readonly color: SceneColor
}

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
 * Narrow a `SMOKEVIEW_ID` onto the four shapes the library can draw.
 *
 * SmokeView ships many more objects than these and lets a user define their
 * own, so a &PROP may name one the library has never heard of - in which case
 * the app falls back on what the device measures.
 */
export function isSceneDevcMarker(value: string): value is SceneDevcMarker {
    return SCENE_DEVC_MARKERS.indexOf(value as SceneDevcMarker) !== -1;
}

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
 * A volume that describes a condition rather than a thing.
 *
 * An &INIT and a &ZONE are both boxes, and neither is matter: one says what the
 * air inside it starts as, the other that the pressure inside it is solved on
 * its own. They overlap the geometry they apply to by design, which is why they
 * are drawn translucent and why nothing here is opaque enough to hide a wall.
 *
 * Neither has a colour in FDS, so the app picks one - as it already does for a
 * &DEVC. The library is told rather than deciding, so that one place answers
 * what everything on screen is coloured by.
 */
export interface SceneRegion extends SceneElement {
    readonly color: SceneColor
}

/** An &INIT - a region the simulation starts in a state other than ambient. */
export type SceneInit = SceneRegion;

/** A &ZONE - a sealed pressure zone. */
export type SceneZone = SceneRegion;

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
    readonly geoms: readonly SceneGeom[],
    readonly inits: readonly SceneInit[],
    readonly zones: readonly SceneZone[]
}
