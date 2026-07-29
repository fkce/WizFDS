import { Injectable, isDevMode } from '@angular/core';
import { find } from 'lodash';

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
import { Xb } from '@services/fds-object/primitives';
import {
  isSceneJetfanDirection, SceneColor, SceneDevc, SceneDevcExtent, SceneDevcMarker, SceneFire,
  SceneGeom, SceneHole, SceneInput, SceneJetfan, SceneMesh, SceneObst, SceneOpen, SceneVent, SceneXb
} from '../../../../../web-smokeview-lib/src/lib/services/drawing/scene-input';

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
 * Which marker a device is drawn with, by the FDS QUANTITY it measures.
 *
 * The quantity is the only link the app actually keeps: `PROP_ID` is never
 * written to the input file, the device form does not offer it, and the model's
 * own resolver never finds the &PROP - so a marker read off &PROP would be one
 * read off nothing. See ADR-0008.
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
      meshes: geometry.meshes.map((mesh: Mesh): SceneMesh => ({
        uuid: mesh.uuid, id: mesh.id, xb: this.xb(mesh.xb)
      })),
      obsts: geometry.obsts.map((obst: Obst) => this.obst(obst, surfs)),
      holes: geometry.holes.map((hole: Hole): SceneHole => ({
        uuid: hole.uuid, id: hole.id, xb: this.xb(hole.xb)
      })),
      opens: geometry.opens.map((open: Open): SceneOpen => ({
        uuid: open.uuid, id: open.id, xb: this.xb(open.xb)
      })),
      vents: ventilation.vents.map((vent: Vent) => this.vent(vent)),
      fires: fds.fires.fires.map((fire: Fire) => this.fire(fire)),
      jetfans: ventilation.jetfans.map((jetfan: JetFan) => this.jetfan(jetfan)),
      devcs: (fds.output?.devcs ?? []).map((devc: Devc) => this.devc(devc)),
      // A geom with no triangles is not something the preview can draw, and it
      // would measure the scene from a box it never occupies
      geoms: (geometry.geoms ?? [])
        .map((geom: Geom) => this.geom(geom, surfs))
        .filter((geom: SceneGeom) => geom.faces.length > 0)
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
    const quantity: string = (devc.quantity?.quantity ?? '').toUpperCase();

    return {
      uuid: devc.uuid,
      id: devc.id,
      xb: extent === 'point' ? this.pointXb(devc) : this.xb(devc.xb),
      extent: extent,
      marker: MARKER_BY_QUANTITY.get(quantity) ?? 'sensor',
      color: this.color(DEVC_RGB, 1, DEVC_RGB)
    };
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
   * The domain model does not hold what its type says it does: `ngModel` on a
   * text input writes a **string**, the `decimalInput` directive only validates
   * and reformats the DOM value, and `Xb`'s setter takes whatever it is handed.
   * So a scenario that has been through the geometry form carries `'40'` where
   * it declares `40`.
   *
   * The library does arithmetic on these. `x1 + x2` on two strings concatenates,
   * which drew a mesh edited from 10..40 m centred on 520 m; and
   * `Number.isFinite('40')` is false, so SceneBoundsService found nothing it
   * could measure and left the scene at its default ten-metre box - taking the
   * camera, the clip ranges and every width derived from the model's size with
   * it. Both symptoms appeared only after an edit, because a scenario loaded
   * from the database goes through `new Xb(...)`, which does convert.
   *
   * Coerced here rather than in the model because this is the boundary that
   * declares the type (ADR-0004): the library is handed flat, resolved values
   * and is entitled to trust them.
   */
  private metres(value: number): number {
    const asNumber = Number(value);
    // A field cleared in the form arrives as '': drawing at NaN would take the
    // whole scene's bounding box with it
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
