import { Router, NavigationEnd } from '@angular/router';
import { Component, OnInit, isDevMode, enableProdMode } from '@angular/core';
import 'rxjs/add/operator/filter';
import {googleAnalytics} from '../assets/analytics';

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

  constructor(
    private mainService: MainService,
    private websocket: WebsocketService,
    private libraryService: LibraryService,
    private projectService: ProjectService,
    private fdsScenarioService: FdsScenarioService,
    private categoryService: CategoryService,
    private router: Router,
    public httpManager: HttpManagerService
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

    this.mainService.getMain().subscribe(main => this.main = main);

    this.projectService.getProjects();
    this.categoryService.getCategories();

    this.libraryService.loadLibrary();
    this.libraryService.getLibrary().subscribe(library => this.lib = library);

    this.websocket.initializeWebSocket();

    // Navigate after page is reloaded
    this.router.navigate(['']);

    // For developing purpose
    if (isDevMode()) {
      setTimeout(() => {
        this.setCurrentFdsScenario(30, 53);
      }, 1000);
      setTimeout(() => {
        //this.router.navigate(['fds/output/device']);
      }, 2000);
    }
  }

  ngAfterViewInit() {

  }

  setCurrentFdsScenario(projectId: number, fdsScenarioId: number) {
    this.fdsScenarioService.setCurrentFdsScenario(projectId, fdsScenarioId).subscribe();
  }

}
