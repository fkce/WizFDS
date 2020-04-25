import { TestBed } from '@angular/core/testing';

import { BabylonService } from './babylon.service';

describe('BabylonService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: BabylonService = TestBed.get(BabylonService);
    expect(service).toBeTruthy();
  });
});
