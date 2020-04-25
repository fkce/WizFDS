import { TestBed } from '@angular/core/testing';

import { SliceCellService } from './slice-cell.service';

describe('SliceCellService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: SliceCellService = TestBed.get(SliceCellService);
    expect(service).toBeTruthy();
  });
});
