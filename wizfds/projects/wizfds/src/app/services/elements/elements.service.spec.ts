import { TestBed } from '@angular/core/testing';

import { ElementsService } from './elements.service';
import { MainService } from '@services/main/main.service';
import { FdsScenario } from '@services/fds-scenario/fds-scenario';
import { appServiceProviders } from '../../../testing/app-service-testing';

/**
 * Finding an element of the scenario, whichever way it is named.
 *
 * `uuid` is the identity everything in the app speaks (ADR-0005); `idAC` is what
 * arrives from the CAD plugin and is optional, because an element drawn in the
 * browser has none. Both directions live here, so the CAD bridge has one place
 * to translate through instead of a cascade of its own.
 */
describe('ElementsService', () => {
  let service: ElementsService;

  /** One of everything the CAD bridge can name, with and without an idAC. */
  function scenario(): FdsScenario {
    return new FdsScenario(JSON.stringify({
      id: 1, projectId: 1, name: 'lookup',
      fdsObject: {
        geometry: {
          meshes: [{ id: 'MESH1', uuid: 'mesh-uuid', idAC: 401 }],
          obsts: [
            { id: 'OBST1', uuid: 'obst-uuid', idAC: 101 },
            // Added with the button in the form, so never in the drawing
            { id: 'OBST2', uuid: 'drawn-uuid' }
          ],
          holes: [{ id: 'HOLE1', uuid: 'hole-uuid', idAC: 102 }],
          surfs: [{ id: 'WALL', uuid: 'surf-uuid', idAC: 301 }]
        },
        ventilation: {
          jetfans: [{ id: 'JF1', uuid: 'jetfan-uuid', idAC: 501 }]
        },
        specie: {
          vents: [{ id: 'SPEV1', uuid: 'specvent-uuid', idAC: 601 }]
        },
        general: {
          zones: [{ id: 'SHAFT', uuid: 'zone-uuid' }]
        }
      }
    }));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...appServiceProviders()] });
    service = TestBed.inject(ElementsService);
    TestBed.inject(MainService).setCurrentFdsScenario(scenario());
  });

  describe('by uuid', () => {
    it('finds an element and says what kind it is', () => {
      const found = service.byUuid('obst-uuid');

      expect(found.type).toBe('obst');
      expect(found.element.id).toBe('OBST1');
    });

    it('looks in every list, not only the geometry', () => {
      expect(service.byUuid('jetfan-uuid').type).toBe('jetfan');
      expect(service.byUuid('zone-uuid').type).toBe('zone');
    });

    it('finds an element that was never in the drawing', () => {
      // The whole point of keying on uuid: an obst added in the form has no idAC
      expect(service.byUuid('drawn-uuid').element.id).toBe('OBST2');
    });

    it('has nothing to say about a uuid the scenario does not hold', () => {
      expect(service.byUuid('never-drawn')).toBeUndefined();
    });
  });

  describe('by idAC', () => {
    it('finds the element the drawing knows', () => {
      const found = service.byIdAC(101);

      expect(found.type).toBe('obst');
      expect(found.element.uuid).toBe('obst-uuid');
    });

    it('reads an idAC that arrived as a string', () => {
      // A websocket message carries whatever JSON held
      expect(service.byIdAC('401').type).toBe('mesh');
    });

    it('finds a &SURF, which has no shape in the 3D preview', () => {
      // The cascade this replaces had a case for surfs but never looked in the
      // list, so a layer clicked in CAD opened nothing
      expect(service.byIdAC(301).type).toBe('surf');
    });

    it('finds an injection &VENT', () => {
      // It answered 'spev' where its own consumer expected 'spec', so a species
      // vent clicked in CAD opened nothing either
      expect(service.byIdAC(601).type).toBe('spec');
    });

    it('treats a missing idAC as no element at all', () => {
      // 0 is what the model stores for "not in the drawing", and every element
      // drawn in the browser has it - one of them must never answer for another
      expect(service.byIdAC(0)).toBeUndefined();
      expect(service.byIdAC('')).toBeUndefined();
      expect(service.byIdAC(undefined)).toBeUndefined();
    });
  });

  describe('idACOf', () => {
    it('gives the link to the drawing', () => {
      expect(service.idACOf('hole-uuid')).toBe(102);
    });

    it('gives none for an element drawn in the browser', () => {
      // Nothing can be shown in a drawing that does not contain it
      expect(service.idACOf('drawn-uuid')).toBeUndefined();
    });
  });

  describe('listOf', () => {
    it('gives every element of one kind', () => {
      expect(service.listOf('obst').map(obst => obst.id)).toEqual(['OBST1', 'OBST2']);
    });

    it('gives an empty list for a kind the scenario has none of', () => {
      expect(service.listOf('fire')).toEqual([]);
    });
  });
});
