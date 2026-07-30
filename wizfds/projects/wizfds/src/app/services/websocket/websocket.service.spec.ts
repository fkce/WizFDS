import { TestBed } from '@angular/core/testing';
import { find, map } from 'lodash';

import { WebsocketService } from './websocket.service';
import { MainService } from '@services/main/main.service';
import { FdsScenario } from '@services/fds-scenario/fds-scenario';
import { Fds } from '@services/fds-object/fds-object';
import { appServiceProviders } from '../../../testing/app-service-testing';

describe('WebsocketService', () => {
  let service: WebsocketService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...appServiceProviders(), WebsocketService]
    });
    service = TestBed.inject(WebsocketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

/**
 * The definition of done for #120: import a CAD model, add an &OBST from the
 * form, import from CAD again - the added &OBST is still there.
 *
 * `fExport` replaces every collection with whatever its transform returns, so the
 * whole import path has to be exercised, not one transform method.
 */
describe('importing geometry from CAD', () => {
  let service: WebsocketService;
  let fds: Fds;

  /**
   * A model that came from CAD - a mesh, a wall layer, one wall - plus an &OBST
   * added afterwards with the button in the form, which has no idAC.
   */
  function scenario(): FdsScenario {
    return new FdsScenario(JSON.stringify({
      id: 1, projectId: 1, name: 'garage',
      fdsObject: {
        geometry: {
          surfs: [{ id: 'inert', editable: false }, { id: 'WALL', idAC: 301 }],
          meshes: [{ id: 'MESH1', idAC: 401, xb: { x1: 0, x2: 10, y1: 0, y2: 8, z1: 0, z2: 4 } }],
          obsts: [
            {
              id: 'OBST1', uuid: 'from-cad', idAC: 101,
              xb: { x1: 0, x2: 4, y1: 2, y2: 2.2, z1: 0, z2: 3 },
              surf: { type: 'surf_id', surf_id: 'WALL' }
            },
            {
              id: 'OBST2', uuid: 'drawn-in-the-browser',
              xb: { x1: 6, x2: 8, y1: 2, y2: 2.2, z1: 0, z2: 3 },
              surf: { type: 'surf_id', surf_id: 'WALL' }
            }
          ]
        }
      }
    }));
  }

  /** What the plugin sends back: the same drawing, with the wall made longer */
  function payload(): object {
    return {
      geometry: {
        meshes: [{ idAC: 401, xb: { x1: 0, x2: 10, y1: 0, y2: 8, z1: 0, z2: 4 } }],
        surfs: [{ id: 'WALL', idAC: 301, color: [200, 100, 50] }],
        obsts: [{
          idAC: 101, elevation: 0,
          xb: { x1: 0, x2: 5, y1: 2, y2: 2.2, z1: 0, z2: 3 },
          surf: { type: 'surf_id', surf_id: 'WALL' }
        }],
        holes: [], opens: [], geoms: []
      },
      ventilation: { surfs: [], vents: [], jetfans: [] },
      specie: { surfs: [], vents: [] },
      fires: { fires: [] },
      output: { devcs: [], slcfs: [] }
    };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...appServiceProviders(), WebsocketService]
    });
    service = TestBed.inject(WebsocketService);

    let current = scenario();
    TestBed.inject(MainService).setCurrentFdsScenario(current);
    fds = current.fdsObject;

    // requestMessage() hands fExport the scenario's fds object
    service['fds'] = fds;
    service['fExport'](payload());
  });

  it('leaves the &OBST added in the form in place', () => {
    let drawn = find(fds.geometry.obsts, (obst) => obst.uuid == 'drawn-in-the-browser');

    expect(drawn).toBeDefined();
    expect(drawn.id).toBe('OBST2');
    expect(drawn.xb.x1).toBe(6);
  });

  it('still updates the wall the drawing owns, and duplicates nothing', () => {
    expect(map(fds.geometry.obsts, 'id')).toEqual(['OBST1', 'OBST2']);
    expect(find(fds.geometry.obsts, (obst) => obst.uuid == 'from-cad').xb.x2).toBe(5);
  });

  it('adds no second inert layer', () => {
    // The default &SURF is not in the payload, so the merge carries the existing
    // one over - fExport must not add another
    expect(map(fds.geometry.surfs, 'id')).toEqual(['WALL', 'inert']);
  });
});
