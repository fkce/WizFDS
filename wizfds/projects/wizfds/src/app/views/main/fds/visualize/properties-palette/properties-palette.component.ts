import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { ElementsService, FoundElement } from '@services/elements/elements.service';
import { boxOf } from '@services/elements/element-geometry';
import { formRouteFor } from '@services/elements/form-routes';
import { SelectionService } from '@services/selection/selection.service';
import { FdsEditService } from '@services/fds-edit/fds-edit.service';
import { FdsValidationService } from '@services/fds-validation/fds-validation.service';
import { FdsWarning } from '@services/fds-validation/fds-rules';
import { SceneXb } from '../../../../../../../../web-smokeview-lib/src/lib/services/drawing/scene-input';

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
 * Typing a coordinate emits a `setXb` command, exactly as the gizmo of #124
 * will - the palette does not write to `Fds` itself. That is what puts a typed
 * coordinate on the undo stack, marks the scenario changed and redraws only what
 * moved, without this component knowing about any of it (ADR-0004).
 *
 * It also shows what FDS will make of the element: a warning here never stops
 * the edit going through (ADR-0009).
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

  /**
   * What is in the six fields.
   *
   * The user's text rather than the model's numbers: a coordinate half-typed is
   * not a number yet, and rewriting the field under them as they type is what
   * makes a form unusable.
   */
  values: { [key: string]: string } = {};

  /** What FDS will make of this element as it stands. */
  warnings: readonly FdsWarning[] = [];

  private readonly subs: Subscription[] = [];

  constructor(
    private selection: SelectionService,
    private elements: ElementsService,
    private fdsEdit: FdsEditService,
    private validation: FdsValidationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.subs.push(this.selection.selected$.subscribe(selected => {
      // The palette shows one element - the one last clicked - and names the
      // rest of a multi-selection by a count. Looked up rather than trusted, as
      // a selection outlives the render that produced it - see
      // VisualizeComponent.onPicked().
      const last = this.selection.lastSelected;
      this.found = last ? this.elements.byUuid(last.uuid) : undefined;
      this.alsoSelected = Math.max(selected.length - 1, 0);
      this.readFromModel();
    }));

    // An edit made anywhere else - the gizmo, an undo, the CAD bridge - moves
    // the element this is showing, and the fields have to follow it
    this.subs.push(this.fdsEdit.applied$.subscribe(() => this.readFromModel()));
    this.subs.push(this.validation.changed$.subscribe(() => this.readWarnings()));
  }

  ngOnDestroy(): void {
    this.subs.forEach(sub => sub.unsubscribe());
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
    return !!(this.found && boxOf(this.found.type, this.found.element));
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

  /**
   * Send what has been typed as an edit command.
   *
   * On leaving a field or on Enter, not on every keystroke: a coordinate is not
   * a coordinate until it is finished, and each command is one entry on the undo
   * stack.
   */
  commit(): void {
    if (!this.hasXb) { return; }

    const xb = this.typedXb();
    // A field that reads as no number at all is not an edit - it is a field
    // still being typed in, or a slip. Put back what the model says.
    if (!xb) { this.readFromModel(); return; }

    if (sameBox(xb, this.modelXb())) { return; }

    this.fdsEdit.apply({ kind: 'setXb', uuid: this.found.element.uuid, xb: xb });
  }

  /** Abandon what was typed - Escape, as every field in the app behaves. */
  cancel(): void {
    this.readFromModel();
  }

  /** Open the selected element where every one of its fields is. */
  openForm(): void {
    if (!this.found) { return; }

    const route = formRouteFor(this.found.type);
    if (route) { this.router.navigate([route]); }
  }

  /** Show what the scenario currently says, to a millimetre. */
  private readFromModel(): void {
    this.values = {};
    const xb = this.found ? boxOf(this.found.type, this.found.element) : undefined;

    if (xb) {
      XB_FIELDS.forEach(field => {
        const value = xb[field.key];
        this.values[field.key] = Number.isFinite(value) ? value.toFixed(3) : '';
      });
    }
    this.readWarnings();
  }

  private readWarnings(): void {
    this.warnings = this.found
      ? this.validation.warningsFor(this.found.element.uuid)
      : [];
  }

  /** The box the six fields describe, or undefined when one of them is not a number. */
  private typedXb(): SceneXb | undefined {
    const box: any = {};

    for (const field of XB_FIELDS) {
      const value = Number(this.values[field.key]);
      if (!Number.isFinite(value)) { return undefined; }
      box[field.key] = value;
    }

    return box as SceneXb;
  }

  /** Where the element stands now. */
  private modelXb(): SceneXb {
    return boxOf(this.found.type, this.found.element);
  }
}

/**
 * Whether two boxes are the same to the millimetre the palette shows.
 *
 * Compared at the precision of what is displayed, not exactly: a field showing
 * 3.150 for a coordinate stored as 3.1499999 would otherwise emit a command
 * every time it lost focus - and each one would be an entry on the undo stack.
 */
function sameBox(typed: SceneXb, current: SceneXb): boolean {
  return (Object.keys(typed) as (keyof SceneXb)[])
    .every(key => Math.abs(typed[key] - current[key]) < 0.0005);
}
