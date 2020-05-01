import { TestBed } from '@angular/core/testing';

import { HttpManagerService } from './http-manager.service';

describe('HttpManagerService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: HttpManagerService = TestBed.get(HttpManagerService);
    expect(service).toBeTruthy();
  });
});
