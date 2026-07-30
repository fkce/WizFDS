import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

import { RibbonComponent } from './ribbon.component';
import { MainService } from '@services/main/main.service';
import { SelectionService } from '@services/selection/selection.service';
import { FdsScenario } from '@services/fds-scenario/fds-scenario';
import { appServiceProviders } from '../../../../../../testing/app-service-testing';
import { SceneViewService } from '../../../../../../../../web-smokeview-lib/src/lib/services/scene-view/scene-view.service';

/**
 * The chrome of the 3D view.
 *
 * What is asserted here is the ribbon's own behaviour - which tab is open, when
 * the contextual tab exists and what it is called, and that the View panels
 * reach the scene through the library's API rather than round it (ADR-0010).
 */
describe('RibbonComponent', () => {
  let component: RibbonComponent;
  let fixture: ComponentFixture<RibbonComponent>;
  let view: any;
  let selection: SelectionService;

  function scenario(): FdsScenario {
    return new FdsScenario(JSON.stringify({
      id: 1, projectId: 1, name: 'ribbon',
      fdsObject: {
        geometry: {
          obsts: [{
            id: 'WALL', uuid: 'wall-uuid',
            xb: { x1: 0, x2: 4, y1: 0, y2: 0.2, z1: 0, z2: 3 }
          }],
          surfs: [{ id: 'CONCRETE', uuid: 'surf-uuid' }]
        },
        ventilation: {
          jetfans: [{
            id: 'JF1', uuid: 'jetfan-uuid',
            xb: { x1: 8, x2: 10, y1: 1, y2: 2, z1: 2, z2: 3 }
          }]
        }
      }
    }));
  }

  beforeEach(async () => {
    view = {
      layers: [{ id: 'mesh', label: 'MESH' }, { id: 'vent', label: 'VENT' }],
      displays: [{ id: 'wireframe', label: 'Wireframe' }],
      layerState: jasmine.createSpy('layerState').and.returnValue('edges'),
      toggleLayer: jasmine.createSpy('toggleLayer'),
      isDisplayOn: () => false,
      toggleDisplay: jasmine.createSpy('toggleDisplay'),
      clipPlane: () => 0, clipMin: () => -1, clipMax: () => 11, clipStep: () => 0.1,
      clipLabel: () => '0.00 m',
      setClip: jasmine.createSpy('setClip'),
      resetClipping: jasmine.createSpy('resetClipping'),
      zoomExtents: jasmine.createSpy('zoomExtents'),
      zoomTo: jasmine.createSpy('zoomTo')
    };

    await TestBed.configureTestingModule({
      imports: [FormsModule, MatIconModule],
      declarations: [RibbonComponent],
      providers: [
        ...appServiceProviders(),
        { provide: SceneViewService, useValue: view }
      ]
    }).compileComponents();

    TestBed.inject(MainService).setCurrentFdsScenario(scenario());
    selection = TestBed.inject(SelectionService);

    fixture = TestBed.createComponent(RibbonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /** The labels of the tabs currently in the strip. */
  function tabLabels(): string[] {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.tab'))
      .map(tab => tab.textContent.trim());
  }

  it('opens on the tab whose commands exist', () => {
    // Home is where AutoCAD opens, but its drawing and modifying tools are still
    // to come (#125, #126) - View drives everything that works today.
    expect(component.active).toBe('view');
  });

  describe('the contextual tab', () => {
    it('is not there while nothing is selected', () => {
      expect(tabLabels()).toEqual(['Home', 'View', 'Measure']);
    });

    it('appears named after what was selected', () => {
      selection.select({ uuid: 'wall-uuid', type: 'obst' });
      fixture.detectChanges();

      expect(tabLabels()).toEqual(['Home', 'View', 'Measure', 'OBST']);
    });

    it('is renamed when a different kind of element is selected', () => {
      selection.select({ uuid: 'wall-uuid', type: 'obst' });
      fixture.detectChanges();

      selection.select({ uuid: 'jetfan-uuid', type: 'jetfan' });
      fixture.detectChanges();

      expect(component.contextLabel).toBe('JETFAN');
    });

    it('gives the tab strip back when the selection is dropped', () => {
      selection.select({ uuid: 'wall-uuid', type: 'obst' });
      component.select('context');

      selection.clear();
      fixture.detectChanges();

      expect(component.active).toBe('view');
      expect(tabLabels()).toEqual(['Home', 'View', 'Measure']);
    });

    it('names the selected element by its FDS id', () => {
      selection.select({ uuid: 'wall-uuid', type: 'obst' });

      expect(component.selectedId).toBe('WALL');
    });

    it('frames everything selected, not just the first of it', () => {
      // A multi-selection is one thing the user is looking at; framing one
      // corner of it is not what they asked for.
      selection.select({ uuid: 'wall-uuid', type: 'obst' });
      selection.select({ uuid: 'jetfan-uuid', type: 'jetfan' }, { add: true });

      component.zoomToSelection();

      expect(view.zoomTo).toHaveBeenCalledWith({
        x1: 0, x2: 10, y1: 0, y2: 2, z1: 0, z2: 3
      });
    });

    it('opens the form that holds the rest of the element\'s fields', () => {
      const router = spyOn(TestBed.inject(Router), 'navigate');
      selection.select({ uuid: 'wall-uuid', type: 'obst' });

      component.openForm();

      expect(router).toHaveBeenCalledWith(['fds/geometry/obstruction']);
    });
  });

  describe('the View tab', () => {
    it('drives the scene through the library API', () => {
      // Not by reaching into the drawing services: which of them draws a &VENT
      // is the library's business and stops at SceneViewService.
      const toggles = fixture.nativeElement.querySelectorAll('.panel .cmd');
      (toggles[0] as HTMLButtonElement).click();

      expect(view.toggleLayer).toHaveBeenCalledWith('mesh');
    });

    it('offers a switch for every layer the library reports', () => {
      // The list crosses the boundary rather than being spelled out again here,
      // so a layer added to the library turns up without a change in the app.
      const labels = Array.from<HTMLElement>(
        fixture.nativeElement.querySelectorAll('.panel .cmd span'))
        .map(span => span.textContent.trim());

      expect(labels).toContain('MESH');
      expect(labels).toContain('VENT');
    });
  });

  describe('minimising', () => {
    it('hides the panels but keeps the tabs, as AutoCAD does', () => {
      component.select('view');

      expect(component.collapsed).toBe(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.panels')).toBeNull();
      expect(fixture.nativeElement.querySelector('.tabs')).toBeTruthy();
    });

    it('opens again when another tab is chosen', () => {
      component.select('view');

      component.select('measure');

      expect(component.collapsed).toBe(false);
      expect(component.active).toBe('measure');
    });
  });
});
