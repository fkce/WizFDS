import { TestBed } from '@angular/core/testing';

import { SliceService } from './slice.service';

describe('SliceService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: SliceService = TestBed.inject(SliceService);
    expect(service).toBeTruthy();
  });
});
