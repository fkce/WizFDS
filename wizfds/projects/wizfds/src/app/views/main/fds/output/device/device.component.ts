import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Main } from '@services/main/main';
import { Fds } from '@services/fds-object/fds-object';
import { UiState } from '@services/ui-state/ui-state';
import { Library } from '@services/library/library';
import { Devc } from '@services/fds-object/output/devc';
import { quantities } from '@enums/fds/enums/fds-enums-quantities';
import { Quantity } from '@services/fds-object/primitives';
import { Spec } from '@services/fds-object/specie/spec';
import { MainService } from '@services/main/main.service';
import { UiStateService } from '@services/ui-state/ui-state.service';
import { LibraryService } from '@services/library/library.service';
import { IdGeneratorService } from '@services/id-generator/id-generator.service';
import { FdsEnums } from '@enums/fds/enums/fds-enums';
import { WebsocketService } from '@services/websocket/websocket.service';

import { PerfectScrollbarComponent } from 'ngx-perfect-scrollbar';
import { map, filter, includes, find, findIndex, cloneDeep, set } from 'lodash';
import { WebsocketMessageObject } from '@services/websocket/websocket-message';
import { SnackBarService } from '@services/snack-bar/snack-bar.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-device',
  templateUrl: './device.component.html',
  styleUrls: ['./device.component.scss']
})
export class DeviceComponent implements OnInit, OnDestroy {

  // Global objects
  main: Main;
  fds: Fds;
  ui: UiState;
  lib: Library;

  // Component objects
  devcs: Devc[];
  libDevcs: Devc[];
  devc: Devc;
  devcOld: Devc;
  objectType: string = 'current'; // Lib or current

  wsSub: Subscription;
  mainSub: Subscription;
  uiSub: Subscription;
  libSub: Subscription;
  rouSub: Subscription;

  // Scrolbars containers
  @ViewChild('devcScrollbar', {static: false}) devcScrollbar: PerfectScrollbarComponent;
  @ViewChild('libDevcScrollbar', {static: false}) libDevcScrollbar: PerfectScrollbarComponent;

  // Enums
  QUANTITIES = map(filter(quantities, function (o) { return includes(o.type, 'd') }), function (o) { return new Quantity(JSON.stringify(o)) });
  SPECIES: Spec[];
  DEVC = FdsEnums.DEVC

  constructor(
    private mainService: MainService,
    public uiStateService: UiStateService,
    private libraryService: LibraryService,
    private route: ActivatedRoute,
    private snackBarService: SnackBarService,
    public websocketService: WebsocketService
  ) { }

  ngOnInit() {
    console.clear();
    // Subscribe main object
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);
    this.uiSub = this.uiStateService.uiObservable.subscribe(uiObservable => this.ui = uiObservable);
    this.libSub = this.libraryService.getLibrary().subscribe(lib => this.lib = lib);

    // Assign to local variables
    this.fds = this.main.currentFdsScenario.fdsObject;
    this.devcs = this.main.currentFdsScenario.fdsObject.output.devcs;
    this.libDevcs = this.lib.devcs;
    this.SPECIES = this.main.currentFdsScenario.fdsObject.specie.specs;

    // Subscribe websocket requests status for websocket CAD sync
    this.wsSub = this.websocketService.requestStatus.subscribe(
      (message) => {
        if (message.status == 'error') {
          this.devc = cloneDeep(this.devcOld);
          this.snackBarService.notify('error', 'CAD: Cannot sync ...');
        }
        else if (message.status == 'success') {
          this.devcOld = cloneDeep(this.devc);
          if (message.method == 'createDevcSurfWeb') {
            this.snackBarService.notify('success', 'CAD: Device layer created');
          }
        }
      },
      (error) => {
        this.devc = cloneDeep(this.devcOld);
        this.snackBarService.notify('error', 'CAD: Cannot sync ...');
      }
    );

    // Activate element from route or ui object
    this.rouSub = this.route.params.subscribe((params) => {
      if (params['idAC']) {
        let index = -1;
        index = findIndex(this.devcs, function (o) { return o.idAC == params['idAC']; });
        if (index >= 0) {
          this.activate(this.devcs[index].id);
        }
      }
      else {
        this.devcs.length > 0 ? this.activate(this.devcs[this.ui.output['devc'].elementIndex].id) : this.devc = undefined;
      }
    });

  }

  ngAfterViewInit() {
    // Set scrollbars position y after view rendering and set last selected element
    this.devcScrollbar.directiveRef.scrollToY(this.ui.output['devc'].scrollPosition);
  }

  ngOnDestroy() {
    this.wsSub.unsubscribe();
    this.mainSub.unsubscribe();
    this.uiSub.unsubscribe();
    this.libSub.unsubscribe();
    this.rouSub.unsubscribe();
  }

  /** Activate element on click */
  public activate(id: string, library?: boolean) {
    if (!library) {
      this.objectType = 'current';
      this.devc = find(this.fds.output.devcs, function (o) { return o.id == id; });
      this.ui.output['devc'].elementIndex = findIndex(this.devcs, { id: id });
      this.devcOld = cloneDeep(this.devc);
    }
    else {
      this.objectType = 'library';
      this.devc = find(this.lib.devcs, function (o) { return o.id == id; });
      this.ui.output['libDevc'].elementIndex = findIndex(this.libDevcs, { id: id });
      this.devcOld = cloneDeep(this.devc);
    }
  }

  /** Push new element */
  public add(library?: boolean) {
    // Create new devc object with unique id
    if (!library) {
      let element = { id: 'DEVC' + this.mainService.getListId(this.devcs, 'devc') };
      this.devcs.push(new Devc(JSON.stringify(element), this.fds.specie.specs, this.fds.particle.parts));
      this.activate(element.id);
    }
    else {
      let element = { id: 'DEVC' + this.mainService.getListId(this.libDevcs, 'devc') };
      this.libDevcs.push(new Devc(JSON.stringify(element), undefined, this.lib.specs)); // Add parts ... !!!
      this.activate(element.id, true);
    }
  }

  /** Delete element */
  public delete(id: string, library?: boolean) {
    if (!library) {
      let index = findIndex(this.devcs, { id: id });
      this.devcs.splice(index, 1);
      if (index != 0) {
        this.devcs.length == 0 ? this.devc = undefined : this.activate(this.devcs[index - 1].id);
      }
      else {
        this.devcs.length == 0 ? this.devc = undefined : this.activate(this.devcs[index].id);
      }
    }
    else {
      let index = findIndex(this.libDevcs, { id: id });
      this.libDevcs.splice(index, 1);
      if (index != 0) {
        this.libDevcs.length == 0 ? this.devc = undefined : this.activate(this.libDevcs[index - 1].id, true);
      }
      else {
        this.libDevcs.length == 0 ? this.devc = undefined : this.activate(this.libDevcs[index].id, true);
      }
    }
  }

  /** Update scroll position */
  public scrollbarUpdate(element: string) {
    set(this.ui.output, element + '.scrollPosition', this[element + 'Scrollbar'].directiveRef.geometry().y);
  }

  /** Toggle library */
  public toggleLibrary() {
    this.ui.output['devc'].lib == 'closed' ? this.ui.output['devc'].lib = 'opened' : this.ui.output['devc'].lib = 'closed';
  }

  /** Import from library */
  public importLibraryItem(id: string) {
    let idGeneratorService = new IdGeneratorService;
    let libDevc = find(this.lib.devcs, function (o) { return o.id == id; });
    let devc = cloneDeep(libDevc);
    devc.uuid = idGeneratorService.genUUID()
    this.devcs.push(devc);
  }

  /** Import from library */
  public mergeLibraryItem(id: string) {
    let libDevc = find(this.lib.devcs, function (o) { return o.id == id; });
    if (this.devc != undefined) {
      this.devc.quantity = libDevc.quantity;
      this.devc.statistics = libDevc.statistics;
      this.devc.initial_state = libDevc.initial_state;
      this.devc.latch = libDevc.latch;
      this.devc.quantity_type = libDevc.quantity_type;
      this.devc.setpoint = libDevc.setpoint;
      this.devc.trip_direction = libDevc.trip_direction;
    }
    else {
      this.snackBarService.notify('warning', 'Select current devc before merging');
    }
  }

  /** Create CAD layer */
  public createCadLayer(id: string = '') {
    if (this.websocketService.isConnected) {
      this.devcOld = cloneDeep(this.devc);

      // Prepare message
      let message: WebsocketMessageObject = {
        method: 'createDevcSurfWeb',
        data: {
          id: id
        },
        id: this.websocketService.idGenerator(),
        requestID: '',
        status: "waiting"
      }

      // Send message to CAD
      this.websocketService.sendMessage(message);
    }
  }

  // COMPONENT METHODS
  public showSpecs(): boolean {
    if (this.devc.quantity != undefined) {
      let show = this.devc.quantity.quantity != '' ? this.devc.quantity.spec : false;
      return show;
    }
    return false;
  }

  public showParts(): boolean {
    if (this.devc.quantity != undefined) {
      let show = this.devc.quantity.quantity != '' ? this.devc.quantity.part : false;
      return show;
    }
    return false;
  }

}
