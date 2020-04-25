import { TestBed, inject } from '@angular/core/testing';

import { JsonFdsService } from './json-fds.service';

describe('JsonFdsService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [JsonFdsService]
    });
  });

  it('should be created', inject([JsonFdsService], (service: JsonFdsService) => {
    expect(service).toBeTruthy();
  }));
});
