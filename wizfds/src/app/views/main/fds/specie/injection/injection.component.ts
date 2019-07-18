import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { LibraryService } from '@services/library/library.service';
import { Library } from '@services/library/library';
import { Ramp } from '@services/fds-object/ramp/ramp';
import { UiStateService } from '@services/ui-state/ui-state.service';
import { WebsocketService } from '@services/websocket/websocket.service';
import { MainService } from '@services/main/main.service';
import { FdsEnums } from '@enums/fds/enums/fds-enums';
import { UiState } from '@services/ui-state/ui-state';
import { Fds } from '@services/fds-object/fds-object';
import { Main } from '@services/main/main';
import { IdGeneratorService } from '@services/id-generator/id-generator.service';
import { colors } from '@enums/fds/enums/fds-enums-colors';
import { NotifierService } from '../../../../../../../node_modules/angular-notifier';

import { PerfectScrollbarComponent } from 'ngx-perfect-scrollbar';
import { find, findIndex, cloneDeep, set, filter, forEach } from 'lodash';
import { WebsocketMessageObject } from '@services/websocket/websocket-message';
import { VentSpec } from '@services/fds-object/specie/vent';
import { SurfSpec } from '@services/fds-object/specie/surf-spec';
import { Spec } from '@services/fds-object/specie/spec';

@Component({
  selector: 'app-injection',
  templateUrl: './injection.component.html',
  styleUrls: ['./injection.component.scss']
})
export class InjectionComponent implements OnInit, OnDestroy {

  // Global objects
  main: Main;
  fds: Fds;
  specie: any;
  ui: UiState;
  lib: Library;

  // Component objects
  vents: VentSpec[];
  vent: VentSpec;
  ventOld: VentSpec;
  surfs: SurfSpec[];
  libSurfs: SurfSpec[];
  surf: SurfSpec;
  surfOld: SurfSpec;
  ramps: Ramp[];
  libRamps: Ramp[];
  specs: Spec[];
  libSpecs: Spec[];
  objectType: string = 'current'; // Lib or current

  wsSub;
  mainSub;
  uiSub;
  libSub;
  rouSub;

  // Scrolbars containers
  @ViewChild('ventScrollbar', {static: false}) ventScrollbar: PerfectScrollbarComponent;
  @ViewChild('surfScrollbar', {static: false}) surfScrollbar: PerfectScrollbarComponent;
  @ViewChild('libSurfScrollbar', {static: false}) libSurfScrollbar: PerfectScrollbarComponent;

  // Enums
  ENUMS_SURF = FdsEnums.SURF;
  COLORS = colors;
  ENUMS_SPEC = FdsEnums.SPEC;

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
    this.specie = this.main.currentFdsScenario.fdsObject.specie;
    this.vents = this.main.currentFdsScenario.fdsObject.specie.vents;
    this.surfs = this.main.currentFdsScenario.fdsObject.specie.surfs;
    this.ramps = filter(this.main.currentFdsScenario.fdsObject.ramps.ramps, function (o) { return o.type == 'spec' });
    this.libRamps = filter(this.lib.ramps, function (o) { return o.type == 'spec' });
    this.libSurfs = this.lib.specsurfs;
    this.specs = this.main.currentFdsScenario.fdsObject.specie.specs;
    this.libSpecs = this.lib.specs;

    // Subscribe websocket requests status for websocket CAD sync
    this.wsSub = this.websocketService.requestStatus.subscribe(
      (message) => {
        if (message.status == 'error') {
          //this.mesh = cloneDeep(this.meshOld);
          console.log('Cannot sync vent ...');
        }
        else if (message.status == 'success') {
          this.surfOld = cloneDeep(this.surf);
          if (message.method == 'createVentSurfWeb') {
            this.notifierService.notify('success', 'CAD: Vent layer created');
          }
        }
      },
      (error) => {
        //this.mesh = cloneDeep(this.meshOld);
        console.log('Cannot sync vent ...');
      }
    );

    // Activate element from route or ui object
    this.rouSub = this.route.params.subscribe((params) => {
      if (params['idAC']) {
        let index = -1;
        index = findIndex(this.vents, function (o) { return o.idAC == params['idAC']; });
        if (index >= 0) {
          this.activate(this.vents[index].id, 'mesh');
        }
        this.surfs.length > 0 ? this.activate(this.surfs[this.ui.geometry['surf'].elementIndex].id, 'surf') : this.surf = undefined;
      }
      else {
        this.vents.length > 0 ? this.activate(this.vents[this.ui.specie['vent'].elementIndex].id, 'vent') : this.vent = undefined;
        this.surfs.length > 0 ? this.activate(this.surfs[this.ui.specie['surf'].elementIndex].id, 'surf') : this.surf = undefined;
      }
    });

  }

  ngAfterViewInit() {
    // Set scrollbars position y after view rendering and set last selected element
    this.ventScrollbar.directiveRef.scrollToY(this.ui.specie['vent'].scrollPosition);
    this.surfScrollbar.directiveRef.scrollToY(this.ui.specie['surf'].scrollPosition);
  }

  ngOnDestroy() {
    this.wsSub.unsubscribe();
    this.mainSub.unsubscribe();
    this.uiSub.unsubscribe();
    this.libSub.unsubscribe();
    this.rouSub.unsubscribe();
  }

  /** Activate element on click */
  public activate(id: string, type: string = '', library?: boolean) {
    if (type == 'vent') {
      this.vent = find(this.fds.specie.vents, function (o) { return o.id == id; });
      this.ui.specie['vent'].elementIndex = findIndex(this.vents, { id: id });
      this.ventOld = cloneDeep(this.vent);
    }
    else if (type == 'surf') {
      if (!library) {
        this.objectType = 'current';
        this.surf = find(this.fds.specie.surfs, function (o) { return o.id == id; });
        this.ui.specie['surf'].elementIndex = findIndex(this.surfs, { id: id });
        this.surfOld = cloneDeep(this.surf);
      }
      else {
        this.objectType = 'library';
        this.surf = find(this.lib.specsurfs, function (o) { return o.id == id; });
        this.ui.geometry['libSurf'].elementIndex = findIndex(this.libSurfs, { id: id });
        this.surfOld = cloneDeep(this.surf);
      }
    }
  }

  /** Push new element */
  public add(type: string = '', library?: boolean) {
    if (type == 'vent') {
      let element = { id: 'SPEV' + this.mainService.getListId(this.vents) };
      this.vents.push(new VentSpec(JSON.stringify(element)));
      this.activate(element.id, 'vent');
    }
    else if (type == 'surf') {
      if (!library) {
        let element = { id: 'SPES' + this.mainService.getListId(this.surfs) };
        //this.surfs.push(new SurfVent(JSON.stringify(element), this.ramps));
        this.surfs = [...this.surfs, new SurfSpec(JSON.stringify(element), this.ramps, this.specs)];
        this.specie.surfs = this.surfs;
        this.activate(element.id, 'surf');
      }
      else {
        let element = { id: 'SPES' + this.mainService.getListId(this.libSurfs) };
        this.libSurfs.push(new SurfSpec(JSON.stringify(element), this.libRamps, this.libSpecs));
        this.activate(element.id, 'surf', true);
      }
    }
  }

  /** Delete element */
  public delete(id: string, type: string = '', library?: boolean) {
    if (type == 'vent') {
      let index = findIndex(this.vents, { id: id });
      this.vents.splice(index, 1);
      if (index != 0) {
        this.vents.length == 0 ? this.vent = undefined : this.activate(this.vents[index - 1].id);
      }
      else {
        this.vents.length == 0 ? this.vent = undefined : this.activate(this.vents[index].id);
      }
    }
    else if (type == 'surf') {
      if (!library) {
        let index = findIndex(this.surfs, { id: id });
        this.surfs.splice(index, 1);
        if (index != 0) {
          this.surfs.length == 0 ? this.surf = undefined : this.activate(this.surfs[index - 1].id);
        }
        else {
          this.surfs.length == 0 ? this.surf = undefined : this.activate(this.surfs[index].id);
        }
      }
      else {
        let index = findIndex(this.libSurfs, { id: id });
        this.libSurfs.splice(index, 1);
        if (index != 0) {
          this.libSurfs.length == 0 ? this.surf = undefined : this.activate(this.libSurfs[index - 1].id, 'surf', true);
        }
        else {
          this.libSurfs.length == 0 ? this.surf = undefined : this.activate(this.libSurfs[index].id, 'surf', true);
        }
      }
    }
  }

  /** Update scroll position */
  public scrollbarUpdate(element: string) {
    set(this.ui.specie, element + '.scrollPosition', this[element + 'Scrollbar'].directiveRef.geometry().y);
  }

  /** Toggle library */
  public toggleLibrary() {
    this.ui.specie['surf'].lib == 'closed' ? this.ui.specie['surf'].lib = 'opened' : this.ui.specie['surf'].lib = 'closed';
  }

  /** Import from library */
  public importLibraryItem(id: string) {
    let idGeneratorService = new IdGeneratorService;
    let libSurf = find(this.lib.specsurfs, function (o) { return o.id == id; });
    let ramp = undefined;
    let libRamp = undefined;
    if (libSurf.ramp != undefined && libSurf.ramp.id) {
      // Check if ramp already exists
      libRamp = find(this.ramps, function (o) { return o.id == libSurf.ramp.id });
      // If ramp do not exists import from library
      if (libRamp == undefined) {
        let libRamp = find(this.lib.ramps, function (o) { return o.id == libSurf.ramp.id });
        ramp = cloneDeep(libRamp);
        ramp.uuid = idGeneratorService.genUUID();
        this.main.currentFdsScenario.fdsObject.ramps.ramps.push(ramp);
        this.ramps = filter(this.main.currentFdsScenario.fdsObject.ramps.ramps, function (o) { return o.type == 'spec' });
      }
      else {
        // TODO: warrning that ramp was not imported because name already exists
      }
    }

    // Import species from library
    console.log(libSurf);
    if (libSurf.specieFlowType == 'massFlux' && libSurf.massFlux.length > 0) {

      forEach(libSurf.massFlux, (massFluxSpec) => {
        let tempSpec = find(this.lib.specs, function (o) {
          return o.id == massFluxSpec.spec.id;
        });
        let libSpec = cloneDeep(tempSpec);

        // Copy to current fds scenario specs
        if (libSpec != undefined) {
          this.main.currentFdsScenario.fdsObject.specie.specs.push(new Spec(JSON.stringify(libSpec.toJSON())));
        }
      });
    }
    else if (libSurf.specieFlowType == 'massFraction' && libSurf.massFraction.length > 0) {

      forEach(libSurf.massFraction, (massFractionSpec) => {
        let tempSpec = find(this.lib.specs, function (o) {
          return o.id == massFractionSpec.spec.id;
        });
        let libSpec = cloneDeep(tempSpec);

        // Copy to current fds scenario specs
        if (libSpec != undefined) {
          this.main.currentFdsScenario.fdsObject.specie.specs.push(new Spec(JSON.stringify(libSpec.toJSON())));
        }
      });
    }

    let surf = cloneDeep(libSurf);
    surf.uuid = idGeneratorService.genUUID()
    surf.ramp = ramp != undefined ? ramp : libRamp;
    this.surfs.push(new SurfSpec(JSON.stringify(surf), this.ramps, this.specs));
  }

  /** Create CAD layer */
  public createCadLayer(id: string = '') {
    if (this.websocketService.isConnected) {
      this.surfOld = cloneDeep(this.surf);

      // Find clicked object
      let surf = find(this.libSurfs, ['id', id]);

      // Prepare message
      let message: WebsocketMessageObject = {
        method: 'createSpecSurfWeb',
        data: {
          id: id,
          color: surf.color
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
    this.websocketService.selectCad(this.vent.idAC);
  }

  // COMPONENT METHODS
  /** Add ramp and activate */
  public addRamp(type: string, property?: string) {
    // Chcek if current or library
    if (this.objectType == 'current') {
      let element = { id: 'RAMP' + this.mainService.getListId(this.main.currentFdsScenario.fdsObject.ramps.ramps), type: type };
      this.main.currentFdsScenario.fdsObject.ramps.ramps.push(new Ramp(JSON.stringify(element)));
      this.ramps = filter(this.main.currentFdsScenario.fdsObject.ramps.ramps, function (o) { return o.type == 'spec' });
      this.surf.ramp = find(this.ramps, (ramp) => {
        return ramp.id == element.id;
      });
    }
    else if (this.objectType == 'library') {
      let element = { id: 'RAMP' + this.mainService.getListId(this.lib.ramps), type: type };
      this.lib.ramps.push(new Ramp(JSON.stringify(element)));
      this.libRamps = filter(this.lib.ramps, function (o) { return o.type == 'spec' });
      this.surf.ramp = find(this.libRamps, (ramp) => {
        return ramp.id == element.id;
      });
    }
  }

  /**
   * Add specie
   */
  public addSpecie() {
    if (this.surf.specieFlowType == 'massFlux') {
      this.surf.massFlux.push({ spec: undefined, mass_flux: 0 })
    }
    else if (this.surf.specieFlowType == 'massFraction') {
      this.surf.massFraction.push({ spec: undefined, mass_fraction: 0 })
    }
  }

  /**
   * Delete specie
   * @param index Array index
   */
  public deleteSpecie(index: number) {
    if (this.surf.specieFlowType == 'massFlux') {
      this.surf.massFlux.splice(index, 1);
    }
    else if (this.surf.specieFlowType == 'massFraction') {
      this.surf.massFraction.splice(index, 1);
    }
  }

}
