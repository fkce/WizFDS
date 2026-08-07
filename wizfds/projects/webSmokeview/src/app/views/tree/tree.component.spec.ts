import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { SmokeviewApiService } from 'projects/web-smokeview-lib/src/lib/services/smokeview-api/smokeview-api.service';
import { SceneInput } from 'projects/web-smokeview-lib/src/lib/services/drawing/scene-input';
import { smvFixture } from 'projects/web-smokeview-lib/src/lib/services/parsers/smv/smv.fixture';

import { TreeComponent } from './tree.component';
import { TreeService, SimulationNode } from '../../services/tree/tree.service';
import { ConfigService } from '../../services/config/config.service';

/** A file the user clicked in the tree, addressed from the simulations root. */
function node(path: string): SimulationNode {
  const name = path.split('/').pop();
  return { name: name, type: 'file', extension: '.smv', path: path };
}

describe('TreeComponent', () => {
  let component: TreeComponent;
  let fixture: ComponentFixture<TreeComponent>;
  /** Every scene the component handed the library, in order. */
  let rendered: SceneInput[];

  /**
   * A server that honours ranges over a case directory, which is the whole of
   * what the component needs from `/api/results/...`: the probe reports the
   * size, the read hands back the bytes asked for.
   *
   * The `.smv` gets the bytes it was given; every other file is as long as
   * `resultSizes` says, and as missing as its absence from it - which is the
   * ordinary state of affairs after an interrupted run.
   */
  function serve(smv: Uint8Array, resultSizes: Record<string, number> = {}): jasmine.Spy {
    return spyOn(window, 'fetch').and.callFake((input: RequestInfo | URL, init: RequestInit) => {
      const name = decodeURIComponent(String(input).split('/').pop());
      const bytes = name.endsWith('.smv')
        ? smv
        : (name in resultSizes ? new Uint8Array(resultSizes[name]) : null);
      if (bytes === null) { return Promise.resolve(new Response(null, { status: 404 })); }

      return Promise.resolve(rangeResponse(bytes, init));
    });
  }

  /** The 206 a range request earns: exactly the bytes asked for, and the total. */
  function rangeResponse(bytes: Uint8Array, init: RequestInit): Response {
    const range = (init.headers as Record<string, string>).Range;
    const [start, end] = range.replace('bytes=', '').split('-').map(Number);
    return new Response(bytes.slice(start, end + 1), {
      status: 206,
      headers: { 'Content-Range': `bytes ${start}-${end}/${bytes.length}` }
    });
  }

  /**
   * Turns the event loop until `done` holds. Reading a response body takes
   * more than one turn of it, so waiting a fixed number of ticks would be
   * guesswork; waiting on the condition is not.
   */
  async function until(done: () => boolean): Promise<void> {
    for (let turn = 0; turn < 100 && !done(); turn++) {
      await new Promise(resolve => setTimeout(resolve));
    }
  }

  beforeEach(waitForAsync(() => {
    rendered = [];
    ConfigService.settings = { name: 'test', host: 'http://localhost:4000' };

    TestBed.configureTestingModule({
      declarations: [TreeComponent],
      providers: [
        {
          provide: SmokeviewApiService,
          useValue: {
            render: (scene: SceneInput) => { rendered.push(scene); return Promise.resolve(); }
          }
        },
        { provide: TreeService, useValue: { getTreeStructure: () => Promise.resolve({}) } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('loading a simulation', () => {
    // #115: the backend serves the raw `.smv`; the component parses it in the
    // library and draws through the same render(scene) call as the app does,
    // so nothing reaches the drawing services raw - and in metres (ADR-0002).
    // #148: those bytes now arrive through the byte-range route every result
    // file will use.

    it('reads the .smv through byte ranges and draws it through the scene contract', async () => {
      const bytes = new TextEncoder().encode(smvFixture());
      const fetchSpy = serve(bytes);

      await component.loadSmv(node('sim/case/case.smv'));

      expect(rendered.length).toBe(1);
      expect(rendered[0].obsts.length).toBe(2);
      expect(rendered[0].meshes.length).toBe(1);
      // The metres the retired JSON export could not carry
      expect(rendered[0].meshes[0].xb.x2).toBe(2);

      // the case directory, not the file, is what the results directory is
      // rooted at - every result file the .smv names hangs off it
      const [url, init] = fetchSpy.calls.first().args;
      expect(String(url)).toBe('http://localhost:4000/api/results/sim/case/case.smv');
      expect((init.headers as Record<string, string>).Range).toBe('bytes=0-0');

      // the probe, then the whole file - the requests after those belong to the
      // availability probes of the catalog
      const master = fetchSpy.calls.allArgs().filter(([target]) => String(target).endsWith('case.smv'));
      expect(master.length).toBe(2);
      expect((master[1][1].headers as Record<string, string>).Range)
        .toBe(`bytes=0-${bytes.length - 1}`);
    });

    it('keeps the catalog and the directory of the case it drew', async () => {
      serve(new TextEncoder().encode(smvFixture()));

      await component.loadSmv(node('sim/case/case.smv'));

      // what Phase 3 turns into the results catalog
      expect(component.results.length).toBeGreaterThan(0);
      expect(component.resultsDirectory).not.toBeNull();
    });

    it('addresses a case sitting in the simulations root without a directory part', async () => {
      const fetchSpy = serve(new TextEncoder().encode(smvFixture()));

      await component.loadSmv(node('case.smv'));

      expect(String(fetchSpy.calls.first().args[0]))
        .toBe('http://localhost:4000/api/results/case.smv');
    });

    it('draws nothing when the server no longer has the file', async () => {
      spyOn(window, 'fetch').and.returnValue(Promise.resolve(new Response(null, { status: 404 })));

      await component.loadSmv(node('sim/case/case.smv'));

      expect(rendered).toEqual([]);
      expect(component.resultsDirectory).toBeNull();
      expect(component.resultFormats).toEqual([]);
    });
  });

  describe('the results catalog', () => {
    // #148: the panel lists what the case wrote - format, then quantity group,
    // then one file per mesh - and says which of those files the directory
    // actually has. Nothing in it loads anything; the readers arrive with #149.

    const smv = () => new TextEncoder().encode(smvFixture());

    /** The catalog entry for one file of the fixture case. */
    const fileNamed = (filename: string) =>
      component.results.filter(entry => entry.filename === filename)[0];

    it('groups the catalog of the case it drew, in reading order', async () => {
      serve(smv());

      await component.loadSmv(node('sim/case/case.smv'));

      expect(component.resultFormats.map(format => format.kind))
        .toEqual(['slcf', 'bndf', 'prt5', 'smoke3d', 'isof']);
      // two slices of different quantities on different planes, so two groups,
      // each carrying the cell index of the plane it sits on - and the second
      // is an SLCC, whose values sit in the cells rather than on the planes
      expect(component.resultFormats[0].groups.map(group => group.label))
        .toEqual(['TEMPERATURE, J=1', 'HRRPUV, K=1 (cell)']);
      // the .smv names no quantity for a particle file, so the file names itself
      expect(component.resultFormats[2].groups[0].label).toBe('demo_1.prt5');
    });

    it('takes the size of an available file from the probe, and marks the rest gone', async () => {
      serve(smv(), { 'demo_1_1.sf': 4096 });

      await component.loadSmv(node('sim/case/case.smv'));

      expect(component.sizeOf(fileNamed('demo_1_1.sf'))).toBe(4096);
      expect(component.isAbsent(fileNamed('demo_1_1.sf'))).toBe(false);
      // the .smv named it, the server does not have it - an ordinary answer
      expect(component.isAbsent(fileNamed('demo_1_1.bf'))).toBe(true);
      expect(component.sizeOf(fileNamed('demo_1_1.bf'))).toBeNull();
    });

    it('shows a row per mesh with its size, and flags the files that are gone', async () => {
      serve(smv(), { 'demo_1_1.sf': 4096 });

      await component.loadSmv(node('sim/case/case.smv'));
      fixture.detectChanges();

      const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.file'));
      expect(rows.length).toBe(component.results.length);
      expect(rows[0].textContent).toContain('MESH 1');
      expect(rows[0].textContent).toContain('4.0 KB');
      expect(fixture.nativeElement.querySelectorAll('.file.absent').length)
        .toBe(component.results.length - 1);
    });

    it('drops the catalog when a case fails to load, rather than leave the last one standing', async () => {
      serve(smv(), { 'demo_1_1.sf': 4096 });
      await component.loadSmv(node('sim/case/case.smv'));
      expect(component.resultFormats.length).toBeGreaterThan(0);

      // the same server, now without that case at all
      (window.fetch as jasmine.Spy).and.returnValue(
        Promise.resolve(new Response(null, { status: 404 })));
      await component.loadSmv(node('sim/gone/gone.smv'));

      // nothing of the case just clicked is on screen, and a failed load says
      // so nowhere else - so the panel does not go on labelling the viewer
      // with the case before it
      expect(component.resultFormats).toEqual([]);
      expect(component.results).toEqual([]);
      expect(component.resultsDirectory).toBeNull();
    });

    it('lets the probes of an abandoned case fall on the floor', async () => {
      // Case A's probes are held open while case B is loaded and probed; when
      // A's answers finally arrive they must land nowhere, not in B's catalog.
      const held: (() => void)[] = [];
      spyOn(window, 'fetch').and.callFake((input: RequestInfo | URL, init: RequestInit) => {
        const url = String(input);
        const name = decodeURIComponent(url.split('/').pop());
        if (name.endsWith('.smv')) { return Promise.resolve(rangeResponse(smv(), init)); }

        const bytes = new Uint8Array(url.includes('/a/') ? 4096 : 8192);
        return url.includes('/a/')
          ? new Promise<Response>(resolve => held.push(() => resolve(rangeResponse(bytes, init))))
          : Promise.resolve(rangeResponse(bytes, init));
      });

      const loadingA = component.loadSmv(node('sim/a/a.smv'));
      // A gets as far as its probes, which are now hanging
      await until(() => held.length > 0);
      expect(held.length).toBe(component.results.length);

      await component.loadSmv(node('sim/b/b.smv'));
      expect(component.sizeOf(fileNamed('demo_1_1.bf'))).toBe(8192);

      held.forEach(release => release());
      await loadingA;

      expect(component.sizeOf(fileNamed('demo_1_1.bf'))).toBe(8192);
    });

    it('collapses a format block and opens it again', async () => {
      serve(smv());

      await component.loadSmv(node('sim/case/case.smv'));
      fixture.detectChanges();
      const blockOf = (index: number) => fixture.nativeElement.querySelectorAll('.format + div')[index];

      // a freshly loaded case shows its catalog rather than five closed rows
      expect(component.isFormatOpen('slcf')).toBe(true);
      expect(blockOf(0).classList).toContain('open');

      component.toggleFormat('slcf');
      fixture.detectChanges();

      expect(component.isFormatOpen('slcf')).toBe(false);
      expect(blockOf(0).classList).toContain('close');
      // one block at a time - the boundaries stayed as they were
      expect(component.isFormatOpen('bndf')).toBe(true);

      component.toggleFormat('slcf');
      fixture.detectChanges();

      expect(blockOf(0).classList).toContain('open');
    });

    describe('sizes', () => {
      it('reads a size the way a person does', () => {
        expect(component.formatSize(512)).toBe('512 B');
        expect(component.formatSize(4096)).toBe('4.0 KB');
        expect(component.formatSize(52 * 1024 * 1024)).toBe('52 MB');
      });

      it('takes the carry when rounding would spell a unit that has a name', () => {
        // 1023.9 KB is not a size anybody writes down
        expect(component.formatSize(1048500)).toBe('1.0 MB');
      });
    });
  });
});
