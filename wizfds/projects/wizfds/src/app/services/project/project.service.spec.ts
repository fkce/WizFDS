import { TestBed } from '@angular/core/testing';

import { ProjectService } from './project.service';
import { appServiceProviders } from '../../../testing/app-service-testing';

describe('ProjectService', () => {
  let service: ProjectService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...appServiceProviders(), ProjectService]
    });
    service = TestBed.inject(ProjectService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
