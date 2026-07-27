import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { SmokeviewApiService } from '../../../../../../../web-smokeview-lib/src/lib/services/smokeview-api/smokeview-api.service';
import { MainService } from '@services/main/main.service';
import { Main } from '@services/main/main';
import { SceneInputService } from '@services/scene-input/scene-input.service';
import { combineLatest, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { BabylonService } from '../../../../../../../web-smokeview-lib/src/lib/services/babylon/babylon.service';

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

  constructor(
    private mainService: MainService,
    private smvApiService: SmokeviewApiService,
    private sceneInputService: SceneInputService,
    private babylonService: BabylonService
  ) { }

  ngOnInit(): void {
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);
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
    void this.smvApiService.render(scene);
  }

  ngOnDestroy() {
    this.mainSub.unsubscribe();
    if (this.readySub) {
      this.readySub.unsubscribe();
    }
  }

}
