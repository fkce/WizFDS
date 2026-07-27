import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { SmokeviewApiService } from '../../../../../../../web-smokeview-lib/src/lib/services/smokeview-api/smokeview-api.service';
import { MainService } from '@services/main/main.service';
import { Main } from '@services/main/main';
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
