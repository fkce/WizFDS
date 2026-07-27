import { TestBed } from '@angular/core/testing';

import { JsonFdsService } from './json-fds.service';
import { appServiceProviders } from '../../../testing/app-service-testing';

describe('JsonFdsService', () => {
  let service: JsonFdsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...appServiceProviders(), JsonFdsService]
    });
    service = TestBed.inject(JsonFdsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
