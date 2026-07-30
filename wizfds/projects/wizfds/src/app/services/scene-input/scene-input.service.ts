import { Injectable, isDevMode } from '@angular/core';
import { find, get } from 'lodash';

import { Fds } from '@services/fds-object/fds-object';
import { Obst } from '@services/fds-object/geometry/obst';
import { Hole } from '@services/fds-object/geometry/hole';
import { Mesh } from '@services/fds-object/geometry/mesh';
import { Open } from '@services/fds-object/geometry/open';
import { Surf } from '@services/fds-object/geometry/surf';
import { Vent } from '@services/fds-object/ventilation/vent';
import { JetFan } from '@services/fds-object/ventilation/jet-fan';
import { Fire } from '@services/fds-object/fire/fire';
import { Devc } from '@services/fds-object/output/devc';
import { Geom } from '@services/fds-object/geometry/geom';
import { Init } from '@services/fds-object/general/init';
import { Zone } from '@services/fds-object/general/zone';
import { Xb } from '@services/fds-object/primitives';
import { FdsElementType } from '@services/elements/elements.service';
import {
  isSceneDevcMarker, isSceneJetfanDirection, SceneColor, SceneDevc, SceneDevcExtent, SceneDevcMarker,
  SceneFire,
  SceneGeom, SceneHole, SceneInit, SceneInput, SceneJetfan, SceneMesh, SceneObst, SceneOpen,
  SceneVent, SceneXb, SceneZone
} from '../../../../../web-smokeview-lib/src/lib/services/drawing/scene-input';
import { SceneDrawnElement } from '../../../../../web-smokeview-lib/src/lib/services/drawing/scene-change';

/** Drawn for an obst whose &SURF cannot be resolved. Opaque, so it stays visible. */
const FALLBACK_OBST_RGB: number[] = [255, 208, 0];

/** Drawn for a vent with no &SURF. */
const FALLBACK_VENT_RGB: number[] = [0, 0, 255];

/** Drawn for a fire with no colour of its own. */
const FALLBACK_FIRE_RGB: number[] = [255, 0, 0];

/** Drawn for a jetfan with no colour of its own. */
const FALLBACK_JETFAN_RGB: number[] = [255, 0, 0];

/** Devices have no colour in the FDS model, so the preview gives them one. */
const DEVC_RGB: number[] = [0, 220, 255];

/** Drawn for a &GEOM whose &SURF cannot be resolved. */
const FALLBACK_GEOM_RGB: number[] = [180, 180, 180];

/**
 * An &INIT has no colour in FDS either, so the preview gives it one - violet,
 * which nothing else on screen is.
 */
const INIT_RGB: number[] = [170, 100, 255];

/** And a &ZONE: pink, so the two condition regions never read as one. */
const ZONE_RGB: number[] = [255, 90, 200];

/**
 * A &HOLE: green, which nothing else on screen is.
 *
 * An opening is not a condition region, so it must not read as one - and it is
 * drawn over the very obst it was cut out of, so it has to be told apart from
 * the wall around it at a glance.
 */
const HOLE_RGB: number[] = [150, 230, 70];

/**
 * How solid an opening is drawn.
 *
 * A little more than a condition region: a hole is small, often seen edge-on
 * through the thickness of a wall, and it is the thing being worked on rather
 * than a note about the space.
 */
const HOLE_ALPHA = 0.35;

/**
 * How solid a condition region is drawn.
 *
 * An &INIT and a &ZONE cover the geometry they apply to by design - a warm layer
 * sits over a whole storey, a pressure zone contains a stairwell - so the point
 * of drawing them at all is lost if they hide it. Low enough to read the walls
 * through, high enough to see where the region ends.
 */
const REGION_ALPHA = 0.25;

/**
 * Which marker a device is drawn with, by the FDS QUANTITY it measures.
 *
 * The fallback, for a device that names no &PROP - which is every device in a
 * scenario written before &PROP worked, and every one whose author only cared
 * what it measures. See ADR-0008.
 */
const MARKER_BY_QUANTITY: ReadonlyMap<string, SceneDevcMarker> = new Map([
  ['SPRINKLER LINK TEMPERATURE', 'sprinkler' as SceneDevcMarker],
  ['ACTUATED SPRINKLERS', 'sprinkler' as SceneDevcMarker],
  ['CHAMBER OBSCURATION', 'smoke detector' as SceneDevcMarker],
  ['PATH OBSCURATION', 'smoke detector' as SceneDevcMarker]
]);

/** The four ways FDS lets a &DEVC occupy space. */
const DEVC_EXTENTS: readonly SceneDevcExtent[] = ['point', 'linear', 'plane', 'volume'];

/**
 * Builds what the 3D preview draws out of the scenario.
 *
 * This is the one place where the domain model turns into the library's input
 * contract. The `Fds` object stays the source of truth (ADR-0004): every element
 * type is flattened into plain, resolved values here, so the library gets no
 * reference into the model and cannot write back into what auto-save serialises.
 *
 * Resolving &SURF colours is part of the job. The library used to be handed the
 * surf list and reach for `obst.surf.surf_id.id` through an `any`; that knowledge
 * belongs on this side of the boundary.
 */
@Injectable({
  providedIn: 'root'
})
export class SceneInputService {

  /** Flatten a scenario into the state the library renders. */
  public fromFds(fds: Fds): SceneInput {
    const geometry = fds.geometry;
    const ventilation = fds.ventilation;
    const surfs: Surf[] = geometry.surfs;

    return {
      meshes: geometry.meshes.map((mesh: Mesh) => this.mesh(mesh)),
      obsts: geometry.obsts.map((obst: Obst) => this.obst(obst, surfs)),
      holes: geometry.holes.map((hole: Hole) => this.hole(hole)),
      opens: geometry.opens.map((open: Open) => this.open(open)),
      vents: ventilation.vents.map((vent: Vent) => this.vent(vent)),
      fires: fds.fires.fires.map((fire: Fire) => this.fire(fire)),
      jetfans: ventilation.jetfans.map((jetfan: JetFan) => this.jetfan(jetfan)),
      devcs: (fds.output?.devcs ?? []).map((devc: Devc) => this.devc(devc)),
      // A geom with no triangles is not something the preview can draw, and it
      // would measure the scene from a box it never occupies
      geoms: (geometry.geoms ?? [])
        .map((geom: Geom) => this.geom(geom, surfs))
        .filter((geom: SceneGeom) => geom.faces.length > 0),
      inits: (fds.general?.inits ?? []).map((init: Init) => this.init(init)),
      zones: (fds.general?.zones ?? []).map((zone: Zone) => this.zone(zone))
    };
  }

  /**
   * One element, flattened the same way the whole scenario is.
   *
   * What the incremental redraw is built from: an applied command changed a
   * handful of elements, and each of them has to reach the library in exactly
   * the form it would have arrived in through `fromFds()` - same colours, same
   * resolved &SURF, same copied coordinates. Which is why this shares every
   * per-type method with it rather than restating any of them.
   *
   * Undefined for an element the preview does not draw - a &SURF and a &SLCF
   * have no shape - and for a &GEOM with no triangles, on the same reasoning as
   * above.
   */
  public drawn(type: FdsElementType, element: any, fds: Fds): SceneDrawnElement | undefined {
    if (!element) { return undefined; }
    const surfs: Surf[] = fds.geometry.surfs;

    switch (type) {
      case 'mesh': return { type: 'mesh', element: this.mesh(element) };
      case 'obst': return { type: 'obst', element: this.obst(element, surfs) };
      case 'hole': return { type: 'hole', element: this.hole(element) };
      case 'open': return { type: 'open', element: this.open(element) };
      case 'vent': return { type: 'vent', element: this.vent(element) };
      case 'fire': return { type: 'fire', element: this.fire(element) };
      case 'jetfan': return { type: 'jetfan', element: this.jetfan(element) };
      case 'devc': return { type: 'devc', element: this.devc(element) };
      case 'init': return { type: 'init', element: this.init(element) };
      case 'zone': return { type: 'zone', element: this.zone(element) };
      case 'geom': {
        const geom = this.geom(element, surfs);
        return geom.faces.length > 0 ? { type: 'geom', element: geom } : undefined;
      }
      default: return undefined;
    }
  }

  /** A &MESH: an outline, in a colour the library picks itself. */
  private mesh(mesh: Mesh): SceneMesh {
    return { uuid: mesh.uuid, id: mesh.id, xb: this.xb(mesh.xb) };
  }

  /** A &HOLE, in the one colour nothing else on screen is drawn in. */
  private hole(hole: Hole): SceneHole {
    return {
      uuid: hole.uuid, id: hole.id, xb: this.xb(hole.xb),
      color: this.color(HOLE_RGB, HOLE_ALPHA, HOLE_RGB)
    };
  }

  /** An `OPEN` vent: a plane, coloured by the library. */
  private open(open: Open): SceneOpen {
    return { uuid: open.uuid, id: open.id, xb: this.xb(open.xb) };
  }

  /** An &INIT - a region that starts in a state other than ambient. */
  private init(init: Init): SceneInit {
    return {
      uuid: init.uuid, id: init.id, xb: this.xb(init.xb),
      color: this.color(INIT_RGB, REGION_ALPHA, INIT_RGB)
    };
  }

  /** A &ZONE - a sealed pressure zone. */
  private zone(zone: Zone): SceneZone {
    return {
      uuid: zone.uuid, id: zone.id, xb: this.xb(zone.xb),
      color: this.color(ZONE_RGB, REGION_ALPHA, ZONE_RGB)
    };
  }

  /**
   * A device, with the shape of its marker resolved.
   *
   * A point device is given a box with no extent where it stands, so that one
   * field says where every device is however much space it takes up. How big the
   * marker is drawn follows from how big the model is, which is the library's
   * business (ADR-0002).
   */
  private devc(devc: Devc): SceneDevc {
    const extent = this.devcExtent(devc.geometrical_type);

    return {
      uuid: devc.uuid,
      id: devc.id,
      xb: extent === 'point' ? this.pointXb(devc) : this.xb(devc.xb),
      extent: extent,
      marker: this.devcMarker(devc),
      color: this.color(DEVC_RGB, 1, DEVC_RGB)
    };
  }

  /**
   * What kind of device this is, for the shape of its marker.
   *
   * The &PROP first, because that is where the user says what the device *is*
   * and it is what SmokeView itself reads. The QUANTITY is a fallback: it says
   * what the device measures, which usually implies the kind but is a weaker
   * statement - and a device may name a &PROP whose `SMOKEVIEW_ID` is one of
   * SmokeView's many other objects, or one the user defined. See ADR-0008.
   */
  private devcMarker(devc: Devc): SceneDevcMarker {
    const smokeviewId: string = (get(devc.prop_id, 'smokeview_id') ?? '').toString();
    if (isSceneDevcMarker(smokeviewId)) { return smokeviewId; }

    const quantity: string = (devc.quantity?.quantity ?? '').toUpperCase();
    return MARKER_BY_QUANTITY.get(quantity) ?? 'sensor';
  }

  /** Narrow a stored geometrical type onto the four the library draws. */
  private devcExtent(stored: string): SceneDevcExtent {
    const candidate = (stored ?? '') as SceneDevcExtent;
    return DEVC_EXTENTS.indexOf(candidate) !== -1 ? candidate : 'point';
  }

  /** The box a point device occupies: none at all, centred where it stands. */
  private pointXb(devc: Devc): SceneXb {
    const x = this.metres(devc.xyz?.x);
    const y = this.metres(devc.xyz?.y);
    const z = this.metres(devc.xyz?.z);
    return { x1: x, x2: x, y1: y, y2: y, z1: z, z2: z };
  }

  /**
   * A &GEOM, flattened into the buffers a mesh is built from.
   *
   * The only element that carries its own geometry rather than a box, so this is
   * where the scenario's shape - vertices as triples, faces counted from one, as
   * the input file is written - turns into the shape a vertex buffer wants.
   */
  private geom(geom: Geom, surfs: Surf[]): SceneGeom {
    const verts: number[][] = Array.isArray(geom.verts) ? geom.verts : [];
    const vertices: number[] = [];
    verts.forEach((vert: number[]) => {
      vertices.push(this.metres(vert?.[0]), this.metres(vert?.[1]), this.metres(vert?.[2]));
    });

    const surfId: string = (geom.surf as Surf)?.id ?? '';
    const surf: Surf = surfId
      ? find(surfs, (candidate: Surf) => !!candidate && candidate.id === surfId)
      : undefined;

    return {
      uuid: geom.uuid,
      id: geom.id,
      xb: this.boundsOf(vertices),
      vertices: vertices,
      faces: this.faces(geom.faces, verts.length),
      color: surf ? this.color(surf.color?.rgb, surf.transparency) : this.color(undefined, 1, FALLBACK_GEOM_RGB)
    };
  }

  /**
   * Triangles as zero-based indices, dropping any that point past the vertices.
   *
   * A geom arrives from CAD, and a triangle indexing past the list would be
   * drawn from whatever the buffer happens to hold beyond it.
   */
  private faces(stored: number[][], vertexCount: number): number[] {
    const faces: number[] = [];
    (Array.isArray(stored) ? stored : []).forEach((face: number[]) => {
      if (!face || face.length < 3) { return; }
      // FDS counts vertices from one, as Fortran does
      const corners = [face[0] - 1, face[1] - 1, face[2] - 1];
      if (corners.some(corner => !Number.isInteger(corner) || corner < 0 || corner >= vertexCount)) {
        if (isDevMode()) {
          try { console.warn('[SceneInputService] Dropping a &GEOM face that points past its vertices:', face); } catch { }
        }
        return;
      }
      faces.push(...corners);
    });
    return faces;
  }

  /** The box a flat position buffer occupies, in metres. */
  private boundsOf(vertices: readonly number[]): SceneXb {
    if (vertices.length === 0) {
      return { x1: 0, x2: 0, y1: 0, y2: 0, z1: 0, z2: 0 };
    }

    let xMin = Infinity, yMin = Infinity, zMin = Infinity;
    let xMax = -Infinity, yMax = -Infinity, zMax = -Infinity;
    for (let i = 0; i + 2 < vertices.length; i += 3) {
      xMin = Math.min(xMin, vertices[i]); xMax = Math.max(xMax, vertices[i]);
      yMin = Math.min(yMin, vertices[i + 1]); yMax = Math.max(yMax, vertices[i + 1]);
      zMin = Math.min(zMin, vertices[i + 2]); zMax = Math.max(zMax, vertices[i + 2]);
    }
    return { x1: xMin, x2: xMax, y1: yMin, y2: yMax, z1: zMin, z2: zMax };
  }

  /**
   * An obst with its colour resolved.
   *
   * Only `surf_id` carries a colour - a `surf_ids` or `surf_id6` obst has one
   * &SURF per face and no single colour to draw it in, so it takes the fallback,
   * exactly as it did while the lookup lived in the library.
   */
  private obst(obst: Obst, surfs: Surf[]): SceneObst {
    // The obst's own surf_id is already a resolved Surf; the list is consulted
    // anyway, so that an obst naming a &SURF the scenario no longer has still
    // reports the name it declares while falling back for the colour.
    const surfId: string = (obst.surf?.surf_id as Surf)?.id ?? '';
    const surf: Surf = surfId
      ? find(surfs, (candidate: Surf) => !!candidate && candidate.id === surfId)
      : undefined;

    if (surfId && !surf && isDevMode()) {
      try { console.warn(`[SceneInputService] Obst ${obst.id} names a &SURF the scenario has no longer: ${surfId}`); } catch { }
    }

    return {
      uuid: obst.uuid,
      id: obst.id,
      xb: this.xb(obst.xb),
      surfId: surfId,
      permitHole: obst.permit_hole === true,
      // FDS TRANSPARENCY maps straight onto alpha: 1 is opaque, 0 invisible
      color: surf ? this.color(surf.color?.rgb, surf.transparency) : this.color(undefined, 1, FALLBACK_OBST_RGB)
    };
  }

  /** A ventilation vent, coloured by the &SURF it points at. */
  private vent(vent: Vent): SceneVent {
    // Vent.surf is typed `any` in the model and is undefined when none is set
    const surf = vent.surf;

    return {
      uuid: vent.uuid,
      id: vent.id,
      xb: this.xb(vent.xb),
      color: this.color(surf?.color?.rgb, surf?.transparency ?? 1, FALLBACK_VENT_RGB)
    };
  }

  /**
   * A fire, drawn as the plane of its &VENT.
   *
   * Fires have no box of their own - the &VENT carries the geometry and the
   * &SURF the colour. They are always drawn opaque.
   */
  private fire(fire: Fire): SceneFire {
    return {
      uuid: fire.uuid,
      id: fire.id,
      xb: this.xb(fire.vent?.xb),
      color: this.color(fire.surf?.color?.rgb, 1, FALLBACK_FIRE_RGB)
    };
  }

  /**
   * A jet fan. Its own `transparency` is the alpha - a jetfan is drawn as a
   * translucent box rather than through a &SURF.
   *
   * A transparency of 0 is drawn half-transparent rather than invisible, which is
   * how the preview has always shown a jetfan that was never given one.
   */
  private jetfan(jetfan: JetFan): SceneJetfan {
    const direction: string = jetfan.direction ?? '';

    return {
      uuid: jetfan.uuid,
      id: jetfan.id,
      xb: this.xb(jetfan.xb),
      direction: isSceneJetfanDirection(direction) ? direction : '+x',
      color: this.color(jetfan.color?.rgb, jetfan.transparency || 0.5, FALLBACK_JETFAN_RGB)
    };
  }

  /** Copy the coordinates out of the model, so nothing downstream shares them. */
  private xb(xb: Xb): SceneXb {
    return {
      x1: this.metres(xb?.x1), x2: this.metres(xb?.x2),
      y1: this.metres(xb?.y1), y2: this.metres(xb?.y2),
      z1: this.metres(xb?.z1), z2: this.metres(xb?.z2)
    };
  }

  /**
   * One coordinate, as the number the contract promises.
   *
   * `Xb` and `Xyz` convert on assignment now, so a coordinate that came through
   * a form is already a number by the time it reaches here - see
   * `primitives.ts`. This stays for the two things that never went through
   * those classes:
   *
   * - a &GEOM's vertices, which are a raw `number[][]` straight off the CAD
   *   plugin, and
   * - whatever a future field is added as, since the failure mode is silent:
   *   the library does arithmetic on these, and a string reaching it once left
   *   the whole scene measured as a default ten-metre box.
   *
   * It also settles what NaN means at this boundary, which the model
   * deliberately leaves open: the editor wants a fault it can show the user,
   * the preview wants a number it can draw.
   */
  private metres(value: number): number {
    const asNumber = Number(value);
    // Drawing at NaN would take the whole scene's bounding box with it
    return Number.isFinite(asNumber) ? asNumber : 0;
  }

  /**
   * Turn a stored 0..255 rgb triple and an alpha into what the shaders want.
   *
   * Coerced for the same reason the coordinates are - a colour that has been
   * through the form is three strings. See metres().
   */
  private color(rgb: number[], alpha: number, fallbackRgb: number[] = FALLBACK_OBST_RGB): SceneColor {
    const source = (rgb && rgb.length >= 3) ? rgb : fallbackRgb;
    const channel = (value: number) => {
      const asNumber = Number(value);
      return Number.isFinite(asNumber) ? asNumber / 255 : 0;
    };
    const opacity = Number(alpha);

    return {
      r: channel(source[0]),
      g: channel(source[1]),
      b: channel(source[2]),
      // An unreadable transparency draws the element solid rather than invisible
      a: Number.isFinite(opacity) ? opacity : 1
    };
  }
}
