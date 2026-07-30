import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';

import { Main } from '@services/main/main';
import { Fds } from '@services/fds-object/fds-object';
import { UiState } from '@services/ui-state/ui-state';
import { SelectionService } from '@services/selection/selection.service';
import { Zone } from '@services/fds-object/general/zone';
import { MainService } from '@services/main/main.service';
import { UiStateService } from '@services/ui-state/ui-state.service';

import { NgScrollbar } from 'ngx-scrollbar';
import { find, findIndex, set } from 'lodash';
import { Subscription } from 'rxjs';

/**
 * Editing &ZONEs - the sealed pressure zones of a scenario.
 *
 * A lift shaft, a stairwell, a room the smoke has to be kept out of. FDS solves
 * the pressure in each one separately and lets neighbouring ones leak into each
 * other through `LEAK_AREA`, which is what makes a pressurisation system
 * modellable.
 *
 * No library drawer: a zone is a region of this scenario, like a &MESH.
 */
@Component({
    selector: 'app-zone',
    templateUrl: './zone.component.html',
    styleUrls: ['./zone.component.scss'],
    standalone: false
})
export class ZoneComponent implements OnInit, OnDestroy {

  // Global objects
  main: Main;
  fds: Fds;
  ui: UiState;

  // Component objects
  zones: Zone[];
  zone: Zone;

  mainSub: Subscription;
  uiSub: Subscription;
  selSub: Subscription;

  // Scrollbars containers
  @ViewChild('zoneScrollbar', { static: false }) zoneScrollbar: NgScrollbar;

  constructor(
    private mainService: MainService,
    public uiStateService: UiStateService,
    private selectionService: SelectionService
  ) { }

  ngOnInit() {
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);
    this.uiSub = this.uiStateService.uiObservable.subscribe(uiObservable => this.ui = uiObservable);

    this.fds = this.main.currentFdsScenario.fdsObject;
    this.zones = this.fds.general.zones;

    // Open whatever is selected - a click in 3D is what says so (#121).
    // Replayed on subscribe, so this settles what is open on arrival.
    this.selSub = this.selectionService.selected$.subscribe(() => this.activateSelected());
  }

  /**
   * Open the selected element, or the one last worked on.
   *
   * A condition region is selectable in the 3D preview since #121, and the
   * selection is the app's one answer to what the user is on (ADR-0005).
   */
  private activateSelected() {
    const selected = this.selectionService.selectedIn(this.zones);
    if (selected) {
      this.activate(selected.id);
    } else {
      this.zones.length > 0
        ? this.activate(this.zones[this.ui.general['zone'].elementIndex].id)
        : this.zone = undefined;
    }
  }

  ngAfterViewInit() {
    // Set scrollbar position after the view is rendered
    setTimeout(() => {
      try { this.zoneScrollbar?.viewport?.scrollYTo(this.ui.general['zone'].scrollPosition); } catch { }
    });
  }

  ngOnDestroy() {
    this.mainSub.unsubscribe();
    this.uiSub.unsubscribe();
    this.selSub.unsubscribe();
  }

  /** Activate element on click */
  public activate(id: string) {
    this.zone = find(this.zones, (o: Zone) => o.id == id);
    this.ui.general['zone'].elementIndex = findIndex(this.zones, { id: id });
    if (this.zone) { this.selectionService.select({ uuid: this.zone.uuid, type: 'zone' }); }
  }

  /** Push new element */
  public add() {
    const element = { id: 'ZONE' + this.mainService.getListId(this.zones, 'zone') };

    this.zones.push(new Zone(JSON.stringify(element)));
    this.activate(element.id);
  }

  /** Delete element */
  public delete(id: string) {
    const index = findIndex(this.zones, { id: id });

    this.zones.splice(index, 1);
    if (this.zones.length == 0) {
      this.zone = undefined;
      return;
    }
    this.activate(this.zones[index != 0 ? index - 1 : index].id);
  }

  /** Update scroll position */
  public scrollbarUpdate() {
    set(this.ui.general, 'zone.scrollPosition', this.zoneScrollbar.viewport.scrollTop);
  }
}
