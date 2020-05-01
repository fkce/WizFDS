import { TestBed } from '@angular/core/testing';

import { OpenService } from './open.service';

describe('OpenService', () => {
  let service: OpenService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OpenService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
