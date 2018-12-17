import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Fire } from '@services/fds-object/fire/fire';
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
import { colors } from '@enums/fds/enums/fds-enums-colors';
import { FdsEnums } from '@enums/fds/enums/fds-enums';
import { NotifierService } from '../../../../../../../node_modules/angular-notifier';

import { PerfectScrollbarComponent } from 'ngx-perfect-scrollbar';
import { set, cloneDeep, find, findIndex, filter } from 'lodash';
import { WebsocketMessageObject } from '@services/websocket/websocket-message';

@Component({
  selector: 'app-fires',
  templateUrl: './fires.component.html',
  styleUrls: ['./fires.component.scss']
})
export class FiresComponent implements OnInit, OnDestroy {

  // Global objects
  main: Main;
  fds: Fds;
  ui: UiState;
  lib: Library;

  // Component objects
  fires: Fire[];
  libFires: Fire[];
  fire: Fire;
  fireOld: Fire;
  ramps: Ramp[];
  libRamps: Ramp[];
  objectType: string = 'current'; // Lib or current

  // Enums
  ENUMS_FIRE = FdsEnums.FIRE;
  COLORS = colors;

  wsSub;
  mainSub;
  uiSub;
  libSub;
  rouSub;

  // Scrolbars containers
  @ViewChild('fireScrollbar') fireScrollbar: PerfectScrollbarComponent;
  @ViewChild('libFireScrollbar') libFireScrollbar: PerfectScrollbarComponent;

  constructor(
    private mainService: MainService,
    private websocketService: WebsocketService,
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
    this.fires = this.main.currentFdsScenario.fdsObject.fires.fires;
    this.libFires = this.lib.fires;
    this.ramps = filter(this.main.currentFdsScenario.fdsObject.ramps.ramps, function(o) { return o.type == 'fire' });
    this.libRamps = filter(this.lib.ramps, function(o) { return o.type == 'fire' });

    // Subscribe websocket requests status for websocket CAD sync
    this.wsSub = this.websocketService.requestStatus.subscribe(
      (message) => {
        if (message.status == 'error') {
          this.fire = cloneDeep(this.fireOld);
          console.log('Cannot sync fire ...');
        }
        else if (message.status == 'success') {
          this.fireOld = cloneDeep(this.fire);
          if (message.method == 'createFireSurfWeb') {
            this.notifierService.notify('success', 'CAD: Fire layer created');
          }
        }
      },
      (error) => {
        this.fire = cloneDeep(this.fireOld);
        console.log('Cannot sync fire ...');
      }
    );

    // Activate element from route or ui object
    this.rouSub = this.route.params.subscribe((params) => {
      if (params['idAC']) {
        let index = -1;
        index = findIndex(this.fires, function (o) { return o.idAC == params['idAC']; });
        if (index >= 0) {
          this.activate(this.fires[index].id);
        }
      }
      else {
        this.fires.length > 0 ? this.activate(this.fires[this.ui.fires['fire'].elementIndex].id) : this.fire = undefined;
      }
    });

  }

  ngAfterViewInit() {
    // Set scrollbars position y after view rendering and set last selected element
    this.fireScrollbar.directiveRef.scrollToY(this.ui.fires['fire'].scrollPosition);
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
      this.fire = find(this.fds.fires.fires, function (o) { return o.id == id; });
      this.ui.fires['fire'].elementIndex = findIndex(this.fires, { id: id });
      this.fireOld = cloneDeep(this.fire);
    }
    else {
      this.objectType = 'library';
      this.fire = find(this.lib.fires, function (o) { return o.id == id; });
      this.ui.fires['libFire'].elementIndex = findIndex(this.libFires, { id: id });
      this.fireOld = cloneDeep(this.fire);
    }
  }

  /** Push new element */
  public add(library?: boolean) {
    // Create new fire object with unique id
    if (!library) {
      let element = { id: 'FIRE' + this.mainService.getListId(this.fires, 'fire') };
      this.fires.push(new Fire(JSON.stringify(element), this.ramps));
      this.activate(element.id);
    }
    else {
      let element = { id: 'FIRE' + this.mainService.getListId(this.libFires, 'fire') };
      this.libFires.push(new Fire(JSON.stringify(element), this.libRamps));
      this.activate(element.id, true);
    }
  }

  /** Delete element */
  public delete(id: string, library?: boolean) {
    if (!library) {
      let index = findIndex(this.fires, { id: id });
      this.fires.splice(index, 1);
      if (index != 0) {
        this.fires.length == 0 ? this.fire = undefined : this.activate(this.fires[index - 1].id);
      }
      else {
        this.fires.length == 0 ? this.fire = undefined : this.activate(this.fires[index].id);
      }
    }
    else {
      let index = findIndex(this.libFires, { id: id });
      this.libFires.splice(index, 1);
      if (index != 0) {
        this.libFires.length == 0 ? this.fire = undefined : this.activate(this.libFires[index - 1].id, true);
      }
      else {
        this.libFires.length == 0 ? this.fire = undefined : this.activate(this.libFires[index].id, true);
      }
    }
  }

  /** Update scroll position */
  public scrollbarUpdate(element: string) {
    set(this.ui.fires, element + '.scrollPosition', this[element + 'Scrollbar'].directiveRef.geometry().y);
  }

  /** Toggle library */
  public toggleLibrary() {
    this.ui.fires['fire'].lib == 'closed' ? this.ui.fires['fire'].lib = 'opened' : this.ui.fires['fire'].lib = 'closed';
  }

  /** Import from library */
  public importLibraryItem(id: string) {
    let idGeneratorService = new IdGeneratorService;
    let libFire = find(this.lib.fires, function (o) { return o.id == id; });
    let ramp = undefined;
    let libRamp = undefined;
    if (libFire.surf.ramp != undefined && libFire.surf.ramp.id) {
      // Check if ramp already exists
      libRamp = find(this.ramps, function (o) { return o.id == libFire.surf.ramp.id });
      // If ramp do not exists import from library
      if (libRamp == undefined) {
        libRamp = find(this.lib.ramps, function (o) { return o.id == libFire.surf.ramp.id });
        ramp = cloneDeep(libRamp);
        ramp.uuid = idGeneratorService.genUUID();
        this.main.currentFdsScenario.fdsObject.ramps.ramps.push(ramp);
        this.ramps = filter(this.main.currentFdsScenario.fdsObject.ramps.ramps, function(o) { return o.type == 'fire' });
      }
    }
    let fire = cloneDeep(libFire);
    fire.uuid = idGeneratorService.genUUID()
    fire.surf.ramp = ramp != undefined ? ramp : libRamp;
    this.fires.push(fire);
  }

  /** Create CAD layer */
  public createCadLayer(id: string = '') {
    if (this.websocketService.isConnected) {
      this.fireOld = cloneDeep(this.fire);

      // Prepare message
      let message: WebsocketMessageObject = {
        method: 'createFireSurfWeb',
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

  /** Select CAD element */
  public selectCad(type: string = '') {
    this.websocketService.selectCad(this.fire.idAC);
  }

  // COMPONENT METHODS
  /** Add ramp and activate */
  public addRamp(type: string, property?: string) {
    // Chcek if current or library
    if (this.objectType == 'current') {
      let element = { id: 'RAMP' + this.mainService.getListId(this.main.currentFdsScenario.fdsObject.ramps.ramps), type: type };
      this.main.currentFdsScenario.fdsObject.ramps.ramps.push(new Ramp(JSON.stringify(element)));
      this.ramps = filter(this.main.currentFdsScenario.fdsObject.ramps.ramps, function(o) { return o.type == 'fire' });
      this.fire.surf.ramp = find(this.ramps, (ramp) => {
        return ramp.id == element.id;
      });
    }
    else if (this.objectType == 'library') {
      let element = { id: 'RAMP' + this.mainService.getListId(this.lib.ramps), type: type };
      this.lib.ramps.push(new Ramp(JSON.stringify(element)));
      this.libRamps = filter(this.lib.ramps, function(o) { return o.type == 'fire' });
      this.fire.surf.ramp = find(this.libRamps, (ramp) => {
        return ramp.id == element.id;
      });
    }
  }

}
