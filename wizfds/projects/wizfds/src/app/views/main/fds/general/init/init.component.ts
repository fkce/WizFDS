import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';

import { Main } from '@services/main/main';
import { Fds } from '@services/fds-object/fds-object';
import { UiState } from '@services/ui-state/ui-state';
import { Init } from '@services/fds-object/general/init';
import { Spec } from '@services/fds-object/specie/spec';
import { MainService } from '@services/main/main.service';
import { UiStateService } from '@services/ui-state/ui-state.service';

import { NgScrollbar } from 'ngx-scrollbar';
import { find, findIndex, map, set } from 'lodash';
import { Subscription } from 'rxjs';

/**
 * Editing &INIT regions - where a scenario starts in a state other than ambient.
 *
 * A warm layer under a ceiling, a volume already full of smoke, a species at a
 * concentration. Everything on an &INIT is optional, and FDS defaults each of
 * them to ambient, so an empty field means "leave it alone" rather than zero -
 * which is why nothing here is given a starting value.
 *
 * No library drawer: an &INIT is a region of this scenario, like a &MESH, not a
 * reusable definition like a &SURF or a &PROP.
 */
@Component({
    selector: 'app-init',
    templateUrl: './init.component.html',
    styleUrls: ['./init.component.scss'],
    standalone: false
})
export class InitComponent implements OnInit, OnDestroy {

  // Global objects
  main: Main;
  fds: Fds;
  ui: UiState;

  // Component objects
  inits: Init[];
  init: Init;

  mainSub: Subscription;
  uiSub: Subscription;

  // Scrollbars containers
  @ViewChild('initScrollbar', { static: false }) initScrollbar: NgScrollbar;

  constructor(
    private mainService: MainService,
    public uiStateService: UiStateService
  ) { }

  ngOnInit() {
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);
    this.uiSub = this.uiStateService.uiObservable.subscribe(uiObservable => this.ui = uiObservable);

    this.fds = this.main.currentFdsScenario.fdsObject;
    this.inits = this.fds.general.inits;

    this.inits.length > 0
      ? this.activate(this.inits[this.ui.general['init'].elementIndex].id)
      : this.init = undefined;
  }

  ngAfterViewInit() {
    // Set scrollbar position after the view is rendered
    setTimeout(() => {
      try { this.initScrollbar?.viewport?.scrollYTo(this.ui.general['init'].scrollPosition); } catch { }
    });
  }

  ngOnDestroy() {
    this.mainSub.unsubscribe();
    this.uiSub.unsubscribe();
  }

  /** The species of this scenario, for the concentration an &INIT can start. */
  public get specs(): string[] {
    return map(this.fds.specie.specs, (spec: Spec) => spec.id);
  }

  /**
   * The one species an &INIT starts, as the form edits it.
   *
   * FDS takes a list, so the model holds one - see Init. The form offers a
   * single species, so it reads and writes the first, and clearing it empties
   * the list rather than leaving a blank entry the serialiser would write.
   */
  public get specId(): string {
    return this.init.spec_id.length > 0 ? this.init.spec_id[0] : '';
  }

  public set specId(value: string) {
    this.init.spec_id = value ? [value] : [];
  }

  /** The fraction that goes with it. Same reasoning as specId. */
  public get massFraction(): number {
    return this.init.mass_fraction.length > 0 ? this.init.mass_fraction[0] : undefined;
  }

  public set massFraction(value: number) {
    this.init.mass_fraction = (value === undefined || value === null || value.toString() === '')
      ? []
      : [value];
  }

  /** Activate element on click */
  public activate(id: string) {
    this.init = find(this.inits, (o: Init) => o.id == id);
    this.ui.general['init'].elementIndex = findIndex(this.inits, { id: id });
  }

  /** Push new element */
  public add() {
    const element = { id: 'INIT' + this.mainService.getListId(this.inits, 'init') };

    this.inits.push(new Init(JSON.stringify(element)));
    this.activate(element.id);
  }

  /** Delete element */
  public delete(id: string) {
    const index = findIndex(this.inits, { id: id });

    this.inits.splice(index, 1);
    if (this.inits.length == 0) {
      this.init = undefined;
      return;
    }
    this.activate(this.inits[index != 0 ? index - 1 : index].id);
  }

  /** Update scroll position */
  public scrollbarUpdate() {
    set(this.ui.general, 'init.scrollPosition', this.initScrollbar.viewport.scrollTop);
  }
}
