import { TestBed } from '@angular/core/testing';

import { CadService } from './cad.service';
import { appServiceProviders } from '../../../testing/app-service-testing';

describe('CadService', () => {
  let service: CadService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...appServiceProviders(), CadService]
    });
    service = TestBed.inject(CadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
