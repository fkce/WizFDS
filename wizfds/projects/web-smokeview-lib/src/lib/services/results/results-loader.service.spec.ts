import { TestBed } from '@angular/core/testing';

import { ResultsLoaderService } from './results-loader.service';
import { QuantityGroup } from './quantity-groups';
import { ResultsDirectory } from './results-directory';
import { SliceService } from '../drawing/slice/slice.service';
import { BndfService } from '../drawing/bndf/bndf.service';
import { TimelineService } from '../timeline/timeline.service';
import { QuantityScaleService } from '../scale/quantity-scale.service';
import { SmvFile } from '../parsers/smv/smv-file';

// What this pins down is the routing and the opening of a case - the two things
// the hosts used to do for themselves. Loading needs a live WebGPU scene, so
// the readers are watched rather than driven.
describe('ResultsLoaderService', () => {

  let loader: ResultsLoaderService;
  let slices: SliceService;
  let boundaries: BndfService;

  const sliceGroup: QuantityGroup = {
    label: 'TEMPERATURE, K=1', unit: 'C',
    files: [{
      kind: 'slcf', meshIndex: 1, filename: 'demo_1.sf', longLabel: 'TEMPERATURE',
      shortLabel: 'temp', unit: 'C', cellCentered: false,
      bounds: { i1: 0, i2: 4, j1: 0, j2: 2, k1: 1, k2: 1 }, ior: 3
    }]
  };

  const boundaryGroup: QuantityGroup = {
    label: 'WALL TEMPERATURE', unit: 'C',
    files: [{
      kind: 'bndf', meshIndex: 1, filename: 'demo_1.bf', longLabel: 'WALL TEMPERATURE',
      shortLabel: 'temp', unit: 'C', cellCentered: false
    }]
  };

  const particleGroup: QuantityGroup = {
    label: 'demo_1.prt5', unit: '',
    files: [{
      kind: 'prt5', meshIndex: 1, filename: 'demo_1.prt5', longLabel: '',
      shortLabel: '', unit: '', cellCentered: false
    }]
  };

  /** The same group, written the one way neither reader can draw yet. */
  const cellCentered = (group: QuantityGroup): QuantityGroup => ({
    ...group, files: [{ ...group.files[0], cellCentered: true }]
  });

  /** Enough of a parsed `.smv` for setCase; nothing here reads the rest. */
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
    loader = TestBed.inject(ResultsLoaderService);
    slices = TestBed.inject(SliceService);
    boundaries = TestBed.inject(BndfService);
  });

  it('sends a slice group to the slice reader and nowhere else', () => {
    const toSlices = spyOn(slices, 'toggleGroup').and.resolveTo();
    const toBoundaries = spyOn(boundaries, 'toggleGroup').and.resolveTo();

    loader.toggle(sliceGroup);

    expect(toSlices).toHaveBeenCalledWith(sliceGroup);
    expect(toBoundaries).not.toHaveBeenCalled();
  });

  it('sends a boundary group to the boundary reader and nowhere else', () => {
    const toSlices = spyOn(slices, 'toggleGroup').and.resolveTo();
    const toBoundaries = spyOn(boundaries, 'toggleGroup').and.resolveTo();

    loader.toggle(boundaryGroup);

    expect(toBoundaries).toHaveBeenCalledWith(boundaryGroup);
    expect(toSlices).not.toHaveBeenCalled();
  });

  it('asks each reader about its own format', () => {
    spyOn(slices, 'canLoad').and.returnValue(true);
    spyOn(boundaries, 'canLoad').and.returnValue(true);

    expect(loader.canLoad(sliceGroup)).toBeTrue();
    expect(loader.canLoad(boundaryGroup)).toBeTrue();
  });

  it('says a format with no reader yet cannot be loaded, and clicking it does nothing', () => {
    expect(loader.canLoad(particleGroup)).toBeFalse();
    expect(loader.isLoaded(particleGroup)).toBeFalse();
    expect(loader.isLoading(particleGroup)).toBeFalse();
    expect(() => loader.toggle(particleGroup)).not.toThrow();
  });

  it('nothing is loadable before a case is set', () => {
    expect(loader.canLoad(sliceGroup)).toBeFalse();
    expect(loader.canLoad(boundaryGroup)).toBeFalse();
  });

  it('opens both formats once a case is set, and neither of them cell-centered', () => {
    loader.setCase(smv, directory);

    expect(loader.canLoad(sliceGroup)).toBeTrue();
    expect(loader.canLoad(boundaryGroup)).toBeTrue();
    expect(loader.canLoad(cellCentered(sliceGroup))).toBeFalse();
    expect(loader.canLoad(cellCentered(boundaryGroup))).toBeFalse();
  });

  it('hands a new case to every reader', () => {
    const toSlices = spyOn(slices, 'setCase');
    const toBoundaries = spyOn(boundaries, 'setCase');

    loader.setCase(smv, directory);

    expect(toSlices).toHaveBeenCalledWith(smv, directory);
    expect(toBoundaries).toHaveBeenCalledWith(smv, directory);
  });

  it('rewinds the timeline and drops the ranges once per case, not once per reader', () => {
    const timeline = spyOn(TestBed.inject(TimelineService), 'resetForNewCase');
    const scales = spyOn(TestBed.inject(QuantityScaleService), 'resetForNewCase');

    loader.setCase(smv, directory);

    expect(timeline).toHaveBeenCalledTimes(1);
    expect(scales).toHaveBeenCalledTimes(1);
  });
});
