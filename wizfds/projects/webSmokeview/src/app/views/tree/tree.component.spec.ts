import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { SmokeviewApiService } from 'projects/web-smokeview-lib/src/lib/services/smokeview-api/smokeview-api.service';
import { SceneInput } from 'projects/web-smokeview-lib/src/lib/services/drawing/scene-input';
import { exportOfBoxes } from 'projects/web-smokeview-lib/src/lib/services/parsers/smokeviewJson/obst-json.fixture';

import { TreeComponent } from './tree.component';
import { TreeService } from '../../services/tree/tree.service';
import { GeometryLoaderService, SimulationNode } from '../../services/loaders/geometryLoader/geometry-loader.service';
import { Result } from '../../services/http-manager/http-manager.service';

/** One blockage, as `<chid>_obst.json` holds it - see ObstJsonService. */
function obstExport() {
  return exportOfBoxes([{ x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 0.5 }]);
}

function loaded(data: unknown): Result {
  return { meta: { status: 'success', from: '', details: [] }, data: data };
}

/** A file the user clicked in the tree. */
function node(extension: string): SimulationNode {
  return {
    name: `case${extension}`, type: 'file', extension: extension,
    path: `sim/case${extension}`
  };
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

      component.loadSmv(node('.smv'));
      tick();

      expect(rendered.length).toBe(1);
      expect(rendered[0].obsts.length).toBe(1);
      expect(rendered[0].obsts[0].uuid).toBeTruthy();
    }));

    it('draws a .json the same way', fakeAsync(() => {
      loader.loadJson.and.returnValue(Promise.resolve(loaded(obstExport())));

      component.loadJson(node('.json'));
      tick();

      expect(rendered.length).toBe(1);
      expect(rendered[0].obsts.length).toBe(1);
    }));

    it('draws nothing when the response is not a success', fakeAsync(() => {
      loader.loadSmv.and.returnValue(Promise.resolve({
        meta: { status: 'error', from: '', details: [] }, data: null
      } as Result));

      component.loadSmv(node('.smv'));
      tick();

      expect(rendered).toEqual([]);
    }));
  });
});
