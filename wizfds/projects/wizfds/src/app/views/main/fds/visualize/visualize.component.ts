import { Component, OnInit, AfterViewInit } from '@angular/core';
import { SmokeviewApiService } from '../../../../../../../web-smokeview-lib/src/lib/services/smokeview-api/smokeview-api.service';
import { MainService } from '@services/main/main.service';
import { Main } from '@services/main/main';
import { Subscription, timer, TimeoutError } from 'rxjs';
import { filter, map, switchMap, take, timeout } from 'rxjs/operators';
import { SnackBarService } from '@services/snack-bar/snack-bar.service';
import { BabylonService } from '../../../../../../../web-smokeview-lib/src/lib/services/babylon/babylon.service';

@Component({
    selector: 'app-visualize',
    templateUrl: './visualize.component.html',
    styleUrls: ['./visualize.component.scss'],
    standalone: false
})
export class VisualizeComponent implements OnInit, AfterViewInit {

  /** How long to wait for the scenario before giving up on the preview. */
  private static readonly SCENARIO_TIMEOUT_MS = 30000;

  main: Main;

  mainSub: Subscription;
  readySub: Subscription;

  constructor(
    private mainService: MainService,
    private smvApiService: SmokeviewApiService,
    private babylonService: BabylonService,
    private snackBarService: SnackBarService
  ) { }

  ngOnInit(): void {
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);
  }

  ngAfterViewInit() {
    // The scene can become ready before the scenario has finished loading - on a
    // slow backend it reliably does, and reaching for fdsObject then throws and
    // leaves the preview blank for the rest of the session.
    //
    // The scenario cannot be awaited as a stream: MainService never calls
    // mainSubject.next(), it mutates the shared Main object in place, so
    // subscribers are told nothing when a scenario arrives. Hence the poll -
    // the proper fix belongs in MainService, not here.
    this.readySub = this.babylonService.ready$.pipe(
      switchMap(() => timer(0, 250).pipe(
        map(() => this.main),
        filter(main => !!main?.currentFdsScenario?.fdsObject),
        take(1),
        // Without this the poll spins until the component is destroyed, and a
        // scenario that never arrives leaves the user with a silent blank canvas.
        timeout({ first: VisualizeComponent.SCENARIO_TIMEOUT_MS })
      ))
    ).subscribe({
      next: () => this.renderScenario(),
      error: (error) => {
        const message = error instanceof TimeoutError
          ? 'Scenario did not load in time - 3D preview unavailable'
          : 'Could not draw the 3D preview';
        this.snackBarService.notify('error', message);
      }
    });
  }

  private renderScenario(): void {
    this.smvApiService.renderMeshes(this.main.currentFdsScenario.fdsObject.geometry.meshes);

    // Render holes if they exist
    if (this.main.currentFdsScenario.fdsObject.geometry.holes) {
      this.smvApiService.renderHoles(this.main.currentFdsScenario.fdsObject.geometry.holes);
    }

    this.smvApiService.renderObsts(this.main.currentFdsScenario.fdsObject.geometry.obsts, this.main.currentFdsScenario.fdsObject.geometry.surfs);
    this.smvApiService.renderOpens(this.main.currentFdsScenario.fdsObject.geometry.opens);

    // Check if jetfans exist and render them
    if (this.main.currentFdsScenario.fdsObject.ventilation && this.main.currentFdsScenario.fdsObject.ventilation.jetfans) {
      this.smvApiService.renderJetfans(this.main.currentFdsScenario.fdsObject.ventilation.jetfans);
    }

    // Render fires
    if (this.main.currentFdsScenario.fdsObject.fires &&
        this.main.currentFdsScenario.fdsObject.fires.fires) {
      const fires = this.main.currentFdsScenario.fdsObject.fires.fires;
      const mappedFires = fires.map(fire => ({
        id: fire.id,
        uuid: fire.uuid,
        idAC: fire.idAC,
        xb: {
          x1: fire.vent.xb.x1, x2: fire.vent.xb.x2,
          y1: fire.vent.xb.y1, y2: fire.vent.xb.y2,
          z1: fire.vent.xb.z1, z2: fire.vent.xb.z2
        },
        color: {
          label: fire.surf.color.label || 'RED',
          value: fire.surf.color.value || 'RED',
          rgb: (fire.surf.color.rgb?.length >= 3)
            ? [fire.surf.color.rgb[0], fire.surf.color.rgb[1], fire.surf.color.rgb[2]]
            : [255, 0, 0],
          show: true
        },
        vis: {
          xbNorm: { x1: 0, x2: 0, y1: 0, y2: 0, z1: 0, z2: 0 },
          colorNorm: [1, 0, 0, 1]
        }
      }));
      this.smvApiService.renderFires(mappedFires);
    }

    // Render basic vents
    if (this.main.currentFdsScenario.fdsObject.ventilation &&
        this.main.currentFdsScenario.fdsObject.ventilation.vents) {
      const vents = this.main.currentFdsScenario.fdsObject.ventilation.vents;
      const mappedVents = vents.map(vent => {
        const surfColor = vent.surf?.color;
        const rgb = (surfColor?.rgb?.length >= 3)
          ? [surfColor.rgb[0], surfColor.rgb[1], surfColor.rgb[2]]
          : [0, 0, 255];
        const alpha = vent.surf?.transparency ?? 1;
        return {
          id: vent.id,
          uuid: vent.uuid,
          idAC: vent.idAC,
          xb: {
            x1: vent.xb.x1, x2: vent.xb.x2,
            y1: vent.xb.y1, y2: vent.xb.y2,
            z1: vent.xb.z1, z2: vent.xb.z2
          },
          surf_id: vent.surf?.id || '',
          elevation: vent.elevation || 0,
          color: {
            label: surfColor?.label || 'BLUE',
            value: surfColor?.value || 'BLUE',
            rgb: [...rgb, alpha],
            show: true
          },
          vis: {
            xbNorm: { x1: 0, x2: 0, y1: 0, y2: 0, z1: 0, z2: 0 },
            colorNorm: [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, alpha]
          }
        };
      });
      this.smvApiService.renderVents(mappedVents);
    }
  }

  ngOnDestroy() {
    this.mainSub.unsubscribe();
    if (this.readySub) {
      this.readySub.unsubscribe();
    }
  }

}
