import { Result, HttpManagerService } from '@services/http-manager/http-manager.service';
import { Injectable } from '@angular/core';
import { MainService } from '@services/main/main.service';
import { Project } from './project';
import { Main } from '@services/main/main';
import { forEach, find } from 'lodash';
import { SnackBarService } from '@services/snack-bar/snack-bar.service';

@Injectable()
export class ProjectService {

  main: Main;

  constructor(
    private mainService: MainService,
    private httpManager: HttpManagerService,
    private snackBarService: SnackBarService
  ) {
    // Sync with main object
    this.mainService.getMain().subscribe(main => this.main = main);
  }

  /** Get all project from database */
  public getProjects() {
    let promise = new Promise((resolve, reject) => {
      this.httpManager.get(this.main.settings.hostAddress + '/api/projects').then((result: Result) => {
        // Iterate through all projects
        forEach(result.data, (project) => {
          this.main.projects.push(new Project(JSON.stringify(project)));
        });
        this.snackBarService.notify(result.meta.status, result.meta.details[0]);
        this.mainService.resetIdle();
        result.meta.status == 'success' ? resolve() : reject();
      });
    });
    return promise;
  }

  /** Set current project in main object */
  public setCurrnetProject(projectId: number) {
    let project = find(this.main.projects, function (o) {
      return o.id == projectId;
    });
    this.main.currentProject = project;
  }

  /** Create new project */
  public createProject() {
    this.mainService.resetIdle();
    return this.httpManager.post(this.main.settings.hostAddress + '/api/project', JSON.stringify({}));
  }

  /** Update project */
  public updateProject(projectId: number) {
    let project: Project = find(this.main.projects, function (o) { return o.id == projectId });
    this.httpManager.put(this.main.settings.hostAddress + '/api/project/' + project.id, project.toJSON()).then((result: Result) => {
      this.snackBarService.notify(result.meta.status, result.meta.details[0]);
      this.mainService.resetIdle();
    });

  }

  /** Delete project */
  public deleteProject(projectId: number) {
    this.mainService.resetIdle();
    return this.httpManager.delete(this.main.settings.hostAddress + '/api/project/' + projectId);
  }

}
