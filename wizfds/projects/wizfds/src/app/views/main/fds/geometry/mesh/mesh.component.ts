import { Component, OnInit, ViewChild, OnDestroy, isDevMode } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Open } from '@services/fds-object/geometry/open';
import { UiState } from '@services/ui-state/ui-state';
import { SelectionService } from '@services/selection/selection.service';
import { UiStateService } from '@services/ui-state/ui-state.service';
import { Fds } from '@services/fds-object/fds-object';
import { Mesh } from '@services/fds-object/geometry/mesh';
import { MainService } from '@services/main/main.service';
import { Main } from '@services/main/main';
import { WebsocketService } from '@services/websocket/websocket.service';
import { WebsocketMessageObject } from '@services/websocket/websocket-message';

import { NgScrollbar } from 'ngx-scrollbar';
import { set, cloneDeep, find, forEach, findIndex } from 'lodash';
import { colors } from '@enums/fds/enums/fds-enums-colors';
import { SnackBarService } from '@services/snack-bar/snack-bar.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-mesh',
    templateUrl: './mesh.component.html',
    styleUrls: ['./mesh.component.scss'],
    standalone: false
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

  wsSub: Subscription;
  mainSub: Subscription;
  uiSub: Subscription;
  selSub: Subscription;

  // Scrolbars containers
  @ViewChild('meshScrollbar', {static: false}) meshScrollbar: NgScrollbar;
  @ViewChild('openScrollbar', {static: false}) openScrollbar: NgScrollbar;

  // Enums
  COLORS = colors;

  constructor(
    private mainService: MainService,
    public websocketService: WebsocketService,
    public uiStateService: UiStateService,
    private snackBarService: SnackBarService,
    private selectionService: SelectionService
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

    // Activate element from route or ui object
    // Open whatever is selected - a click in 3D or in CAD is what says so
    // (#121). Replayed on subscribe, so this settles what is open on arrival.
    this.selSub = this.selectionService.selected$.subscribe(() => this.activateSelected());
  }

  /**
   * Open the selected element of each list, or the one last worked on.
   *
   * The selection is the app's one answer to "what is the user on" (ADR-0005): a
   * click in 3D, a click in the drawing and a click in the list below all reach
   * here the same way. What it replaces was an `idAC` route parameter, which
   * could only ever name an element the drawing contained.
   */
  private activateSelected() {
    const selectedMesh = this.selectionService.selectedIn(this.meshes);
    if (selectedMesh) {
      this.activate(selectedMesh.id, 'mesh');
    } else {
      this.meshes.length > 0 ? this.activate(this.meshes[this.ui.geometry['mesh'].elementIndex].id, 'mesh') : this.mesh = undefined;
    }

    const selectedOpen = this.selectionService.selectedIn(this.opens);
    if (selectedOpen) {
      this.activate(selectedOpen.id, 'open');
    } else {
      this.opens.length > 0 ? this.activate(this.opens[this.ui.geometry['open'].elementIndex].id, 'open') : this.open = undefined;
    }
  }

  ngAfterViewInit() {
    // Set scrollbars position y after view rendering
    // Set scroll position to last selected element (defer to ensure viewport is ready)
    setTimeout(() => {
      let index = this.ui.geometry['mesh'].elementIndex;
      let elementBegin = Math.floor((index + 1) / this.ui.listRange) * this.ui.listRange;
      let elementNumber = this.meshes.length - (index + 1) > this.ui.listRange ? this.ui.listRange : this.meshes.length % this.ui.listRange;
      const viewport = this.meshScrollbar?.viewport;
      if (viewport) {
        const vh = viewport.offsetHeight || 0;
        let elementHeight = elementNumber > 0 ? vh / elementNumber : 0;
        try { viewport.scrollYTo(elementHeight * (index - elementBegin)); } catch {}
      }
      try { this.openScrollbar?.viewport?.scrollYTo(this.ui.geometry['open'].scrollPosition); } catch {}
    });
  }

  ngOnDestroy() {
    //this.wsSub.unsubscribe();
    this.mainSub.unsubscribe();
    this.uiSub.unsubscribe();
    this.selSub.unsubscribe();
  }

  /** Activate element on click */
  public activate(id: string, type: string = '') {
    if (type == 'mesh') {
      this.mesh = find(this.fds.geometry.meshes, function (o) { return o.id == id; });
      this.ui.geometry['mesh'].elementIndex = findIndex(this.meshes, { id: id });
      this.meshOld = cloneDeep(this.mesh);
      if (this.mesh) { this.selectionService.select({ uuid: this.mesh.uuid, type: 'mesh' }); }
    }
    else if (type == 'open') {
      this.open = find(this.fds.geometry.opens, function (o) { return o.id == id; });
      this.ui.geometry['open'].elementIndex = findIndex(this.opens, { id: id });
      this.openOld = cloneDeep(this.open);
      if (this.open) { this.selectionService.select({ uuid: this.open.uuid, type: 'open' }); }
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
    set(this.ui.geometry, element + '.scrollPosition', (this[element + 'Scrollbar'] as NgScrollbar).viewport.scrollTop);
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
