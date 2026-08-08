import { TestBed } from '@angular/core/testing';

import { SliceService } from './slice.service';
import { QuantityGroup } from '../../results/quantity-groups';
import { TimelineService } from '../../timeline/timeline.service';

// The service needs a live WebGPU scene to actually load anything, so what
// these specs pin down is the state logic around it: what can be loaded when,
// what it contributes to the timeline, and what a scene reset leaves behind.
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
  });

  it('spans nothing on the axis while nothing is loaded', () => {
    expect(service.timeSpan()).toBeNull();
  });

  it('takes no offence at being asked for a time it has nothing for', () => {
    expect(() => service.showAt(42)).not.toThrow();
  });

  it('hangs itself on the timeline, so a loaded group reaches the axis', () => {
    // Registration happens in the constructor - injecting is what does it.
    const timeline = TestBed.inject(TimelineService);
    expect(timeline.hasAxis).toBeFalse();

    spyOn(service, 'timeSpan').and.returnValue({ first: 0, last: 300 });

    expect(timeline.hasAxis).toBeTrue();
    expect(timeline.end).toBe(300);
  });

  it('resets to nothing with the scene', () => {
    service.resetSceneState();
    expect(service.timeSpan()).toBeNull();
    expect(service.canLoad(group)).toBeFalse();
  });
});
