import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { AutoSaveService, FORM_EDIT_INTERVAL, SAVE_DELAY } from './auto-save.service';
import { FdsScenarioService } from '@services/fds-scenario/fds-scenario.service';
import { MainService } from '@services/main/main.service';
import { Main } from '@services/main/main';
import { FdsScenario } from '@services/fds-scenario/fds-scenario';
import { Project } from '@services/project/project';
import { saveStateOf } from '@services/main/save-state';
import { appServiceProviders } from '../../../testing/app-service-testing';

/** Stands in for the service that talks to the backend. */
class FakeFdsScenarioService {
  public saved: { projectId: number, scenarioId: number, syncType: string }[] = [];

  updateFdsScenario(projectId: number, scenarioId: number, syncType: string): void {
    this.saved.push({ projectId: projectId, scenarioId: scenarioId, syncType: syncType });
  }
}

/**
 * Auto-save, off the change-detection loop (#123, ADR-0009).
 *
 * It used to run `isEqual` over the whole `fdsObject` in `ngDoCheck` on the root
 * component - so every mouse move over the 3D canvas deep-compared the scenario,
 * because the canvas listeners are `@HostListener`s and each of them ticks
 * Angular. A drag gesture had no chance of fitting the frame budget.
 */
describe('AutoSaveService', () => {
  let service: AutoSaveService;
  let mainService: MainService;
  let main: Main;
  let scenarios: FakeFdsScenarioService;

  /** Open a scenario with one obst in it, as the app does on load. */
  function open(id: number = 1): FdsScenario {
    const scenario = new FdsScenario(JSON.stringify({
      id: id, projectId: 7, name: 'saved',
      fdsObject: {
        geometry: { obsts: [{ id: 'W1', uuid: 'w1', xb: { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 } }] }
      }
    }));
    main.currentProject = new Project(JSON.stringify({ id: 7, name: 'project' }));
    mainService.setCurrentFdsScenario(scenario);
    return scenario;
  }

  beforeEach(() => {
    scenarios = new FakeFdsScenarioService();

    TestBed.configureTestingModule({
      providers: [
        ...appServiceProviders(),
        { provide: FdsScenarioService, useValue: scenarios }
      ]
    });

    service = TestBed.inject(AutoSaveService);
    mainService = TestBed.inject(MainService);
    main = mainService.main;
  });

  afterEach(() => service.stop());

  describe('an applied command', () => {
    it('marks the scenario unsaved without comparing anything', () => {
      open();

      service.markDirty();

      expect(saveStateOf(main)).toBe('unsaved');
    });

    it('saves the scenario once the delay is up', fakeAsync(() => {
      open();

      service.markDirty();
      tick(SAVE_DELAY);

      expect(scenarios.saved).toEqual([{ projectId: 7, scenarioId: 1, syncType: 'all' }]);
    }));

    it('waits for the user to stop editing rather than saving each command', fakeAsync(() => {
      open();

      service.markDirty();
      tick(SAVE_DELAY / 2);
      service.markDirty();
      tick(SAVE_DELAY / 2);

      expect(scenarios.saved).toEqual([]);

      tick(SAVE_DELAY / 2);
      expect(scenarios.saved.length).toBe(1);
    }));

    it('does nothing while auto-save is switched off', fakeAsync(() => {
      open();
      main.autoSave.disable = true;

      service.markDirty();
      tick(SAVE_DELAY);

      expect(scenarios.saved).toEqual([]);
      expect(saveStateOf(main)).not.toBe('unsaved');
    }));

    it('does nothing when no scenario is open', fakeAsync(() => {
      service.markDirty();
      tick(SAVE_DELAY);

      expect(scenarios.saved).toEqual([]);
    }));

    it('does not walk the scenario to record what changed', fakeAsync(() => {
      // Neither comparing nor copying: both are a pass over the whole scenario,
      // and at ten thousand obsts that is the cost this exists to avoid. The
      // interval takes the snapshot in its own time.
      open();

      service.markDirty();

      expect(main.autoSave.fdsObjectDiffer).toBeNull();
      expect(saveStateOf(main)).toBe('unsaved');
    }));
  });

  describe('edits made in a form', () => {
    // They never reach markDirty(): a form binds `[(ngModel)]` straight to the
    // model, so there is no point at which such a change could be noticed. The
    // comparison stays, on an interval slow enough to cost nothing.

    it('are noticed within the interval', fakeAsync(() => {
      const scenario = open();
      service.start();
      tick(FORM_EDIT_INTERVAL);

      scenario.fdsObject.geometry.obsts[0].xb.x1 = 5;
      tick(FORM_EDIT_INTERVAL);

      expect(saveStateOf(main)).toBe('unsaved');
      tick(SAVE_DELAY);
      expect(scenarios.saved.length).toBe(1);
    }));

    it('leave the scenario alone while nothing is edited', fakeAsync(() => {
      open();
      service.start();

      tick(FORM_EDIT_INTERVAL * 3);

      expect(scenarios.saved).toEqual([]);
      expect(saveStateOf(main)).not.toBe('unsaved');
    }));

    it('do not save the scenario that was merely opened', fakeAsync(() => {
      // The first pass has nothing to compare against, and finding a difference
      // between "nothing" and a freshly loaded scenario is not an edit
      service.start();
      open();

      tick(FORM_EDIT_INTERVAL);
      tick(SAVE_DELAY);

      expect(scenarios.saved).toEqual([]);
    }));

    it('are no longer looked for once the app stops watching', fakeAsync(() => {
      const scenario = open();
      service.start();
      tick(FORM_EDIT_INTERVAL);

      service.stop();
      scenario.fdsObject.geometry.obsts[0].xb.x1 = 5;
      tick(FORM_EDIT_INTERVAL * 2);

      expect(saveStateOf(main)).not.toBe('unsaved');
    }));
  });

  it('does not carry a pending save into another scenario', fakeAsync(() => {
    open(1);
    service.markDirty();

    open(2);
    tick(SAVE_DELAY);

    expect(scenarios.saved).toEqual([]);
  }));
});
