import { Component, OnInit, ViewChild, OnDestroy, isDevMode } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { WebsocketService } from '@services/websocket/websocket.service';
import { Fds } from '@services/fds-object/fds-object';
import { Hole } from '@services/fds-object/geometry/hole';
import { Obst } from '@services/fds-object/geometry/obst';
import { Main } from '@services/main/main';
import { MainService } from '@services/main/main.service';
import { UiStateService } from '@services/ui-state/ui-state.service';
import { UiState } from '@services/ui-state/ui-state';
import { SelectionService } from '@services/selection/selection.service';
import { FdsEnums } from '@enums/fds/enums/fds-enums';
import { WebsocketMessageObject } from '@services/websocket/websocket-message';

import { NgScrollbar } from 'ngx-scrollbar';
import { set, find, cloneDeep, findIndex, concat } from 'lodash';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-obstruction',
    templateUrl: './obstruction.component.html',
    styleUrls: ['./obstruction.component.scss'],
    standalone: false
})
export class ObstructionComponent implements OnInit, OnDestroy {

  // Global objects
  main: Main;
  fds: Fds;
  geometry: any;
  ui: UiState;
  output: any;
  surfaces: any[];

  // Component objects
  obsts: Obst[];
  obst: Obst;
  obstOld: Obst;
  holes: Hole[];
  hole: Hole;
  holeOld: Hole;

  wsSub: Subscription;
  mainSub: Subscription;
  uiSub: Subscription;
  selSub: Subscription;

  // Scrolbars containers
  @ViewChild('obstScrollbar', {static: false}) obstScrollbar: NgScrollbar;
  @ViewChild('holeScrollbar', {static: false}) holeScrollbar: NgScrollbar;

  // Enums
  ENUMS_OBST = FdsEnums.OBST;

  constructor(
    private mainService: MainService,
    public websocketService: WebsocketService,
    public uiStateService: UiStateService,
    private selectionService: SelectionService
  ) { }

  ngOnInit() {
    if (isDevMode()) console.clear();
    // Subscribe main object
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);
    this.uiSub = this.uiStateService.uiObservable.subscribe(uiObservable => this.ui = uiObservable);

    // Assign to local variables
    this.fds = this.main.currentFdsScenario.fdsObject;
    this.geometry = this.main.currentFdsScenario.fdsObject.geometry;
    this.output = this.main.currentFdsScenario.fdsObject.output;
    this.obsts = this.main.currentFdsScenario.fdsObject.geometry.obsts;
    this.holes = this.main.currentFdsScenario.fdsObject.geometry.holes;

    // Create fire and geometry surfaces
    this.surfaces = concat(this.geometry.surfs, this.fds.fires.fires);

    // Subscribe websocket requests status for websocket CAD sync
    this.wsSub = this.websocketService.requestStatus.subscribe(
      (message) => {
        if (message.status == 'error') {
          //this.mesh = cloneDeep(this.meshOld);
          if (isDevMode()) console.log('Cannot sync obst ...');
        }
        else if (message.status == 'success') {
          //this.meshOld = cloneDeep(this.mesh);
          if (isDevMode()) console.log('Obst updated ...')
        }
      },
      (error) => {
        //this.mesh = cloneDeep(this.meshOld);
        if (isDevMode()) console.log('Cannot sync obst ...');
      }
    );

    // Open whatever is selected - a click in 3D or in CAD is what says so (#121).
    // Replayed on subscribe, so this also settles what is open on arrival.
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
    const selectedObst = this.selectionService.selectedIn(this.obsts);
    if (selectedObst) {
      this.activate(selectedObst.id, 'obst');
    } else {
      this.obsts.length > 0 ? this.activate(this.obsts[this.ui.geometry['obst'].elementIndex].id, 'obst') : this.obst = undefined;
    }

    const selectedHole = this.selectionService.selectedIn(this.holes);
    if (selectedHole) {
      this.activate(selectedHole.id, 'hole');
    } else {
      this.holes.length > 0 ? this.activate(this.holes[this.ui.geometry['hole'].elementIndex].id, 'hole') : this.hole = undefined;
    }
  }

  ngAfterViewInit() {
    // Set scrollbars position y after view rendering and set last selected element
    setTimeout(() => {
      try { this.obstScrollbar?.viewport?.scrollYTo(this.ui.geometry['obst'].scrollPosition); } catch {}
      try { this.holeScrollbar?.viewport?.scrollYTo(this.ui.geometry['hole'].scrollPosition); } catch {}
    });
  }

  ngOnDestroy() {
    this.wsSub.unsubscribe();
    this.mainSub.unsubscribe();
    this.uiSub.unsubscribe();
    this.selSub.unsubscribe();
  }

  /** Activate element on click */
  public activate(id: string, type: string = '') {
    if (type == 'obst') {
      this.obst = find(this.fds.geometry.obsts, function (o) { return o.id == id; });
      this.ui.geometry['obst'].elementIndex = findIndex(this.obsts, { id: id });
      this.obstOld = cloneDeep(this.obst);
      if (this.obst) { this.selectionService.select({ uuid: this.obst.uuid, type: 'obst' }); }
    }
    else if (type == 'hole') {
      this.hole = find(this.fds.geometry.holes, function (o) { return o.id == id; });
      this.ui.geometry['hole'].elementIndex = findIndex(this.holes, { id: id });
      this.holeOld = cloneDeep(this.hole);
      if (this.hole) { this.selectionService.select({ uuid: this.hole.uuid, type: 'hole' }); }
    }
  }

  /** Push new element */
  public add(type: string = '') {
    if (type == 'obst') {
      let element = { id: 'OBST' + this.mainService.getListId(this.obsts) };
      this.obsts.push(new Obst(JSON.stringify(element)));
      this.activate(element.id, 'obst');
    }
    else if (type == 'hole') {
      let element = { id: 'HOLE' + this.mainService.getListId(this.holes) };
      this.holes.push(new Hole(JSON.stringify(element)));
      this.activate(element.id, 'hole');
    }
  }

  /** Delete element */
  public delete(id: string, type: string = '') {
    if (type == 'obst') {
      let index = findIndex(this.obsts, { id: id });
      this.obsts.splice(index, 1);
      if (index != 0) {
        this.obsts.length == 0 ? this.obst = undefined : this.activate(this.obsts[index - 1].id);
      }
      else {
        this.obsts.length == 0 ? this.obst = undefined : this.activate(this.obsts[index].id);
      }
    }
    else if (type == 'hole') {
      let index = findIndex(this.holes, { id: id });
      this.holes.splice(index, 1);
      if (index != 0) {
        this.holes.length == 0 ? this.hole = undefined : this.activate(this.holes[index - 1].id);
      }
      else {
        this.holes.length == 0 ? this.hole = undefined : this.activate(this.holes[index].id);
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
      if (type == 'obst') {
        this.obstOld = cloneDeep(this.obst);

        // Prepare message
        let message: WebsocketMessageObject = {
          method: 'createObstWeb',
          data: {
            xb: this.obst.xb.toJSON()
          },
          id: this.websocketService.idGenerator(),
          requestID: '',
          status: "waiting"
        }

        // Send message to CAD
        this.websocketService.sendMessage(message);
      }
      else if (type == 'hole') {
        this.holeOld = cloneDeep(this.hole);

        // Prepare message
        let message: WebsocketMessageObject = {
          method: 'createHoleWeb',
          data: {
            xb: this.hole.xb.toJSON()
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
      if (type == 'obst') {
        this.obstOld = cloneDeep(this.obst);

        // Prepare message
        let message: WebsocketMessageObject = {
          method: 'updateObstWeb',
          data: {
            idAC: this.obst.idAC,
            xb: this.obst.xb.toJSON()
          },
          id: this.websocketService.idGenerator(),
          requestID: '',
          status: "waiting"
        }

        // Send message to CAD
        this.websocketService.sendMessage(message);
      }
      else if (type == 'hole') {
        this.holeOld = cloneDeep(this.hole);

        // Prepare message
        let message: WebsocketMessageObject = {
          method: 'updateHoleWeb',
          data: {
            idAC: this.hole.idAC,
            xb: this.hole.xb.toJSON()
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
      if (type == 'obst') {
        this.obstOld = cloneDeep(this.obst);

        // Prepare message
        let message: WebsocketMessageObject = {
          method: 'deleteObsthWeb',
          data: {
            idAC: this.obst.idAC
          },
          id: this.websocketService.idGenerator(),
          requestID: '',
          status: "waiting"
        }

        // Send message to CAD
        this.websocketService.sendMessage(message);
      }
      else if (type == 'hole') {
        this.holeOld = cloneDeep(this.hole);

        // Prepare message
        let message: WebsocketMessageObject = {
          method: 'deleteHoleWeb',
          data: {
            idAC: this.hole.idAC
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

  /**
   * Change surface in CAD
   * @param type Id or Idx or Id1
   */
  public updateObstSurface(type: string = '') {
    if (type == 'surfId') {
      if (isDevMode()) console.log(this.obst.surf.surf_id);
    }
    else if (type == 'surfIdx') {
      if (isDevMode()) console.log(this.obst.surf.surf_idx);
    }
    else if (type == 'surfId1') {
      if (isDevMode()) console.log(this.obst.surf.surf_id1);
    }
  }

  // COMPONENT METHODS


}
