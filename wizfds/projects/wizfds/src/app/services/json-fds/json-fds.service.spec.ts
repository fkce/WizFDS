import { TestBed } from '@angular/core/testing';

import { JsonFdsService } from './json-fds.service';
import { appServiceProviders } from '../../../testing/app-service-testing';
import { Prop } from '@services/fds-object/output/prop';
import { Devc } from '@services/fds-object/output/devc';
import { Init } from '@services/fds-object/general/init';

describe('JsonFdsService', () => {
  let service: JsonFdsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...appServiceProviders(), JsonFdsService]
    });
    service = TestBed.inject(JsonFdsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('&INIT', () => {
    // An &INIT starts a region in a state other than ambient. The class was a
    // stub that serialised to `{}`, so a scenario could not express one at all -
    // and `general.init` held a single object where FDS allows many. See #112.

    /** An &INIT the way the model builds one. */
    function init(values: object): Init {
      return new Init(JSON.stringify(values));
    }

    it('writes the region and the state it starts in', () => {
      const written = service.simpleAmper([init({
        id: 'HOT LAYER',
        xb: { x1: 0, x2: 10, y1: 0, y2: 8, z1: 2, z2: 4 },
        temperature: 60
      })], 'init');

      expect(written.length).toBe(1);
      expect(written[0]).toContain("ID='HOT LAYER'");
      expect(written[0]).toContain('XB=0,10, 0,8, 2,4');
      expect(written[0]).toContain('TEMPERATURE=60');
      expect(written[0]).toMatch(/^&INIT .* \/$/);
    });

    it('writes a species at a concentration', () => {
      const written = service.simpleAmper([init({
        id: 'CO2', spec_id: ['CARBON DIOXIDE'], mass_fraction: [0.02]
      })], 'init');

      expect(written[0]).toContain("SPEC_ID='CARBON DIOXIDE'");
      expect(written[0]).toContain('MASS_FRACTION=0.02');
    });

    it('leaves out what the user did not set', () => {
      // FDS defaults each of these to ambient, so writing a zero would pin the
      // region to a number nobody chose.
      const written = service.simpleAmper([init({ id: 'PLAIN' })], 'init');

      expect(written[0]).not.toContain('TEMPERATURE');
      expect(written[0]).not.toContain('DENSITY');
      expect(written[0]).not.toContain('HRRPUV');
      expect(written[0]).not.toContain('SPEC_ID');
    });

    it('writes every region a scenario has', () => {
      const written = service.simpleAmper(
        [init({ id: 'A', temperature: 40 }), init({ id: 'B', temperature: 50 })], 'init');

      expect(written.length).toBe(2);
      expect(written[0]).toContain("ID='A'");
      expect(written[1]).toContain("ID='B'");
    });

    it('writes nothing at all when there are no regions', () => {
      expect(service.simpleAmper([], 'init')).toEqual([]);
    });
  });

  describe('&PROP', () => {
    // A &PROP is what tells FDS - and SmokeView - what a device *is*: a
    // sprinkler with an RTI and an activation temperature, a smoke detector with
    // an obscuration threshold. It was modelled and then never written out, so a
    // device could not refer to one.

    /** A &PROP the way the model builds it. */
    function prop(values: object): Prop {
      return new Prop(JSON.stringify(values));
    }

    it('writes the namelist for a sprinkler', () => {
      const written = service.propAmper([prop({
        id: 'SPR-68', type: 'sprinkler', smokeview_id: 'sprinkler',
        activation_temperature: 68, rti: 50, k_factor: 80
      })]);

      expect(written.length).toBe(1);
      expect(written[0]).toContain("ID='SPR-68'");
      expect(written[0]).toContain("SMOKEVIEW_ID='sprinkler'");
      expect(written[0]).toContain('ACTIVATION_TEMPERATURE=68');
      expect(written[0]).toContain('RTI=50');
      expect(written[0]).toMatch(/^&PROP .* \/$/);
    });

    it('writes what a smoke detector needs and not what it does not', () => {
      const written = service.propAmper([prop({
        id: 'SD', type: 'smoke detector', smokeview_id: 'smoke detector',
        quantity: 'CHAMBER OBSCURATION', activation_obscuration: 5
      })])[0];

      // 3.24 %/m is the FDS default, and parseAmper drops what FDS assumes
      expect(written).toContain('ACTIVATION_OBSCURATION=5');
      expect(written)
        .withContext('a detector has no sprinkler flow')
        .not.toContain('K_FACTOR');
      expect(written).not.toContain('RTI=');
    });

    it('writes nothing at all when there are no props', () => {
      expect(service.propAmper([])).toEqual([]);
    });
  });

  describe('a device that names a &PROP', () => {
    function devcWithProp(): Devc {
      const sprinkler = new Prop(JSON.stringify({ id: 'SPR-68', smokeview_id: 'sprinkler' }));
      return new Devc(JSON.stringify({
        id: 'D1', quantity_type: 'PROP', prop_id: 'SPR-68', geometrical_type: 'point',
        xyz: { x: 1, y: 2, z: 3 }
      }), [sprinkler]);
    }

    it('writes PROP_ID', () => {
      const written = service.devcAmper([devcWithProp()])[0];

      expect(written).toContain("PROP_ID='SPR-68'");
    });

    it('leaves QUANTITY to the &PROP', () => {
      // FDS reads the quantity off the &PROP when a device names one; writing
      // both is how a device ends up measuring something its prop does not
      const written = service.devcAmper([devcWithProp()])[0];

      expect(written).not.toContain('QUANTITY=');
    });

    it('still writes QUANTITY for a device that names no &PROP', () => {
      const plain = new Devc(JSON.stringify({
        id: 'D2', quantity_type: 'QUANTITY', geometrical_type: 'point',
        quantity: { id: 'Temperature', quantity: 'TEMPERATURE' },
        xyz: { x: 1, y: 2, z: 3 }
      }));

      const written = service.devcAmper([plain])[0];

      expect(written).toContain("QUANTITY='TEMPERATURE'");
      expect(written).not.toContain('PROP_ID');
    });
  });
});
