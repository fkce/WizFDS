import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { FdsEnums } from '@enums/fds/enums/fds-enums';
import { JetFan } from '@services/fds-object/ventilation/jet-fan';
import { Ramp } from '@services/fds-object/ramp/ramp';
import { UiStateService } from '@services/ui-state/ui-state.service';
import { WebsocketService } from '@services/websocket/websocket.service';
import { MainService } from '@services/main/main.service';
import { UiState } from '@services/ui-state/ui-state';
import { Fds } from '@services/fds-object/fds-object';
import { Main } from '@services/main/main';
import { LibraryService } from '@services/library/library.service';
import { Library } from '@services/library/library';
import { IdGeneratorService } from '@services/id-generator/id-generator.service';
import { NotifierService } from 'angular-notifier';

import { PerfectScrollbarComponent } from 'ngx-perfect-scrollbar';
import { set, cloneDeep, find, forEach, findIndex, filter } from 'lodash';
import { WebsocketMessageObject } from '@services/websocket/websocket-message';
import { colors } from '@enums/fds/enums/fds-enums-colors';

@Component({
  selector: 'app-jetfan',
  templateUrl: './jetfan.component.html',
  styleUrls: ['./jetfan.component.scss']
})
export class JetfanComponent implements OnInit, OnDestroy {

  // Global objects
  main: Main;
  fds: Fds;
  ventilation: any;
  ui: UiState;
  lib: Library;

  // Component objects
  jetfans: JetFan[];
  libJetfans: JetFan[];
  jetfan: JetFan;
  jetfanOld: JetFan;
  ramps: Ramp[];
  libRamps: Ramp[];
  objectType: string = 'current'; // Lib or current

  wsSub;
  mainSub;
  uiSub;
  libSub;
  rouSub;

  // Scrolbars containers
  @ViewChild('jetfanScrollbar') jetfanScrollbar: PerfectScrollbarComponent;
  @ViewChild('libJetfanScrollbar') libJetfanScrollbar: PerfectScrollbarComponent;

  // Enums
  ENUMS_JETFAN = FdsEnums.JETFAN;
  COLORS = colors;

  constructor(
    private mainService: MainService,
    public websocketService: WebsocketService,
    private uiStateService: UiStateService,
    private libraryService: LibraryService,
    private route: ActivatedRoute,
    private readonly notifierService: NotifierService,
  ) { }

  ngOnInit() {
    console.clear();
    // Subscribe main object
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);
    this.uiSub = this.uiStateService.uiObservable.subscribe(uiObservable => this.ui = uiObservable);
    this.libSub = this.libraryService.getLibrary().subscribe(lib => this.lib = lib);

    // Assign to local variables
    this.fds = this.main.currentFdsScenario.fdsObject;
    this.ventilation = this.main.currentFdsScenario.fdsObject.ventilation;
    this.jetfans = this.main.currentFdsScenario.fdsObject.ventilation.jetfans;
    this.libJetfans = this.lib.jetfans;
    this.ramps = filter(this.main.currentFdsScenario.fdsObject.ramps.ramps, function(o) { return o.type == 'vent' });
    this.libRamps = filter(this.lib.ramps, function(o) { return o.type == 'vent' });

    // Subscribe websocket requests status for websocket CAD sync
    this.wsSub = this.websocketService.requestStatus.subscribe(
      (message) => {
        if (message.status == 'error') {
          this.jetfan = cloneDeep(this.jetfanOld);
          console.log('Cannot sync jetfan ...');
        }
        else if (message.status == 'success') {
          this.jetfanOld = cloneDeep(this.jetfan);
          if (message.method == 'createJetfanSurfWeb') {
            this.notifierService.notify('success', 'CAD: Jetfan layer created');
          }
        }
      },
      (error) => {
        this.jetfan = cloneDeep(this.jetfanOld);
        console.log('Cannot sync jetfan ...');
      }
    );

    // Activate element from route or ui object
    this.rouSub = this.route.params.subscribe((params) => {
      if (params['idAC']) {
        let index = -1;
        index = findIndex(this.jetfans, function (o) { return o.idAC == params['idAC']; });
        if (index >= 0) {
          this.activate(this.jetfans[index].id);
        }
      }
      else {
        this.jetfans.length > 0 ? this.activate(this.jetfans[this.ui.ventilation['jetfan'].elementIndex].id) : this.jetfan = undefined;
      }
    });

  }

  ngAfterViewInit() {
    // Set scrollbars position y after view rendering and set last selected element
    this.jetfanScrollbar.directiveRef.scrollToY(this.ui.ventilation['jetfan'].scrollPosition);
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
      this.jetfan = find(this.fds.ventilation.jetfans, function (o) { return o.id == id; });
      this.ui.ventilation['jetfan'].elementIndex = findIndex(this.jetfans, { id: id });
      this.jetfanOld = cloneDeep(this.jetfan);
    }
    else {
      this.objectType = 'library';
      this.jetfan = find(this.lib.jetfans, function (o) { return o.id == id; });
      this.ui.ventilation['libJetfan'].elementIndex = findIndex(this.libJetfans, { id: id });
      this.jetfanOld = cloneDeep(this.jetfan);
    }
  }

  /** Push new element */
  public add(library?: boolean) {
    // Create new jetfan object with unique id
    if (!library) {
      let element = { id: 'JFAN' + this.mainService.getListId(this.jetfans, 'jfan') };
      this.jetfans.push(new JetFan(JSON.stringify(element), this.ramps));
      this.activate(element.id);
    }
    else {
      let element = { id: 'JFAN' + this.mainService.getListId(this.libJetfans, 'jfan') };
      this.libJetfans.push(new JetFan(JSON.stringify(element), this.libRamps));
      this.activate(element.id, true);
    }
  }

  /** Delete element */
  public delete(id: string, library?: boolean) {
    if (!library) {
      let index = findIndex(this.jetfans, { id: id });
      this.jetfans.splice(index, 1);
      if (index != 0) {
        this.jetfans.length == 0 ? this.jetfan = undefined : this.activate(this.jetfans[index - 1].id);
      }
      else {
        this.jetfans.length == 0 ? this.jetfan = undefined : this.activate(this.jetfans[index].id);
      }
    }
    else {
      let index = findIndex(this.libJetfans, { id: id });
      this.libJetfans.splice(index, 1);
      if (index != 0) {
        this.libJetfans.length == 0 ? this.jetfan = undefined : this.activate(this.libJetfans[index - 1].id, true);
      }
      else {
        this.libJetfans.length == 0 ? this.jetfan = undefined : this.activate(this.libJetfans[index].id, true);
      }
    }
  }

  /** Update scroll position */
  public scrollbarUpdate(element: string) {
    set(this.ui.ventilation, element + '.scrollPosition', this[element + 'Scrollbar'].directiveRef.geometry().y);
  }

  /** Toggle library */
  public toggleLibrary() {
    this.ui.ventilation['jetfan'].lib == 'closed' ? this.ui.ventilation['jetfan'].lib = 'opened' : this.ui.ventilation['jetfan'].lib = 'closed';
  }

  /** Import from library */
  public importLibraryItem(id: string) {
    let idGeneratorService = new IdGeneratorService;
    let libJetfan = find(this.lib.jetfans, function (o) { return o.id == id; });
    let ramp = undefined;
    let libRamp = undefined;
    if (libJetfan.ramp != undefined && libJetfan.ramp.id) {
      // Check if ramp already exists
      libRamp = find(this.ramps, function (o) { return o.id == libJetfan.ramp.id });
      // If ramp do not exists import from library
      if (libRamp == undefined) {
        libRamp = find(this.lib.ramps, function (o) { return o.id == libJetfan.ramp.id });
        ramp = cloneDeep(libRamp);
        ramp.uuid = idGeneratorService.genUUID();
        this.main.currentFdsScenario.fdsObject.ramps.ramps.push(ramp);
        this.ramps = filter(this.main.currentFdsScenario.fdsObject.ramps.ramps, function(o) { return o.type == 'vent' });
      }
    }
    let jetfan = cloneDeep(libJetfan);
    jetfan.uuid = idGeneratorService.genUUID()
    jetfan.ramp = ramp != undefined ? ramp : libRamp;
    this.jetfans.push(jetfan);
  }

  /** Merge from library */
  public mergeLibraryItem(id: string) {
    let libJetfan = find(this.lib.jetfans, function (o) { return o.id == id; });
    if (this.jetfan != undefined) {
      this.jetfan.color = libJetfan.color;
      this.jetfan.devc = libJetfan.devc;
      this.jetfan.direction = libJetfan.direction;
      this.jetfan.elevation = libJetfan.elevation;
      this.jetfan.flow = libJetfan.flow;
      this.jetfan.louver = libJetfan.louver;
      this.jetfan.area = libJetfan.area;
      if (libJetfan.ramp != undefined) {
        let ramp = find(this.main.currentFdsScenario.fdsObject.ramps.ramps, function (o) {
          return o.id == libJetfan.ramp.id;
        });

        // Import ramp from library
        if (ramp == undefined) {
          let tempRamp = find(this.lib.ramps, function (o) {
            return o.id == libJetfan.ramp.id;
          });
          let libRamp = cloneDeep(tempRamp);

          if (libRamp != undefined) {
            // Copy to current fds scenario ramp
            this.main.currentFdsScenario.fdsObject.ramps.ramps.push(new Ramp(JSON.stringify(libRamp.toJSON())));
            this.ramps = filter(this.main.currentFdsScenario.fdsObject.ramps.ramps, function(o) { return o.type == 'vent' });
            this.jetfan.ramp = find(this.main.currentFdsScenario.fdsObject.ramps.ramps, function(o) { 
              return o.id == libRamp.id;
            });
          }
        }
        else {
          this.jetfan.ramp = ramp;
        }

      }
    }
    else {
      this.notifierService.notify('warning', 'Select current slcf before merging');
    }
  }

  /** Create CAD layer */
  public createCadLayer(id: string = '') {
    if (this.websocketService.isConnected) {
      this.jetfanOld = cloneDeep(this.jetfan);

      // Find clicked object
      let jetfan = find(this.libJetfans, ['id', id]);

      // Prepare message
      let message: WebsocketMessageObject = {
        method: 'createJetfanSurfWeb',
        data: {
          id: id,
          color: jetfan.color
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
  /** Add ramp and activate */
  public addRamp(type: string) {
    // Chcek if current or library
    if (this.objectType == 'current') {
      let element = { id: 'RAMP' + this.mainService.getListId(this.main.currentFdsScenario.fdsObject.ramps.ramps), type: type };
      this.main.currentFdsScenario.fdsObject.ramps.ramps.push(new Ramp(JSON.stringify(element)));
      this.ramps = filter(this.main.currentFdsScenario.fdsObject.ramps.ramps, function(o) { return o.type == 'vent' });
      this.jetfan.ramp = find(this.ramps, (ramp) => {
        return ramp.id == element.id;
      });
    }
    else if (this.objectType == 'library') {
      let element = { id: 'RAMP' + this.mainService.getListId(this.lib.ramps), type: type };
      this.lib.ramps.push(new Ramp(JSON.stringify(element)));
      this.libRamps = filter(this.lib.ramps, function(o) { return o.type == 'vent' });
      this.jetfan.ramp = find(this.libRamps, (ramp) => {
        return ramp.id == element.id;
      });
    }
  }

}
