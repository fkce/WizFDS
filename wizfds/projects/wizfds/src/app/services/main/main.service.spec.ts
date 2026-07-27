import { TestBed } from '@angular/core/testing';

import { MainService } from './main.service';
import { FdsScenario } from '@services/fds-scenario/fds-scenario';
import { appServiceProviders } from '../../../testing/app-service-testing';

function makeScenario(id: number, name: string): FdsScenario {
  return new FdsScenario(JSON.stringify({ id: id, projectId: 1, name: name }));
}

describe('MainService', () => {
  let service: MainService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...appServiceProviders(), MainService]
    });
    service = TestBed.inject(MainService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('currentFdsScenario$', () => {
    it('replays the current scenario to a late subscriber', () => {
      // The preview subscribes when the user opens its tab, long after the
      // scenario loaded - it still has to be told what is current.
      service.setCurrentFdsScenario(makeScenario(7, 'tunnel'));

      let seen: FdsScenario | undefined;
      service.currentFdsScenario$.subscribe(scenario => seen = scenario);

      expect(seen?.id).toBe(7);
    });

    it('emits when the scenario is replaced', () => {
      const seen: (number | undefined)[] = [];
      service.currentFdsScenario$.subscribe(scenario => seen.push(scenario?.id));

      service.setCurrentFdsScenario(makeScenario(1, 'first'));
      service.setCurrentFdsScenario(makeScenario(2, 'second'));

      expect(seen).toEqual([undefined, 1, 2]);
    });

    it('stays silent when the same scenario is re-assigned', () => {
      // Auto-saving a scenario name re-assigns the field with the same scenario
      // (FdsScenarioService.updateFdsScenario, syncType 'head'). Without the
      // distinct check the 3D preview would redraw the whole scene on every save.
      service.setCurrentFdsScenario(makeScenario(3, 'garage'));

      const seen: (number | undefined)[] = [];
      service.currentFdsScenario$.subscribe(scenario => seen.push(scenario?.id));

      service.setCurrentFdsScenario(makeScenario(3, 'garage renamed'));

      expect(seen).toEqual([3]);
    });

    it('emits when the scenario is cleared', () => {
      service.setCurrentFdsScenario(makeScenario(4, 'atrium'));

      const seen: (number | undefined)[] = [];
      service.currentFdsScenario$.subscribe(scenario => seen.push(scenario?.id));

      service.setCurrentFdsScenario(undefined);

      expect(seen).toEqual([4, undefined]);
    });

    it('keeps main.currentFdsScenario in step with the stream', () => {
      const scenario = makeScenario(5, 'warehouse');

      service.setCurrentFdsScenario(scenario);

      expect(service.main.currentFdsScenario).toBe(scenario);
    });
  });
});
