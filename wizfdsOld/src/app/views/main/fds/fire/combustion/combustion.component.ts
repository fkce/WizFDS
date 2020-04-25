import { Component, OnInit, OnDestroy } from '@angular/core';

import { FdsEnums } from '@enums/fds/enums/fds-enums';
import { MainService } from '@services/main/main.service';
import { Fds } from '@services/fds-object/fds-object';
import { Main } from '@services/main/main';
import { Combustion } from '@services/fds-object/fire/combustion';

@Component({
  selector: 'app-combustion',
  templateUrl: './combustion.component.html',
  styleUrls: ['./combustion.component.scss']
})
export class CombustionComponent implements OnInit, OnDestroy {

  // Global objects
  main: Main;
  fds: Fds;
  fires: any;

  // Component objects
  combustion: Combustion;

  // Enums
  RADCALS = FdsEnums.FIRE.radcals;

  mainSub;

  constructor(
    private mainService: MainService
  ) { }

  ngOnInit() {
    // Subscribe main object
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);

    // Assign to local variables
    this.fds = this.main.currentFdsScenario.fdsObject;
    this.fires = this.main.currentFdsScenario.fdsObject.fires;
  }

  ngAfterViewInit() {
  }

  ngOnDestroy() {
    this.mainSub.unsubscribe();
  }
  // COMPONENT METHODS

}
