import { TestBed } from '@angular/core/testing';

import { SliceGeomService } from './slice-geom.service';

describe('SliceGeomService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: SliceGeomService = TestBed.inject(SliceGeomService);
    expect(service).toBeTruthy();
  });
});
