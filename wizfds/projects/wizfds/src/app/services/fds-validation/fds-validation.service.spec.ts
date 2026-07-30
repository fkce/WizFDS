import { TestBed } from '@angular/core/testing';

import { FdsValidationService } from './fds-validation.service';
import { MainService } from '@services/main/main.service';
import { FdsScenario } from '@services/fds-scenario/fds-scenario';
import { appServiceProviders } from '../../../testing/app-service-testing';

/** A scenario built around one 10 x 10 x 3 m mesh on a 0.25 m grid. */
function scenario(elements: any = {}, id: number = 1): FdsScenario {
  return new FdsScenario(JSON.stringify({
    id: id, projectId: 1, name: 'validated',
    fdsObject: {
      geometry: {
        meshes: [{
          id: 'MESH1', uuid: 'mesh-uuid',
          xb: { x1: 0, x2: 10, y1: 0, y2: 10, z1: 0, z2: 3 },
          isize: 0.25, jsize: 0.25, ksize: 0.25
        }],
        ...elements
      }
    }
  }));
}

/**
 * What is wrong with the scenario, for the palette and the status bar (#123).
 *
 * Nothing here refuses an edit - the command has already been applied by the
 * time this runs. It says what FDS will make of the result (ADR-0009).
 */
describe('FdsValidationService', () => {
  let service: FdsValidationService;
  let mainService: MainService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...appServiceProviders()] });
    service = TestBed.inject(FdsValidationService);
    mainService = TestBed.inject(MainService);
  });

  it('has nothing to report with no scenario open', () => {
    expect(service.count).toBe(0);
    expect(service.warningsFor('anything')).toEqual([]);
  });

  it('counts what is wrong across the whole scenario', () => {
    mainService.setCurrentFdsScenario(scenario({
      obsts: [
        { id: 'OK', uuid: 'ok', xb: { x1: 1, x2: 2, y1: 1, y2: 2, z1: 0, z2: 3 } },
        { id: 'OFF', uuid: 'off', xb: { x1: 1.13, x2: 2, y1: 1, y2: 2, z1: 0, z2: 3 } },
        { id: 'AWAY', uuid: 'away', xb: { x1: 40, x2: 41, y1: 1, y2: 2, z1: 0, z2: 3 } }
      ]
    }));

    service.revalidate();

    expect(service.count).toBe(2);
  });

  it('says what is wrong with one element, for the palette', () => {
    mainService.setCurrentFdsScenario(scenario({
      obsts: [{ id: 'OFF', uuid: 'off', xb: { x1: 1.13, x2: 2, y1: 1, y2: 2, z1: 0, z2: 3 } }]
    }));

    service.revalidate();

    expect(service.warningsFor('off').map(w => w.rule)).toEqual(['off-grid']);
  });

  it('has nothing to say about an element that breaks no rule', () => {
    mainService.setCurrentFdsScenario(scenario({
      obsts: [{ id: 'OK', uuid: 'ok', xb: { x1: 1, x2: 2, y1: 1, y2: 2, z1: 0, z2: 3 } }]
    }));

    service.revalidate();

    expect(service.warningsFor('ok')).toEqual([]);
  });

  it('checks a &MESH as well, so a flat one is reported', () => {
    mainService.setCurrentFdsScenario(new FdsScenario(JSON.stringify({
      id: 1, projectId: 1, name: 'flat mesh',
      fdsObject: {
        geometry: {
          meshes: [{
            id: 'FLAT', uuid: 'flat',
            xb: { x1: 0, x2: 10, y1: 0, y2: 10, z1: 2, z2: 2 }
          }]
        }
      }
    })));

    service.revalidate();

    expect(service.warningsFor('flat').map(w => w.rule)).toEqual(['zero-thickness']);
  });

  it('reads the fresh state of the scenario each time it is asked', () => {
    // The command has already been applied when this runs, and the element it
    // moved is the same object - so a cached box would report the old position
    const open = scenario({
      obsts: [{ id: 'OK', uuid: 'ok', xb: { x1: 1, x2: 2, y1: 1, y2: 2, z1: 0, z2: 3 } }]
    });
    mainService.setCurrentFdsScenario(open);
    service.revalidate();

    open.fdsObject.geometry.obsts[0].xb.x1 = 1.13;
    service.revalidate();

    expect(service.warningsFor('ok').map(w => w.rule)).toEqual(['off-grid']);
  });

  it('says when the warnings change, so the status bar can follow', () => {
    let announced = 0;
    service.changed$.subscribe(() => announced++);

    mainService.setCurrentFdsScenario(scenario({
      obsts: [{ id: 'OFF', uuid: 'off', xb: { x1: 1.13, x2: 2, y1: 1, y2: 2, z1: 0, z2: 3 } }]
    }));
    service.revalidate();

    expect(announced).toBeGreaterThan(0);
  });

  it('forgets the previous scenario when another is opened', () => {
    mainService.setCurrentFdsScenario(scenario({
      obsts: [{ id: 'OFF', uuid: 'off', xb: { x1: 1.13, x2: 2, y1: 1, y2: 2, z1: 0, z2: 3 } }]
    }));
    service.revalidate();

    mainService.setCurrentFdsScenario(scenario({}, 2));

    expect(service.count).toBe(0);
    expect(service.warningsFor('off')).toEqual([]);
  });

  it('checks a fire through the &VENT that carries its geometry', () => {
    // A fire has no box of its own - the vent under it does, which is also what
    // SceneInputService draws it from
    mainService.setCurrentFdsScenario(new FdsScenario(JSON.stringify({
      id: 1, projectId: 1, name: 'fire',
      fdsObject: {
        geometry: {
          meshes: [{
            id: 'MESH1', uuid: 'mesh-uuid',
            xb: { x1: 0, x2: 10, y1: 0, y2: 10, z1: 0, z2: 3 },
            isize: 0.25, jsize: 0.25, ksize: 0.25
          }]
        },
        fires: {
          fires: [{
            id: 'F1', uuid: 'fire-uuid',
            vent: { xb: { x1: 1, x2: 2, y1: 1, y2: 2, z1: 1.5, z2: 1.5 } }
          }]
        }
      }
    })));

    service.revalidate();

    expect(service.warningsFor('fire-uuid').map(w => w.rule)).toEqual(['vent-in-mid-air']);
  });
});
