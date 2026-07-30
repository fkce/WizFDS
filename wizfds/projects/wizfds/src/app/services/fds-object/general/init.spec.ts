import { Init } from './init';
import { General } from './general';

/** An &INIT the way the model builds one. */
function init(values: object): Init {
  return new Init(JSON.stringify(values));
}

/**
 * An &INIT is how a scenario starts anything other than ambient - a warm layer
 * under a ceiling, a volume already full of smoke, a species at a concentration.
 *
 * The class existed as a stub that read nothing out of its JSON and serialised
 * to `{}`, so every scenario carried an empty object and no scenario could
 * express an initial condition at all. See #112.
 */
describe('Init', () => {

  it('keeps the region it was given', () => {
    const region = init({ id: 'HOT LAYER', xb: { x1: 0, x2: 10, y1: 0, y2: 8, z1: 2, z2: 4 } });

    expect(region.id).toBe('HOT LAYER');
    expect(region.xb.x1).toBe(0);
    expect(region.xb.x2).toBe(10);
    expect(region.xb.z1).toBe(2);
    expect(region.xb.z2).toBe(4);
  });

  it('keeps the initial state it was given', () => {
    const region = init({
      temperature: 60, density: 1.1, spec_id: ['CARBON DIOXIDE'],
      mass_fraction: [0.02], hrrpuv: 250, cell_centered: true
    });

    expect(region.temperature).toBe(60);
    expect(region.density).toBe(1.1);
    expect(region.spec_id).toEqual(['CARBON DIOXIDE']);
    expect(region.mass_fraction).toEqual([0.02]);
    expect(region.hrrpuv).toBe(250);
    expect(region.cell_centered).toBe(true);
  });

  it('gives an init a uuid of its own', () => {
    // ADR-0005: uuid is what identifies an element everywhere in the system,
    // which is what the preview and the form will both key on.
    const one = init({ id: 'A' });
    const other = init({ id: 'B' });

    expect(one.uuid).toBeTruthy();
    expect(one.uuid).not.toBe(other.uuid);
  });

  it('keeps a uuid it was loaded with', () => {
    expect(init({ id: 'A', uuid: 'stored-uuid' }).uuid).toBe('stored-uuid');
  });

  it('survives a round trip through toJSON', () => {
    const values = {
      id: 'HOT LAYER', uuid: 'stored-uuid',
      xb: { x1: 0, x2: 10, y1: 0, y2: 8, z1: 2, z2: 4 },
      temperature: 60, spec_id: ['CARBON DIOXIDE'], mass_fraction: [0.02]
    };

    const reloaded = new Init(JSON.stringify(init(values).toJSON()));

    expect(reloaded.toJSON()).toEqual(init(values).toJSON());
    expect(reloaded.id).toBe('HOT LAYER');
    expect(reloaded.temperature).toBe(60);
  });

  it('reads a coordinate that came through a form as a number', () => {
    // Xb converts on assignment - see primitives.ts and #111. Pinned here too,
    // because the preview does arithmetic on these.
    const region = init({ xb: { x1: '1.5', x2: '4', y1: '0', y2: '2', z1: '0', z2: '3' } });

    expect(region.xb.x1).toBe(1.5);
    expect(region.xb.x2).toBe(4);
  });

  it('is empty rather than broken when it is given nothing', () => {
    const region = init({});

    expect(region.id).toBe('');
    expect(region.uuid).toBeTruthy();
    expect(region.xb).toBeTruthy();
  });
});

describe('General holding inits', () => {
  // FDS allows many &INIT regions - a scenario can start a warm layer under one
  // ceiling and a smoke volume in another room. The model held exactly one.

  it('reads a list of inits', () => {
    const general = new General(JSON.stringify({
      inits: [{ id: 'A' }, { id: 'B' }]
    }));

    expect(general.inits.length).toBe(2);
    expect(general.inits[0].id).toBe('A');
    expect(general.inits[1].id).toBe('B');
  });

  it('has no inits when the scenario names none', () => {
    expect(new General(JSON.stringify({})).inits).toEqual([]);
  });

  it('carries a scenario written before the list existed', () => {
    // Every scenario saved so far holds `general.init`, a single object. Losing
    // it on load would silently drop a region the user had entered.
    const general = new General(JSON.stringify({
      init: { id: 'OLD', temperature: 40 }
    }));

    expect(general.inits.length).toBe(1);
    expect(general.inits[0].id).toBe('OLD');
    expect(general.inits[0].temperature).toBe(40);
  });

  it('drops the empty init every old scenario carries', () => {
    // The stub serialised to `{}`, so `general.init` is an empty object in every
    // scenario saved to date. Migrating that into a region would give every
    // existing scenario a nameless &INIT it never asked for.
    expect(new General(JSON.stringify({ init: {} })).inits).toEqual([]);
  });

  it('writes the inits back out', () => {
    const general = new General(JSON.stringify({ inits: [{ id: 'A' }] }));

    expect(general.toJSON()['inits'].length).toBe(1);
    expect(general.toJSON()['inits'][0]['id']).toBe('A');
  });
});
