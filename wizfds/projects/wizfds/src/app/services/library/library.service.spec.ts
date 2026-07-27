import { TestBed } from '@angular/core/testing';

import { LibraryService } from './library.service';
import { appServiceProviders } from '../../../testing/app-service-testing';

describe('LibraryService', () => {
  let service: LibraryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...appServiceProviders(), LibraryService]
    });
    service = TestBed.inject(LibraryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
