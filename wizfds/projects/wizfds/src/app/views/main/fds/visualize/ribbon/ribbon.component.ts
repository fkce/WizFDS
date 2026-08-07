import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { Main } from '@services/main/main';
import { MainService } from '@services/main/main.service';
import { ElementsService, FdsElementType } from '@services/elements/elements.service';
import {
  arraySlots, boxOf, ElementBox, mirroredBox, shiftedBox
} from '@services/elements/element-geometry';
import { formRouteFor } from '@services/elements/form-routes';
import { SaveState, saveStateOf } from '@services/main/save-state';
import { SelectedElement, SelectionService } from '@services/selection/selection.service';
import { HistoryService } from '@services/history/history.service';
import { FdsEditService } from '@services/fds-edit/fds-edit.service';
import {
  displaySwitchIcon, layerStateIcon, SceneDisplayId, SceneLayerId, SceneViewService
} from '../../../../../../../../web-smokeview-lib/src/lib/services/scene-view/scene-view.service';
import { SceneAxis } from '../../../../../../../../web-smokeview-lib/src/lib/services/scene-bounds/scene-bounds.service';
import { GizmoService } from '../../../../../../../../web-smokeview-lib/src/lib/services/editing/gizmo.service';
import { SnapService } from '../../../../../../../../web-smokeview-lib/src/lib/services/editing/snap.service';
import { SnapMode } from '../../../../../../../../web-smokeview-lib/src/lib/services/editing/snap';
import { DrawToolService } from '../../../../../../../../web-smokeview-lib/src/lib/services/editing/draw-tool.service';
import { MeasureToolService } from '../../../../../../../../web-smokeview-lib/src/lib/services/editing/measure-tool.service';
import { DimensionLabelService } from '../../../../../../../../web-smokeview-lib/src/lib/services/editing/dimension-label.service';
import { DrawKind } from '../../../../../../../../web-smokeview-lib/src/lib/services/editing/draw';
import { PickService } from '../../../../../../../../web-smokeview-lib/src/lib/services/picking/pick.service';
import { SceneChange } from '../../../../../../../../web-smokeview-lib/src/lib/services/drawing/scene-change';
import { ResultsDirectoryService } from '@services/results-directory/results-directory.service';

/** Which tab of the ribbon is open. */
export type RibbonTabId = 'home' | 'view' | 'measure' | 'results' | 'context' | 'array' | 'mirror';

/**
 * The tabs that are always there, in the order the strip lists them.
 *
 * A list rather than four near-identical buttons in the markup, and the one
 * place the order is decided. Results comes last because it is where a case
 * goes after it has been built (#148).
 */
const FIXED_TABS: ReadonlyArray<{ id: RibbonTabId, label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'view', label: 'View' },
  { id: 'measure', label: 'Measure' },
  { id: 'results', label: 'Results' }
];

/**
 * The three Draw commands, in the order the panel lists them.
 *
 * The titles narrate the gesture, because it is AutoCAD's `BOX` and a user who
 * knows that needs only the reminder: corner, corner, height - and a &VENT,
 * being flat, finishes at the second (#125).
 */
const DRAW_TOOLS: ReadonlyArray<{ id: DrawKind, label: string, icon: string, title: string }> = [
  {
    id: 'obst', label: 'OBST', icon: 'cube-outline',
    title: 'Draw an OBST: a corner, the opposite corner of the base, a height. Esc cancels.'
  },
  {
    id: 'hole', label: 'HOLE', icon: 'vector-difference-ab',
    title: 'Draw a HOLE: a corner, the opposite corner of the base, a height. Esc cancels.'
  },
  {
    id: 'vent', label: 'VENT', icon: 'shape-rectangle-plus',
    title: 'Draw a VENT: two corners, flat on the surface the first one lands on. Esc cancels.'
  }
];

/**
 * The three snap modes, in the order they take priority.
 *
 * Corner before edge before grid, which is the order a snap tries them in - so
 * the panel reads as what it does (#124).
 */
const SNAP_MODES: ReadonlyArray<{ id: SnapMode, label: string, title: string }> = [
  { id: 'corner', label: 'Corner', title: 'Catch on the corners of existing geometry' },
  { id: 'edge', label: 'Edge', title: 'Catch on its edges' },
  { id: 'grid', label: 'Grid', title: 'Catch on the cell boundaries of the active &MESH' }
];

/**
 * The chrome of the 3D view: a Quick Access Toolbar, tabs, and named panels.
 *
 * The anatomy is AutoCAD's, because the users of WizFDS are AutoCAD users and
 * that is the interface language they already read (ADR-0010). It lives in the
 * app rather than in the library so that undo, the save state and the FDS forms
 * are all in reach without widening the boundary ADR-0004 keeps narrow: what it
 * does to the scene it does through SceneViewService.
 */
@Component({
  selector: 'app-ribbon',
  templateUrl: './ribbon.component.html',
  styleUrls: ['./ribbon.component.scss'],
  standalone: false
})
export class RibbonComponent implements OnInit, OnDestroy {

  readonly tabs = FIXED_TABS;
  readonly axes: readonly SceneAxis[] = ['x', 'y', 'z'];
  readonly snapModes = SNAP_MODES;
  readonly drawTools = DRAW_TOOLS;

  /**
   * Home, which is where AutoCAD opens - since #125 there is something to draw
   * with, so the tab a user reaches first is the one that creates geometry.
   */
  active: RibbonTabId = 'home';

  /** Minimised to the tab strip, which is what AutoCAD offers a short screen. */
  collapsed = false;

  /** The navigation gestures, shown from the ribbon rather than over the canvas. */
  showHelp = false;

  selected: readonly SelectedElement[] = [];

  main: Main;

  /**
   * The directory input behind the Open folder button, for the browsers with
   * no picker. It lives in the template so the click that reaches it is the
   * user's own - a synthesised one from anywhere else would be refused.
   */
  @ViewChild('resultsFolder') private resultsFolder?: ElementRef<HTMLInputElement>;

  private readonly subs: Subscription[] = [];

  constructor(
    public view: SceneViewService,
    public gizmo: GizmoService,
    public snap: SnapService,
    public draw: DrawToolService,
    public measure: MeasureToolService,
    public dimensions: DimensionLabelService,
    public results: ResultsDirectoryService,
    private picking: PickService,
    private selection: SelectionService,
    private elements: ElementsService,
    private history: HistoryService,
    private fdsEdit: FdsEditService,
    private router: Router,
    private mainService: MainService
  ) { }

  ngOnInit(): void {
    // A reference to the object the app mutates in place, not a change stream -
    // the save indicator is read off it on each pass (see MainService.getMain).
    this.subs.push(this.mainService.getMain().subscribe(main => this.main = main));

    this.subs.push(this.selection.selected$.subscribe(selected => {
      this.selected = selected;
      // A builder is a proposal over the selection it was opened on (#126)
      this.closeBuilder();
      // The contextual tab goes with the selection it was named after
      if (selected.length === 0 && this.active === 'context') { this.active = 'home'; }
    }));
  }

  ngOnDestroy(): void {
    this.subs.forEach(sub => sub.unsubscribe());
  }

  // ==========================================
  // Tabs
  // ==========================================

  /**
   * What the contextual tab is called - the type of what was last selected, as
   * FDS spells it. Null when nothing is selected, and the tab is not there.
   */
  get contextLabel(): string | null {
    const last = this.selection.lastSelected;
    return last ? last.type.toUpperCase() : null;
  }

  select(tab: RibbonTabId): void {
    // Pressing the open tab again minimises the ribbon, as AutoCAD's does
    if (tab === this.active) { this.collapsed = !this.collapsed; return; }
    this.active = tab;
    this.collapsed = false;
  }

  // ==========================================
  // Quick Access Toolbar
  // ==========================================

  get saveState(): SaveState {
    return saveStateOf(this.main);
  }

  get canUndo(): boolean {
    return this.history.canUndo;
  }

  get canRedo(): boolean {
    return this.history.canRedo;
  }

  /**
   * What the button offers to take back.
   *
   * It names the operation rather than saying "Undo": the history holds edits
   * made through the command channel, and a change typed into a form is not one
   * of them (ADR-0009). Naming what would actually happen is what keeps that
   * boundary honest.
   */
  get undoTitle(): string {
    return this.canUndo ? `Undo ${this.history.undoLabel} (Ctrl+Z)` : 'Nothing to undo';
  }

  get redoTitle(): string {
    return this.canRedo ? `Redo ${this.history.redoLabel} (Ctrl+Y)` : 'Nothing to redo';
  }

  undo(): void {
    this.fdsEdit.undo();
  }

  redo(): void {
    this.fdsEdit.redo();
  }

  get saveLabel(): string {
    const state = this.saveState;
    // Same wording as the status bar, which shows this state at the same time -
    // "Unsaved" rather than "Unsaved changes" so neither readout has to reserve
    // room for a label half again as long as the other two.
    return state === 'saved' ? 'Saved'
      : state === 'unsaved' ? 'Unsaved' : 'Autosave on';
  }

  // ==========================================
  // View tab
  // ==========================================

  /**
   * The icons the switches read as.
   *
   * The mapping is the library's, so that this panel and the standalone
   * viewer's control bar say the same thing with the same picture.
   */
  layerIcon(id: SceneLayerId): string {
    return layerStateIcon(this.view.layerState(id));
  }

  displayIcon(id: SceneDisplayId): string {
    return displaySwitchIcon(this.view.isDisplayOn(id));
  }

  // ==========================================
  // Home tab - the Draw panel (#125)
  // ==========================================

  /**
   * The current &SURF for a drawn OBST, and separately for a drawn &VENT.
   *
   * Two, because they are two different lists in the scenario: an &OBST names
   * a surface from `geometry.surfs`, a &VENT one from `ventilation.surfs`, and
   * an id handed across the pair would resolve to nothing. `''` is the INERT
   * pseudo-entry - no surface named, which is exactly what the form's add()
   * produces and what FDS defaults to.
   */
  drawSurfId = '';
  drawVentSurfId = '';

  /**
   * The kind last drawn, for the selector while no tool is running.
   *
   * The tool switches itself off after each element (ADR-0010), so without
   * this the ventilation list would be reachable only mid-gesture and every
   * &VENT after the first would need its &SURF re-chosen - the correction the
   * current-SURF selector exists to remove (#125).
   */
  private lastDrawKind: DrawKind = 'obst';

  /**
   * The &SURFs a new obst could be given - the current layer's list (#125).
   */
  get surfs(): any[] {
    return this.elements.listOf('surf');
  }

  /** The &SURFs a new &VENT could be given - the ventilation's own list. */
  get ventSurfs(): any[] {
    return this.main?.currentFdsScenario?.fdsObject?.ventilation?.surfs ?? [];
  }

  /**
   * The kind the selector speaks for: the tool that is running, or the one
   * last used - the next element is most likely another of the same.
   */
  private get drawKindInForce(): DrawKind {
    return this.draw.active ?? this.lastDrawKind;
  }

  /** What the selector offers now: the list the tool in force draws from. */
  get drawSurfs(): any[] {
    return this.drawKindInForce === 'vent' ? this.ventSurfs : this.surfs;
  }

  /** A &HOLE is an absence and names no surface - the selector says so. */
  get surfSelectorDisabled(): boolean {
    return this.drawKindInForce === 'hole';
  }

  get currentDrawSurfId(): string {
    return this.drawKindInForce === 'vent' ? this.drawVentSurfId : this.drawSurfId;
  }

  /**
   * Change the current &SURF - AutoCAD's current layer. A gesture already in
   * flight takes the new one: the element gets the surface in force when it is
   * committed.
   */
  setDrawSurf(surfId: string): void {
    if (this.drawKindInForce === 'vent') { this.drawVentSurfId = surfId; }
    else { this.drawSurfId = surfId; }

    if (this.draw.active && this.draw.active !== 'hole') {
      this.draw.setSurf(surfId || undefined);
    }
  }

  /** Begin drawing one element, with the current &SURF along (#125). */
  startDraw(kind: DrawKind): void {
    // Two tools cannot share one pointer - starting one ends the other (#127)
    this.measure.cancel();
    this.lastDrawKind = kind;
    const surfId = kind === 'obst' ? this.drawSurfId
      : kind === 'vent' ? this.drawVentSurfId
        : '';
    this.draw.start(kind, surfId || undefined);
  }

  // ==========================================
  // Measure tab (#127)
  // ==========================================

  /**
   * Start or end a measuring run - the button reads as a toggle, so it is
   * one; Esc ends the run too. The tool cancels any draw gesture in flight
   * itself, and stays on between measurements, because measuring is usually
   * done in runs.
   */
  toggleMeasure(): void {
    if (this.measure.active) { this.measure.cancel(); } else { this.measure.start(); }
  }

  // ==========================================
  // Results tab (#148)
  // ==========================================

  /**
   * Point WizFDS at a folder of FDS results.
   *
   * One button whichever browser the user brought: Chromium gets the picker,
   * everything else gets the directory input, and neither is a choice worth
   * putting in front of somebody who only wants to see their slices. What the
   * fallback costs is that the folder does not outlive the page - a handle can
   * be stored, a list of files cannot.
   */
  openResults(): void {
    if (this.results.canPick) {
      void this.results.openPicker();
      return;
    }
    this.resultsFolder?.nativeElement.click();
  }

  /** What the directory input collected, on its way into the same scan. */
  onResultsFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    // Cleared so that picking the same folder twice running is still a change
    input.value = '';
    if (files && files.length > 0) { void this.results.openFiles(files); }
  }

  // ==========================================
  // Modify and Snap (#124)
  // ==========================================

  /**
   * Both act on the selection, so neither means anything without one.
   *
   * Which manipulator is on screen is `gizmo.mode`, and the template asks it
   * directly - as the Visibility panel asks `view.layerState()`. What is here
   * is what the ribbon knows and the library does not: whether a command has
   * anything to act on, and what to call it.
   */
  get canModify(): boolean {
    return this.selected.length > 0;
  }

  /**
   * What the Resize button offers, and why it sometimes offers nothing.
   *
   * Which face of which element a drag would be is not a question six handles
   * can answer for a multiple selection.
   */
  get resizeTitle(): string {
    if (!this.canModify) { return 'Nothing selected'; }
    return this.gizmo.canResize
      ? 'Drag a face to change one XB coordinate'
      : 'Resize acts on one element at a time';
  }

  get moveTitle(): string {
    return this.canModify
      ? 'Drag an arrow or a plane handle to move the selection'
      : 'Nothing selected';
  }

  get copyTitle(): string {
    return this.canModify
      ? 'Copy the selection: arm and drag a handle, or hold ctrl and drag an axis arrow'
      : 'Nothing selected';
  }

  // ==========================================
  // Array and Mirror builders (#126)
  // ==========================================

  /** The rectangular array being built, while its tab is open. */
  arrayForm: {
    counts: { x: number, y: number, z: number },
    spacing: { x: number, y: number, z: number }
  } | null = null;

  /** The mirror being built, while its tab is open. */
  mirrorForm: { axis: SceneAxis, coordinate: number, keepOriginal: boolean } | null = null;

  /** Whether the counts describe anything beyond the original. */
  get arrayHasCopies(): boolean {
    const form = this.arrayForm;
    return !!form && arraySlots(form.counts).length > 0 && this.selected.length > 0;
  }

  startArray(): void {
    if (!this.canModify) { return; }

    const bounds = this.selectionBounds();
    this.arrayForm = {
      counts: { x: 2, y: 1, z: 1 },
      // The selection's own size: the copies stand shoulder to shoulder
      // until told otherwise
      spacing: {
        x: round3(bounds.x2 - bounds.x1),
        y: round3(bounds.y2 - bounds.y1),
        z: round3(bounds.z2 - bounds.z1)
      }
    };
    this.mirrorForm = null;
    this.active = 'array';
    this.previewBuilder();
  }

  setArrayCount(axis: SceneAxis, value: number): void {
    if (!this.arrayForm) { return; }
    this.arrayForm.counts[axis] = Number(value) || 1;
    this.previewBuilder();
  }

  setArraySpacing(axis: SceneAxis, value: number): void {
    if (!this.arrayForm) { return; }
    this.arrayForm.spacing[axis] = Number(value) || 0;
    this.previewBuilder();
  }

  commitArray(): void {
    const form = this.arrayForm;
    if (!form || !this.arrayHasCopies) { return; }

    const change = this.fdsEdit.apply({
      kind: 'array', uuids: this.selected.map(element => element.uuid),
      counts: { ...form.counts }, spacing: { ...form.spacing }
    });
    this.closeBuilder();
    this.selectAdded(change);
  }

  startMirror(): void {
    if (!this.canModify) { return; }

    const bounds = this.selectionBounds();
    this.mirrorForm = {
      axis: 'x',
      coordinate: round3((bounds.x1 + bounds.x2) / 2),
      keepOriginal: true
    };
    this.arrayForm = null;
    this.active = 'mirror';
    this.previewBuilder();
  }

  setMirrorAxis(axis: SceneAxis): void {
    if (!this.mirrorForm) { return; }
    const bounds = this.selectionBounds();
    this.mirrorForm.axis = axis;
    // The centre on the new axis: the plane the user most often means
    this.mirrorForm.coordinate = round3((bounds[`${axis}1`] + bounds[`${axis}2`]) / 2);
    this.previewBuilder();
  }

  setMirrorCoordinate(value: number): void {
    if (!this.mirrorForm) { return; }
    this.mirrorForm.coordinate = Number(value) || 0;
    this.previewBuilder();
  }

  /** Put the plane at the selection's near face, centre or far face. */
  setMirrorPlaneAt(where: '1' | 'mid' | '2'): void {
    if (!this.mirrorForm) { return; }
    const axis = this.mirrorForm.axis;
    const bounds = this.selectionBounds();
    this.mirrorForm.coordinate = where === 'mid'
      ? round3((bounds[`${axis}1`] + bounds[`${axis}2`]) / 2)
      : bounds[`${axis}${where}`];
    this.previewBuilder();
  }

  toggleMirrorKeep(): void {
    if (!this.mirrorForm) { return; }
    this.mirrorForm.keepOriginal = !this.mirrorForm.keepOriginal;
  }

  commitMirror(): void {
    const form = this.mirrorForm;
    if (!form || this.selected.length === 0) { return; }

    const change = this.fdsEdit.apply({
      kind: 'mirror', uuids: this.selected.map(element => element.uuid),
      axis: form.axis, coordinate: form.coordinate, keepOriginal: form.keepOriginal
    });
    const keep = form.keepOriginal;
    this.closeBuilder();
    if (keep) { this.selectAdded(change); }
  }

  /** Close whichever builder is open, ghosts and all. */
  closeBuilder(): void {
    if (!this.arrayForm && !this.mirrorForm) { return; }

    this.arrayForm = null;
    this.mirrorForm = null;
    this.picking.clearGhosts();
    if (this.active === 'array' || this.active === 'mirror') { this.active = 'home'; }
  }

  /** The ghosts: where the open builder would put its copies. */
  private previewBuilder(): void {
    if (this.arrayForm) {
      const form = this.arrayForm;
      const ghosts: ElementBox[] = [];
      this.selectionBoxes().forEach(xb =>
        arraySlots(form.counts).forEach(slot => ghosts.push(shiftedBox(xb,
          slot.ix * form.spacing.x, slot.iy * form.spacing.y, slot.iz * form.spacing.z))));
      this.picking.previewGhosts(ghosts);
      return;
    }
    if (this.mirrorForm) {
      const form = this.mirrorForm;
      this.picking.previewGhosts(this.selectionBoxes()
        .map(xb => mirroredBox(xb, form.axis, form.coordinate)));
    }
  }

  /** What a committed builder leaves selected: what it made. */
  private selectAdded(change: SceneChange | null): void {
    const added = (change?.added ?? []).map(drawn => ({
      uuid: drawn.element.uuid as string,
      type: drawn.type as FdsElementType
    }));
    if (added.length > 0) { this.selection.setSelection(added); }
  }

  /** The boxes of everything selected, as the scenario holds them. */
  private selectionBoxes(): ElementBox[] {
    return this.selected
      .map(element => this.elements.byUuid(element.uuid))
      .filter(found => !!found)
      .map(found => boxOf(found.type, found.element))
      .filter((xb): xb is ElementBox => !!xb);
  }

  /** The box the whole selection occupies. */
  private selectionBounds(): ElementBox {
    const boxes = this.selectionBoxes();
    return {
      x1: Math.min(...boxes.map(xb => xb.x1)), x2: Math.max(...boxes.map(xb => xb.x2)),
      y1: Math.min(...boxes.map(xb => xb.y1)), y2: Math.max(...boxes.map(xb => xb.y2)),
      z1: Math.min(...boxes.map(xb => xb.z1)), z2: Math.max(...boxes.map(xb => xb.z2))
    };
  }

  // ==========================================
  // Contextual tab
  // ==========================================

  /** The `ID` of the selected element, as its form and the `.fds` file show it. */
  get selectedId(): string {
    const last = this.selection.lastSelected;
    const found = last ? this.elements.byUuid(last.uuid) : undefined;
    return found ? found.element.id : '';
  }

  /** Open what is selected in the form that holds all of its fields. */
  openForm(): void {
    const last = this.selection.lastSelected;
    if (!last) { return; }

    const route = formRouteFor(last.type);
    if (route) { this.router.navigate([route]); }
  }

  /**
   * What the delete button offers, named after what it would remove.
   *
   * No confirmation behind it, and none is wanted: Ctrl+Z takes it straight back
   * (ADR-0009), which is the answer AutoCAD gives to the same question.
   */
  get deleteTitle(): string {
    if (this.selected.length === 0) { return 'Nothing selected'; }
    return this.selected.length > 1
      ? `Delete the ${this.selected.length} selected elements`
      : `Delete ${this.selectedId || this.contextLabel}`;
  }

  /** Take everything selected out of the scenario. */
  deleteSelection(): void {
    if (this.selected.length === 0) { return; }

    this.fdsEdit.apply({
      kind: 'delete', uuids: this.selected.map(element => element.uuid)
    });
  }

  /**
   * Fly the camera to what is selected.
   *
   * Over everything selected rather than the first of them: a multi-selection is
   * one thing the user is looking at, and framing one corner of it is not what
   * they asked for.
   */
  zoomToSelection(): void {
    if (this.selectionBoxes().length === 0) { return; }
    this.view.zoomTo(this.selectionBounds());
  }
}

/** Millimetre-rounded, so a derived default reads like a number a user typed. */
function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
