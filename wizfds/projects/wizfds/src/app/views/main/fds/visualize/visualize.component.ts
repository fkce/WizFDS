import { Component, HostListener, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { SmokeviewApiService } from '../../../../../../../web-smokeview-lib/src/lib/services/smokeview-api/smokeview-api.service';
import { MainService } from '@services/main/main.service';
import { Main } from '@services/main/main';
import { SceneInputService } from '@services/scene-input/scene-input.service';
import { SelectionService } from '@services/selection/selection.service';
import { ElementsService, FdsElementType } from '@services/elements/elements.service';
import { ViewportStatusService } from '@services/viewport-status/viewport-status.service';
import { FdsEditService } from '@services/fds-edit/fds-edit.service';
import { FdsValidationService } from '@services/fds-validation/fds-validation.service';
import { combineLatest, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { BabylonService } from '../../../../../../../web-smokeview-lib/src/lib/services/babylon/babylon.service';
import { PickService } from '../../../../../../../web-smokeview-lib/src/lib/services/picking/pick.service';
import { EditStreamService } from '../../../../../../../web-smokeview-lib/src/lib/services/editing/edit-stream.service';
import { SnapService } from '../../../../../../../web-smokeview-lib/src/lib/services/editing/snap.service';
import { GizmoService } from '../../../../../../../web-smokeview-lib/src/lib/services/editing/gizmo.service';
import { MeasureToolService } from '../../../../../../../web-smokeview-lib/src/lib/services/editing/measure-tool.service';
import { SceneChange } from '../../../../../../../web-smokeview-lib/src/lib/services/drawing/scene-change';
import { ScenePoint } from '../../../../../../../web-smokeview-lib/src/lib/services/scene-bounds/scene-bounds.service';
import { ViewportGrid } from '@services/viewport-status/viewport-status.service';

@Component({
    selector: 'app-visualize',
    templateUrl: './visualize.component.html',
    styleUrls: ['./visualize.component.scss'],
    standalone: false
})
export class VisualizeComponent implements OnInit, AfterViewInit, OnDestroy {

  main: Main;

  mainSub: Subscription;
  readySub: Subscription;
  pickedSub: Subscription;
  selectedSub: Subscription;
  pointerSub: Subscription;
  commandSub: Subscription;
  appliedSub: Subscription;
  measuringSub: Subscription;
  measurementSub: Subscription;

  constructor(
    private mainService: MainService,
    private smvApiService: SmokeviewApiService,
    private sceneInputService: SceneInputService,
    private babylonService: BabylonService,
    private pickService: PickService,
    private snapService: SnapService,
    private gizmoService: GizmoService,
    private measureTool: MeasureToolService,
    private editStream: EditStreamService,
    private fdsEdit: FdsEditService,
    private validation: FdsValidationService,
    private selectionService: SelectionService,
    private elementsService: ElementsService,
    private viewportStatus: ViewportStatusService
  ) { }

  ngOnInit(): void {
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);

    // The status bar belongs to the whole app, so what the pointer is doing in
    // the scene reaches it through a service rather than directly (ADR-0010).
    this.viewportStatus.enter();
    this.pointerSub = this.pickService.pointerAt$
      .subscribe(point => this.viewportStatus.setCursor(point, this.gridAt(point)));

    // The measurement takes the same route (#127): the tool measures in the
    // library, the bar reads the numbers here - and both go down together.
    this.measuringSub = this.measureTool.active$
      .subscribe(active => this.viewportStatus.setMeasuring(active));
    this.measurementSub = this.measureTool.measurement$
      .subscribe(measurement => this.viewportStatus.setMeasurement(measurement));

    // The app owns the selection, not the preview (ADR-0004): the forms and the
    // CAD bridge are outside the library, and only one of the two may apply a
    // pick or the two would answer differently.
    this.pickService.applyOwnPicks = false;

    // And this is the app that can act on an edit. The gizmo is off by default
    // so that the standalone viewer, which has no `Fds` and nothing subscribed
    // to the command stream, does not offer to move what it cannot save (#88).
    this.gizmoService.enabled = true;

    this.pickedSub = this.pickService.picked$.subscribe(picked => this.onPicked(picked));
    this.selectedSub = this.selectionService.selected$
      .subscribe(() => this.pickService.setSelected(this.selectionService.selectedUuids()));

    // The other half of the boundary: state goes in through render(), intent
    // comes back out here. The library asks, the app decides (ADR-0004).
    // A drawn element is selected as soon as it exists (#125), the same way
    // the form's add() activates what it just added - the palette shows it and
    // the contextual tab is named after it.
    this.commandSub = this.editStream.commands$
      .subscribe(command => {
        const change = this.fdsEdit.apply(command);
        if (command.kind === 'create' || command.kind === 'copy') { this.selectCreated(change); }
      });

    // Every producer of edits arrives on this one stream - the command stream
    // above, the properties palette, the ribbon, undo and redo - so this is the
    // only place the preview has to be told from.
    this.appliedSub = this.fdsEdit.applied$.subscribe(change => this.onApplied(change));
  }

  /**
   * Which &MESH's grid is in force where the pointer is.
   *
   * Asked of the library rather than worked out here: it is the same question a
   * snap answers on every frame of a drag, and the bar has to name the grid the
   * edit will actually obey (#124).
   */
  private gridAt(point: ScenePoint | null): ViewportGrid | null {
    if (!point) { return null; }

    const grid = this.snapService.gridAt(point);
    return grid ? { id: grid.meshId, cell: grid.cell } : null;
  }

  /**
   * Fold a click in the scene into the selection.
   *
   * The preview answers with a `uuid` and the kind of element it drew; what that
   * is in the scenario is the app's own business, so it is looked up here rather
   * than trusted - an element can leave the scenario between a render and a click.
   */
  private onPicked(picked: { element?: { uuid: string }, add: boolean }): void {
    if (!picked.element) {
      // A click on empty space drops the selection, unless it was extending one
      if (!picked.add) { this.selectionService.clear(); }
      return;
    }

    const found = this.elementsService.byUuid(picked.element.uuid);
    if (!found) { return; }

    this.selectionService.select(
      { uuid: found.element.uuid, type: found.type }, { add: picked.add });
  }

  /**
   * Select what a create command just made.
   *
   * From the change the edit answered with rather than from a second lookup:
   * the change already names the element and its kind, and it is the one place
   * that knows which element the command produced.
   */
  private selectCreated(change: SceneChange | null): void {
    const created = (change?.added ?? []).map(added => ({
      uuid: added.element.uuid as string,
      type: added.type as FdsElementType
    }));
    if (created.length === 0) { return; }

    this.selectionService.setSelection(created);
  }

  /**
   * Show what an applied edit did.
   *
   * Through `update()` and not `render()`: a full render rebuilds the instance
   * pools and re-cuts every opening through CSG, which is seconds of work at the
   * scale this is built for and not something one moved wall may cost
   * (ADR-0004).
   *
   * A deleted element leaves the selection with it - it would otherwise name
   * something the scenario no longer holds, and the palette and the contextual
   * tab would go on offering to edit it.
   */
  private onApplied(change: SceneChange): void {
    const removed = new Set((change.removed ?? []).map(gone => gone.uuid));
    if (removed.size > 0) {
      this.selectionService.setSelection(
        this.selectionService.selected.filter(element => !removed.has(element.uuid)));
    }

    void this.smvApiService.update(change);
  }

  /**
   * Delete, undo and redo, while the 3D view is what the user is working in.
   *
   * Not in a field: `[(ngModel)]` writes straight to the model, so an edit typed
   * into a form never reaches the command channel and is not in this history
   * (ADR-0009). Ctrl+Z there has to stay the browser's own text undo, or a user
   * correcting a typo would move a wall instead - and Delete has to stay the
   * key that removes a character, not a wall.
   */
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (isTyping(event.target)) { return; }

    // No confirmation behind it, and none is wanted: Ctrl+Z takes it straight
    // back, which is the answer AutoCAD gives to the same question (#124).
    if (event.key === 'Delete') {
      const uuids = this.selectionService.selectedUuids();
      if (uuids.length === 0) { return; }

      event.preventDefault();
      this.fdsEdit.apply({ kind: 'delete', uuids: uuids });
      return;
    }

    if (!event.ctrlKey && !event.metaKey) { return; }

    const key = event.key.toLowerCase();
    // Ctrl+Shift+Z as well as Ctrl+Y: both are redo, and which one a user
    // reaches for depends on what else they use
    const redo = key === 'y' || (key === 'z' && event.shiftKey);
    const undo = key === 'z' && !event.shiftKey;
    if (!redo && !undo) { return; }

    event.preventDefault();
    if (redo) { this.fdsEdit.redo(); } else { this.fdsEdit.undo(); }
  }

  ngAfterViewInit() {
    // The scene can become ready before the scenario has finished loading - on a
    // slow backend it reliably does, and reaching for fdsObject then throws and
    // leaves the preview blank for the rest of the session. Drawing therefore
    // waits for both, in whichever order they arrive, and redraws if the user
    // switches to another scenario.
    //
    // scene$ emits null when the scene is disposed, so leaving the view stops
    // this from drawing into a scene that no longer exists.
    this.readySub = combineLatest([
      this.babylonService.scene$,
      this.mainService.currentFdsScenario$
    ]).pipe(
      filter(([scene, fdsScenario]) => !!scene && !!fdsScenario?.fdsObject)
    ).subscribe(() => this.renderScenario());
  }

  /**
   * Hand the scenario to the preview.
   *
   * Everything the library draws goes through SceneInputService, so the `Fds`
   * object itself never crosses the boundary and the preview cannot write into
   * what auto-save serialises (ADR-0004).
   */
  private renderScenario(): void {
    const scene = this.sceneInputService.fromFds(this.main.currentFdsScenario.fdsObject);
    // Failures are logged by the library rather than rejected, so there is
    // nothing here to recover from - see SmokeviewApiService.render().
    void this.smvApiService.render(scene).then(() => {
      // A render rebuilds every mesh, so the highlight over what is selected has
      // to be asked for again - and the user may have selected it in a form, or
      // in CAD, while there was no scene at all to draw it in.
      this.pickService.setSelected(this.selectionService.selectedUuids());
    });

    // What FDS will make of the scenario as it stands, for the palette and the
    // count in the status bar. On opening it as well as on every edit: a
    // scenario can arrive from CAD, or from the database, already wrong.
    this.validation.revalidate();
  }

  ngOnDestroy() {
    this.mainSub.unsubscribe();
    if (this.readySub) {
      this.readySub.unsubscribe();
    }
    this.pickedSub.unsubscribe();
    this.selectedSub.unsubscribe();
    this.pointerSub.unsubscribe();
    this.commandSub.unsubscribe();
    this.appliedSub.unsubscribe();
    this.measuringSub.unsubscribe();
    this.measurementSub.unsubscribe();
    this.viewportStatus.leave();
    // The services are the application's, not this view's - a gizmo left armed
    // would attach itself to a selection made in a form, and a measuring run
    // has nothing left to measure in.
    this.gizmoService.enabled = false;
    this.measureTool.cancel();
  }

}

/** Whether the keystroke belongs to a field the user is typing in. */
function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement;
  if (!element || !element.tagName) { return false; }

  const tag = element.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || element.isContentEditable;
}
