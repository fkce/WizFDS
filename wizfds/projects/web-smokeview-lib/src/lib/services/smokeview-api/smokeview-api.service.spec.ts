import { TestBed } from '@angular/core/testing';

import { SmokeviewApiService } from './smokeview-api.service';
import { FireService } from '../drawing/fire/fire.service';
import { VentService } from '../drawing/vent/vent.service';

describe('SmokeviewApiService', () => {
  let service: SmokeviewApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: FireService,
          useValue: { fires: [], renderFires: () => Promise.reject(new Error('render failed')) }
        },
        {
          provide: VentService,
          useValue: { basicVents: [], renderBasicVents: () => Promise.reject(new Error('render failed')) }
        }
      ]
    });
    service = TestBed.inject(SmokeviewApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('failing renders', () => {
    // The drawing services are async and a rejection used to escape the API
    // entirely - the caller got no promise to await, so a failed render
    // surfaced only as an unhandled rejection in the console.

    it('reports a failed fire render to the caller instead of dropping it', async () => {
      await expectAsync(service.renderFires([])).toBeResolved();
    });

    it('reports a failed vent render to the caller instead of dropping it', async () => {
      await expectAsync(service.renderVents([])).toBeResolved();
    });
  });
});
