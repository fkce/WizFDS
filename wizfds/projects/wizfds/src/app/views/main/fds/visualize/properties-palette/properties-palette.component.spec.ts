import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

import { PropertiesPaletteComponent } from './properties-palette.component';
import { MainService } from '@services/main/main.service';
import { SelectionService } from '@services/selection/selection.service';
import { FdsEditService } from '@services/fds-edit/fds-edit.service';
import { FdsScenario } from '@services/fds-scenario/fds-scenario';
import { appServiceProviders } from '../../../../../../testing/app-service-testing';

/**
 * AutoCAD's PROPERTIES, docked on the right of the 3D view.
 *
 * A geometric subset of the form, not a second copy of it (ADR-0010): the id,
 * the six `XB` coordinates, the &SURF, and the way through to the rest.
 */
describe('PropertiesPaletteComponent', () => {
  let component: PropertiesPaletteComponent;
  let fixture: ComponentFixture<PropertiesPaletteComponent>;
  let selection: SelectionService;

  function scenario(): FdsScenario {
    return new FdsScenario(JSON.stringify({
      id: 1, projectId: 1, name: 'palette',
      fdsObject: {
        geometry: {
          meshes: [{
            id: 'MESH1', uuid: 'mesh-uuid',
            xb: { x1: 0, x2: 10, y1: 0, y2: 10, z1: 0, z2: 3 },
            isize: 0.25, jsize: 0.25, ksize: 0.25
          }],
          obsts: [{
            id: 'WALL', uuid: 'wall-uuid',
            xb: { x1: 0, x2: 4.5, y1: 0, y2: 0.2, z1: 0, z2: 3 },
            // As the scenario stores it: a name, which Obst resolves against
            // the &SURF list into the object the palette then reads back
            surf: { type: 'surf_id', surf_id: 'CONCRETE' }
          }],
          // A &SURF has no shape of its own, and arrives from CAD all the same
          surfs: [{ id: 'CONCRETE', uuid: 'surf-uuid' }]
        }
      }
    }));
  }

  /** The six XB fields, in the order they are rendered. */
  function xbFields(): HTMLInputElement[] {
    return Array.from<HTMLInputElement>(
      fixture.nativeElement.querySelectorAll('.palette-body .group input'))
      .filter(input => !input.readOnly);
  }

  /**
   * Type into one field and leave it, which is what commits an edit.
   *
   * Settled afterwards because `ngModel` writes back to the input in a
   * microtask, so what the field shows is not decided until the current task is
   * over - see settle().
   */
  async function type(index: number, value: string): Promise<void> {
    const field = xbFields()[index];
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    await settle();
  }

  /** Run change detection and let ngModel's deferred write to the input land. */
  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** What the read-out inputs currently show, in the order they are rendered. */
  function readouts(): string[] {
    return Array.from<HTMLInputElement>(
      fixture.nativeElement.querySelectorAll('.palette-body input'))
      .map(input => input.value);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatIconModule, FormsModule],
      declarations: [PropertiesPaletteComponent],
      providers: [...appServiceProviders()]
    }).compileComponents();

    TestBed.inject(MainService).setCurrentFdsScenario(scenario());
    selection = TestBed.inject(SelectionService);

    fixture = TestBed.createComponent(PropertiesPaletteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('says so when nothing is selected', () => {
    expect(fixture.nativeElement.querySelector('.palette-empty')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.palette-body')).toBeNull();
  });

  it('shows the id, the six XB coordinates and the &SURF', async () => {
    selection.select({ uuid: 'wall-uuid', type: 'obst' });
    await settle();

    expect(component.type).toBe('OBST');
    expect(readouts())
      .toEqual(['WALL', 'CONCRETE', '0.000', '4.500', '0.000', '0.200', '0.000', '3.000']);
  });

  it('reads the &SURF an &OBST names through its own shape', () => {
    // An &OBST holds a resolved &SURF under `surf.surf_id`; a &VENT, a &GEOM and
    // a fire hold one directly under `surf`.
    selection.select({ uuid: 'wall-uuid', type: 'obst' });

    expect(component.surfId).toBe('CONCRETE');
  });

  it('does not invent an XB for an element that has no shape', async () => {
    selection.select({ uuid: 'surf-uuid', type: 'surf' });
    await settle();

    expect(component.hasXb).toBe(false);
    expect(readouts()).toEqual(['CONCRETE']);
  });

  it('names the count when more than one element is selected', () => {
    selection.select({ uuid: 'wall-uuid', type: 'obst' });
    selection.select({ uuid: 'surf-uuid', type: 'surf' }, { add: true });
    fixture.detectChanges();

    expect(component.alsoSelected).toBe(1);
  });

  it('shows the element last clicked, not the first', () => {
    // Ctrl+click appends to the selection, so the first entry is the one chosen
    // longest ago - a palette naming it would stop following the clicks. The
    // pick panel this replaces read the same end of the list.
    selection.select({ uuid: 'wall-uuid', type: 'obst' });

    selection.select({ uuid: 'surf-uuid', type: 'surf' }, { add: true });
    fixture.detectChanges();

    expect(component.type).toBe('SURF');
    expect(component.id).toBe('CONCRETE');
  });

  it('empties again when the selection is dropped', () => {
    selection.select({ uuid: 'wall-uuid', type: 'obst' });
    fixture.detectChanges();

    selection.clear();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.palette-empty')).toBeTruthy();
  });

  it('opens the full form for what it is showing', () => {
    const router = spyOn(TestBed.inject(Router), 'navigate');
    selection.select({ uuid: 'wall-uuid', type: 'obst' });

    component.openForm();

    expect(router).toHaveBeenCalledWith(['fds/geometry/obstruction']);
  });

  describe('typing a coordinate', () => {
    // The palette does not write to `Fds`: it emits the same `setXb` command a
    // gizmo will (#123), which is what puts the edit on the undo stack and
    // redraws only what moved (ADR-0004).

    let fdsEdit: FdsEditService;

    beforeEach(() => {
      fdsEdit = TestBed.inject(FdsEditService);
      selection.select({ uuid: 'wall-uuid', type: 'obst' });
      fixture.detectChanges();
    });

    it('sends the whole box as one command', async () => {
      const applied = spyOn(fdsEdit, 'apply').and.callThrough();

      await type(0, '1.250');

      expect(applied).toHaveBeenCalledWith({
        kind: 'setXb', uuid: 'wall-uuid',
        xb: { x1: 1.25, x2: 4.5, y1: 0, y2: 0.2, z1: 0, z2: 3 }
      });
    });

    it('moves the element in the scenario', async () => {
      await type(0, '1.250');

      const fds = TestBed.inject(MainService).main.currentFdsScenario.fdsObject;
      expect(fds.geometry.obsts[0].xb.x1).toBe(1.25);
    });

    it('says nothing when the coordinate has not changed', async () => {
      // A field leaving focus untouched is not an edit, and each command is an
      // entry on the undo stack
      const applied = spyOn(fdsEdit, 'apply');

      await type(0, '0.000');

      expect(applied).not.toHaveBeenCalled();
    });

    it('puts back what the model says when the field is not a number', async () => {
      const applied = spyOn(fdsEdit, 'apply');

      await type(0, 'over there');

      expect(applied).not.toHaveBeenCalled();
      expect(xbFields()[0].value).toBe('0.000');
    });

    it('follows an edit made anywhere else', async () => {
      // An undo, the CAD bridge, or the gizmo of #124 - the fields show the
      // scenario, not what was last typed into them
      fdsEdit.apply({ kind: 'move', uuids: ['wall-uuid'], delta: { dx: 0.5, dy: 0, dz: 0 } });
      await settle();

      expect(xbFields()[0].value).toBe('0.500');
    });
  });

  it('shows what FDS will make of the element, without refusing the edit', async () => {
    // A coordinate between two cell boundaries: FDS would snap it, so the user
    // is told - and the edit goes through all the same (ADR-0009)
    selection.select({ uuid: 'wall-uuid', type: 'obst' });
    fixture.detectChanges();

    await type(0, '1.130');

    const fds = TestBed.inject(MainService).main.currentFdsScenario.fdsObject;
    expect(fds.geometry.obsts[0].xb.x1).toBe(1.13);
    expect(fixture.nativeElement.querySelectorAll('.warnings .warning').length).toBe(1);
  });
});
