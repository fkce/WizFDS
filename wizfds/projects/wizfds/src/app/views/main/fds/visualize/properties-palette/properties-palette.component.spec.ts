import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

import { PropertiesPaletteComponent } from './properties-palette.component';
import { MainService } from '@services/main/main.service';
import { SelectionService } from '@services/selection/selection.service';
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

  /** What the read-out inputs currently show, in the order they are rendered. */
  function readouts(): string[] {
    return Array.from<HTMLInputElement>(
      fixture.nativeElement.querySelectorAll('.palette-body input'))
      .map(input => input.value);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatIconModule],
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

  it('shows the id, the six XB coordinates and the &SURF', () => {
    selection.select({ uuid: 'wall-uuid', type: 'obst' });
    fixture.detectChanges();

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

  it('does not invent an XB for an element that has no shape', () => {
    selection.select({ uuid: 'surf-uuid', type: 'surf' });
    fixture.detectChanges();

    expect(component.hasXb).toBe(false);
    expect(readouts()).toEqual(['CONCRETE']);
  });

  it('names the count when more than one element is selected', () => {
    selection.select({ uuid: 'wall-uuid', type: 'obst' });
    selection.select({ uuid: 'surf-uuid', type: 'surf' }, { add: true });
    fixture.detectChanges();

    expect(component.alsoSelected).toBe(1);
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

  it('is read-only until edits become commands (#123)', () => {
    // Writing straight to `Fds` would go round the history #123 introduces, and
    // would need a full re-render to show - which ADR-0004 rules out.
    selection.select({ uuid: 'wall-uuid', type: 'obst' });
    fixture.detectChanges();

    const inputs = Array.from<HTMLInputElement>(
      fixture.nativeElement.querySelectorAll('.palette-body input'));

    expect(inputs.length).toBeGreaterThan(0);
    expect(inputs.every(input => input.readOnly)).toBe(true);
  });
});
