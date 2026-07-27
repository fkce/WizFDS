import { TestBed } from '@angular/core/testing';

import { HttpManagerService } from './http-manager.service';
import { appServiceProviders } from '../../../testing/app-service-testing';

describe('HttpManagerService', () => {
  let service: HttpManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...appServiceProviders(), HttpManagerService]
    });
    service = TestBed.inject(HttpManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
