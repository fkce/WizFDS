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
   * A server that honours ranges over one file, which is the whole of what
   * the component needs from `/api/results/...`: the probe reports the size,
   * the read hands back the bytes asked for.
   */
  function serve(bytes: Uint8Array): jasmine.Spy {
    return spyOn(window, 'fetch').and.callFake((_input: RequestInfo | URL, init: RequestInit) => {
      const range = (init.headers as Record<string, string>).Range;
      const [start, end] = range.replace('bytes=', '').split('-').map(Number);
      const slice = bytes.slice(start, end + 1);
      return Promise.resolve(new Response(slice, {
        status: 206,
        headers: { 'Content-Range': `bytes ${start}-${end}/${bytes.length}` }
      }));
    });
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
      expect((fetchSpy.calls.mostRecent().args[1].headers as Record<string, string>).Range)
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
    });
  });
});
