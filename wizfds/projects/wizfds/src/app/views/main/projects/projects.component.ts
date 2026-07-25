import { Component, OnInit, OnDestroy, isDevMode, HostListener } from '@angular/core';

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
import { Subscription } from 'rxjs';

type SortKey = 'name' | 'category' | 'scenarios';

@Component({
    selector: 'app-projects',
    templateUrl: './projects.component.html',
    styleUrls: ['./projects.component.scss'],
    standalone: false
})
export class ProjectsComponent implements OnInit, OnDestroy {
  main: Main;
  projects: Project[] = [];       // category-filtered + sorted (source of truth for the view)
  filteredProjects: Project[] = []; // projects further narrowed by the search box (rendered)
  allProjects: Project[] = [];
  ui: UiState;

  // View state
  searchQuery: string = '';
  sortKey: SortKey = 'category';
  sortAsc: boolean = true;

  // Two-step (inline) delete confirmation
  confirmType: 'project' | 'scenario' | null = null;
  confirmProjectId: number = null;
  confirmScenarioId: number = null;
  private confirmTimeout: any;

  mainSub: Subscription;
  uiSub: Subscription;

  constructor(
    public mainService: MainService,
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
    if (this.main.init.isProjectsInited && this.main.init.isCategoriesInited) {
      this.updateProjectsList();
    }

    // Wait for projects and categories if first loading page
    if (this.projects.length < 1 && !this.main.init.isProjectsInited) {
      let projectsInterval = setInterval(() => {
        if (this.main.categories.length > 0 && this.main.projects.length > 0) {
          this.updateProjectsList();
          clearInterval(projectsInterval);
          this.main.init.isProjectsInited = true;
        }
      }, 500);
    }

  }

  ngOnDestroy() {
    this.mainSub.unsubscribe();
    this.uiSub.unsubscribe();
    clearTimeout(this.confirmTimeout);
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
    this.applySort();
    this.applyView();
  }

  // --- Search --------------------------------------------------------------
  /** Live-filter the visible list by name/description. */
  public onSearchChange(value: string) {
    this.searchQuery = value;
    this.uiStateService.projects.begin = 0; // jump back to the first page on a new query
    this.applyView();
  }

  private applyView() {
    const q = (this.searchQuery || '').trim().toLowerCase();
    this.filteredProjects = q
      ? this.projects.filter(p =>
          (p.name || '').toLowerCase().indexOf(q) >= 0 ||
          (p.description || '').toLowerCase().indexOf(q) >= 0)
      : this.projects.slice();
  }

  // --- Sorting (column headers) --------------------------------------------
  /** Toggle sort on a column; same key flips direction, new key resets to asc. */
  public setSort(key: SortKey) {
    if (this.sortKey === key) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortKey = key;
      this.sortAsc = true;
    }
    this.applySort();
    this.applyView();
  }

  private applySort() {
    let arr = this.projects.slice();
    if (this.sortKey === 'name') {
      arr = sortBy(arr, (p) => (p.name || '').toLowerCase());
    } else if (this.sortKey === 'scenarios') {
      arr = sortBy(arr, (p) => (p.fdsScenarios || []).length);
    } else {
      arr = sortBy(arr, (p) => this.rankByCategory(p));
    }
    if (!this.sortAsc) arr.reverse();
    this.projects = arr;
  }

  /** Rank current(1) < finished(2) < archive(3); unknown last. */
  private rankByCategory(project: Project): number {
    if (this.main == undefined || this.main.categories == undefined) return 99;
    const uuidFor = (label: string) => {
      const c = find(this.main.categories, (category) => category.label == label);
      return c ? c.uuid : undefined;
    };
    const rank = {
      [uuidFor('current')]: 1,
      [uuidFor('finished')]: 2,
      [uuidFor('archive')]: 3
    };
    const r = rank[project.category];
    return r == undefined ? 99 : r;
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
    if (isDevMode()) console.log("download fds scenario");
  }

  /** Delete fds scenario */
  public deleteFdsScenario(projectId: number, fdsScenarioId: number) {
    if (this.main.currentFdsScenario != undefined && this.main.currentFdsScenario.id == fdsScenarioId)
      this.main.currentFdsScenario = undefined;

    this.fdsScenarioService.deleteFdsScenario(projectId, fdsScenarioId);
  }

  // --- Two-step delete confirmation ----------------------------------------
  public isConfirmingProject(projectId: number): boolean {
    return this.confirmType === 'project' && this.confirmProjectId === projectId;
  }
  public isConfirmingScenario(projectId: number, fdsScenarioId: number): boolean {
    return this.confirmType === 'scenario' && this.confirmProjectId === projectId && this.confirmScenarioId === fdsScenarioId;
  }

  /** First click arms the confirm; second click (within 3s) deletes. */
  public requestDeleteProject(projectId: number, event?: MouseEvent) {
    if (event) event.stopPropagation();
    if (this.isConfirmingProject(projectId)) {
      this.clearConfirm();
      this.deleteProject(projectId);
    } else {
      this.armConfirm('project', projectId, null);
    }
  }
  public requestDeleteScenario(projectId: number, fdsScenarioId: number, event?: MouseEvent) {
    if (event) event.stopPropagation();
    if (this.isConfirmingScenario(projectId, fdsScenarioId)) {
      this.clearConfirm();
      this.deleteFdsScenario(projectId, fdsScenarioId);
    } else {
      this.armConfirm('scenario', projectId, fdsScenarioId);
    }
  }

  private armConfirm(type: 'project' | 'scenario', projectId: number, fdsScenarioId: number) {
    this.confirmType = type;
    this.confirmProjectId = projectId;
    this.confirmScenarioId = fdsScenarioId;
    clearTimeout(this.confirmTimeout);
    this.confirmTimeout = setTimeout(() => this.clearConfirm(), 3000);
  }
  public clearConfirm() {
    clearTimeout(this.confirmTimeout);
    this.confirmType = null;
    this.confirmProjectId = null;
    this.confirmScenarioId = null;
  }

  /** Any click outside an armed delete control cancels the pending confirm. */
  @HostListener('document:click')
  public onDocumentClick() {
    if (this.confirmType != null) this.clearConfirm();
  }

}
