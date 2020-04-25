import { TestBed } from '@angular/core/testing';

import { SmokeviewApiService } from './smokeview-api.service';

describe('SmokeviewApiService', () => {
  let service: SmokeviewApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SmokeviewApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
