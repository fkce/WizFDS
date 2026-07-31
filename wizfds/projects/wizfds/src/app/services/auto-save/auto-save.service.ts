import { Injectable } from '@angular/core';
import { cloneDeep, isEqual } from 'lodash';

import { FdsScenarioService } from '@services/fds-scenario/fds-scenario.service';
import { MainService } from '@services/main/main.service';
import { Main } from '@services/main/main';

/**
 * How long the app waits after the last edit before writing the scenario away.
 *
 * Long enough that a user working steadily is not saved on every keystroke, and
 * the timer is restarted by each edit - so what is saved is a pause, not a
 * change.
 */
export const SAVE_DELAY = 20000;

/**
 * How often the scenario is compared with its last known state, for edits made
 * in a form.
 *
 * Two seconds against the change-detection cycle this replaces. It is ample for
 * a mechanism that then waits twenty: the only thing it costs is that the
 * "unsaved changes" indicator can lag a form edit by up to this long.
 */
export const FORM_EDIT_INTERVAL = 2000;

/**
 * Saving the scenario, on its own clock.
 *
 * This used to live in `ngDoCheck` on the root component, where it ran `isEqual`
 * over the whole `fdsObject` on **every change-detection pass**. The render loop
 * runs outside Angular's zone, but the canvas's pointer handlers are
 * `@HostListener`s, so every mouse move over the 3D view ticked Angular and deep-
 * compared the scenario with it - a cost already paid today by hovering, and one
 * a drag gesture could never fit into a frame (ADR-0009).
 *
 * There are two ways in, because there are two kinds of edit:
 *
 * - an **applied command** says so outright through `markDirty()`. Nothing is
 *   compared: the app applied the command itself and knows what it did.
 * - an **edit in a form** has no such moment - `[(ngModel)]` writes straight to
 *   the model - so it is still found by comparison, on an interval rather than
 *   on every tick.
 */
@Injectable({
  providedIn: 'root'
})
export class AutoSaveService {

  private main: Main;

  /** The interval that looks for form edits, while the app is watching. */
  private watch: any = null;

  constructor(
    mainService: MainService,
    private fdsScenarioService: FdsScenarioService
  ) {
    mainService.getMain().subscribe(main => this.main = main);

    // A save pending against the previous scenario would write it under the new
    // one's id; the snapshot the interval compares against belongs to it too.
    mainService.currentFdsScenario$.subscribe(() => this.forgetPendingSave());
  }

  /** Start looking for edits made in the forms. */
  public start(): void {
    if (this.watch !== null) { return; }
    this.watch = setInterval(() => this.checkForFormEdits(), FORM_EDIT_INTERVAL);
  }

  /** Stop looking - the app is going away. */
  public stop(): void {
    if (this.watch === null) { return; }
    clearInterval(this.watch);
    this.watch = null;
  }

  /**
   * The scenario has changed, and the caller knows it.
   *
   * What an applied edit command calls. Neither a comparison nor a snapshot:
   * both are a pass over the whole scenario, which at ten thousand obsts is the
   * very cost this was built to get off the editing path. The interval takes the
   * snapshot in its own time - it will find this change, see the save is already
   * scheduled, and restart the same timer.
   */
  public markDirty(): void {
    const scenario = this.main?.currentFdsScenario;
    if (!scenario || this.main.autoSave.disable) { return; }

    this.scheduleSave();
  }

  /**
   * Compare the scenario with what it last looked like, and save if it moved.
   *
   * The first pass over a scenario only takes the snapshot: everything differs
   * from nothing, and a scenario that has just been loaded has not been edited.
   */
  private checkForFormEdits(): void {
    const scenario = this.main?.currentFdsScenario;
    if (!scenario || this.main.autoSave.disable) { return; }

    if (isEqual(this.main.autoSave.fdsObjectDiffer, scenario.fdsObject)) { return; }

    const known = this.main.autoSave.fdsObjectDiffer !== null
      && this.main.autoSave.timeoutScenarioId === scenario.id;

    this.rememberScenario();
    if (known) { this.scheduleSave(); }
  }

  /** Take a copy of the scenario, to compare the next pass against. */
  private rememberScenario(): void {
    const scenario = this.main.currentFdsScenario;
    this.main.autoSave.timeoutScenarioId = scenario.id;
    this.main.autoSave.fdsObjectDiffer = cloneDeep(scenario.fdsObject);
  }

  /**
   * Save once the user has stopped for `SAVE_DELAY`.
   *
   * Each edit restarts the timer, so a session of steady work writes once at the
   * end of it rather than on every change.
   */
  private scheduleSave(): void {
    const scenario = this.main.currentFdsScenario;
    const project = this.main.currentProject;
    if (!project) { return; }

    clearTimeout(this.main.autoSave.fdsObjectTimeout);
    this.main.autoSave.fdsObjectSaveFont = 'red';

    this.main.autoSave.fdsObjectTimeout = setTimeout(() => {
      this.fdsScenarioService.updateFdsScenario(project.id, scenario.id, 'all', true);
    }, SAVE_DELAY);
  }

  /** Drop a save that was waiting - it belongs to a scenario no longer open. */
  private forgetPendingSave(): void {
    if (!this.main) { return; }

    clearTimeout(this.main.autoSave.fdsObjectTimeout);
    this.main.autoSave.fdsObjectTimeout = null;
    this.main.autoSave.fdsObjectDiffer = null;
    this.main.autoSave.timeoutScenarioId = 0;
    this.main.autoSave.fdsObjectSaveFont = '';
  }
}
