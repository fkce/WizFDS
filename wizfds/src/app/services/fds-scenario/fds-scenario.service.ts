import { Result, HttpManagerService } from '../http-manager/http-manager.service';
import { MainService } from '../main/main.service';
import { Main } from '../main/main';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { find, findIndex, filter, some, startsWith, forEach, split, toNumber, last } from 'lodash';
import { FdsScenario } from './fds-scenario';
import { Fds } from '../fds-object/fds-object';
import { NotifierService } from 'angular-notifier';
import { UiStateService } from '../ui-state/ui-state.service';
import { UiState } from '@services/ui-state/ui-state';

@Injectable()
export class FdsScenarioService {

  main: Main;

  constructor(
    private mainService: MainService,
    private httpManager: HttpManagerService,
    private uiStateService: UiStateService,
    private readonly notifierService: NotifierService
  ) {
    this.mainService.getMain().subscribe(main => this.main = main);
  }

  /**
   * Set fds scenario to current
   * @param projectId 
   * @param fdsScenarioId 
   */
  public setCurrentFdsScenario(projectId: number, fdsScenarioId: number): Observable<FdsScenario> {
    // Set current scenario in main object
    this.httpManager.get(this.main.hostAddres + '/api/fdsScenario/' + fdsScenarioId).then((result: Result) => {

      this.main.currentFdsScenario = new FdsScenario(JSON.stringify(result.data));

      // Set current project in main object
      let project = find(this.main.projects, function (o) {
        return o.id == projectId;
      });
      this.main.currentProject = project;

      this.uiStateService.setUiState();
      this.notifierService.notify(result.meta.status, result.meta.details[0]);
    });

    return of(this.main.currentFdsScenario)
  }

  /**
   * Create new FDS scenario
   * @param projectId 
   */
  public createFdsScenario(projectId: number) {
    // Request
    this.httpManager.post(this.main.hostAddres + '/api/fdsScenario/' + projectId, JSON.stringify({})).then((result: Result) => {
      let data = result.data;
      let fdsScenario = new FdsScenario(JSON.stringify({ id: data['id'], projectId: data['projectId'], name: data['name'], fdsObject: new Fds(JSON.stringify({})) }));
      // add ui state in fdsscenario constructor ???
      this.main.currentProject.fdsScenarios.push(fdsScenario);
      this.notifierService.notify(result.meta.status, result.meta.details[0]);
      this.setCurrentFdsScenario(projectId, fdsScenario.id);
    });
  }

  /**
   * Update FDS Scenario
   * @param projectId 
   * @param fdsScenarioId 
   * @param syncType Default value: 'all'
   */
  updateFdsScenario(projectId: number, fdsScenarioId: number, syncType: string = 'all') {

    let projectIndex = findIndex(this.main.projects, function (o) {
      return o.id == projectId;
    });
    let fdsScenarioIndex = findIndex(this.main.projects[projectIndex].fdsScenarios, function (o) {
      return o.id == fdsScenarioId;
    });

    // Sync only main info without fds object
    if (syncType == 'head') {
      let fdsScenario = this.main.projects[projectIndex].fdsScenarios[fdsScenarioIndex];

      this.httpManager.put(this.main.hostAddres + '/api/fdsScenario/' + fdsScenario.id, JSON.stringify({ type: 'head', data: { id: fdsScenario.id, name: fdsScenario.name } })).then((result: Result) => {
        if (this.main.currentFdsScenario != undefined) {
          this.main.currentFdsScenario = fdsScenario;
          // Change chid after scenario name update
          this.main.currentFdsScenario.fdsObject.general.head.chid = this.main.currentFdsScenario.name;
          this.main.currentFdsScenario.fdsObject.general.head.title = this.main.currentFdsScenario.name + ' scenario';
        }

        this.notifierService.notify(result.meta.status, result.meta.details[0]);
      });
    }
    // Sync only fds input file - user-defined input
    else if (syncType == 'input') {
      let fdsScenario = this.main.currentFdsScenario;

      this.httpManager.put(this.main.hostAddres + '/api/fdsScenario/' + fdsScenario.id, JSON.stringify({ type: 'input', data: { id: fdsScenario.id, fdsFile: fdsScenario.fdsFile } })).then((result: Result) => {
        this.main.projects[projectIndex].fdsScenarios[fdsScenarioIndex] = fdsScenario;
        this.notifierService.notify(result.meta.status, result.meta.details[0]);
      });
    }
    // Sync all data
    else if (syncType == 'all') {
      let fdsScenario = this.main.projects[projectIndex].fdsScenarios[fdsScenarioIndex];

      this.httpManager.put(this.main.hostAddres + '/api/fdsScenario/' + fdsScenario.id, JSON.stringify({ type: 'all', data: fdsScenario.toJSON() })).then((result: Result) => {
        this.main.projects[projectIndex].fdsScenarios[fdsScenarioIndex] = fdsScenario;
        this.notifierService.notify(result.meta.status, result.meta.details[0]);
      });
    }
  }

  /**
   * Duplicate scenario
   * @param projectId Project id
   * @param fdsScenarioId FDS scenario id
   */
  public duplicateFdsScenario(projectId: number, fdsScenarioId: number) {
    // Request
    this.httpManager.get(this.main.hostAddres + '/api/fdsScenario/' + fdsScenarioId).then((getScenarioResult: Result) => {
      let getScenarioData = getScenarioResult.data;
      console.log('get scenario data:');
      console.log(getScenarioData);
      this.httpManager.post(this.main.hostAddres + '/api/fdsScenario/' + projectId, JSON.stringify({})).then((result: Result) => {
        let data = result.data;

        // Find scenarios starting with duplicated scenario name && get currnet index
        let scenarios = filter(this.main.currentProject.fdsScenarios, function (scenario) { return RegExp('^' + getScenarioData['name']).test(scenario.name) });
        let index = 1;
        let id = 0;
        forEach(scenarios, (scenario) => {
          if (scenario.name != getScenarioData['name']) {
            if (1 < toNumber(last(split(scenario.name, '_'))) + 1) {
              index = toNumber(last(split(scenario.name, '_'))) + 1;
              id = scenario.id;
            }
          }
          else {
            id = scenario.id;
          }
        });

        let fdsScenario = new FdsScenario(JSON.stringify({
          id: data['id'],
          projectId: data['projectId'],
          name: getScenarioData['name'] + '_' + index,
          fdsObject: new Fds(JSON.stringify(getScenarioData['fdsObject'])),
          uiState: new UiState(JSON.stringify(getScenarioData['uiState']))
        }));

        // Splice scenario on proper position
        let projectIndex = findIndex(this.main.projects, function (o) { return o.id == projectId; });
        let fdsScenarioIndex = findIndex(this.main.projects[projectIndex].fdsScenarios, function (o) { return o.id == id; });
        
        this.main.currentProject.fdsScenarios.splice(fdsScenarioIndex + 1, 0, fdsScenario);

        fdsScenarioIndex = findIndex(this.main.projects[projectIndex].fdsScenarios, function (o) { return o.id == fdsScenario.id; });

        this.httpManager.put(this.main.hostAddres + '/api/fdsScenario/' + fdsScenario.id, JSON.stringify({ type: 'all', data: fdsScenario.toJSON() })).then((result: Result) => {
          this.main.projects[projectIndex].fdsScenarios[fdsScenarioIndex] = fdsScenario;

          if (result.meta.status == 'sucessful') {
            this.notifierService.notify(result.meta.status, fdsScenario.name + ' duplicated');
          }
          else {
            this.notifierService.notify(result.meta.status, fdsScenario.name + ' not duplicated');
          }
        });
      });
    });
  }

  /**
   * Delete FDS scenario
   * @param projectId 
   * @param fdsScenarioId 
   */
  public deleteFdsScenario(projectId: number, fdsScenarioId: number) {
    this.httpManager.delete(this.main.hostAddres + '/api/fdsScenario/' + fdsScenarioId).then((result: Result) => {
      let project = find(this.main.projects, function (o) { return o.id == projectId });
      project.fdsScenarios.splice(findIndex(project.fdsScenarios, function (o) { return o.id == fdsScenarioId }), 1);
      this.notifierService.notify(result.meta.status, result.meta.details[0]);
    });
  }

}
