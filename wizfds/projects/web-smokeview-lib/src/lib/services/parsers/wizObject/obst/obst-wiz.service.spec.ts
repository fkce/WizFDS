import { TestBed } from '@angular/core/testing';

import { ObstWizService } from './obst-wiz.service';

describe('ObstWizService', () => {
  let service: ObstWizService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ObstWizService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
