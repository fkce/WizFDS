import { TestBed } from '@angular/core/testing';

import { InputService } from './input.service';

describe('InputService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: InputService = TestBed.get(InputService);
    expect(service).toBeTruthy();
  });
});
