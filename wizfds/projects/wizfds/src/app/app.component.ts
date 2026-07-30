import { Router, NavigationEnd } from '@angular/router';
import { Component, isDevMode } from '@angular/core';
import { filter } from 'rxjs/operators';
import { googleAnalytics } from '../assets/analytics';
import { includes } from 'lodash';


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
import { timer, Subscription } from 'rxjs';
import { SnackBarService } from '@services/snack-bar/snack-bar.service';
import { LayoutService } from '@services/layout/layout.service';
import { SaveState, saveStateOf } from '@services/main/save-state';
import { ViewportStatusService } from '@services/viewport-status/viewport-status.service';
import { AutoSaveService } from '@services/auto-save/auto-save.service';
import { FdsValidationService } from '@services/fds-validation/fds-validation.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false
})
export class AppComponent {
  main: Main;
  lib: Library;
  version = environment.version;
  lastUrl: string = '/';

  mainSub: Subscription;
  wsSub: Subscription;

  /**
   * The coarse autosave state the status bar shows. Shared with the ribbon's
   * Quick Access Toolbar, which shows the same thing - see saveStateOf().
   */
  get saveState(): SaveState {
    return saveStateOf(this.main);
  }

  constructor(
    private mainService: MainService,
    private websocket: WebsocketService,
    private libraryService: LibraryService,
    private projectService: ProjectService,
    private fdsScenarioService: FdsScenarioService,
    private categoryService: CategoryService,
    private router: Router,
    public httpManager: HttpManagerService,
    public websocketService: WebsocketService,
    private snackBarService: SnackBarService,
    public layout: LayoutService,
    public viewportStatus: ViewportStatusService,
    public validation: FdsValidationService,
    private autoSave: AutoSaveService
  ) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const url = event.url;
        if (url !== null && url !== undefined && url !== '' && url.indexOf('null') < 0 && this.lastUrl != url) {
          googleAnalytics(url);
          this.lastUrl = url;
        }
      });

  }

  ngOnInit() {
    if (isDevMode()) {
      console.clear();
      console.log('Development mode');
    }

    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);

    this.projectService.getProjects().then(() => {
      this.main.init.isProjectsInited = true;
    });
    this.categoryService.getCategories().then(() => {
      this.main.init.isCategoriesInited = true;
    });

    this.libraryService.loadLibrary();
    this.libraryService.libraryObservable.subscribe(library => this.lib = library);

    // Auto-save used to run from ngDoCheck here, deep-comparing the whole
    // scenario on every change-detection pass - which meant on every mouse move
    // over the 3D canvas. It has a clock of its own now (ADR-0009).
    this.autoSave.start();

    setTimeout(() => {
      this.websocket.initializeWebSocket();
    }, 1000);

    // Navigate after page is reloaded
    this.router.navigate(['']);

    // For developing purpose
    if (isDevMode()) {
      setTimeout(() => {
        this.setCurrentFdsScenario(3011, 14865);
      }, 4000);
      setTimeout(() => {
        this.router.navigate(['/fds/visualize']);
      }, 6000);
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

  ngOnDestroy() {
    this.wsSub.unsubscribe();
    this.mainSub.unsubscribe();
    this.autoSave.stop();
  }

  setCurrentFdsScenario(projectId: number, fdsScenarioId: number) {
    this.fdsScenarioService.setCurrentFdsScenario(projectId, fdsScenarioId).subscribe();
  }

}
