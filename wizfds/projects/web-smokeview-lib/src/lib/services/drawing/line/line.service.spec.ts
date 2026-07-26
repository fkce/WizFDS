import { TestBed } from '@angular/core/testing';

import { LineService } from './line.service';

describe('LineService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: LineService = TestBed.inject(LineService);
    expect(service).toBeTruthy();
  });
});
