import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { GeometryLoaderService } from './geometry-loader.service';

describe('GeometryLoaderService', () => {
  let service: GeometryLoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(GeometryLoaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
