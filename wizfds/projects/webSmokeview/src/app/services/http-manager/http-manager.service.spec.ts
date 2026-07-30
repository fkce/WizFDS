import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { HttpManagerService } from './http-manager.service';

describe('HttpManagerService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [HttpClientTestingModule]
  }));

  it('should be created', () => {
    const service: HttpManagerService = TestBed.inject(HttpManagerService);
    expect(service).toBeTruthy();
  });
});
