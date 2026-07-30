import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { find, map } from 'lodash';

import { MainService } from '@services/main/main.service';
import { FdsElementType } from '@services/elements/elements.service';

/** One selected element: what it is, and which one (ADR-0005). */
export interface SelectedElement {
  readonly uuid: string;
  readonly type: FdsElementType;
}

/**
 * What is selected, for the whole app.
 *
 * A selection used to live in three places that knew nothing of each other: the
 * 3D preview held picked obsts, each form held its own active element, and a
 * click in CAD arrived as a route parameter. Everything Phase 5 adds - a gizmo,
 * a properties palette, a delete - acts on a selection, so there has to be one.
 *
 * It lives here rather than in the preview because it spans more than the
 * preview: the forms and the CAD bridge are outside the library, and the library
 * is only ever *told* what is selected (ADR-0004). It is keyed by `uuid` because
 * that is what identifies an element everywhere in the system (ADR-0005) - an
 * `idAC` would leave out everything drawn in the browser.
 */
@Injectable({
  providedIn: 'root'
})
export class SelectionService {

  private readonly selectedSubject = new BehaviorSubject<readonly SelectedElement[]>([]);

  /**
   * What is selected, replayed to whoever subscribes.
   *
   * Replayed on purpose: a form subscribes when the user opens it, long after the
   * click in 3D or in CAD that made the selection, and still has to be told.
   */
  public readonly selected$: Observable<readonly SelectedElement[]> =
    this.selectedSubject.asObservable();

  constructor(mainService: MainService) {
    // A uuid names an element of one scenario. Carrying a selection into the next
    // one would name nothing, or - worse - something else.
    mainService.currentFdsScenario$.subscribe(() => this.clear());
  }

  /** What is selected, for a caller that wants it now rather than on change. */
  public get selected(): readonly SelectedElement[] {
    return this.selectedSubject.value;
  }

  /**
   * The element selected most recently - what a panel that shows one element
   * shows, and what a contextual tab is named after.
   *
   * The last and not the first: a ctrl+click appends, so the first is the one
   * the user chose longest ago, and a palette naming it would stop following the
   * clicks as soon as a second element was added. The pick panel this replaces
   * read the same end of the list.
   */
  public get lastSelected(): SelectedElement | undefined {
    return this.selected[this.selected.length - 1];
  }

  /**
   * Select one element.
   *
   * @param options `add` extends the selection, and takes the element back out
   *                when it is already in - what a ctrl+click does
   */
  public select(element: SelectedElement, options: { add?: boolean } = {}): void {
    const current = this.selected;

    if (!options.add) {
      this.setSelection([element]);
      return;
    }

    const already = find(current, (candidate) => candidate.uuid === element.uuid);
    this.setSelection(already
      ? current.filter((candidate) => candidate.uuid !== element.uuid)
      : [...current, element]);
  }

  /**
   * Select exactly these elements, replacing whatever was selected.
   *
   * Silent when nothing changes. A form both reads the selection and publishes to
   * it - it opens what is selected, and selects what the user clicks in its list -
   * so without this the two would chase each other round for ever.
   */
  public setSelection(elements: readonly SelectedElement[]): void {
    if (this.sameAsSelected(elements)) { return; }
    this.selectedSubject.next([...elements]);
  }

  /** Select nothing - a click on empty space, or a scenario going away. */
  public clear(): void {
    this.setSelection([]);
  }

  /** Whether this is what is selected already, element for element and in order. */
  private sameAsSelected(elements: readonly SelectedElement[]): boolean {
    const current = this.selected;
    if (current.length !== elements.length) { return false; }
    return current.every((element, index) => element.uuid === elements[index].uuid);
  }

  /** The uuids of everything selected, which is what the 3D preview is told. */
  public selectedUuids(): string[] {
    return map(this.selected, (element) => element.uuid);
  }

  /**
   * The element of this list that is selected, if one of them is.
   *
   * What a form asks: it holds one list and wants the element of it to open. The
   * list says which kind is being asked about, so the caller does not have to
   * name the type as well as own the elements.
   */
  public selectedIn<T extends { uuid: string }>(elements: readonly T[]): T | undefined {
    const selected = this.selected;
    if (selected.length === 0 || !elements) { return undefined; }

    return find(elements, (candidate) =>
      !!candidate && !!find(selected, (element) => element.uuid === candidate.uuid));
  }
}
