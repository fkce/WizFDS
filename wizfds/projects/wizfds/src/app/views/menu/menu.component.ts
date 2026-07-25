import { Component, OnInit, OnDestroy, isDevMode } from '@angular/core';

import { MainService } from '@services/main/main.service';
import { Main } from '@services/main/main';
import { UiState } from '@services/ui-state/ui-state';
import { UiStateService } from '@services/ui-state/ui-state.service';
import { FdsScenarioService } from '@services/fds-scenario/fds-scenario.service';
import { WebsocketService } from '@services/websocket/websocket.service';
import { WebsocketMessageObject } from '@services/websocket/websocket-message';
import { LibraryService } from '@services/library/library.service';
import { LayoutService } from '@services/layout/layout.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-menu',
    templateUrl: './menu.component.html',
    styleUrls: ['./menu.component.scss'],
    standalone: false
})
export class MenuComponent implements OnInit, OnDestroy {

  main: Main;
  uiState: UiState;

  mainSub: Subscription;
  uiSub: Subscription;

  constructor(
    private mainService: MainService,
    public uiStateService: UiStateService,
    private fdsScenarioService: FdsScenarioService,
    public websocketService: WebsocketService,
    private libraryService: LibraryService,
    public layout: LayoutService,
    ) { }

  ngOnInit() {
    // Sync services
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);
    this.uiSub = this.uiStateService.uiObservable.subscribe(uiObservable => this.uiState = uiObservable);

    // Delay connectCad to wait for WebSocket initialization in AppComponent
    // (moved here with the CAD controls, which now live in the sidebar footer).
    setTimeout(() => {
      this.connectCad();
    }, 1000);
  }

  ngOnDestroy() {
    this.mainSub.unsubscribe();
    this.uiSub.unsubscribe();
  }

  activate(option: string) {
    this.uiState.active = option;
  }

  /** Collapse / expand the sidebar to an icon rail. */
  public toggleCollapse() {
    this.layout.toggleSidebar();
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

  /** Update FDS library */
  public updateFdsLibrary() {
    this.libraryService.updateLibrary();
  }

  /** Connect to / disconnect from the CAD plugin over WebSocket. */
  public connectCad() {
    if (!this.websocketService.isConnected) {
      this.websocketService.dataStream.subscribe(
        (data) => { },
        (err) => { if (isDevMode()) console.log(err); },
        () => { if (isDevMode()) console.log("Websocket disconnected ..."); }
      );
    }
    else {
      this.websocketService.dataStream.unsubscribe();
      this.websocketService.ws.close();
    }
  }

  /** Request the current CAD geometry from the plugin. */
  public getCadGeometryWeb() {
    let message: WebsocketMessageObject = {
      method: 'getCadGeometryWeb',
      data: {},
      id: this.websocketService.idGenerator(),
      requestID: '',
      status: 'succes'
    }
    this.websocketService.sendMessage(message);
  }

}
