import { TestBed } from '@angular/core/testing';

import { SliceCellService } from './slice-cell.service';

describe('SliceCellService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: SliceCellService = TestBed.inject(SliceCellService);
    expect(service).toBeTruthy();
  });
});
