import { TestBed } from '@angular/core/testing';

import { ObstService } from './obst.service';

describe('ObstService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ObstService = TestBed.get(ObstService);
    expect(service).toBeTruthy();
  });
});
