import { TestBed } from '@angular/core/testing';

import { ViewCubeService } from './view-cube.service';

describe('ViewCubeService', () => {
  let service: ViewCubeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ViewCubeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
