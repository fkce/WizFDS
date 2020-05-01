import { TestBed } from '@angular/core/testing';

import { ObstFdsService } from './obst-fds.service';

describe('ObstFdsService', () => {
  let service: ObstFdsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ObstFdsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
