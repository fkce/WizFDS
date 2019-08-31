import { Router, NavigationEnd } from '@angular/router';
import { Component, isDevMode } from '@angular/core';
import 'rxjs/add/operator/filter';
import { googleAnalytics } from '../assets/analytics';
import { includes, isEqual, cloneDeep } from 'lodash';

import { MainService } from '@services/main/main.service';
import { Main } from '@services/main/main';
import { WebsocketService } from '@services/websocket/websocket.service';
import { Library } from '@services/library/library';
import { LibraryService } from '@services/library/library.service';
import { ProjectService } from '@services/project/project.service';
import { CategoryService } from '@services/category/category.service';
import { HttpManagerService } from '@services/http-manager/http-manager.service';
import { FdsScenarioService } from '@services/fds-scenario/fds-scenario.service';
import { environment } from '@env/environment';
import { timer } from 'rxjs';
import { SnackBarService } from '@services/snack-bar/snack-bar.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  main: Main;
  lib: Library;
  version = environment.version;
  lastUrl: string = '/';

  mainSub;
  wsSub;

  constructor(
    private mainService: MainService,
    private websocket: WebsocketService,
    private libraryService: LibraryService,
    private projectService: ProjectService,
    private fdsScenarioService: FdsScenarioService,
    private categoryService: CategoryService,
    private router: Router,
    public httpManager: HttpManagerService,
    private websocketService: WebsocketService,
    private snackBarService: SnackBarService
  ) {
    this.router.events.subscribe(event => {
      this.router.events.filter(event => event instanceof NavigationEnd).subscribe(event => {
        const url = event['url'];
        if (url !== null && url !== undefined && url !== '' && url.indexOf('null') < 0 && this.lastUrl != url) {
          googleAnalytics(url);
          this.lastUrl = url;
        }
      });
    });

  }

  ngOnInit() {
    console.clear();

    if (isDevMode()) {
      console.log('Development mode');
    }
    else {
      console.log('Production mode');
    }

    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);

    this.projectService.getProjects();
    this.categoryService.getCategories();

    this.libraryService.loadLibrary();
    setTimeout(() => {
      this.libraryService.getLibrary().subscribe(library => this.lib = library);
    }, 1500);

    setTimeout(() => {
      this.websocket.initializeWebSocket();
    }, 1000);

    // Navigate after page is reloaded
    this.router.navigate(['']);

    // For developing purpose
    if (isDevMode()) {
      setTimeout(() => {
        //this.setCurrentFdsScenario(30, 53);
      }, 1000);
      setTimeout(() => {
        //this.router.navigate(['/fds/fire/fire']);
      }, 2000);
    }

    // Subscribe websocket requests status for websocket CAD sync
    this.wsSub = this.websocketService.requestStatus.subscribe(
      (message) => {
        if (message.status == 'error') {
          this.snackBarService.notify('error', 'CAD: Cannot sync ...');
        }
        else if (message.status == 'success') {
          if (includes(message.method, 'create')) {
            this.snackBarService.notify('success', 'CAD: Object created');
          }
          else if (includes(message.method, 'update')) {
            this.snackBarService.notify('success', 'CAD: Object updated');
          }
          else if (includes(message.method, 'delete')) {
            this.snackBarService.notify('success', 'CAD: Object deleted');
          }
          else if (message.method == 'selectObjectWeb') {
            this.snackBarService.notify('success', 'CAD: Element selected');
          }
        }
      },
      (error) => {
        this.snackBarService.notify('error', 'CAD: Cannot sync ...');
      }
    );

    // Idle implementation 
    this.main.idle.timer = timer(0, this.main.idle.interval);
    this.main.idle.subscription = this.main.idle.timer.subscribe((val) => {
        this.mainService.updateIdle();
    });

  }

  ngAfterViewInit() {

  }

  ngDoCheck(): void {

    // !!!!!!!!! TODO - wylaczyc w przypadku tworzenia nowego obiektu -> dodac jeszcze jedna zmienną

    // Autosave changes in FdsObject every 20 seconds when change is detected
    // First check if FdsObject was changed
    if (this.main.currentFdsScenario != undefined && !isEqual(this.main.autoSave.fdsObjectDiffer, this.main.currentFdsScenario.fdsObject) && !this.main.autoSave.disable) {
      clearTimeout(this.main.autoSave.fdsObjectTimeout);
      // Check if scenario or project was not changed in the meanwhile
      if (this.main.autoSave.fdsObjectDiffer != null && this.main.autoSave.timeoutScenarioId == this.main.currentFdsScenario.id) {
        this.main.autoSave.fdsObjectSaveFont = 'mdi mdi-content-save-edit red';

        this.main.autoSave.fdsObjectTimeout = setTimeout(() => {
          this.fdsScenarioService.updateFdsScenario(this.main.currentProject.id, this.main.currentFdsScenario.id, 'all', true);
        }, 20000);
        this.main.autoSave.fdsObjectDiffer = cloneDeep(this.main.currentFdsScenario.fdsObject);
      }
      else {
        this.main.autoSave.timeoutScenarioId = this.main.currentFdsScenario.id;
        this.main.autoSave.fdsObjectDiffer = cloneDeep(this.main.currentFdsScenario.fdsObject);
      }
    }

    // Autosave changes in Library every 20 seconds when change is detected
    // First check if Library was changed
    //if (this.lib != undefined && !isEqual(this.main.autoSave.libDiffer, this.lib)) {
    //  clearTimeout(this.main.autoSave.libTimeout);
    //  // Check if not null else init
    //  if (this.main.autoSave.libDiffer != null) {
    //    this.main.autoSave.libSaveFont = 'mdi mdi-content-save-edit red';
    //    this.main.autoSave.libTimeout = setTimeout(() => {
    //      this.libraryService.updateLibrary(true);
    //    }, 20000);
    //    this.main.autoSave.libDiffer = cloneDeep(this.lib);
    //  }
    //  else {
    //    this.main.autoSave.libDiffer = cloneDeep(this.lib);
    //  }
    //}

  }

  ngOnDestroy() {
    this.wsSub.unsubscribe();
    this.mainSub.unsubscribe();
  }

  setCurrentFdsScenario(projectId: number, fdsScenarioId: number) {
    this.fdsScenarioService.setCurrentFdsScenario(projectId, fdsScenarioId).subscribe();
  }

}
