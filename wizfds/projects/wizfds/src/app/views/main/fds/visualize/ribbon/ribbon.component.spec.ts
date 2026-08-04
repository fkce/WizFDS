import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

import { RibbonComponent } from './ribbon.component';
import { MainService } from '@services/main/main.service';
import { SelectionService } from '@services/selection/selection.service';
import { FdsEditService } from '@services/fds-edit/fds-edit.service';
import { FdsScenario } from '@services/fds-scenario/fds-scenario';
import { appServiceProviders } from '../../../../../../testing/app-service-testing';
import { SceneViewService } from '../../../../../../../../web-smokeview-lib/src/lib/services/scene-view/scene-view.service';
import { GizmoService } from '../../../../../../../../web-smokeview-lib/src/lib/services/editing/gizmo.service';

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
          surfs: [{ id: 'SUPPLY', uuid: 'vsurf-uuid' }],
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
      zoomTo: jasmine.createSpy('zoomTo'),
      standardViews: [{ side: 'top', label: 'Top' }],
      viewFrom: jasmine.createSpy('viewFrom')
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
    // The ribbon only ever exists in the app, which is the host that edits (#88)
    TestBed.inject(GizmoService).enabled = true;

    fixture = TestBed.createComponent(RibbonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /** The labels of the tabs currently in the strip. */
  function tabLabels(): string[] {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.tab'))
      .map(tab => tab.textContent.trim());
  }

  it('opens on Home, where AutoCAD opens', () => {
    // Since #125 the Draw panel works, so the tab a user reaches first is the
    // one that creates geometry.
    expect(component.active).toBe('home');
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

    it('follows the last click, not the first', () => {
      // Ctrl+click appends to the selection, so the first entry is what the user
      // chose longest ago. A tab named after it would stop following the clicks.
      selection.select({ uuid: 'wall-uuid', type: 'obst' });

      selection.select({ uuid: 'jetfan-uuid', type: 'jetfan' }, { add: true });
      fixture.detectChanges();

      expect(component.contextLabel).toBe('JETFAN');
      expect(component.selectedId).toBe('JF1');
    });

    it('gives the tab strip back when the selection is dropped', () => {
      selection.select({ uuid: 'wall-uuid', type: 'obst' });
      component.select('context');

      selection.clear();
      fixture.detectChanges();

      expect(component.active).toBe('home');
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
    beforeEach(() => {
      component.select('view');
      fixture.detectChanges();
    });

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

  /**
   * The Draw panel (#125).
   *
   * The ribbon does not draw: it starts the library's tool and names the
   * current &SURF, the way the current layer works in AutoCAD (ADR-0010).
   */
  describe('the Draw panel', () => {

    it('starts the tool with the current SURF along', () => {
      const start = spyOn(component.draw, 'start');
      component.drawSurfId = 'CONCRETE';

      component.startDraw('obst');

      expect(start).toHaveBeenCalledWith('obst', 'CONCRETE');
    });

    it('names no SURF for the INERT pseudo-entry', () => {
      // The element then gets exactly the default the form's add() produces -
      // no surface, which FDS reads as INERT.
      const start = spyOn(component.draw, 'start');

      component.startDraw('obst');

      expect(start).toHaveBeenCalledWith('obst', undefined);
    });

    it('offers the geometry surfaces to an OBST', () => {
      expect(component.drawSurfs.map(surf => surf.id)).toEqual(['CONCRETE']);
    });

    it('offers the ventilation surfaces to a VENT', () => {
      // Two different lists in the scenario: an id handed across the pair
      // would resolve to nothing (see Vent's constructor).
      component.draw.start('vent');

      expect(component.drawSurfs.map(surf => surf.id)).toEqual(['SUPPLY']);

      component.draw.cancel();
    });

    it('keeps a current SURF per list, not one shared', () => {
      component.setDrawSurf('CONCRETE');
      component.draw.start('vent');
      component.setDrawSurf('SUPPLY');
      component.draw.cancel();

      expect(component.drawSurfId).toBe('CONCRETE');
      expect(component.drawVentSurfId).toBe('SUPPLY');
    });

    it('greys the selector out for a HOLE, which has no SURF', () => {
      component.draw.start('hole');

      expect(component.surfSelectorDisabled).toBe(true);

      component.draw.cancel();
    });

    it('hands a SURF changed mid-gesture to the tool', () => {
      const setSurf = spyOn(component.draw, 'setSurf');
      component.draw.start('obst');

      component.setDrawSurf('CONCRETE');

      expect(setSurf).toHaveBeenCalledWith('CONCRETE');
      component.draw.cancel();
    });
  });

  describe('minimising', () => {
    it('hides the panels but keeps the tabs, as AutoCAD does', () => {
      // Pressing the tab that is already open is what minimises
      component.select('home');

      expect(component.collapsed).toBe(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.panels')).toBeNull();
      expect(fixture.nativeElement.querySelector('.tabs')).toBeTruthy();
    });

    it('opens again when another tab is chosen', () => {
      component.select('home');

      component.select('measure');

      expect(component.collapsed).toBe(false);
      expect(component.active).toBe('measure');
    });
  });

  describe('the Quick Access Toolbar', () => {
    // AutoCAD puts undo, redo and the save indicator here, and so does this.
    // The history holds edits made through the command channel only - a change
    // typed into a form is not one of them (ADR-0009).

    let fdsEdit: FdsEditService;

    /** The two history buttons, in the order the toolbar shows them. */
    function historyButtons(): HTMLButtonElement[] {
      return Array.from<HTMLButtonElement>(
        fixture.nativeElement.querySelectorAll('.qat .qat-btn'))
        .filter(button => ['Undo', 'Redo'].indexOf(button.getAttribute('aria-label')) !== -1);
    }

    beforeEach(() => {
      fdsEdit = TestBed.inject(FdsEditService);
    });

    it('offers nothing to undo before anything has been edited', () => {
      const [undo, redo] = historyButtons();

      expect(undo.disabled).toBe(true);
      expect(redo.disabled).toBe(true);
      expect(undo.title).toBe('Nothing to undo');
    });

    it('names the operation it would take back', () => {
      fdsEdit.apply({ kind: 'move', uuids: ['wall-uuid'], delta: { dx: 1, dy: 0, dz: 0 } });
      fixture.detectChanges();

      expect(historyButtons()[0].disabled).toBe(false);
      expect(historyButtons()[0].title).toBe('Undo Move (Ctrl+Z)');
    });

    it('takes the edit back when it is pressed', () => {
      fdsEdit.apply({ kind: 'move', uuids: ['wall-uuid'], delta: { dx: 1, dy: 0, dz: 0 } });
      fixture.detectChanges();

      historyButtons()[0].click();

      const fds = TestBed.inject(MainService).main.currentFdsScenario.fdsObject;
      expect(fds.geometry.obsts[0].xb.x1).toBe(0);
    });

    it('offers the redo once something has been undone', () => {
      fdsEdit.apply({ kind: 'move', uuids: ['wall-uuid'], delta: { dx: 1, dy: 0, dz: 0 } });
      fdsEdit.undo();
      fixture.detectChanges();

      historyButtons()[1].click();

      const fds = TestBed.inject(MainService).main.currentFdsScenario.fdsObject;
      expect(fds.geometry.obsts[0].xb.x1).toBe(1);
    });
  });

  describe('deleting the selection', () => {
    // A delete is a command over what is selected and needs no gesture, so it
    // works from #123 - unlike Move and Resize, which wait for the gizmo (#124).

    it('takes the selected element out of the scenario', () => {
      selection.select({ uuid: 'wall-uuid', type: 'obst' });
      fixture.detectChanges();

      component.deleteSelection();

      const fds = TestBed.inject(MainService).main.currentFdsScenario.fdsObject;
      expect(fds.geometry.obsts.length).toBe(0);
    });

    it('names what it would remove', () => {
      selection.select({ uuid: 'wall-uuid', type: 'obst' });

      expect(component.deleteTitle).toBe('Delete WALL');
    });

    it('names the count when several are selected', () => {
      selection.select({ uuid: 'wall-uuid', type: 'obst' });
      selection.select({ uuid: 'jetfan-uuid', type: 'jetfan' }, { add: true });

      expect(component.deleteTitle).toBe('Delete the 2 selected elements');
    });

    it('does nothing with nothing selected', () => {
      component.deleteSelection();

      const fds = TestBed.inject(MainService).main.currentFdsScenario.fdsObject;
      expect(fds.geometry.obsts.length).toBe(1);
    });
  });
  /**
   * The Modify and Snap panels (#124).
   *
   * The ribbon owns neither gesture: it says which manipulator is on screen and
   * which modes catch, and the library does the dragging (ADR-0010).
   */
  describe('Modify and Snap', () => {

    it('opens on the arrows, which is the gesture a user reaches for first', () => {
      expect(component.gizmo.mode).toBe('move');
    });

    it('chooses which manipulator is on screen', () => {
      selection.select({ uuid: 'wall-uuid', type: 'obst' });

      component.gizmo.setMode('resize');

      expect(component.gizmo.mode).toBe('resize');
    });

    it('offers neither with nothing selected', () => {
      expect(component.canModify).toBe(false);
      expect(component.moveTitle).toBe('Nothing selected');
    });

    it('says why resize is not on offer for a multiple selection', () => {
      selection.select({ uuid: 'wall-uuid', type: 'obst' });
      selection.select({ uuid: 'jetfan-uuid', type: 'jetfan' }, { add: true });
      fixture.detectChanges();

      expect(component.gizmo.canResize).toBe(false);
      expect(component.resizeTitle).toBe('Resize acts on one element at a time');
    });

    it('starts with all three snap modes on, as OSNAP does', () => {
      expect(component.snapModes.map(mode => component.snap.isOn(mode.id)))
        .toEqual([true, true, true]);
    });

    it('lists them in the order a snap tries them', () => {
      expect(component.snapModes.map(mode => mode.id)).toEqual(['corner', 'edge', 'grid']);
    });

    it('turns one mode off without touching the others', () => {
      component.snap.toggle('grid');

      expect(component.snap.isOn('grid')).toBe(false);
      expect(component.snap.isOn('corner')).toBe(true);
    });
  });
});
