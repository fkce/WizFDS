import { Component, OnInit, OnDestroy } from '@angular/core';

import { Project } from '@services/project/project';
import { MainService } from '@services/main/main.service';
import { ProjectService } from '@services/project/project.service';
import { FdsScenarioService } from '@services/fds-scenario/fds-scenario.service';
import { Main } from '@services/main/main';
import { CategoryService } from '@services/category/category.service';
import { UiState } from '@services/ui-state/ui-state';
import { UiStateService } from '@services/ui-state/ui-state.service';
import { Result } from '@services/http-manager/http-manager.service';

import { find, forEach, remove, findIndex, sortBy } from 'lodash';
import { SnackBarService } from '@services/snack-bar/snack-bar.service';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit, OnDestroy {
  main: Main;
  projects: Project[] = [];
  allProjects: Project[] = [];
  ui: UiState;

  mainSub;
  uiSub;

  constructor(
    private mainService: MainService,
    private projectService: ProjectService,
    private fdsScenarioService: FdsScenarioService,
    public uiStateService: UiStateService,
    private categoryService: CategoryService,
    private snackBarService: SnackBarService
  ) { }

  ngOnInit() {
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);
    this.uiSub = this.uiStateService.uiObservable.subscribe(uiObservable => this.ui = uiObservable);

    // Try to update list asap if project & category is inited
    if(this.main.init.isProjectsInited && this.main.init.isCategoriesInited) {
      this.updateProjectsList();
    }

    // Wait for projects and categories if first loading page
    // If there is slow internet connection wait another 2 sec 
    if (this.projects.length < 1) {
      setTimeout(() => {
        if (this.main.categories.length > 0 && this.main.projects.length > 0) {
          this.updateProjectsList();
        }
        else {
          setTimeout(() => {
            this.updateProjectsList();
          }, 2000)
        }
      }, 2500);
    }

  }

  ngOnDestroy() {
    this.mainSub.unsubscribe();
    this.uiSub.unsubscribe();
  }

  /**
   * Update list of projects
   */
  public updateProjectsList() {
    remove(this.projects);
    forEach(this.main.categories, (category) => {
      forEach(this.main.projects, (project) => {
        if (category.active && project.category == category.uuid) {
          this.projects.push(project);
        }
      });
    });
    this.sortProjectsByCategory();
  }

  /**
   * Set/unset project to current in main object
   * @param index 
   */
  public setCurrentProject(index: number) {
    if (this.main.currentProject != undefined && this.main.currentFdsScenario != undefined) {
      this.fdsScenarioService.updateFdsScenario(this.main.currentProject.id, this.main.currentFdsScenario.id);
    }
    this.projectService.setCurrnetProject(index);
    this.main.currentFdsScenario = undefined;
  }
  public unsetCurrentProject() {
    if (this.main.currentProject != undefined && this.main.currentFdsScenario != undefined) {
      this.fdsScenarioService.updateFdsScenario(this.main.currentProject.id, this.main.currentFdsScenario.id);
    }
    this.main.currentProject = undefined;
    this.main.currentFdsScenario = undefined;
  }

  /** 
   * Add new project 
   */
  public newProject() {
    this.projectService.createProject()
      .then((result: Result) => {
        let data = result.data;
        let project = new Project(JSON.stringify({ id: data['id'], name: data['name'], description: data['description'], category: data['category_id'] }));
        this.main.projects.splice(0, 0, project);
        this.snackBarService.notify(result.meta.status, result.meta.details[0]);
        this.updateProjectsList();
      });
  }

  /**
   * Update project name/desc/category in DB
   * @param projectId 
   */
  public updateProject(projectId: number) {
    this.projectService.updateProject(projectId);
  }

  /**
   * Delete project from DB
   * @param projectId 
   */
  public deleteProject(projectId: number) {
    let project: Project = find(this.main.projects, function (o) { return o.id == projectId });
    this.projectService.deleteProject(projectId).then((result: Result) => {
      ;
      this.main.projects.splice(findIndex(this.main.projects, function (o) { return o.id == project.id }), 1);
      this.snackBarService.notify(result.meta.status, result.meta.details[0]);
      this.updateProjectsList();
    });
  }

  /** Check if category is visible (turned on/off) */
  public checkProjectCategory(categoryUuid: string) {
    let category = find(this.main.categories, function (category) {
      return category.uuid == categoryUuid;
    });
    if (category && category.active == true) {
      return true;
    } else {
      return false;
    }
  }

  /** Change category activity */
  public changeCategoryActivity(categoryUuid: string, categoryIndex: number) {
    if (this.main.currentProject != undefined && this.main.currentProject.category == categoryUuid) {
      if (this.main.currentFdsScenario != undefined) {
        this.main.currentFdsScenario = undefined;
      }
      this.main.currentProject = undefined;
    }
    this.categoryService.updataCategory(categoryUuid, this.main.categories[categoryIndex]);
    this.updateProjectsList();
  }

  /** Set fds scenario to current */
  public setCurrentFdsScenario(projectId: number, fdsScenarioId: number) {
    if (this.main.currentFdsScenario != undefined) {
      if (this.main.currentFdsScenario.id != fdsScenarioId) {
        //this.fdsScenarioService.setCurrentFdsScenario(projectId, fdsScenarioId).subscribe();
        this.fdsScenarioService.setCurrentFdsScenario(projectId, fdsScenarioId);
      }
    }
    else {
      //this.fdsScenarioService.setCurrentFdsScenario(projectId, fdsScenarioId).subscribe();
      this.fdsScenarioService.setCurrentFdsScenario(projectId, fdsScenarioId);
    }
  }

  /** Add fds scenario */
  public addFdsScenario(projectId: number) {
    this.setCurrentProject(projectId);
    this.fdsScenarioService.createFdsScenario(projectId);
  }

  /**
   * Duplicate FDS scenario
   * @param projectId Project id
   * @param fdsScenarioId FDS scenario id
   */
  public duplicateFdsScenario(projectId: number, fdsScenarioId: number) {
    this.fdsScenarioService.duplicateFdsScenario(projectId, fdsScenarioId);
  }

  /** Set fds scenario name  */
  public updateFdsScenario(projectId: number, fdsScenarioId: number) {
    this.fdsScenarioService.updateFdsScenario(projectId, fdsScenarioId, 'head', true);
  }

  /** Download fds file */
  public downloadFdsScenario(projectId: number, fdsScenarioId: number) {
    console.log("download fds scenario");
  }

  /** Delete fds scenario */
  public deleteFdsScenario(projectId: number, fdsScenarioId: number) {
    if (this.main.currentFdsScenario != undefined && this.main.currentFdsScenario.id == fdsScenarioId)
      this.main.currentFdsScenario = undefined;

    this.fdsScenarioService.deleteFdsScenario(projectId, fdsScenarioId);
  }

  /** Sort projects by name */
  public sortProjectsByName() {
    this.projects = sortBy(this.projects, (project) => {
      return project.name;
    });
  }

  /** Sort projects by category */
  public sortProjectsByCategory() {
    if (this.main != undefined && this.main.categories != undefined) {
      let current = find(this.main.categories, (category) => { return category.label == 'current'; }).uuid;
      let finished = find(this.main.categories, (category) => { return category.label == 'finished'; }).uuid;
      let archive = find(this.main.categories, (category) => { return category.label == 'archive'; }).uuid;
      this.projects = sortBy(this.projects, (project) => {
        let rank = {
          [current]: 1,
          [finished]: 2,
          [archive]: 3
        };
        return rank[project.category];
      });
    }
  }

}