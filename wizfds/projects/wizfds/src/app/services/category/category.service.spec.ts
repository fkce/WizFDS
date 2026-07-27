import { TestBed } from '@angular/core/testing';

import { CategoryService } from './category.service';
import { appServiceProviders } from '../../../testing/app-service-testing';

describe('CategoryService', () => {
  let service: CategoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...appServiceProviders(), CategoryService]
    });
    service = TestBed.inject(CategoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
