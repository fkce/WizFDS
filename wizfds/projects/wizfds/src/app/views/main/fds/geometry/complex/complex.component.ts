import { Component, OnInit, ViewChild, OnDestroy, isDevMode } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { WebsocketService } from '@services/websocket/websocket.service';
import { Fds } from '@services/fds-object/fds-object';
import { Main } from '@services/main/main';
import { MainService } from '@services/main/main.service';
import { UiStateService } from '@services/ui-state/ui-state.service';
import { UiState } from '@services/ui-state/ui-state';
import { SelectionService } from '@services/selection/selection.service';

import { NgScrollbar } from 'ngx-scrollbar';
import { set, find, cloneDeep, findIndex, concat } from 'lodash';
import { Geom } from '@services/fds-object/geometry/geom';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-complex',
    templateUrl: './complex.component.html',
    styleUrls: ['./complex.component.scss'],
    standalone: false
})
export class ComplexComponent implements OnInit, OnDestroy {

  // Global objects
  main: Main;
  fds: Fds;
  geometry: any;
  ui: UiState;
  output: any;
  surfaces: any[];

  // Component objects
  geoms: Geom[];
  geom: Geom;
  geomOld: Geom;

  wsSub: Subscription;
  mainSub: Subscription;
  uiSub: Subscription;
  selSub: Subscription;

  // Scrolbars containers
  @ViewChild('geomScrollbar', {static: false}) geomScrollbar: NgScrollbar;

  // Enums
  //ENUMS_GEOM = FdsEnums.GEOM;

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
    this.geoms = this.main.currentFdsScenario.fdsObject.geometry.geoms;

    // Create geometry surfaces
    this.surfaces = this.geometry.surfs;

    // Subscribe websocket requests status for websocket CAD sync
    this.wsSub = this.websocketService.requestStatus.subscribe(
      (message) => {
        if (message.status == 'error') {
          //this.mesh = cloneDeep(this.meshOld);
          if (isDevMode()) console.log('Cannot sync geom ...');
        }
        else if (message.status == 'success') {
          //this.meshOld = cloneDeep(this.mesh);
          if (isDevMode()) console.log('Geom updated ...')
        }
      },
      (error) => {
        //this.mesh = cloneDeep(this.meshOld);
        if (isDevMode()) console.log('Cannot sync geom ...');
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
    const selected = this.selectionService.selectedIn(this.geoms);
    if (selected) {
      this.activate(selected.id);
    } else {
      this.geoms.length > 0 ? this.activate(this.geoms[this.ui.geometry['geom'].elementIndex].id) : this.geom = undefined;
    }
  }

  ngAfterViewInit() {
    // Set scrollbars position y after view rendering and set last selected element
    setTimeout(() => {
      try { this.geomScrollbar?.viewport?.scrollYTo(this.ui.geometry['geom'].scrollPosition); } catch {}
    });
  }

  ngOnDestroy() {
    this.wsSub.unsubscribe();
    this.mainSub.unsubscribe();
    this.uiSub.unsubscribe();
    this.selSub.unsubscribe();
  }

  /** Activate element on click */
  public activate(id: string) {
    this.geom = find(this.fds.geometry.geoms, function (o) { return o.id == id; });
    this.ui.geometry['geom'].elementIndex = findIndex(this.geoms, { id: id });
    this.geomOld = cloneDeep(this.geom);
    if (this.geom) { this.selectionService.select({ uuid: this.geom.uuid, type: 'geom' }); }
  }

  /** Push new element */
  public add() {
    let element = { id: 'GEOM' + this.mainService.getListId(this.geoms) };
    this.geoms.push(new Geom(JSON.stringify(element)));
    this.activate(element.id);
  }

  /** Delete element */
  public delete(id: string) {
    let index = findIndex(this.geoms, { id: id });
    this.geoms.splice(index, 1);
    if (index != 0) {
      this.geoms.length == 0 ? this.geom = undefined : this.activate(this.geoms[index - 1].id);
    }
    else {
      this.geoms.length == 0 ? this.geom = undefined : this.activate(this.geoms[index].id);
    }
  }

  /** Update scroll position */
  public scrollbarUpdate(element: string) {
    set(this.ui.geometry, element + '.scrollPosition', (this[element + 'Scrollbar'] as NgScrollbar).viewport.scrollTop);
  }

  // COMPONENT METHODS

}
