import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { WebsocketService } from '@services/websocket/websocket.service';
import { Fds } from '@services/fds-object/fds-object';
import { Hole } from '@services/fds-object/geometry/hole';
import { Obst } from '@services/fds-object/geometry/obst';
import { Main } from '@services/main/main';
import { MainService } from '@services/main/main.service';
import { UiStateService } from '@services/ui-state/ui-state.service';
import { UiState } from '@services/ui-state/ui-state';
import { FdsEnums } from '@enums/fds/enums/fds-enums';
import { WebsocketMessageObject } from '@services/websocket/websocket-message';

import { PerfectScrollbarComponent } from 'ngx-perfect-scrollbar';
import { set, find, cloneDeep, findIndex } from 'lodash';

@Component({
  selector: 'app-obstruction',
  templateUrl: './obstruction.component.html',
  styleUrls: ['./obstruction.component.scss']
})
export class ObstructionComponent implements OnInit, OnDestroy {

  // Global objects
  main: Main;
  fds: Fds;
  geometry: any;
  ui: UiState;
  output: any;

  // Component objects
  obsts: Obst[];
  obst: Obst;
  obstOld: Obst;
  holes: Hole[];
  hole: Hole;
  holeOld: Hole;

  wsSub;
  mainSub;
  uiSub;
  rouSub;

  // Scrolbars containers
  @ViewChild('obstScrollbar') obstScrollbar: PerfectScrollbarComponent;
  @ViewChild('holeScrollbar') holeScrollbar: PerfectScrollbarComponent;

  // Enums
  ENUMS_OBST = FdsEnums.OBST;

  constructor(
    private mainService: MainService, 
    private websocketService: WebsocketService, 
    private route: ActivatedRoute,
    private uiStateService: UiStateService
  ) { }

  ngOnInit() {
    console.clear();
    // Subscribe main object
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);
    this.uiSub = this.uiStateService.uiObservable.subscribe(uiObservable => this.ui = uiObservable);

    // Assign to local variables
    this.fds = this.main.currentFdsScenario.fdsObject;
    this.geometry = this.main.currentFdsScenario.fdsObject.geometry;
    this.output = this.main.currentFdsScenario.fdsObject.output;
    this.obsts = this.main.currentFdsScenario.fdsObject.geometry.obsts;
    this.holes = this.main.currentFdsScenario.fdsObject.geometry.holes;

    // Subscribe websocket requests status for websocket CAD sync
    this.wsSub = this.websocketService.requestStatus.subscribe(
      (message) => {
        if (message.status == 'error') {
          //this.mesh = cloneDeep(this.meshOld);
          console.log('Cannot sync obst ...');
        }
        else if (message.status == 'success') {
          //this.meshOld = cloneDeep(this.mesh);
          console.log('Obst updated ...')
        }
      },
      (error) => {
        //this.mesh = cloneDeep(this.meshOld);
        console.log('Cannot sync obst ...');
      }
    );

    // Activate element from route or ui object
    this.rouSub = this.route.params.subscribe((params) => {
      if (params['idAC']) {
        let index = -1;

        switch (params['type']) {
          case 'obst':
            index = findIndex(this.obsts, function (o) { return o.idAC == params['idAC']; });
            if (index >= 0) {
              this.activate(this.obsts[index].id, 'obst');
            }
            this.holes.length > 0 ? this.activate(this.holes[this.ui.geometry['hole'].elementIndex].id, 'hole') : this.hole = undefined;
            break;

          case 'hole':
            index = findIndex(this.holes, function (o) { return o.idAC == params['idAC']; });
            if (index >= 0) {
              this.activate(this.holes[index].id, 'hole');
            }
            this.obsts.length > 0 ? this.activate(this.obsts[this.ui.geometry['obst'].elementIndex].id, 'obst') : this.obst = undefined;
            break;

        }
      }
      else {
        this.obsts.length > 0 ? this.activate(this.obsts[this.ui.geometry['obst'].elementIndex].id, 'obst') : this.obst = undefined;
        this.holes.length > 0 ? this.activate(this.holes[this.ui.geometry['hole'].elementIndex].id, 'hole') : this.hole = undefined;
      }
    });
  }

  ngAfterViewInit() {
    // Set scrollbars position y after view rendering and set last selected element
    this.obstScrollbar.directiveRef.scrollToY(this.ui.geometry['obst'].scrollPosition);
    this.holeScrollbar.directiveRef.scrollToY(this.ui.geometry['hole'].scrollPosition);
  }

  ngOnDestroy() {
    this.wsSub.unsubscribe();
    this.mainSub.unsubscribe();
    this.uiSub.unsubscribe();
    this.rouSub.unsubscribe();
  }

  /** Activate element on click */
  public activate(id: string, type: string = '') {
    if (type == 'obst') {
      this.obst = find(this.fds.geometry.obsts, function (o) { return o.id == id; });
      this.ui.geometry['obst'].elementIndex = findIndex(this.obsts, { id: id });
      this.obstOld = cloneDeep(this.obst);
    }
    else if (type == 'hole') {
      this.hole = find(this.fds.geometry.holes, function (o) { return o.id == id; });
      this.ui.geometry['hole'].elementIndex = findIndex(this.holes, { id: id });
      this.holeOld = cloneDeep(this.hole);
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
    set(this.ui.geometry, element + '.scrollPosition', this[element + 'Scrollbar'].directiveRef.geometry().y);
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
      console.log(this.obst.surf.surf_id);
    }
    else if (type == 'surfIdx') {
      console.log(this.obst.surf.surf_idx);
    }
    else if (type == 'surfId1') {
      console.log(this.obst.surf.surf_id1);
    }
  }

  /** Select CAD element */
  public selectCad(type: string = '') {
    if (this.websocketService.isConnected) {
      if (type == 'obst') {
        this.websocketService.selectCad(this.obst.idAC);
      }
      else if (type == 'hole') {
        this.websocketService.selectCad(this.hole.idAC);
      }
    }
  }

  // COMPONENT METHODS


}
