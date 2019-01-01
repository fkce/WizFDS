import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';

import { Matl } from '@services/fds-object/geometry/matl';
import { LibraryService } from '@services/library/library.service';
import { UiStateService } from '@services/ui-state/ui-state.service';
import { WebsocketService } from '@services/websocket/websocket.service';
import { MainService } from '@services/main/main.service';
import { Surf } from '@services/fds-object/geometry/surf';
import { Library } from '@services/library/library';
import { UiState } from '@services/ui-state/ui-state';
import { Fds } from '@services/fds-object/fds-object';
import { Main } from '@services/main/main';
import { FdsEnums } from '@enums/fds/enums/fds-enums';
import { IdGeneratorService } from '@services/id-generator/id-generator.service';
import { colors } from '@enums/fds/enums/fds-enums-colors';
import { WebsocketMessageObject } from '@services/websocket/websocket-message';
import { NotifierService } from '../../../../../../../node_modules/angular-notifier';

import { PerfectScrollbarComponent } from 'ngx-perfect-scrollbar';
import { cloneDeep, find, set, findIndex, each } from 'lodash';

@Component({
  selector: 'app-surface',
  templateUrl: './surface.component.html',
  styleUrls: ['./surface.component.scss']
})
export class SurfaceComponent implements OnInit, OnDestroy {

  // Global objects
  main: Main;
  fds: Fds;
  geometry: any;
  ui: UiState;
  lib: Library;

  // Component objects
  surfs: Surf[];
  libSurfs: Surf[];
  surf: Surf;
  surfOld: Surf;
  matls: Matl[];
  libMatls: Matl[];
  objectType: string = 'current'; // Lib or current

  wsSub;
  mainSub;
  uiSub;
  libSub;

  // Scrolbars containers
  @ViewChild('surfScrollbar') surfScrollbar: PerfectScrollbarComponent;
  @ViewChild('libSurfScrollbar') libSurfScrollbar: PerfectScrollbarComponent;

  // Enums
  COLORS = colors;
  BACKING = FdsEnums.SURF.surfaceBacking;

  constructor(
    private mainService: MainService,
    private websocketService: WebsocketService,
    private uiStateService: UiStateService,
    private libraryService: LibraryService,
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
    this.geometry = this.main.currentFdsScenario.fdsObject.geometry;
    this.surfs = this.main.currentFdsScenario.fdsObject.geometry.surfs;
    this.libSurfs = this.lib.surfs;
    this.matls = this.main.currentFdsScenario.fdsObject.geometry.matls;
    this.libMatls = this.lib.matls;

    // Activate last element
    this.surfs.length > 0 ? this.surf = this.surfs[this.ui.geometry['surf'].elementIndex] : this.surf = undefined;

    // Subscribe websocket requests status for websocket CAD sync
    this.wsSub = this.websocketService.requestStatus.subscribe(
      (message) => {
        if (message.status == 'error') {
          this.surf = cloneDeep(this.surfOld);
          this.notifierService.notify('error', 'CAD: Cannot sync ...');
        }
        else if (message.status == 'success') {
          this.surfOld = cloneDeep(this.surf);
          if (message.method == 'createObstSurfWeb') {
            this.surf.idAC = message.data['idAC'];
            this.notifierService.notify('success', 'CAD: Surface layer created');
          }
          else if (message.method == 'updateObstSurfWeb') {
            this.notifierService.notify('success', 'CAD: Surf updated');
          }
          else if (message.method == 'deleteObstSurfWeb') {
            this.notifierService.notify('success', 'CAD: Surf deleted');
          }
          else if (message.method == 'selectObjectWeb') {
            this.notifierService.notify('success', 'CAD: Element selected');
          }
        }
      },
      (error) => {
        this.surf = cloneDeep(this.surfOld);
        this.notifierService.notify('error', 'CAD: Cannot sync ...');
      }
    );
  }

  ngAfterViewInit() {
    // Set scrollbars position y after view rendering and set last selected element
    this.surfScrollbar.directiveRef.scrollToY(this.ui.geometry['surf'].scrollPosition);
    this.surfs.length > 0 && this.activate(this.surfs[this.ui.geometry['surf'].elementIndex].id);
  }

  ngOnDestroy() {
    this.wsSub.unsubscribe();
    this.mainSub.unsubscribe();
    this.uiSub.unsubscribe();
    this.libSub.unsubscribe();
  }

  /** Activate element on click */
  public activate(id: string, library?: boolean) {
    if (!library) {
      this.objectType = 'current';
      this.surf = find(this.fds.geometry.surfs, function (o) { return o.id == id; });
      this.ui.geometry['surf'].elementIndex = findIndex(this.surfs, { id: id });
      this.surfOld = cloneDeep(this.surf);
    }
    else {
      this.objectType = 'library';
      this.surf = find(this.lib.surfs, function (o) { return o.id == id; });
      this.ui.geometry['libSurf'].elementIndex = findIndex(this.libSurfs, { id: id });
      this.surfOld = cloneDeep(this.surf);
    }
  }

  /** Push new element */
  public add(library?: boolean) {
    // Create new surf object with unique id
    if (!library) {
      let element = { id: 'SURF' + this.mainService.getListId(this.surfs) };
      this.surfs.push(new Surf(JSON.stringify(element), this.matls));
      this.activate(element.id);
    }
    else {
      let element = { id: 'SURF' + this.mainService.getListId(this.libSurfs) };
      this.libSurfs.push(new Surf(JSON.stringify(element), this.libMatls));
      this.activate(element.id, true);
    }
  }

  /** Delete element */
  public delete(id: string, library?: boolean) {
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
        this.libSurfs.length == 0 ? this.surf = undefined : this.activate(this.libSurfs[index - 1].id, true);
      }
      else {
        this.libSurfs.length == 0 ? this.surf = undefined : this.activate(this.libSurfs[index].id, true);
      }
    }
  }

  /** Update scroll position */
  public scrollbarUpdate(element: string) {
    set(this.ui.geometry, element + '.scrollPosition', this[element + 'Scrollbar'].directiveRef.geometry().y);
  }

  /** Toggle library */
  public toggleLibrary() {
    this.ui.geometry['surf'].lib == 'closed' ? this.ui.geometry['surf'].lib = 'opened' : this.ui.geometry['surf'].lib = 'closed';
  }

  /** Import from library */
  public importLibraryItem(id: string) {
    let idGeneratorService = new IdGeneratorService;
    let libSurf = find(this.lib.surfs, function (o) { return o.id == id; });
    if (libSurf.layers) {
      each(libSurf.layers, (layer) => {
        if (layer.materials) {
          each(layer.materials, (material) => {
            // Check if already exists in current matl list
            let libMatl = find(this.matls, function (o) { return o.id == material.material.id });
            // If libMatl undefinded import from library
            if (libMatl == undefined) {
              libMatl = find(this.lib.matls, function (o) { return o.id == material.material.id });
              let matl = cloneDeep(libMatl);
              matl.uuid = idGeneratorService.genUUID();
              this.matls.push(matl);
            }
          });
        }
      });
    }
    let surf = cloneDeep(libSurf);
    surf.uuid = idGeneratorService.genUUID()
    this.surfs.push(surf);
  }

  /** Create CAD element */
  public createCad(id: string = '') {
    if (this.websocketService.isConnected) {
      this.surfOld = cloneDeep(this.surf);

      // Find clicked object
      let surf = find(this.libSurfs, ['id', id]);

      // Prepare message
      let message: WebsocketMessageObject = {
        method: 'createObstSurfWeb',
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

  /** Update CAD element */
  public updateCad(type: string = '') {
    if (this.websocketService.isConnected) {
      if (this.objectType == 'library') return;
      this.surfOld = cloneDeep(this.surf);

      // Prepare message
      let message: WebsocketMessageObject = {
        method: 'updateObstSurfWeb',
        data: {
          idAC: this.surf.idAC,
          id: this.surf.id
        },
        id: this.websocketService.idGenerator(),
        requestID: '',
        status: "waiting"
      }

      // Send message to CAD
      this.websocketService.sendMessage(message);
    }
  }

  /** Delete CAD element */
  public deleteCad(type: string = '') {
    if (this.websocketService.isConnected) {
      this.surfOld = cloneDeep(this.surf);

      // Prepare message
      let message: WebsocketMessageObject = {
        method: 'deleteObstSurfWeb',
        data: {
          idAC: this.surf.idAC
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
    this.websocketService.selectCad(this.surf.idAC);
  }

  // COMPONENT METHODS

  public addLayer() {
    this.surf.addLayer();
  }

  public deleteLayer(layerIndex: number) {
    this.surf.deleteLayer(layerIndex);
  }

  public addMaterial(layerIndex: number) {
    this.surf.addMaterial(layerIndex);
  }

  public deleteMaterial(layerIndex: number, materialIndex: number) {
    this.surf.deleteMaterial(layerIndex, materialIndex);
  }

}
