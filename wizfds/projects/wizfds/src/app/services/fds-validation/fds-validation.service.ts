import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { ElementsService, FdsElementType } from '@services/elements/elements.service';
import { boxOf } from '@services/elements/element-geometry';
import { MainService } from '@services/main/main.service';
import { Main } from '@services/main/main';
import { checkAll, FdsWarning, RuleElement, RuleMesh, RuleModel } from './fds-rules';

/**
 * The element types that occupy space, and so have rules to break.
 *
 * A &SURF and a &SLCF are in the scenario and not here: neither has a box, and
 * neither is something the 3D view can put wrong. A specie &VENT is here even
 * though the preview does not draw it - it is an FDS &VENT and can hang in mid
 * air like any other.
 */
const CHECKED_TYPES: readonly FdsElementType[] = [
  'mesh', 'obst', 'hole', 'open', 'vent', 'spec', 'jetfan', 'fire', 'devc', 'init', 'zone'
];

/**
 * What is wrong with the scenario, as the palette and the status bar show it.
 *
 * The rules themselves are in `fds-rules.ts`; this is the bookkeeping around
 * them - which element has which warnings, how many there are altogether, and
 * when that changed.
 *
 * Recomputed for the whole scenario rather than for the elements a command
 * touched. One moved &OBST changes what a &VENT resting on it is standing on,
 * and one moved &MESH changes the grid every element in it is measured against,
 * so "what this command affected" is not the same as "what this command
 * touched". A pass over ten thousand elements costs a few milliseconds and it
 * happens once per gesture, not once per frame - see FdsEditService.
 */
@Injectable({
  providedIn: 'root'
})
export class FdsValidationService {

  /** Warnings by the uuid of the element they are about. */
  private byUuid = new Map<string, FdsWarning[]>();

  private total = 0;

  private readonly changedSubject = new Subject<void>();

  /** Fires when the warnings change - what the status bar redraws on. */
  public readonly changed$: Observable<void> = this.changedSubject.asObservable();

  private main: Main;

  constructor(mainService: MainService, private elements: ElementsService) {
    mainService.getMain().subscribe(main => this.main = main);
    // A warning names an element of one scenario, so nothing carries over - and
    // the next scenario has its own faults, which it may well arrive with: one
    // imported from CAD, or written before a rule existed, is wrong from the
    // moment it opens rather than from the first edit.
    mainService.currentFdsScenario$.subscribe(() => this.revalidate());
  }

  /** How many things are wrong with the scenario altogether. */
  public get count(): number {
    return this.total;
  }

  /** What is wrong with one element, for the palette that shows it. */
  public warningsFor(uuid: string): readonly FdsWarning[] {
    return this.byUuid.get(uuid) ?? [];
  }

  /** Check the whole scenario again, and say so if anything changed. */
  public revalidate(): void {
    const model = this.model();
    if (!model) { this.reset(); return; }

    const warnings = checkAll(this.elementsToCheck(), model);

    this.byUuid = new Map<string, FdsWarning[]>();
    warnings.forEach(warning => {
      const forElement = this.byUuid.get(warning.uuid) ?? [];
      forElement.push(warning);
      this.byUuid.set(warning.uuid, forElement);
    });
    this.total = warnings.length;

    this.changedSubject.next();
  }

  /** Nothing is known about the scenario - there is none, or it has changed. */
  private reset(): void {
    if (this.total === 0 && this.byUuid.size === 0) { return; }

    this.byUuid = new Map<string, FdsWarning[]>();
    this.total = 0;
    this.changedSubject.next();
  }

  /** The meshes and the obsts, which are what the rules judge against. */
  private model(): RuleModel | undefined {
    if (!this.main?.currentFdsScenario?.fdsObject) { return undefined; }

    return {
      meshes: this.elements.listOf('mesh')
        .filter(mesh => !!mesh && !!mesh.xb)
        .map((mesh: any): RuleMesh => ({
          uuid: mesh.uuid, id: mesh.id, xb: boxOf('mesh', mesh),
          // isize, jsize and ksize are the cell dimensions in metres - see Mesh
          cell: { i: Number(mesh.isize), j: Number(mesh.jsize), k: Number(mesh.ksize) }
        })),
      obsts: this.elements.listOf('obst')
        .filter(obst => !!obst && !!obst.xb)
        .map((obst: any) => ({ uuid: obst.uuid, xb: boxOf('obst', obst) }))
    };
  }

  /**
   * Every element of the scenario that occupies space, as the rules see one.
   *
   * An element with no box is skipped rather than given an empty one: a point
   * &DEVC stands at a coordinate on purpose, and a &SURF has no shape at all.
   */
  private elementsToCheck(): RuleElement[] {
    const checked: RuleElement[] = [];

    CHECKED_TYPES.forEach(type => {
      this.elements.listOf(type).forEach((element: any) => {
        const xb = boxOf(type, element);
        if (!element || !element.uuid || !xb) { return; }
        checked.push({ uuid: element.uuid, type: type, xb: xb });
      });
    });

    return checked;
  }
}
