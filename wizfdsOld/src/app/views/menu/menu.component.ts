import { Component, OnInit, OnDestroy } from '@angular/core';

import { MainService } from '@services/main/main.service';
import { Main } from '@services/main/main';
import { UiState } from '@services/ui-state/ui-state';
import { UiStateService } from '@services/ui-state/ui-state.service';
import { FdsScenarioService } from '@services/fds-scenario/fds-scenario.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit, OnDestroy {

  main: Main;
  uiState: UiState;

  mainSub;
  uiSub;

  constructor(
    private mainService: MainService, 
    private uiStateService: UiStateService,
    private fdsScenarioService: FdsScenarioService,
    ) { }

  ngOnInit() {
    // Sync services
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);
    this.uiSub = this.uiStateService.uiObservable.subscribe(uiObservable => this.uiState = uiObservable);
  }

  ngOnDestroy() {
    this.mainSub.unsubscribe();
    this.uiSub.unsubscribe();
  }

  activate(option: string) {
    this.uiState.active = option;
  }
  
  /**
   * Update FDS sceanrio
   * @param projectId 
   * @param fdsScenarioId 
   */
  public updateFdsScenario(projectId: number, fdsScenarioId: number) {
    if(this.main.currentFdsScenario != undefined) {
      this.fdsScenarioService.updateFdsScenario(projectId, fdsScenarioId);
    }
  }

}
