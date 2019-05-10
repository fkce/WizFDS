import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Main } from '@services/main/main';
import { Fds } from '@services/fds-object/fds-object';
import { UiState } from '@services/ui-state/ui-state';
import { Library } from '@services/library/library';
import { Slcf } from '@services/fds-object/output/slcf';
import { quantities } from '@enums/fds/enums/fds-enums-quantities';
import { MainService } from '@services/main/main.service';
import { WebsocketService } from '@services/websocket/websocket.service';
import { UiStateService } from '@services/ui-state/ui-state.service';
import { LibraryService } from '@services/library/library.service';
import { IdGeneratorService } from '@services/id-generator/id-generator.service';
import { FdsEnums } from '@enums/fds/enums/fds-enums';
import { Quantity } from '@services/fds-object/primitives';
import { Spec } from '@services/fds-object/specie/spec';

import { NotifierService } from 'angular-notifier';
import { PerfectScrollbarComponent } from 'ngx-perfect-scrollbar';
import { filter, map, includes, cloneDeep, find, findIndex, set, remove, merge } from 'lodash';
import { WebsocketMessageObject } from '@services/websocket/websocket-message';

@Component({
  selector: 'app-slice',
  templateUrl: './slice.component.html',
  styleUrls: ['./slice.component.scss']
})
export class SliceComponent implements OnInit, OnDestroy {

  // Global objects
  main: Main;
  fds: Fds;
  ui: UiState;
  lib: Library;

  // Component objects
  slcfs: Slcf[];
  libSlcfs: Slcf[];
  slcf: Slcf;
  slcfOld: Slcf;
  specs: Spec[];
  objectType: string = 'current'; // Lib or current

  wsSub;
  mainSub;
  uiSub;
  libSub;
  rouSub;

  // Scrolbars containers
  @ViewChild('slcfScrollbar') slcfScrollbar: PerfectScrollbarComponent;
  @ViewChild('libSlcfScrollbar') libSlcfScrollbar: PerfectScrollbarComponent;

  // Enums
  QUANTITIES = map(filter(quantities, function (o) { return includes(o.type, 's') }), function (o) { return new Quantity(JSON.stringify(o)) });
  DIRECTIONS = FdsEnums.SLCF.directions;

  constructor(
    private mainService: MainService,
    public websocketService: WebsocketService,
    private uiStateService: UiStateService,
    private libraryService: LibraryService,
    private route: ActivatedRoute,
    private readonly notifierService: NotifierService
  ) { }

  ngOnInit() {
    console.clear();
    // Subscribe main object
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);
    this.uiSub = this.uiStateService.uiObservable.subscribe(uiObservable => this.ui = uiObservable);
    this.libSub = this.libraryService.getLibrary().subscribe(lib => this.lib = lib);

    // Assign to local variables
    this.fds = this.main.currentFdsScenario.fdsObject;
    this.slcfs = this.main.currentFdsScenario.fdsObject.output.slcfs;
    this.libSlcfs = this.lib.slcfs;
    this.specs = this.main.currentFdsScenario.fdsObject.specie.specs;

    // Subscribe websocket requests status for websocket CAD sync
    this.wsSub = this.websocketService.requestStatus.subscribe(
      (message) => {
        if (message.status == 'error') {
          this.slcf = cloneDeep(this.slcfOld);
          console.log('Cannot sync slcf ...');
        }
        else if (message.status == 'success') {
          this.slcfOld = cloneDeep(this.slcf);
          if (message.method == 'createSlcfSurfWeb') {
            this.notifierService.notify('success', 'CAD: Slice layer created');
          }
        }
      },
      (error) => {
        this.slcf = cloneDeep(this.slcfOld);
        console.log('Cannot sync slcf ...');
      }
    );

    // Activate element from route or ui object
    this.rouSub = this.route.params.subscribe((params) => {
      if (params['idAC']) {
        let index = -1;
        index = findIndex(this.slcfs, function (o) { return o.idAC == params['idAC']; });
        if (index >= 0) {
          this.activate(this.slcfs[index].id);
        }
      }
      else {
        this.slcfs.length > 0 ? this.activate(this.slcfs[this.ui.output['slcf'].elementIndex].id) : this.slcf = undefined;
      }
    });

  }

  ngAfterViewInit() {
    // Set scrollbars position y after view rendering and set last selected element
    this.slcfScrollbar.directiveRef.scrollToY(this.ui.output['slcf'].scrollPosition);
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
      this.slcf = find(this.fds.output.slcfs, function (o) { return o.id == id; });
      this.ui.output['slcf'].elementIndex = findIndex(this.slcfs, { id: id });
      this.slcfOld = cloneDeep(this.slcf);
    }
    else {
      this.objectType = 'library';
      this.slcf = find(this.lib.slcfs, function (o) { return o.id == id; });
      this.ui.output['libSlcf'].elementIndex = findIndex(this.libSlcfs, { id: id });
      this.slcfOld = cloneDeep(this.slcf);
    }
  }

  /** Push new element */
  public add(library?: boolean) {
    // Create new slcf object with unique id
    if (!library) {
      let element = { id: 'SLCF' + this.mainService.getListId(this.slcfs, 'slcf') };
      this.slcfs.push(new Slcf(JSON.stringify(element), this.fds.specie.specs, this.fds.particle.parts));
      this.activate(element.id);
    }
    else {
      let element = { id: 'SLCF' + this.mainService.getListId(this.libSlcfs, 'slcf') };
      this.libSlcfs.push(new Slcf(JSON.stringify(element), this.lib.specs)); // Add parts ... !!!
      this.activate(element.id, true);
    }
  }

  /** Delete element */
  public delete(id: string, library?: boolean) {
    if (!library) {
      let index = findIndex(this.slcfs, { id: id });
      this.slcfs.splice(index, 1);
      if (index != 0) {
        this.slcfs.length == 0 ? this.slcf = undefined : this.activate(this.slcfs[index - 1].id);
      }
      else {
        this.slcfs.length == 0 ? this.slcf = undefined : this.activate(this.slcfs[index].id);
      }
    }
    else {
      let index = findIndex(this.libSlcfs, { id: id });
      this.libSlcfs.splice(index, 1);
      if (index != 0) {
        this.libSlcfs.length == 0 ? this.slcf = undefined : this.activate(this.libSlcfs[index - 1].id, true);
      }
      else {
        this.libSlcfs.length == 0 ? this.slcf = undefined : this.activate(this.libSlcfs[index].id, true);
      }
    }
  }

  /** Update scroll position */
  public scrollbarUpdate(element: string) {
    set(this.ui.output, element + '.scrollPosition', this[element + 'Scrollbar'].directiveRef.geometry().y);
  }

  /** Toggle library */
  public toggleLibrary() {
    this.ui.output['slcf'].lib == 'closed' ? this.ui.output['slcf'].lib = 'opened' : this.ui.output['slcf'].lib = 'closed';
  }

  /** Import from library */
  public importLibraryItem(id: string) {
    let idGeneratorService = new IdGeneratorService;
    let libSlcf = find(this.lib.slcfs, function (o) { return o.id == id; });
    let slcf = cloneDeep(libSlcf);
    slcf.uuid = idGeneratorService.genUUID()
    this.slcfs.push(slcf);
  }

  /** Merge from library */
  public mergeLibraryItem(id: string) {
    let libSlcf = find(this.lib.slcfs, function (o) { return o.id == id; });
    if (this.slcf != undefined) {
      remove(this.slcf.quantities);
      this.slcf.quantities = libSlcf.quantities;
    }
    else {
      this.notifierService.notify('warning', 'Select current slcf before merging');
    }
  }

  /** Create CAD element */
  public createCad(id: string = '') {
    if (this.websocketService.isConnected && id != '') {
      let slcf = find(this.lib.slcfs, function (o) { return o.id == id; });
      this.slcfOld = cloneDeep(slcf);

      // Prepare message
      let message: WebsocketMessageObject = {
        method: 'createSlcfWeb',
        data: {
          id: id,
          direction: slcf.direction,
          value: slcf.value,
          color: { rgb: [165,0,41] }
        },
        id: this.websocketService.idGenerator(),
        requestID: '',
        status: 'waiting'
      }

      // Send message to CAD
      this.websocketService.sendMessage(message);
    }
  }


  /** Create CAD layer */
  public createCadLayer(id: string = '') {
    if (this.websocketService.isConnected && id != '') {
      let slcf = find(this.lib.slcfs, function (o) { return o.id == id; });
      this.slcfOld = cloneDeep(slcf);

      // Prepare message
      let message: WebsocketMessageObject = {
        method: 'createSlcfSurfWeb',
        data: {
          id: id,
          color: { rgb: [165,0,41] }
        },
        id: this.websocketService.idGenerator(),
        requestID: '',
        status: 'waiting'
      }

      // Send message to CAD
      this.websocketService.sendMessage(message);
    }
  }

  // COMPONENT METHODS
  public showSpecs(): boolean {
    let specs = filter(this.slcf.quantities, function (o: Quantity) { return o.spec == true; });
    let show = specs.length > 0 ? true : false;
    return show;
  }

  public showParts(): boolean {
    let parts = filter(this.slcf.quantities, function (o: Quantity) { return o.part == true; });
    let show = parts.length > 0 ? true : false;
    return show;
  }

}
