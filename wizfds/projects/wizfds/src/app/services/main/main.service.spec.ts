import { TestBed } from '@angular/core/testing';

import { MainService } from './main.service';
import { appServiceProviders } from '../../../testing/app-service-testing';

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
});
