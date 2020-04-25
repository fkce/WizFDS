import { TestBed } from '@angular/core/testing';

import { MeshService } from './mesh.service';

describe('MeshService', () => {
  let service: MeshService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MeshService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
