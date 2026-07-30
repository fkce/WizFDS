import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { Main } from '@services/main/main';
import { MainService } from '@services/main/main.service';
import { ElementsService } from '@services/elements/elements.service';
import { formRouteFor } from '@services/elements/form-routes';
import { SaveState, saveStateOf } from '@services/main/save-state';
import { SelectedElement, SelectionService } from '@services/selection/selection.service';
import {
  SceneDisplayId, SceneLayerId, SceneLayerState, SceneViewService
} from '../../../../../../../../web-smokeview-lib/src/lib/services/scene-view/scene-view.service';
import { SceneAxis } from '../../../../../../../../web-smokeview-lib/src/lib/services/scene-bounds/scene-bounds.service';

/** Which tab of the ribbon is open. */
export type RibbonTabId = 'home' | 'view' | 'measure' | 'context';

/**
 * The tabs that are always there.
 *
 * Phase 6 (#89) adds a Results tab to this list - the player, the slices, the
 * frame it is on - which is why the tab strip is a list rather than markup.
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
const AWAITING_HISTORY = 'Available once undo and redo land';
const AWAITING_MEASURE = 'Available once the measuring tools land';

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

  readonly awaitingGeometryTools = AWAITING_GEOMETRY_TOOLS;
  readonly awaitingHistory = AWAITING_HISTORY;
  readonly awaitingMeasure = AWAITING_MEASURE;

  /**
   * View rather than Home, which is where AutoCAD opens.
   *
   * Home holds the drawing and modifying tools, and none of them exists yet
   * (#125, #126); View drives everything that does. To be reconsidered once the
   * tools arrive.
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
    private selection: SelectionService,
    private elements: ElementsService,
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
   * What the contextual tab is called - the type of what is selected, as FDS
   * spells it. Null when nothing is selected, and the tab is not there at all.
   */
  get contextLabel(): string | null {
    return this.selected.length > 0 ? this.selected[0].type.toUpperCase() : null;
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

  get saveLabel(): string {
    const state = this.saveState;
    return state === 'saved' ? 'Saved'
      : state === 'unsaved' ? 'Unsaved changes' : 'Autosave on';
  }

  // ==========================================
  // View tab
  // ==========================================

  /** The icon that says how much of a layer is drawn. */
  layerIcon(id: SceneLayerId): string {
    const state: SceneLayerState = this.view.layerState(id);
    return state === 'hidden' ? 'eye-off-outline'
      : state === 'edges' ? 'square-outline' : 'checkbox-blank';
  }

  displayIcon(id: SceneDisplayId): string {
    return this.view.isDisplayOn(id) ? 'checkbox-marked-outline' : 'checkbox-blank-outline';
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
  // Contextual tab
  // ==========================================

  /** The `ID` of the selected element, as its form and the `.fds` file show it. */
  get selectedId(): string {
    const found = this.selected.length > 0
      ? this.elements.byUuid(this.selected[0].uuid) : undefined;
    return found ? found.element.id : '';
  }

  /** Open what is selected in the form that holds all of its fields. */
  openForm(): void {
    if (this.selected.length === 0) { return; }

    const route = formRouteFor(this.selected[0].type);
    if (route) { this.router.navigate([route]); }
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
