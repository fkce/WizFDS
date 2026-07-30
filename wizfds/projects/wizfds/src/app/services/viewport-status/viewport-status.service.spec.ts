import { TestBed } from '@angular/core/testing';

import { ViewportStatusService } from './viewport-status.service';
import { MainService } from '@services/main/main.service';
import { FdsScenario } from '@services/fds-scenario/fds-scenario';
import { appServiceProviders } from '../../../testing/app-service-testing';

/**
 * What the status bar says while the pointer is over the 3D view.
 *
 * The coordinates and the active grid are what AutoCAD puts there, and both are
 * questions about the scenario rather than about the scene - which &MESH a point
 * falls in is something only the app can answer, so the library reports a point
 * and stops (ADR-0010).
 */
describe('ViewportStatusService', () => {
  let service: ViewportStatusService;

  /** Two meshes side by side, at different resolutions, plus a gap after them. */
  function scenario(): FdsScenario {
    return new FdsScenario(JSON.stringify({
      id: 1, projectId: 1, name: 'grid',
      fdsObject: {
        geometry: {
          meshes: [
            {
              id: 'ROOM', uuid: 'room-uuid',
              xb: { x1: 0, x2: 10, y1: 0, y2: 6, z1: 0, z2: 3 },
              isize: 0.25, jsize: 0.25, ksize: 0.2
            },
            {
              id: 'CORRIDOR', uuid: 'corridor-uuid',
              xb: { x1: 10, x2: 20, y1: 0, y2: 6, z1: 0, z2: 3 },
              isize: 0.5, jsize: 0.5, ksize: 0.5
            }
          ]
        }
      }
    }));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...appServiceProviders()] });
    service = TestBed.inject(ViewportStatusService);
    TestBed.inject(MainService).setCurrentFdsScenario(scenario());
  });

  it('says nothing until the pointer is somewhere', () => {
    expect(service.cursor).toBeNull();
    expect(service.grid).toBeNull();
  });

  it('holds the point the preview reported, in metres', () => {
    service.setCursor({ x: 2.5, y: 1, z: 1.5 });

    expect(service.cursor).toEqual({ x: 2.5, y: 1, z: 1.5 });
  });

  it('names the &MESH the pointer is inside, and how fine its grid is', () => {
    // What "the grid currently active for snapping" means: a scenario has many
    // meshes at different resolutions, and the one under the cursor is the one a
    // snap would round to.
    service.setCursor({ x: 2.5, y: 1, z: 1.5 });

    expect(service.grid).toEqual({ id: 'ROOM', cell: { i: 0.25, j: 0.25, k: 0.2 } });
  });

  it('follows the pointer from one mesh into the next', () => {
    service.setCursor({ x: 2.5, y: 1, z: 1.5 });

    service.setCursor({ x: 15, y: 1, z: 1.5 });

    expect(service.grid.id).toBe('CORRIDOR');
    expect(service.grid.cell.i).toBe(0.5);
  });

  it('has no grid where there is no mesh', () => {
    // An obst outside the domain is a modelling error rather than a reason to
    // invent a grid for it.
    service.setCursor({ x: 25, y: 1, z: 1.5 });

    expect(service.cursor).toEqual({ x: 25, y: 1, z: 1.5 });
    expect(service.grid).toBeNull();
  });

  it('takes the first of two meshes that meet at a face', () => {
    // Meshes share their boundary faces by construction, so a point on one is in
    // both. Answering with the first keeps the readout from flickering between
    // two names as the pointer sits still.
    service.setCursor({ x: 10, y: 1, z: 1.5 });

    expect(service.grid.id).toBe('ROOM');
  });

  it('drops everything when the pointer leaves the model', () => {
    service.setCursor({ x: 2.5, y: 1, z: 1.5 });

    service.setCursor(null);

    expect(service.cursor).toBeNull();
    expect(service.grid).toBeNull();
  });

  it('drops everything when the view is left', () => {
    // The status bar is the whole app's, so the 3D view has to take its readout
    // back down on the way out - otherwise a stale coordinate sits there while
    // the user edits a form.
    service.setCursor({ x: 2.5, y: 1, z: 1.5 });

    service.clear();

    expect(service.cursor).toBeNull();
    expect(service.grid).toBeNull();
  });
});
