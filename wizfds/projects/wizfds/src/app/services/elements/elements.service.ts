import { Injectable } from '@angular/core';
import { find } from 'lodash';

import { Fds } from '@services/fds-object/fds-object';
import { MainService } from '@services/main/main.service';
import { Main } from '@services/main/main';

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
 * Where each kind of element lives in the scenario.
 *
 * One table rather than a lookup per question. What it replaces was a cascade of
 * fourteen `findIndex` blocks in `WebsocketService.findElementByIdAC()`, which
 * answered by `idAC` only, disagreed with the `switch` that consumed it - it
 * returned `'spev'` where that switch expected `'spec'` - and never looked at
 * &SURFs at all, though the switch had a case for them.
 */
const ELEMENT_LISTS: ReadonlyArray<{ type: FdsElementType, listOf: (fds: Fds) => any[] }> = [
  { type: 'mesh', listOf: (fds) => fds.geometry.meshes },
  { type: 'open', listOf: (fds) => fds.geometry.opens },
  { type: 'obst', listOf: (fds) => fds.geometry.obsts },
  { type: 'hole', listOf: (fds) => fds.geometry.holes },
  { type: 'geom', listOf: (fds) => fds.geometry.geoms },
  { type: 'surf', listOf: (fds) => fds.geometry.surfs },
  { type: 'vent', listOf: (fds) => fds.ventilation.vents },
  { type: 'jetfan', listOf: (fds) => fds.ventilation.jetfans },
  { type: 'fire', listOf: (fds) => fds.fires.fires },
  { type: 'devc', listOf: (fds) => fds.output.devcs },
  { type: 'slcf', listOf: (fds) => fds.output.slcfs },
  { type: 'spec', listOf: (fds) => fds.specie.vents },
  { type: 'init', listOf: (fds) => fds.general.inits },
  { type: 'zone', listOf: (fds) => fds.general.zones }
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
