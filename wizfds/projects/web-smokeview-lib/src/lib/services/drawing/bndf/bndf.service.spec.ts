import { TestBed } from '@angular/core/testing';

import { BndfService } from './bndf.service';

describe('BndfService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: BndfService = TestBed.get(BndfService);
    expect(service).toBeTruthy();
  });
});
