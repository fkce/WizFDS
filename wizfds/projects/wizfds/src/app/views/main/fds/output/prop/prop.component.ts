import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';

import { Main } from '@services/main/main';
import { Fds } from '@services/fds-object/fds-object';
import { UiState } from '@services/ui-state/ui-state';
import { Library } from '@services/library/library';
import { Prop } from '@services/fds-object/output/prop';
import { MainService } from '@services/main/main.service';
import { UiStateService } from '@services/ui-state/ui-state.service';
import { LibraryService } from '@services/library/library.service';
import { IdGeneratorService } from '@services/id-generator/id-generator.service';
import { FdsEnums } from '@enums/fds/enums/fds-enums';
import { SnackBarService } from '@services/snack-bar/snack-bar.service';

import { NgScrollbar } from 'ngx-scrollbar';
import { find, findIndex, cloneDeep, set } from 'lodash';
import { Subscription } from 'rxjs';

/**
 * Editing &PROPs - what a device *is*, as opposed to where it stands.
 *
 * A sprinkler with an RTI and an activation temperature, a smoke detector with
 * an obscuration threshold, a nozzle with a spray pattern. A device points at
 * one by `PROP_ID`, several devices can share it, and its `SMOKEVIEW_ID` is what
 * decides the shape the 3D preview draws for every device that names it
 * (ADR-0008).
 *
 * Which fields are shown follows the prop's own type, because the fields FDS
 * reads do: asking for an RTI on a smoke detector would be asking for something
 * that is never written.
 */
@Component({
    selector: 'app-prop',
    templateUrl: './prop.component.html',
    styleUrls: ['./prop.component.scss'],
    standalone: false
})
export class PropComponent implements OnInit, OnDestroy {

  // Global objects
  main: Main;
  fds: Fds;
  ui: UiState;
  lib: Library;

  // Component objects
  props: Prop[];
  libProps: Prop[];
  prop: Prop;
  objectType: string = 'current'; // Lib or current

  mainSub: Subscription;
  uiSub: Subscription;
  libSub: Subscription;

  // Scrollbars containers
  @ViewChild('propScrollbar', { static: false }) propScrollbar: NgScrollbar;
  @ViewChild('libPropScrollbar', { static: false }) libPropScrollbar: NgScrollbar;

  // Enums
  PROP = FdsEnums.PROP;
  /** The smoke-detector models live under DEVC, though they describe a &PROP. */
  DEVC = FdsEnums.DEVC;
  RAMPS: any[] = [];

  constructor(
    private mainService: MainService,
    public uiStateService: UiStateService,
    private libraryService: LibraryService,
    private snackBarService: SnackBarService
  ) { }

  ngOnInit() {
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);
    this.uiSub = this.uiStateService.uiObservable.subscribe(uiObservable => this.ui = uiObservable);
    this.libSub = this.libraryService.getLibrary().subscribe(lib => this.lib = lib);

    this.fds = this.main.currentFdsScenario.fdsObject;
    this.props = this.fds.output.props;
    this.libProps = this.lib.props;
    this.RAMPS = this.fds.ramps.ramps;

    this.props.length > 0
      ? this.activate(this.props[this.ui.output['prop'].elementIndex].id)
      : this.prop = undefined;
  }

  ngAfterViewInit() {
    // Set scrollbar position after the view is rendered
    setTimeout(() => {
      try { this.propScrollbar?.viewport?.scrollYTo(this.ui.output['prop'].scrollPosition); } catch { }
    });
  }

  ngOnDestroy() {
    this.mainSub.unsubscribe();
    this.uiSub.unsubscribe();
    this.libSub.unsubscribe();
  }

  /** Activate element on click */
  public activate(id: string, library?: boolean) {
    if (!library) {
      this.objectType = 'current';
      this.prop = find(this.props, (o: Prop) => o.id == id);
      this.ui.output['prop'].elementIndex = findIndex(this.props, { id: id });
    }
    else {
      this.objectType = 'library';
      this.prop = find(this.libProps, (o: Prop) => o.id == id);
      this.ui.output['libProp'].elementIndex = findIndex(this.libProps, { id: id });
    }
  }

  /** Push new element */
  public add(library?: boolean) {
    const target = library ? this.libProps : this.props;
    const element = { id: 'PROP' + this.mainService.getListId(target, 'prop') };

    target.push(new Prop(JSON.stringify(element), this.fds.ramps.ramps, this.fds.particle.parts));
    this.activate(element.id, library);
  }

  /**
   * Delete element.
   *
   * A device naming it is left pointing at nothing rather than silently
   * repointed: which prop it should use instead is the user's decision.
   */
  public delete(id: string, library?: boolean) {
    const target = library ? this.libProps : this.props;
    const index = findIndex(target, { id: id });

    if (!library) { this.warnAboutDevices(id); }

    target.splice(index, 1);
    if (target.length == 0) {
      this.prop = undefined;
      return;
    }
    this.activate(target[index != 0 ? index - 1 : index].id, library);
  }

  /** Say so when a device is left naming a prop that has just gone. */
  private warnAboutDevices(id: string): void {
    const naming = this.fds.output.devcs.filter(devc => devc.prop_id && devc.prop_id['id'] == id);
    if (naming.length === 0) { return; }

    this.snackBarService.notify(
      'warning', `${naming.length} device(s) still name ${id} - give them another prop`);
  }

  /** Update scroll position */
  public scrollbarUpdate(element: string) {
    set(this.ui.output, element + '.scrollPosition',
      (this[element + 'Scrollbar'] as NgScrollbar).viewport.scrollTop);
  }

  /** Toggle library */
  public toggleLibrary() {
    this.ui.output['prop'].lib == 'closed'
      ? this.ui.output['prop'].lib = 'opened'
      : this.ui.output['prop'].lib = 'closed';
  }

  /** Import from library */
  public importLibraryItem(id: string) {
    let idGeneratorService = new IdGeneratorService;
    let libProp = find(this.libProps, (o: Prop) => o.id == id);
    let prop = cloneDeep(libProp);
    prop.uuid = idGeneratorService.genUUID();
    this.props.push(prop);
  }

  /** Merge library item into the current one */
  public mergeLibraryItem(id: string) {
    let libProp = find(this.libProps, (o: Prop) => o.id == id);
    if (this.prop == undefined) {
      this.snackBarService.notify('warning', 'Select current prop before merging');
      return;
    }

    // Everything but the identity: merging is about the definition
    const id_ = this.prop.id, uuid = this.prop.uuid;
    Object.assign(this.prop, cloneDeep(libProp));
    this.prop.id = id_;
    this.prop.uuid = uuid;
  }

  // COMPONENT METHODS

  /** Whether this kind of prop activates on heat - a sprinkler or a heat detector. */
  public showThermal(): boolean {
    return this.prop.type == 'sprinkler' || this.prop.type == 'heat detector';
  }

  /** Whether this kind of prop puts water out - a sprinkler or a nozzle. */
  public showFlow(): boolean {
    return this.prop.type == 'sprinkler' || this.prop.type == 'nozzle';
  }

  /** Whether this kind of prop responds to smoke. */
  public showSmoke(): boolean {
    return this.prop.type == 'smoke detector';
  }

  /** Whether the Cleary model's four coefficients apply. */
  public showCleary(): boolean {
    return this.showSmoke() && this.prop.smoke_detector_model == 'cleary';
  }
}
