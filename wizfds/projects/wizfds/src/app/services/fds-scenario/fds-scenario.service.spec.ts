import { TestBed } from '@angular/core/testing';

import { FdsScenarioService } from './fds-scenario.service';
import { appServiceProviders } from '../../../testing/app-service-testing';

describe('FdsScenarioService', () => {
  let service: FdsScenarioService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...appServiceProviders(), FdsScenarioService]
    });
    service = TestBed.inject(FdsScenarioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
