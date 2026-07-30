import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { ElementsService, FoundElement } from '@services/elements/elements.service';
import { formRouteFor } from '@services/elements/form-routes';
import { SelectionService } from '@services/selection/selection.service';

/** The six coordinates of an `XB`, in the order FDS writes them. */
export const XB_FIELDS: ReadonlyArray<{ key: string, label: string }> = [
  { key: 'x1', label: 'X1' }, { key: 'x2', label: 'X2' },
  { key: 'y1', label: 'Y1' }, { key: 'y2', label: 'Y2' },
  { key: 'z1', label: 'Z1' }, { key: 'z2', label: 'Z2' }
];

/**
 * The properties palette - AutoCAD's PROPERTIES, docked on the right.
 *
 * Deliberately a geometric subset of the form and not a second copy of it
 * (ADR-0010): what a user wants while looking at the model is where the thing is
 * and what it is made of, and the button at the foot is how they get to the rest.
 *
 * The fields are read-only for now. Typing a coordinate here is meant to emit
 * the same edit command a gizmo does, and that command stream - with its
 * validation and its undo - is #123; writing straight to `Fds` in the meantime
 * would go round the history that issue introduces and would need a full
 * re-render to show, which ADR-0004 rules out.
 */
@Component({
  selector: 'app-properties-palette',
  templateUrl: './properties-palette.component.html',
  styleUrls: ['./properties-palette.component.scss'],
  standalone: false
})
export class PropertiesPaletteComponent implements OnInit, OnDestroy {

  readonly xbFields = XB_FIELDS;

  /** What is selected, looked up in the scenario. Undefined when nothing is. */
  found: FoundElement | undefined;

  /** How many more are selected beyond the one shown. */
  alsoSelected = 0;

  private sub: Subscription;

  constructor(
    private selection: SelectionService,
    private elements: ElementsService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.sub = this.selection.selected$.subscribe(selected => {
      // The palette shows one element - the one last clicked - and names the
      // rest of a multi-selection by a count. Looked up rather than trusted, as
      // a selection outlives the render that produced it - see
      // VisualizeComponent.onPicked().
      const last = this.selection.lastSelected;
      this.found = last ? this.elements.byUuid(last.uuid) : undefined;
      this.alsoSelected = Math.max(selected.length - 1, 0);
    });
  }

  ngOnDestroy(): void {
    if (this.sub) { this.sub.unsubscribe(); }
  }

  /** The element's type, as FDS spells it - the palette's heading. */
  get type(): string {
    return this.found ? this.found.type.toUpperCase() : '';
  }

  get id(): string {
    return this.found ? (this.found.element.id ?? '') : '';
  }

  /** Whether this element has a shape at all - a &SURF and a &SLCF do not. */
  get hasXb(): boolean {
    return !!(this.found && this.found.element.xb);
  }

  /** One coordinate of the `XB`, rounded to a millimetre. */
  coordinate(key: string): string {
    if (!this.hasXb) { return ''; }
    const value = this.found.element.xb[key];
    return typeof value === 'number' ? value.toFixed(3) : '';
  }

  /**
   * The &SURF the element names.
   *
   * An &OBST holds a resolved &SURF under `surf.surf_id` while a &VENT, a &GEOM
   * and a fire hold one directly under `surf` - the same two shapes
   * SceneInputService reads through.
   */
  get surfId(): string {
    const element: any = this.found ? this.found.element : undefined;
    if (!element) { return ''; }
    return element.surf?.surf_id?.id ?? element.surf?.id ?? '';
  }

  /** Open the selected element where every one of its fields is. */
  openForm(): void {
    if (!this.found) { return; }

    const route = formRouteFor(this.found.type);
    if (route) { this.router.navigate([route]); }
  }
}
