import { TestBed } from '@angular/core/testing';

import { ViewportStatusService } from './viewport-status.service';
import { appServiceProviders } from '../../../testing/app-service-testing';

/** The grid of a quarter-metre mesh, as the 3D view reports one. */
const ROOM_GRID = { id: 'ROOM', cell: { i: 0.25, j: 0.25, k: 0.2 } };

/**
 * What the status bar says while the pointer is over the 3D view.
 *
 * The coordinates and the active grid are what AutoCAD puts there. Both are
 * handed over: the point comes from the preview, and which &MESH is in force at
 * it is answered where the snapping is, so that the grid on the bar is the one
 * an edit will actually round to (#124).
 */
describe('ViewportStatusService', () => {
  let service: ViewportStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...appServiceProviders()] });
    service = TestBed.inject(ViewportStatusService);
  });

  it('says nothing until the pointer is somewhere', () => {
    expect(service.cursor).toBeNull();
    expect(service.grid).toBeNull();
  });

  it('is silent while the 3D view is not open', () => {
    expect(service.active).toBe(false);

    service.enter();

    expect(service.active).toBe(true);
  });

  it('stays on the bar while the pointer crosses empty space', () => {
    // The pointer crosses a lot of it, and a segment that came and went with it
    // would reflow the status row several times a second - so the bar shows the
    // segment for as long as the view is open and dashes what it cannot say.
    service.enter();
    service.setCursor({ x: 2.5, y: 1, z: 1.5 }, ROOM_GRID);

    service.setCursor(null);

    expect(service.active).toBe(true);
    expect(service.cursor).toBeNull();
  });

  it('holds the point the preview reported, in metres', () => {
    service.setCursor({ x: 2.5, y: 1, z: 1.5 });

    expect(service.cursor).toEqual({ x: 2.5, y: 1, z: 1.5 });
  });

  it('names the mesh whose grid is in force, and how fine it is', () => {
    service.setCursor({ x: 2.5, y: 1, z: 1.5 }, ROOM_GRID);

    expect(service.grid).toEqual({ id: 'ROOM', cell: { i: 0.25, j: 0.25, k: 0.2 } });
  });

  it('follows the pointer from one mesh into the next', () => {
    service.setCursor({ x: 2.5, y: 1, z: 1.5 }, ROOM_GRID);

    service.setCursor({ x: 15, y: 1, z: 1.5 },
      { id: 'CORRIDOR', cell: { i: 0.5, j: 0.5, k: 0.5 } });

    expect(service.grid.id).toBe('CORRIDOR');
    expect(service.grid.cell.i).toBe(0.5);
  });

  it('has no grid where the view reports none', () => {
    // Which is a scenario with no &MESH at all - outside one, the snapping
    // falls back on the nearest, so the bar has something to name (#124).
    service.setCursor({ x: 25, y: 1, z: 1.5 }, null);

    expect(service.cursor).toEqual({ x: 25, y: 1, z: 1.5 });
    expect(service.grid).toBeNull();
  });

  it('drops everything when the pointer leaves the model', () => {
    service.setCursor({ x: 2.5, y: 1, z: 1.5 }, ROOM_GRID);

    service.setCursor(null);

    expect(service.cursor).toBeNull();
    expect(service.grid).toBeNull();
  });

  it('drops everything when the view is left', () => {
    // The status bar is the whole app's, so the 3D view has to take its readout
    // back down on the way out - otherwise a stale coordinate sits there while
    // the user edits a form.
    service.enter();
    service.setCursor({ x: 2.5, y: 1, z: 1.5 }, ROOM_GRID);

    service.leave();

    expect(service.active).toBe(false);
    expect(service.cursor).toBeNull();
    expect(service.grid).toBeNull();
  });
});
