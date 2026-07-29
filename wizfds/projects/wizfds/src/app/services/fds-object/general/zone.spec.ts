import { Zone } from './zone';
import { General } from './general';

/** A &ZONE the way the model builds one. */
function zone(values: object): Zone {
  return new Zone(JSON.stringify(values));
}

/**
 * A &ZONE is a sealed pressure zone - a lift shaft, a stairwell, a room the
 * smoke has to be kept out of. FDS solves the pressure in each one separately
 * and lets them leak into each other through `LEAK_AREA`.
 *
 * The model had no class, no field on `Fds` and no form: the only trace was the
 * attribute table. See #112.
 */
describe('Zone', () => {

  it('keeps the region it was given', () => {
    const pressureZone = zone({
      id: 'SHAFT', xb: { x1: 0, x2: 3, y1: 0, y2: 3, z1: 0, z2: 30 }
    });

    expect(pressureZone.id).toBe('SHAFT');
    expect(pressureZone.xb.x2).toBe(3);
    expect(pressureZone.xb.z2).toBe(30);
  });

  it('keeps the leakage it was given', () => {
    expect(zone({ id: 'SHAFT', leak_area: 0.05 }).leak_area).toBe(0.05);
  });

  it('starts sealed, as FDS does', () => {
    // LEAK_AREA defaults to zero and PERIODIC to false - a zone that leaks or
    // wraps around is something the user has to ask for.
    const pressureZone = zone({ id: 'SHAFT' });

    expect(pressureZone.leak_area).toBe(0);
    expect(pressureZone.periodic).toBe(false);
  });

  it('gives a zone a uuid of its own', () => {
    const one = zone({ id: 'A' });
    const other = zone({ id: 'B' });

    expect(one.uuid).toBeTruthy();
    expect(one.uuid).not.toBe(other.uuid);
  });

  it('survives a round trip through toJSON', () => {
    const values = {
      id: 'SHAFT', uuid: 'stored-uuid',
      xb: { x1: 0, x2: 3, y1: 0, y2: 3, z1: 0, z2: 30 },
      leak_area: 0.05, periodic: true
    };

    const reloaded = new Zone(JSON.stringify(zone(values).toJSON()));

    expect(reloaded.toJSON()).toEqual(zone(values).toJSON());
    expect(reloaded.leak_area).toBe(0.05);
    expect(reloaded.periodic).toBe(true);
  });

  it('reads a leak area that came through a form as a number', () => {
    expect(zone({ id: 'SHAFT', leak_area: '0.05' }).leak_area).toBe(0.05);
  });
});

describe('General holding zones', () => {

  it('reads a list of zones', () => {
    const general = new General(JSON.stringify({
      zones: [{ id: 'SHAFT' }, { id: 'STAIR' }]
    }));

    expect(general.zones.length).toBe(2);
    expect(general.zones[1].id).toBe('STAIR');
  });

  it('has no zones when the scenario names none', () => {
    expect(new General(JSON.stringify({})).zones).toEqual([]);
  });

  it('writes the zones back out', () => {
    const general = new General(JSON.stringify({ zones: [{ id: 'SHAFT' }] }));

    expect(general.toJSON()['zones'].length).toBe(1);
    expect(general.toJSON()['zones'][0]['id']).toBe('SHAFT');
  });
});
