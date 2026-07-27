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

  it('tolerates the visibility button being clicked before anything is rendered', () => {
    // The control is live from the first frame, while the shader material is
    // still being fetched - FireService already guards this way.
    expect(() => service.toogleVisibility()).not.toThrow();
  });
});
