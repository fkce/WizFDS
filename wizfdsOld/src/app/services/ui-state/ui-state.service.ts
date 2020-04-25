import { Injectable } from '@angular/core';
import { Observable ,  of ,  BehaviorSubject } from 'rxjs';
import { UiState } from './ui-state';
import { get, set } from 'lodash';
import { MainService } from '../main/main.service';
import { Main } from '../main/main';

@Injectable()
export class UiStateService {

  main: Main;
  uiState: UiState = new UiState(JSON.stringify('{}'));
  uiSubject = new BehaviorSubject<UiState>(this.uiState);
  uiObservable = this.uiSubject.asObservable();
  projects: {
    begin: number,
    listRange: number
  }

  constructor(
    private mainService: MainService,
  ) { 
    this.mainService.getMain().subscribe(main => this.main = main);
    this.projects = {
      begin: 0,
      listRange: 20
    }
  }

  /**
   * Set Ui state
   */
  public setUiState() {
    if (this.main.currentFdsScenario != undefined) {
      this.uiSubject.next(this.main.currentFdsScenario.uiState);
    }
  }

  /**
   * Increase projects list range
   */
  public increaseProjectsRange() {
    this.projects.begin = this.projects.begin + this.projects.listRange;
  }

  /**
   * Decrease projects list range
   */
  public decreaseProjectsRange() {
    this.projects.begin = this.projects.begin - this.projects.listRange;
  }

  /** 
   * Increase begin parameter 
   */
  public increaseRange(path: string) {
    let begin = get(this.main.currentFdsScenario.uiState, path + '.begin');
    let range = this.main.currentFdsScenario.uiState.listRange;
    set(this.main.currentFdsScenario.uiState, path + '.begin', begin + range);
    this.setUiState();
  }

  /** Decrease begin parameter */
  public decreaseRange(path: string) {
    let begin = get(this.main.currentFdsScenario.uiState, path + '.begin');
    let range = this.main.currentFdsScenario.uiState.listRange;
    set(this.main.currentFdsScenario.uiState, path + '.begin', begin - range);
    this.setUiState();
  }

}
