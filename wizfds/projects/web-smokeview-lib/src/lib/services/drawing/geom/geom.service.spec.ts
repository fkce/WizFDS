import { TestBed } from '@angular/core/testing';

import { GeomService } from './geom.service';

describe('GeomService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: GeomService = TestBed.get(GeomService);
    expect(service).toBeTruthy();
  });
});
