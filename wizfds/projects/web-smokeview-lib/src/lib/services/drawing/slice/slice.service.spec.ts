import { TestBed } from '@angular/core/testing';

import { SliceService } from './slice.service';
import { QuantityGroup } from '../../results/quantity-groups';

// The service needs a live WebGPU scene to actually load anything, so what
// these specs pin down is the state logic around it: what can be loaded when,
// and what a scene reset leaves behind.
describe('SliceService', () => {

  let service: SliceService;

  const group: QuantityGroup = {
    label: 'TEMPERATURE, J=1', unit: 'C',
    files: [{
      kind: 'slcf', meshIndex: 1, filename: 'demo_1.sf', longLabel: 'TEMPERATURE',
      shortLabel: 'temp', unit: 'C', cellCentered: false,
      bounds: { i1: 0, i2: 4, j1: 1, j2: 1, k1: 0, k2: 2 }, ior: 2
    }]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SliceService);
  });

  it('cannot load anything before a case is set', () => {
    expect(service.canLoad(group)).toBeFalse();
    expect(service.isLoaded(group)).toBeFalse();
    expect(service.frameCount).toBe(0);
  });

  it('remembers the frame it was asked for', () => {
    service.setFrame(7);
    expect(service.frame).toBe(7);
  });

  it('resets to nothing with the scene', () => {
    service.setFrame(7);
    service.resetSceneState();
    expect(service.frame).toBe(0);
    expect(service.frameCount).toBe(0);
    expect(service.canLoad(group)).toBeFalse();
  });
});
