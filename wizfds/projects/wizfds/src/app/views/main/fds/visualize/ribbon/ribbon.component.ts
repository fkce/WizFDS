import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { Main } from '@services/main/main';
import { MainService } from '@services/main/main.service';
import { ElementsService } from '@services/elements/elements.service';
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

/** Which tab of the ribbon is open. */
export type RibbonTabId = 'home' | 'view' | 'measure' | 'context';

/**
 * The tabs that are always there, in the order the strip lists them.
 *
 * A list rather than four near-identical buttons in the markup, and the one
 * place the order is decided. Phase 6 (#89) adds a Results tab here - and a
 * panel block for it in the template, which is where a tab's contents live.
 */
const FIXED_TABS: ReadonlyArray<{ id: RibbonTabId, label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'view', label: 'View' },
  { id: 'measure', label: 'Measure' }
];

/**
 * What a control with no tool behind it yet says when it is hovered.
 *
 * The panels are here because this issue builds the ribbon and the sub-issues
 * fill them (#88): a greyed command that says when it arrives is what AutoCAD
 * does with a command that does not apply, and it beats a panel that is empty
 * or a button that is missing.
 */
const AWAITING_GEOMETRY_TOOLS = 'Available once the geometry editing tools land';
const AWAITING_MEASURE = 'Available once the measuring tools land';

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

  readonly awaitingGeometryTools = AWAITING_GEOMETRY_TOOLS;
  readonly awaitingMeasure = AWAITING_MEASURE;

  /**
   * View rather than Home, which is where AutoCAD opens.
   *
   * Home's Modify and Snap panels work as of #124, but its Draw panel is still
   * empty (#125) - so View remains the tab that drives the most. To be moved
   * once there is something to draw with.
   */
  active: RibbonTabId = 'view';

  /** Minimised to the tab strip, which is what AutoCAD offers a short screen. */
  collapsed = false;

  /** The navigation gestures, shown from the ribbon rather than over the canvas. */
  showHelp = false;

  selected: readonly SelectedElement[] = [];

  main: Main;

  private readonly subs: Subscription[] = [];

  constructor(
    public view: SceneViewService,
    public gizmo: GizmoService,
    public snap: SnapService,
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
      // The contextual tab goes with the selection it was named after
      if (selected.length === 0 && this.active === 'context') { this.active = 'view'; }
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
    return state === 'saved' ? 'Saved'
      : state === 'unsaved' ? 'Unsaved changes' : 'Autosave on';
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
  // Home tab
  // ==========================================

  /**
   * The &SURFs a new obst could be given.
   *
   * Read from the scenario even though the selector is inactive: an empty
   * dropdown would say the scenario has no surfaces, which is a different
   * statement from "this tool is not here yet".
   */
  get surfs(): any[] {
    return this.elements.listOf('surf');
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
    const boxes = this.selected
      .map(element => this.elements.byUuid(element.uuid))
      .filter(found => !!found && !!found.element.xb)
      .map(found => found.element.xb);

    if (boxes.length === 0) { return; }

    this.view.zoomTo({
      x1: Math.min(...boxes.map(xb => xb.x1)), x2: Math.max(...boxes.map(xb => xb.x2)),
      y1: Math.min(...boxes.map(xb => xb.y1)), y2: Math.max(...boxes.map(xb => xb.y2)),
      z1: Math.min(...boxes.map(xb => xb.z1)), z2: Math.max(...boxes.map(xb => xb.z2))
    });
  }
}
