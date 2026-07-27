import { TestBed } from '@angular/core/testing';

import { WebsocketService } from './websocket.service';
import { appServiceProviders } from '../../../testing/app-service-testing';

describe('WebsocketService', () => {
  let service: WebsocketService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...appServiceProviders(), WebsocketService]
    });
    service = TestBed.inject(WebsocketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
