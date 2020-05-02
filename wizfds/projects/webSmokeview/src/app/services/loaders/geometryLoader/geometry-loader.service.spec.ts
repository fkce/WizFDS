import { TestBed } from '@angular/core/testing';

import { GeometryLoaderService } from './geometry-loader.service';

describe('GeometryLoaderService', () => {
  let service: GeometryLoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeometryLoaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
