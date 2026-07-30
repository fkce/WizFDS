import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { SmokeviewApiService } from '../../../../../../../web-smokeview-lib/src/lib/services/smokeview-api/smokeview-api.service';
import { MainService } from '@services/main/main.service';
import { Main } from '@services/main/main';
import { SceneInputService } from '@services/scene-input/scene-input.service';
import { SelectionService } from '@services/selection/selection.service';
import { ElementsService } from '@services/elements/elements.service';
import { combineLatest, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { BabylonService } from '../../../../../../../web-smokeview-lib/src/lib/services/babylon/babylon.service';
import { PickService } from '../../../../../../../web-smokeview-lib/src/lib/services/picking/pick.service';

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

  constructor(
    private mainService: MainService,
    private smvApiService: SmokeviewApiService,
    private sceneInputService: SceneInputService,
    private babylonService: BabylonService,
    private pickService: PickService,
    private selectionService: SelectionService,
    private elementsService: ElementsService
  ) { }

  ngOnInit(): void {
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);

    // The app owns the selection, not the preview (ADR-0004): the forms and the
    // CAD bridge are outside the library, and only one of the two may apply a
    // pick or the two would answer differently.
    this.pickService.applyOwnPicks = false;

    this.pickedSub = this.pickService.picked$.subscribe(picked => this.onPicked(picked));
    this.selectedSub = this.selectionService.selected$
      .subscribe(() => this.pickService.setSelected(this.selectionService.selectedUuids()));
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
  }

  ngOnDestroy() {
    this.mainSub.unsubscribe();
    if (this.readySub) {
      this.readySub.unsubscribe();
    }
    this.pickedSub.unsubscribe();
    this.selectedSub.unsubscribe();
  }

}
