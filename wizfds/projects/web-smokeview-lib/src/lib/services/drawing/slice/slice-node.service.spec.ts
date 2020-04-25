import { TestBed } from '@angular/core/testing';

import { SliceNodeService } from './slice-node.service';

describe('SliceNodeService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: SliceNodeService = TestBed.get(SliceNodeService);
    expect(service).toBeTruthy();
  });
});
