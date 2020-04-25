import { TestBed } from '@angular/core/testing';

import { FdsObjectService } from './fds-object.service';

describe('FdsObjectService', () => {
  let service: FdsObjectService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FdsObjectService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
