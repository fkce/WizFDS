import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { SmokeviewApiService } from 'projects/web-smokeview-lib/src/lib/services/smokeview-api/smokeview-api.service';
import { SceneInput } from 'projects/web-smokeview-lib/src/lib/services/drawing/scene-input';

import { TreeComponent } from './tree.component';
import { TreeService } from '../../services/tree/tree.service';
import { GeometryLoaderService } from '../../services/loaders/geometryLoader/geometry-loader.service';
import { Result } from '../../services/http-manager/http-manager.service';

/** One blockage, as `<chid>_obst.json` holds it - see ObstJsonService. */
function obstExport() {
  const ii = [0, 1, 1, 0, 0, 1, 1, 0];
  const jj = [0, 0, 1, 1, 0, 0, 1, 1];
  const kk = [0, 0, 0, 0, 1, 1, 1, 1];
  const x = [0, 1], y = [0, 1], z = [0, 0.5];

  const vertices: number[] = [];
  const colors: number[] = [];
  for (let group = 0; group < 3; group++) {
    for (let n = 0; n < 8; n++) {
      vertices.push(x[ii[n]], y[jj[n]], z[kk[n]]);
      colors.push(1, 0, 0, 1);
    }
  }

  return {
    vertices: vertices,
    colors: colors,
    indices: new Array(36).fill(0).map((_, n) => n % 24)
  };
}

function loaded(data: unknown): Result {
  return { meta: { status: 'success', from: '', details: [] }, data: data };
}

describe('TreeComponent', () => {
  let component: TreeComponent;
  let fixture: ComponentFixture<TreeComponent>;
  /** Every scene the component handed the library, in order. */
  let rendered: SceneInput[];
  let loader: { loadSmv: jasmine.Spy, loadJson: jasmine.Spy };

  beforeEach(waitForAsync(() => {
    rendered = [];
    loader = {
      loadSmv: jasmine.createSpy('loadSmv'),
      loadJson: jasmine.createSpy('loadJson')
    };

    TestBed.configureTestingModule({
      declarations: [TreeComponent],
      providers: [
        {
          provide: SmokeviewApiService,
          useValue: {
            render: (scene: SceneInput) => { rendered.push(scene); return Promise.resolve(); }
          }
        },
        { provide: GeometryLoaderService, useValue: loader },
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
    // #106: the standalone viewer draws through the same render(scene) call as
    // the app does, so a loaded export never reaches the drawing services raw.

    it('draws a .smv through the scene contract', fakeAsync(() => {
      loader.loadSmv.and.returnValue(Promise.resolve(loaded(obstExport())));

      component.loadSmv({ extension: '.smv', path: 'sim/case.smv' });
      tick();

      expect(rendered.length).toBe(1);
      expect(rendered[0].obsts.length).toBe(1);
      expect(rendered[0].obsts[0].uuid).toBeTruthy();
    }));

    it('draws a .json the same way', fakeAsync(() => {
      loader.loadJson.and.returnValue(Promise.resolve(loaded(obstExport())));

      component.loadJson({ extension: '.json', path: 'sim/case.json' });
      tick();

      expect(rendered.length).toBe(1);
      expect(rendered[0].obsts.length).toBe(1);
    }));

    it('draws nothing when the response is not a success', fakeAsync(() => {
      loader.loadSmv.and.returnValue(Promise.resolve({
        meta: { status: 'error', from: '', details: [] }, data: null
      } as Result));

      component.loadSmv({ extension: '.smv', path: 'sim/case.smv' });
      tick();

      expect(rendered).toEqual([]);
    }));
  });
});
