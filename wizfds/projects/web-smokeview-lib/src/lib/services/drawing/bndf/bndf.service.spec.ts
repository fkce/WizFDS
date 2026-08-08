import { TestBed } from '@angular/core/testing';

import { BndfService } from './bndf.service';
import { QuantityGroup } from '../../results/quantity-groups';
import { TimelineService } from '../../timeline/timeline.service';
import { QuantityScaleService } from '../../scale/quantity-scale.service';
import { SmvFile } from '../../parsers/smv/smv-file';
import { ResultsDirectory } from '../../results/results-directory';

// The service needs a live WebGPU scene to actually load anything, so what
// these specs pin down is the state logic around it: what can be loaded when,
// what it contributes to the shared services, and what a scene reset leaves
// behind. The geometry and the range live in buildBoundary(), which is a pure
// function with a spec of its own.
describe('BndfService', () => {

  let service: BndfService;

  const group: QuantityGroup = {
    label: 'WALL TEMPERATURE', unit: 'C',
    files: [{
      kind: 'bndf', meshIndex: 1, filename: 'demo_1.bf', longLabel: 'WALL TEMPERATURE',
      shortLabel: 'temp', unit: 'C', cellCentered: false
    }]
  };

  const cellCentered: QuantityGroup = {
    label: 'WALL TEMPERATURE (cell)', unit: 'C',
    files: [{ ...group.files[0], cellCentered: true }]
  };


  /** Enough of a parsed `.smv` for setCase; nothing under test reads the rest. */
  const smv = {
    chid: 'demo', title: '',
    scene: {
      meshes: [], obsts: [], holes: [], opens: [], vents: [], fires: [],
      jetfans: [], devcs: [], geoms: [], inits: [], zones: []
    },
    grids: [], blockages: [], results: []
  } as SmvFile;

  const directory = {} as ResultsDirectory;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BndfService);
  });

  it('cannot load anything before a case is set', () => {
    expect(service.canLoad(group)).toBeFalse();
    expect(service.isLoaded(group)).toBeFalse();
  });

  it('opens a node-centered group once a case is set, and never a cell-centered one', () => {
    service.setCase(smv, directory);

    expect(service.canLoad(group)).toBeTrue();
    // BNDC waits for the shared cell-centered geometry, as SLCC does (#159).
    expect(service.canLoad(cellCentered)).toBeFalse();
  });

  it('spans nothing on the axis while nothing is loaded', () => {
    expect(service.timeSpan()).toBeNull();
  });

  it('holds no quantity while nothing is loaded', () => {
    expect(service.quantityExtents().size).toBe(0);
  });

  it('takes no offence at being asked for a time it has nothing for', () => {
    expect(() => service.showAt(42)).not.toThrow();
  });

  it('takes no offence at being clipped while it holds nothing', () => {
    expect(() => service.clip(2.5, 'x')).not.toThrow();
    expect(() => service.resetClipping()).not.toThrow();
  });

  it('hangs itself on the timeline, so a loaded group reaches the axis', () => {
    // Registration happens in the constructor - injecting is what does it.
    const timeline = TestBed.inject(TimelineService);
    expect(timeline.hasAxis).toBeFalse();

    spyOn(service, 'timeSpan').and.returnValue({ first: 0, last: 120 });

    expect(timeline.hasAxis).toBeTrue();
    expect(timeline.end).toBe(120);
  });

  it('hangs itself on the scale, so a boundary quantity reaches the legend', () => {
    const scales = TestBed.inject(QuantityScaleService);
    const quantity = { label: 'WALL TEMPERATURE', unit: 'C' };

    spyOn(service, 'quantityExtents').and.returnValue(
      new Map([['WALL TEMPERATURE|C', { quantity: quantity, min: 20, max: 300 }]]));
    scales.refresh();

    expect(scales.scaleFor('WALL TEMPERATURE|C')).toEqual(
      jasmine.objectContaining({ min: 20, max: 300 }));
  });

  it('resets to nothing with the scene', () => {
    service.resetSceneState();
    expect(service.timeSpan()).toBeNull();
    expect(service.canLoad(group)).toBeFalse();
  });
});
