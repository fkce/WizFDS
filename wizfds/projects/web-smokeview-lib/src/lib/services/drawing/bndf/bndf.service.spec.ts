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

  describe('one boundary quantity at a time', () => {
    // Reaching a loaded state needs a live WebGPU scene, so what is showing is
    // put there directly and the group is handed a directory that has nothing.
    // The assertions stay on the public surface: what is loaded afterwards, and
    // whether what was showing had its scene objects released.

    /** Something that looks enough like a loaded group to be taken down. */
    function showing() {
      const disposed = { surfaces: 0, material: 0, palette: 0 };
      const held = {
        material: { dispose: () => disposed.material++ },
        paletteTexture: { dispose: () => disposed.palette++ },
        paletteName: 'default',
        surfaces: [{ dispose: () => disposed.surfaces++ }],
        quantity: { label: 'GAUGE HEAT FLUX', unit: 'kW/m2' },
        key: 'GAUGE HEAT FLUX|kW/m2',
        span: { first: 0, last: 30 },
        extent: { min: 0, max: 66 }
      };
      return { held: held, disposed: disposed };
    }

    /** A previous quantity of the same case, already on the faces. */
    const previous: QuantityGroup = {
      label: 'GAUGE HEAT FLUX', unit: 'kW/m2',
      files: [{ ...group.files[0], longLabel: 'GAUGE HEAT FLUX', unit: 'kW/m2' }]
    };

    beforeEach(() => {
      // A directory that holds nothing: the load gets as far as the rule under
      // test and then finds no bytes, which is all this needs.
      service.setCase(smv, { open: () => Promise.resolve(null) } as any);
    });

    it('takes the showing quantity down when another is asked for', async () => {
      const first = showing();
      (service as any).loaded.set(previous, first.held);
      expect(service.isLoaded(previous)).toBeTrue();

      await service.toggleGroup(group);

      expect(service.isLoaded(previous)).toBeFalse();
      expect(first.disposed).toEqual({ surfaces: 1, material: 1, palette: 1 });
    });

    it('leaves the axis and the scale with nothing once it has been taken down', async () => {
      (service as any).loaded.set(previous, showing().held);

      await service.toggleGroup(group);

      expect(service.timeSpan()).toBeNull();
      expect(service.quantityExtents().size).toBe(0);
    });

    it('drops a read that was still running when the case changed', async () => {
      // The read is slow and the user opens another case meanwhile. Its bytes
      // belong to the previous simulation: landing them here would put a
      // surface from the old run on the new scene, hand the axis a dead run's
      // span, and key it to a group no catalog row holds - so nothing could
      // click it off again.
      const late = showing();
      let deliver: (built: unknown) => void;
      spyOn(service as any, 'build').and.returnValue(
        new Promise(resolve => { deliver = resolve; }));

      const reading = service.toggleGroup(group);
      service.setCase(smv, { open: () => Promise.resolve(null) } as any);
      deliver(late.held);
      await reading;

      expect(service.isLoaded(group)).toBeFalse();
      expect(service.timeSpan()).toBeNull();
      expect(late.disposed).toEqual({ surfaces: 1, material: 1, palette: 1 });
    });

    it('drops a read that was still running when the scene went away', async () => {
      const late = showing();
      let deliver: (built: unknown) => void;
      spyOn(service as any, 'build').and.returnValue(
        new Promise(resolve => { deliver = resolve; }));

      const reading = service.toggleGroup(group);
      service.resetSceneState();
      deliver(late.held);
      await reading;

      expect(service.isLoaded(group)).toBeFalse();
    });

    it('never reads the same group twice at once', async () => {
      // A superseded read is still running and still holding its bytes, so the
      // group stays marked - otherwise a third click starts a second read of
      // the same file beside the first, which on a large `.bf` is the whole
      // file in memory twice.
      const build = spyOn(service as any, 'build').and.returnValue(new Promise(() => undefined));

      void service.toggleGroup(group);
      void service.toggleGroup(previous);
      void service.toggleGroup(group);

      expect(service.isLoading(group)).toBeTrue();
      expect(build).toHaveBeenCalledTimes(2);
    });

    it('still puts a quantity away when it is the one clicked', async () => {
      const first = showing();
      (service as any).loaded.set(previous, first.held);

      await service.toggleGroup(previous);

      expect(service.isLoaded(previous)).toBeFalse();
      expect(first.disposed.material).toBe(1);
    });
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
