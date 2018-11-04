import { Component, OnInit, ViewChild, OnDestroy, isDevMode } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Open } from '@services/fds-object/geometry/open';
import { UiState } from '@services/ui-state/ui-state';
import { UiStateService } from '@services/ui-state/ui-state.service';
import { Fds } from '@services/fds-object/fds-object';
import { Mesh } from '@services/fds-object/geometry/mesh';
import { MainService } from '@services/main/main.service';
import { Main } from '@services/main/main';
import { WebsocketService } from '@services/websocket/websocket.service';
import { WebsocketMessageObject } from '@services/websocket/websocket-message';

import { PerfectScrollbarComponent } from 'ngx-perfect-scrollbar';
import { NotifierService } from '../../../../../../../node_modules/angular-notifier';
import { set, cloneDeep, find, forEach, findIndex } from 'lodash';

@Component({
  selector: 'app-mesh',
  templateUrl: './mesh.component.html',
  styleUrls: ['./mesh.component.scss']
})
export class MeshComponent implements OnInit, OnDestroy {

  // Global objects
  main: Main;
  fds: Fds;
  geometry: any;
  ui: UiState;

  // Component objects
  meshes: Mesh[];
  mesh: Mesh;
  meshOld: Mesh;
  opens: Open[];
  open: Open;
  openOld: Open;

  wsSub;
  mainSub;
  uiSub;
  rouSub;

  // Scrolbars containers
  @ViewChild('meshScrollbar') meshScrollbar: PerfectScrollbarComponent;
  @ViewChild('openScrollbar') openScrollbar: PerfectScrollbarComponent;

  constructor(
    private mainService: MainService,
    private websocketService: WebsocketService,
    private uiStateService: UiStateService,
    private route: ActivatedRoute,
    private readonly notifierService: NotifierService
  ) { }

  ngOnInit() {
    console.clear();
    // Subscribe main object
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);
    this.uiSub = this.uiStateService.uiObservable.subscribe(uiObservable => this.ui = uiObservable);

    // Assign to local variables
    this.fds = this.main.currentFdsScenario.fdsObject;
    this.geometry = this.main.currentFdsScenario.fdsObject.geometry;
    this.meshes = this.main.currentFdsScenario.fdsObject.geometry.meshes;
    this.opens = this.main.currentFdsScenario.fdsObject.geometry.opens;

    // Subscribe websocket requests status for websocket CAD sync
    this.wsSub = this.websocketService.requestStatus.subscribe(
      (message) => {
        if (message.status == 'error') {
          this.mesh = cloneDeep(this.meshOld);
          this.notifierService.notify('error', 'CAD: Cannot sync ...');
        }
        else if (message.status == 'success') {
          this.meshOld = cloneDeep(this.mesh);
          if (message.method == 'createMeshWeb') {
            this.mesh.idAC = message.data['idAC'];
            this.notifierService.notify('success', 'CAD: Mesh created');
          }
          else if (message.method == 'updateMeshWeb') {
            this.notifierService.notify('success', 'CAD: Mesh updated');
          }
          else if (message.method == 'deleteMeshWeb') {
            this.notifierService.notify('success', 'CAD: Mesh deleted');
          }
          else if (message.method == 'selectObjectWeb') {
            this.notifierService.notify('success', 'CAD: Element selected');
          }
        }
      },
      (error) => {
        this.mesh = cloneDeep(this.meshOld);
        this.notifierService.notify('error', 'CAD: Cannot sync ...');
      }
    );

    // Activate element from route or ui object
    this.rouSub = this.route.params.subscribe((params) => {
      if (params['idAC']) {
        let index = -1;

        switch (params['type']) {
          case 'mesh':
            index = findIndex(this.meshes, function (o) { return o.idAC == params['idAC']; });
            if (index >= 0) {
              this.activate(this.meshes[index].id, 'mesh');
            }
            // Set range list
            let elementBegin = Math.floor((index + 1) / this.ui.listRange) * this.ui.listRange;
            this.ui.geometry['mesh'].begin = elementBegin;
            this.ui.geometry['mesh'].elementIndex = index;
            // Set scrool y position, timeout needed to wait for view init
            setTimeout(() => {
              let elementNumber = this.meshes.length - (index + 1) > this.ui.listRange ? this.ui.listRange : this.meshes.length % this.ui.listRange;
              let elementHeight = this.meshScrollbar.directiveRef.geometry().h / elementNumber;
              this.meshScrollbar.directiveRef.scrollToY(elementHeight * (index - elementBegin));
            }, 100);

            // Activate element from second list
            this.opens.length > 0 ? this.activate(this.opens[this.ui.geometry['open'].elementIndex].id, 'open') : this.open = undefined;
            break;

          case 'open':
            index = findIndex(this.opens, function (o) { return o.idAC == params['idAC']; });
            if (index >= 0) {
              this.activate(this.opens[index].id, 'open');
            }
            this.meshes.length > 0 ? this.activate(this.meshes[this.ui.geometry['mesh'].elementIndex].id, 'mesh') : this.mesh = undefined;
            break;

        }
      }
      else {
        this.meshes.length > 0 ? this.activate(this.meshes[this.ui.geometry['mesh'].elementIndex].id, 'mesh') : this.mesh = undefined;
        this.opens.length > 0 ? this.activate(this.opens[this.ui.geometry['open'].elementIndex].id, 'open') : this.open = undefined;
      }
    });

  }

  ngAfterViewInit() {
    // Set scrollbars position y after view rendering
    //this.meshScrollbar.directiveRef.scrollToY(this.ui.geometry['mesh'].scrollPosition);
    let index = this.ui.geometry['mesh'].elementIndex;
    let elementBegin = Math.floor((index + 1) / this.ui.listRange) * this.ui.listRange;
    let elementNumber = this.meshes.length - (index + 1) > this.ui.listRange ? this.ui.listRange : this.meshes.length % this.ui.listRange;
    let elementHeight = this.meshScrollbar.directiveRef.geometry().h / elementNumber;
    this.meshScrollbar.directiveRef.scrollToY(elementHeight * (index - elementBegin));

    this.openScrollbar.directiveRef.scrollToY(this.ui.geometry['open'].scrollPosition);
  }

  ngOnDestroy() {
    this.wsSub.unsubscribe();
    this.mainSub.unsubscribe();
    this.uiSub.unsubscribe();
    this.rouSub.unsubscribe();
  }

  /** Activate element on click */
  public activate(id: string, type: string = '') {
    if (type == 'mesh') {
      this.mesh = find(this.fds.geometry.meshes, function (o) { return o.id == id; });
      this.ui.geometry['mesh'].elementIndex = findIndex(this.meshes, { id: id });
      this.meshOld = cloneDeep(this.mesh);
    }
    else if (type == 'open') {
      this.open = find(this.fds.geometry.opens, function (o) { return o.id == id; });
      this.ui.geometry['open'].elementIndex = findIndex(this.opens, { id: id });
      this.openOld = cloneDeep(this.open);
    }
  }

  /** Push new element */
  public add(type: string = '') {
    if (type == 'mesh') {
      let element = { id: 'MESH' + this.mainService.getListId(this.meshes) };
      this.meshes.push(new Mesh(JSON.stringify(element)));
      this.activate(element.id, 'mesh');
    }
    else if (type == 'open') {
      let element = { id: 'OPEN' + this.mainService.getListId(this.opens) };
      this.opens.push(new Open(JSON.stringify(element)));
      this.activate(element.id, 'open');
    }
  }

  /** Delete element */
  public delete(id: string, type: string = '') {
    if (type == 'mesh') {
      let index = findIndex(this.meshes, { id: id });
      this.meshes.splice(index, 1);
      if (index != 0) {
        this.meshes.length == 0 ? this.mesh = undefined : this.activate(this.meshes[index - 1].id);
      }
      else {
        this.meshes.length == 0 ? this.mesh = undefined : this.activate(this.meshes[index].id);
      }
    }
    else if (type == 'open') {
      let index = findIndex(this.opens, { id: id });
      this.opens.splice(index, 1);
      if (index != 0) {
        this.opens.length == 0 ? this.open = undefined : this.activate(this.opens[index - 1].id);
      }
      else {
        this.opens.length == 0 ? this.open = undefined : this.activate(this.opens[index].id);
      }
    }
  }

  /** Update scroll position */
  public scrollbarUpdate(element: string) {
    set(this.ui.geometry, element + '.scrollPosition', this[element + 'Scrollbar'].directiveRef.geometry().y);
  }

  /** Create CAD element */
  public createCad(type: string = '') {
    if (this.websocketService.isConnected) {
      if (type == 'mesh') {
        this.meshOld = cloneDeep(this.mesh);

        // Prepare message
        let message: WebsocketMessageObject = {
          method: 'createMeshWeb',
          data: {
            xb: this.mesh.xb.toJSON()
          },
          id: this.websocketService.idGenerator(),
          requestID: '',
          status: "waiting"
        }

        // Send message to CAD
        this.websocketService.sendMessage(message);
      }
      else if (type == 'open') {
        this.openOld = cloneDeep(this.open);

        // Prepare message
        let message: WebsocketMessageObject = {
          method: 'createOpenWeb',
          data: {
            xb: this.open.xb.toJSON()
          },
          id: this.websocketService.idGenerator(),
          requestID: '',
          status: "waiting"
        }

        // Send message to CAD
        this.websocketService.sendMessage(message);
      }
    }
  }

  /** Update CAD element */
  public updateCad(type: string = '') {
    if (this.websocketService.isConnected) {
      if (type == 'mesh') {
        this.meshOld = cloneDeep(this.mesh);

        // Prepare message
        let message: WebsocketMessageObject = {
          method: 'updateMeshWeb',
          data: {
            idAC: this.mesh.idAC,
            xb: this.mesh.xb.toJSON()
          },
          id: this.websocketService.idGenerator(),
          requestID: '',
          status: "waiting"
        }

        // Send message to CAD
        this.websocketService.sendMessage(message);
      }
      else if (type == 'open') {
        this.openOld = cloneDeep(this.open);

        // Prepare message
        let message: WebsocketMessageObject = {
          method: 'updateOpenWeb',
          data: {
            idAC: this.open.idAC,
            xb: this.open.xb.toJSON()
          },
          id: this.websocketService.idGenerator(),
          requestID: '',
          status: "waiting"
        }

        // Send message to CAD
        this.websocketService.sendMessage(message);
      }
    }
  }

  /** Delete CAD element */
  public deleteCad(type: string = '') {
    if (this.websocketService.isConnected) {
      if (type == 'mesh') {
        this.meshOld = cloneDeep(this.mesh);

        // Prepare message
        let message: WebsocketMessageObject = {
          method: 'deleteMeshWeb',
          data: {
            idAC: this.mesh.idAC
          },
          id: this.websocketService.idGenerator(),
          requestID: '',
          status: "waiting"
        }

        // Send message to CAD
        this.websocketService.sendMessage(message);
      }
      else if (type == 'open') {
        this.openOld = cloneDeep(this.open);

        // Prepare message
        let message: WebsocketMessageObject = {
          method: 'deleteOpenWeb',
          data: {
            idAC: this.open.idAC
          },
          id: this.websocketService.idGenerator(),
          requestID: '',
          status: "waiting"
        }

        // Send message to CAD
        this.websocketService.sendMessage(message);
      }
    }
  }

  /** Select CAD element */
  public selectCad(type: string = '') {
    if (this.websocketService.isConnected) {
      if (type == 'mesh') {
        this.websocketService.selectCad(this.mesh.idAC);
      }
      else if (type == 'open') {
        this.websocketService.selectCad(this.open.idAC);
      }
    }
  }

  // COMPONENT METHODS

  /** Calculate no of cells in domain */
  public totalCells(): number {
    let totalCells = 0;
    forEach(this.fds.geometry.meshes, (mesh) => {
      totalCells += mesh.cells;
    });
    return totalCells;
  }

}
