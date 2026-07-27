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
import { Xb } from '@services/fds-object/primitives';
import {
  isSceneJetfanDirection, SceneColor, SceneFire, SceneHole, SceneInput, SceneJetfan, SceneMesh,
  SceneObst, SceneOpen, SceneVent, SceneXb
} from '../../../../../web-smokeview-lib/src/lib/services/drawing/scene-input';

/** Drawn for an obst whose &SURF cannot be resolved. Opaque, so it stays visible. */
const FALLBACK_OBST_RGB: number[] = [255, 208, 0];

/** Drawn for a vent with no &SURF. */
const FALLBACK_VENT_RGB: number[] = [0, 0, 255];

/** Drawn for a fire with no colour of its own. */
const FALLBACK_FIRE_RGB: number[] = [255, 0, 0];

/** Drawn for a jetfan with no colour of its own. */
const FALLBACK_JETFAN_RGB: number[] = [255, 0, 0];

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
      jetfans: ventilation.jetfans.map((jetfan: JetFan) => this.jetfan(jetfan))
    };
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
      x1: xb?.x1 ?? 0, x2: xb?.x2 ?? 0,
      y1: xb?.y1 ?? 0, y2: xb?.y2 ?? 0,
      z1: xb?.z1 ?? 0, z2: xb?.z2 ?? 0
    };
  }

  /** Turn a stored 0..255 rgb triple and an alpha into what the shaders want. */
  private color(rgb: number[], alpha: number, fallbackRgb: number[] = FALLBACK_OBST_RGB): SceneColor {
    const source = (rgb && rgb.length >= 3) ? rgb : fallbackRgb;
    return {
      r: source[0] / 255,
      g: source[1] / 255,
      b: source[2] / 255,
      a: alpha
    };
  }
}
