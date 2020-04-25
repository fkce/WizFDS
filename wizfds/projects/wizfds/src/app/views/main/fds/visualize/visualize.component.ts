import { Component, OnInit, AfterViewInit } from '@angular/core';
import { SmokeviewApiService } from '../../../../../../../web-smokeview-lib/src/lib/services/smokeview-api/smokeview-api.service';
import { MainService } from '@services/main/main.service';
import { Main } from '@services/main/main';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-visualize',
  templateUrl: './visualize.component.html',
  styleUrls: ['./visualize.component.scss']
})
export class VisualizeComponent implements OnInit, AfterViewInit {

  main: Main;

  mainSub: Subscription;

  constructor(
    private mainService: MainService,
    private smvApiService: SmokeviewApiService
  ) { }

  ngOnInit(): void {
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);
  }

  ngAfterViewInit() {
    this.smvApiService.renderObsts(this.main.currentFdsScenario.fdsObject.geometry.obsts, this.main.currentFdsScenario.fdsObject.geometry.surfs);
    this.smvApiService.renderMeshes(this.main.currentFdsScenario.fdsObject.geometry.meshes);
  }

  ngOnDestroy() {
    this.mainSub.unsubscribe();
  }

}
