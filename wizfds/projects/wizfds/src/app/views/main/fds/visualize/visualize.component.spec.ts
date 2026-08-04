import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, Subject } from 'rxjs';

import { VisualizeComponent } from './visualize.component';
import { MainService } from '@services/main/main.service';
import { SelectionService } from '@services/selection/selection.service';
import { FdsEditService } from '@services/fds-edit/fds-edit.service';
import { FdsScenario } from '@services/fds-scenario/fds-scenario';
import { appServiceProviders } from '../../../../../testing/app-service-testing';
import { SmokeviewApiService } from '../../../../../../../web-smokeview-lib/src/lib/services/smokeview-api/smokeview-api.service';
import { BabylonService } from '../../../../../../../web-smokeview-lib/src/lib/services/babylon/babylon.service';
import { PickService } from '../../../../../../../web-smokeview-lib/src/lib/services/picking/pick.service';
import { EditStreamService } from '../../../../../../../web-smokeview-lib/src/lib/services/editing/edit-stream.service';
import { SceneChange } from '../../../../../../../web-smokeview-lib/src/lib/services/drawing/scene-change';

/**
 * The 3D view, where the edit loop is closed (#123).
 *
 * The library emits an intent, the app applies it to `Fds`, and what changed
 * goes back to be redrawn incrementally (ADR-0004). Everything about the scene
 * itself is stubbed here - what is under test is the wiring, not Babylon.
 */
describe('VisualizeComponent', () => {
  let component: VisualizeComponent;
  let fixture: ComponentFixture<VisualizeComponent>;
  let editStream: EditStreamService;
  let fdsEdit: FdsEditService;
  let selection: SelectionService;
  let mainService: MainService;
  let rendered: string[];
  let updates: SceneChange[];

  function scenario(): FdsScenario {
    return new FdsScenario(JSON.stringify({
      id: 1, projectId: 1, name: 'visualize',
      fdsObject: {
        geometry: {
          meshes: [{
            id: 'MESH1', uuid: 'mesh-uuid',
            xb: { x1: 0, x2: 10, y1: 0, y2: 10, z1: 0, z2: 3 },
            isize: 0.25, jsize: 0.25, ksize: 0.25
          }],
          obsts: [{
            id: 'WALL', uuid: 'wall-uuid',
            xb: { x1: 0, x2: 4, y1: 0, y2: 0.25, z1: 0, z2: 3 }
          }]
        }
      }
    }));
  }

  /** The obst the tests move about. */
  function wall(): any {
    return mainService.main.currentFdsScenario.fdsObject.geometry.obsts[0];
  }

  beforeEach(async () => {
    rendered = [];
    updates = [];

    await TestBed.configureTestingModule({
      declarations: [VisualizeComponent],
      schemas: [],
      providers: [
        ...appServiceProviders(),
        {
          provide: SmokeviewApiService,
          useValue: {
            render: () => { rendered.push('render'); return Promise.resolve(); },
            update: (change: SceneChange) => { updates.push(change); return Promise.resolve(); }
          }
        },
        {
          provide: BabylonService,
          // Never ready: what the scene does with the scenario is not what these
          // tests are about, and a real one needs WebGPU
          useValue: { scene$: new BehaviorSubject(null) }
        },
        {
          provide: PickService,
          useValue: {
            picked$: new Subject(), pointerAt$: new Subject(),
            // The gizmo stands on the selection and is told about it here (#124)
            selection$: new BehaviorSubject([]),
            applyOwnPicks: true, setSelected: () => { }
          }
        }
      ]
    })
      .overrideTemplate(VisualizeComponent, '')
      .compileComponents();

    mainService = TestBed.inject(MainService);
    mainService.setCurrentFdsScenario(scenario());

    editStream = TestBed.inject(EditStreamService);
    fdsEdit = TestBed.inject(FdsEditService);
    selection = TestBed.inject(SelectionService);

    fixture = TestBed.createComponent(VisualizeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('applies a command the library emits', () => {
    editStream.emit({ kind: 'move', uuids: ['wall-uuid'], delta: { dx: 0.5, dy: 0, dz: 0 } });

    expect(wall().xb.x1).toBe(0.5);
  });

  it('redraws what changed rather than the whole scenario', () => {
    // A full render rebuilds the pools and re-cuts every opening, which is
    // seconds of work at the scale this is built for (ADR-0004)
    editStream.emit({ kind: 'move', uuids: ['wall-uuid'], delta: { dx: 0.5, dy: 0, dz: 0 } });

    expect(rendered).toEqual([]);
    expect(updates.length).toBe(1);
    expect(updates[0].changed[0].element.uuid).toBe('wall-uuid');
  });

  it('selects what a create command just made (#125)', () => {
    // The same behaviour as the form's add(): the drawn element is what the
    // user works with next, so the palette and the contextual tab show it
    editStream.emit({
      kind: 'create', type: 'obst',
      xb: { x1: 6, x2: 7, y1: 6, y2: 7, z1: 0, z2: 2 }
    });

    const created: any = mainService.main.currentFdsScenario.fdsObject.geometry.obsts[1];
    expect(selection.selected).toEqual([{ uuid: created.uuid, type: 'obst' }]);
  });

  it('drops a deleted element from the selection', () => {
    // It would otherwise name something the scenario no longer holds, and the
    // palette would go on offering to edit it
    selection.select({ uuid: 'wall-uuid', type: 'obst' });

    editStream.emit({ kind: 'delete', uuids: ['wall-uuid'] });

    expect(selection.selected).toEqual([]);
  });

  describe('the keyboard', () => {
    /** Press a key as the document would deliver it. */
    function press(key: string, options: { shift?: boolean, target?: HTMLElement } = {}): void {
      const event = new KeyboardEvent('keydown', {
        key: key, ctrlKey: true, shiftKey: options.shift === true, bubbles: true
      });
      if (options.target) {
        options.target.dispatchEvent(event);
      } else {
        document.dispatchEvent(event);
      }
    }

    beforeEach(() => {
      fdsEdit.apply({ kind: 'move', uuids: ['wall-uuid'], delta: { dx: 0.5, dy: 0, dz: 0 } });
    });

    it('takes the last edit back on Ctrl+Z', () => {
      press('z');

      expect(wall().xb.x1).toBe(0);
    });

    it('puts it back on Ctrl+Y', () => {
      press('z');

      press('y');

      expect(wall().xb.x1).toBe(0.5);
    });

    it('accepts Ctrl+Shift+Z as a redo too', () => {
      press('z');

      press('z', { shift: true });

      expect(wall().xb.x1).toBe(0.5);
    });

    it('leaves Ctrl+Z alone in a field, where it is the browser\'s text undo', () => {
      // A change typed into a form never reaches the command channel and is not
      // in this history, so undoing there would move a wall the user was not
      // even looking at (ADR-0009)
      const field = document.createElement('input');
      document.body.appendChild(field);

      press('z', { target: field });

      expect(wall().xb.x1).toBe(0.5);
      document.body.removeChild(field);
    });

    it('ignores a key pressed without ctrl', () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true }));

      expect(wall().xb.x1).toBe(0.5);
    });
  });

  /**
   * Delete on the selection (#124).
   *
   * No gesture behind it, which is why it needs no gizmo - and no confirmation
   * either, because Ctrl+Z takes it straight back (ADR-0009).
   */
  describe('the Delete key', () => {
    /** Press Delete as the document would deliver it. */
    function pressDelete(target?: HTMLElement): void {
      const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true });
      (target ?? document).dispatchEvent(event);
    }

    function obsts(): any[] {
      return mainService.main.currentFdsScenario.fdsObject.geometry.obsts;
    }

    it('takes the selection out of the scenario', () => {
      selection.select({ uuid: 'wall-uuid', type: 'obst' });

      pressDelete();

      expect(obsts().length).toBe(0);
    });

    it('is one entry in the history, and Ctrl+Z brings it back', () => {
      selection.select({ uuid: 'wall-uuid', type: 'obst' });
      pressDelete();

      document.dispatchEvent(new KeyboardEvent(
        'keydown', { key: 'z', ctrlKey: true, bubbles: true }));

      expect(obsts().length).toBe(1);
      expect(obsts()[0].id).toBe('WALL');
    });

    it('does nothing at all with nothing selected', () => {
      pressDelete();

      expect(obsts().length).toBe(1);
    });

    it('leaves Delete alone in a field, where it removes a character', () => {
      selection.select({ uuid: 'wall-uuid', type: 'obst' });
      const field = document.createElement('input');
      document.body.appendChild(field);

      pressDelete(field);

      expect(obsts().length).toBe(1);
      document.body.removeChild(field);
    });
  });
});
