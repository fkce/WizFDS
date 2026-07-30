import { TestBed } from '@angular/core/testing';
import { find, map } from 'lodash';

import { CadService } from './cad.service';
import { MainService } from '@services/main/main.service';
import { FdsScenario } from '@services/fds-scenario/fds-scenario';
import { Fds } from '@services/fds-object/fds-object';
import { Obst } from '@services/fds-object/geometry/obst';
import { Hole } from '@services/fds-object/geometry/hole';
import { appServiceProviders } from '../../../testing/app-service-testing';

describe('CadService', () => {
  let service: CadService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...appServiceProviders(), CadService]
    });
    service = TestBed.inject(CadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

/**
 * `idAC` is a link to the drawing, not a primary key (ADR-0005).
 *
 * What the merge has to get right is that an element without one - drawn in the
 * browser, or added with the button in a form - is not mentioned by the CAD
 * payload at all, so an import must leave it alone. Until #120 every one of the
 * fourteen transform* methods rebuilt its list from the payload alone and threw
 * such an element away; the user noticed only after losing part of a model.
 */
describe('CadService merging a CAD payload', () => {
  let service: CadService;
  let fds: Fds;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...appServiceProviders(), CadService]
    });
    service = TestBed.inject(CadService);

    // One &SURF, so an element can resolve the layer name the drawing sends
    let scenario = new FdsScenario(JSON.stringify({
      id: 1, projectId: 1, name: 'merge',
      fdsObject: { geometry: { surfs: [{ id: 'WALL' }] } }
    }));
    TestBed.inject(MainService).setCurrentFdsScenario(scenario);
    fds = scenario.fdsObject;
  });

  /** An &OBST as the CAD plugin sends it: an idAC and a layer name */
  function acObst(idAC: number, x2: number): object {
    return {
      idAC: idAC,
      xb: { x1: 0, x2: x2, y1: 0, y2: 0.2, z1: 0, z2: 3 },
      surf: { type: 'surf_id', surf_id: 'WALL' },
      elevation: 0
    };
  }

  /** An &OBST already in the scenario. Without an idAC it never came from CAD. */
  function obst(id: string, idAC?: number): Obst {
    return new Obst(JSON.stringify({
      id: id, idAC: idAC,
      xb: { x1: 0, x2: 4, y1: 0, y2: 0.2, z1: 0, z2: 3 },
      surf: { type: 'surf_id', surf_id: 'WALL' }
    }), fds.geometry.surfs, fds.output.devcs);
  }

  it('matches an incoming element by idAC and rewrites what the drawing owns', () => {
    let merged = service.transformObsts([acObst(101, 6)], [obst('OBST1', 101)]);

    expect(map(merged, 'id')).toEqual(['OBST1']);
    expect(merged[0].xb.x2).toBe(6);
  });

  it('carries over an element without an idAC, untouched', () => {
    // obstruction.component.ts creates an Obst with no idAC
    let drawn = obst('OBST1');

    let merged = service.transformObsts([acObst(101, 4)], [drawn]);

    expect(merged.length).toBe(2);
    expect(find(merged, (element) => element.uuid == drawn.uuid)).toBe(drawn);
  });

  it('drops an element whose idAC the payload no longer mentions', () => {
    // Absence from the payload means "deleted in CAD" - for a CAD element only
    let merged = service.transformObsts([acObst(101, 4)], [obst('OBST1', 101), obst('OBST2', 102)]);

    expect(map(merged, 'idAC')).toEqual([101]);
  });

  it('numbers a new element past the ids of the ones drawn in the browser', () => {
    // rewriteIds sees the merged list, so the incoming &OBST cannot be given a
    // number the drawn one already holds
    let merged = service.transformObsts([acObst(101, 4)], [obst('OBST1')]);

    expect(map(merged, 'id')).toEqual(['OBST2', 'OBST1']);
  });

  it('applies the same rule to every collection, not just obstructions', () => {
    let drawn = new Hole(JSON.stringify({ id: 'HOLE1', xb: { x1: 1, x2: 2, y1: 1, y2: 2.4, z1: 0, z2: 2 } }));

    let merged = service.transformHoles(
      [{ idAC: 201, xb: { x1: 5, x2: 6, y1: 1, y2: 2.4, z1: 0, z2: 2 } }],
      [drawn]
    );

    expect(map(merged, 'id')).toEqual(['HOLE2', 'HOLE1']);
  });

  it('lets the drawing win when a layer and a surface added in the app share a name', () => {
    // A &SURF is a layer name to CAD, so these are the same surface - and two
    // &SURFs named WALL would be ambiguous in the FDS file
    let merged = service.transformSurfs([{ id: 'WALL', idAC: 301, color: [200, 100, 50] }], fds.geometry.surfs);

    expect(map(merged, 'id')).toEqual(['WALL']);
    expect(merged[0].idAC).toBe(301);
  });
});
