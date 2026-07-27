import { TestBed } from '@angular/core/testing';

import { UiStateService } from './ui-state.service';
import { appServiceProviders } from '../../../testing/app-service-testing';

describe('UiStateService', () => {
  let service: UiStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...appServiceProviders(), UiStateService]
    });
    service = TestBed.inject(UiStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
