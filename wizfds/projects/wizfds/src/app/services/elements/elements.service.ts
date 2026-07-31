import { Injectable } from '@angular/core';
import { find } from 'lodash';

import { Fds } from '@services/fds-object/fds-object';
import { MainService } from '@services/main/main.service';
import { Main } from '@services/main/main';
import { Mesh } from '@services/fds-object/geometry/mesh';
import { Open } from '@services/fds-object/geometry/open';
import { Obst } from '@services/fds-object/geometry/obst';
import { Hole } from '@services/fds-object/geometry/hole';
import { Geom } from '@services/fds-object/geometry/geom';
import { Surf } from '@services/fds-object/geometry/surf';
import { Vent } from '@services/fds-object/ventilation/vent';
import { JetFan } from '@services/fds-object/ventilation/jet-fan';
import { Fire } from '@services/fds-object/fire/fire';
import { Devc } from '@services/fds-object/output/devc';
import { Slcf } from '@services/fds-object/output/slcf';
import { VentSpec } from '@services/fds-object/specie/vent';
import { Init } from '@services/fds-object/general/init';
import { Zone } from '@services/fds-object/general/zone';

/**
 * The kinds of element the app can address one at a time.
 *
 * The FDS namelist names, lowercased, as the rest of the app already spells them
 * (`ui.geometry['obst']`, the `type` route parameter). A superset of what the 3D
 * preview draws: a &SURF and a &SLCF have no shape on screen but do arrive from
 * the CAD plugin with an `idAC`.
 */
export type FdsElementType =
  'mesh' | 'open' | 'obst' | 'hole' | 'geom' | 'surf' |
  'vent' | 'jetfan' | 'fire' | 'devc' | 'slcf' | 'spec' |
  'init' | 'zone';

/** An element of the current scenario, and which kind it is. */
export interface FoundElement {
  readonly type: FdsElementType;
  /** The element itself - one of the domain classes in `services/fds-object`. */
  readonly element: any;
}

/**
 * Where each kind of element lives in the scenario, and how one is built.
 *
 * One table rather than a lookup per question. What it replaces was a cascade of
 * fourteen `findIndex` blocks in `WebsocketService.findElementByIdAC()`, which
 * answered by `idAC` only, disagreed with the `switch` that consumed it - it
 * returned `'spev'` where that switch expected `'spec'` - and never looked at
 * &SURFs at all, though the switch had a case for them.
 *
 * `build` is the same construction `Fds` makes when a scenario is loaded, down
 * to which of the scenario's other lists each class is handed to resolve its
 * references through. Undo restores an element from its own `toJSON()` and a
 * create makes one from nothing (#123), and both have to produce exactly what
 * loading the saved scenario would have.
 */
const ELEMENT_LISTS: ReadonlyArray<{
  type: FdsElementType,
  listOf: (fds: Fds) => any[],
  build: (json: string, fds: Fds) => any
}> = [
    {
      type: 'mesh', listOf: (fds) => fds.geometry.meshes,
      build: (json) => new Mesh(json)
    },
    {
      type: 'open', listOf: (fds) => fds.geometry.opens,
      build: (json) => new Open(json)
    },
    {
      type: 'obst', listOf: (fds) => fds.geometry.obsts,
      build: (json, fds) => new Obst(json, fds.geometry.surfs, fds.output.devcs)
    },
    {
      type: 'hole', listOf: (fds) => fds.geometry.holes,
      build: (json, fds) => new Hole(json, fds.geometry.surfs, fds.output.devcs)
    },
    {
      type: 'geom', listOf: (fds) => fds.geometry.geoms,
      build: (json, fds) => new Geom(json, fds.geometry.surfs)
    },
    {
      type: 'surf', listOf: (fds) => fds.geometry.surfs,
      build: (json, fds) => new Surf(json, fds.geometry.matls)
    },
    {
      type: 'vent', listOf: (fds) => fds.ventilation.vents,
      build: (json, fds) => new Vent(json, fds.ventilation.surfs)
    },
    {
      type: 'jetfan', listOf: (fds) => fds.ventilation.jetfans,
      build: (json, fds) => new JetFan(json, fds.ramps.ramps)
    },
    {
      type: 'fire', listOf: (fds) => fds.fires.fires,
      build: (json, fds) => new Fire(json, fds.ramps.ramps)
    },
    {
      type: 'devc', listOf: (fds) => fds.output.devcs,
      build: (json, fds) => new Devc(json, fds.output.props, fds.specie.specs, fds.particle.parts)
    },
    {
      type: 'slcf', listOf: (fds) => fds.output.slcfs,
      build: (json, fds) => new Slcf(json, fds.specie.specs, fds.particle.parts)
    },
    {
      type: 'spec', listOf: (fds) => fds.specie.vents,
      build: (json, fds) => new VentSpec(json, fds.specie.surfs)
    },
    {
      type: 'init', listOf: (fds) => fds.general.inits,
      build: (json) => new Init(json)
    },
    {
      type: 'zone', listOf: (fds) => fds.general.zones,
      build: (json) => new Zone(json)
    }
  ];

/**
 * Finds an element of the current scenario, whichever way it is named.
 *
 * `uuid` is the identity (ADR-0005), and it is what the 3D preview, the forms and
 * the selection all speak. `idAC` is the optional link to the CAD drawing, and it
 * is what arrives from the plugin - so the bridge has to translate, in both
 * directions, and this is where that happens.
 */
@Injectable({
  providedIn: 'root'
})
export class ElementsService {

  private main: Main;

  constructor(mainService: MainService) {
    mainService.getMain().subscribe(main => this.main = main);
  }

  /** Every element of one kind, in the order the scenario holds them. */
  public listOf(type: FdsElementType): any[] {
    const fds = this.fds();
    if (!fds) { return []; }

    const kind = find(ELEMENT_LISTS, (candidate) => candidate.type === type);
    return kind ? (kind.listOf(fds) ?? []) : [];
  }

  /**
   * Build an element of one kind from the JSON it serialises to.
   *
   * The scenario's own lists come along, so that the &SURF a rebuilt &OBST names
   * is the same object the rest of the app holds and not a copy of it - which is
   * what `Fds` does when it loads a scenario, and the reason this is a table
   * rather than a `new` at the call site.
   *
   * Undefined for a kind nothing knows how to build, and with no scenario open.
   */
  public build(type: FdsElementType, json: any): any | undefined {
    const fds = this.fds();
    if (!fds) { return undefined; }

    const kind = find(ELEMENT_LISTS, (candidate) => candidate.type === type);
    return kind ? kind.build(JSON.stringify(json ?? {}), fds) : undefined;
  }

  /** The element with this `uuid`, and what kind it is. */
  public byUuid(uuid: string): FoundElement | undefined {
    if (!uuid) { return undefined; }
    return this.search((element) => element.uuid === uuid);
  }

  /**
   * The element the drawing knows by this `idAC`, and what kind it is.
   *
   * `idAC` arrives from the plugin as a number and is stored as one, but a
   * message carries whatever JSON held - so they are compared loosely, as the
   * cascade this replaces did.
   */
  public byIdAC(idAC: number | string): FoundElement | undefined {
    // Absent, empty or zero all mean "not in the drawing" - see CadService
    if (idAC === undefined || idAC === null || idAC === '' || Number(idAC) === 0) {
      return undefined;
    }
    // eslint-disable-next-line eqeqeq
    return this.search((element) => element.idAC == idAC);
  }

  /** The `idAC` of an element, if the drawing contains it at all. */
  public idACOf(uuid: string): number | undefined {
    const found = this.byUuid(uuid);
    const idAC = found ? found.element.idAC : undefined;
    return idAC ? idAC : undefined;
  }

  private search(matches: (element: any) => boolean): FoundElement | undefined {
    const fds = this.fds();
    if (!fds) { return undefined; }

    for (const kind of ELEMENT_LISTS) {
      const element = find(kind.listOf(fds) ?? [], (candidate) => !!candidate && matches(candidate));
      if (element) { return { type: kind.type, element: element }; }
    }
    return undefined;
  }

  /** The scenario currently open, if one is. */
  private fds(): Fds | undefined {
    return this.main?.currentFdsScenario?.fdsObject;
  }
}
