import { Component, OnInit, ViewChild, OnDestroy, isDevMode } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { FdsEnums } from '@enums/fds/enums/fds-enums';
import { JetFan } from '@services/fds-object/ventilation/jet-fan';
import { Ramp } from '@services/fds-object/ramp/ramp';
import { UiStateService } from '@services/ui-state/ui-state.service';
import { WebsocketService } from '@services/websocket/websocket.service';
import { MainService } from '@services/main/main.service';
import { UiState } from '@services/ui-state/ui-state';
import { SelectionService } from '@services/selection/selection.service';
import { Fds } from '@services/fds-object/fds-object';
import { Main } from '@services/main/main';
import { LibraryService } from '@services/library/library.service';
import { Library } from '@services/library/library';
import { IdGeneratorService } from '@services/id-generator/id-generator.service';

import { NgScrollbar } from 'ngx-scrollbar';
import { set, cloneDeep, find, forEach, findIndex, filter } from 'lodash';
import { WebsocketMessageObject } from '@services/websocket/websocket-message';
import { colors } from '@enums/fds/enums/fds-enums-colors';
import { SnackBarService } from '@services/snack-bar/snack-bar.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-jetfan',
    templateUrl: './jetfan.component.html',
    styleUrls: ['./jetfan.component.scss'],
    standalone: false
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

  wsSub: Subscription;
  mainSub: Subscription;
  uiSub: Subscription;
  libSub: Subscription;
  selSub: Subscription;

  // Scrolbars containers
  @ViewChild('jetfanScrollbar', {static: false}) jetfanScrollbar: NgScrollbar;
  @ViewChild('libJetfanScrollbar', {static: false}) libJetfanScrollbar: NgScrollbar;

  // Enums
  ENUMS_JETFAN = FdsEnums.JETFAN;
  COLORS = colors;

  constructor(
    private mainService: MainService,
    public websocketService: WebsocketService,
    public uiStateService: UiStateService,
    private libraryService: LibraryService,
    private snackBarService: SnackBarService,
    private selectionService: SelectionService
  ) { }

  ngOnInit() {
    if (isDevMode()) console.clear();
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
          if (isDevMode()) console.log('Cannot sync jetfan ...');
        }
        else if (message.status == 'success') {
          this.jetfanOld = cloneDeep(this.jetfan);
    if (this.jetfan) { this.selectionService.select({ uuid: this.jetfan.uuid, type: 'jetfan' }); }
      if (this.jetfan) { this.selectionService.select({ uuid: this.jetfan.uuid, type: 'jetfan' }); }
          if (message.method == 'createJetfanSurfWeb') {
            this.snackBarService.notify('success', 'CAD: Jetfan layer created');
          }
        }
      },
      (error) => {
        this.jetfan = cloneDeep(this.jetfanOld);
        if (isDevMode()) console.log('Cannot sync jetfan ...');
      }
    );

    // Activate element from route or ui object
    // Open whatever is selected - a click in 3D or in CAD is what says so
    // (#121). Replayed on subscribe, so this settles what is open on arrival.
    this.selSub = this.selectionService.selected$.subscribe(() => this.activateSelected());
  }

  /**
   * Open the selected element, or the one last worked on.
   *
   * The selection is the app's one answer to "what is the user on" (ADR-0005): a
   * click in 3D, a click in the drawing and a click in the list below all reach
   * here the same way. What it replaces was an `idAC` route parameter, which
   * could only ever name an element the drawing contained.
   */
  private activateSelected() {
    const selected = this.selectionService.selectedIn(this.jetfans);
    if (selected) {
      this.activate(selected.id);
    } else {
      this.jetfans.length > 0 ? this.activate(this.jetfans[this.ui.ventilation['jetfan'].elementIndex].id) : this.jetfan = undefined;
    }
  }

  ngAfterViewInit() {
    // Set scrollbars position y after view rendering and set last selected element
  this.jetfanScrollbar.scrollTo({ top: this.ui.ventilation['jetfan'].scrollPosition, duration: 0 });
  }

  ngOnDestroy() {
    this.wsSub.unsubscribe();
    this.mainSub.unsubscribe();
    this.uiSub.unsubscribe();
    this.libSub.unsubscribe();
    this.selSub.unsubscribe();
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
  const sc: NgScrollbar = this[element + 'Scrollbar'];
  const y = sc?.viewport?.scrollTop || 0;
  set(this.ui.ventilation, element + '.scrollPosition', y);
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
      this.snackBarService.notify('warning', 'Select current slcf before merging');
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
