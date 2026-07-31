import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { ObstService } from './obst.service';
import { BabylonService } from '../../babylon/babylon.service';
import { SceneRegistryService } from '../../babylon/scene-registry.service';
import { PickService } from '../../picking/pick.service';
import { SceneObst, SceneXb } from '../scene-input';

const OPAQUE = { r: 1, g: 0.8, b: 0, a: 1 };

function makeObst(id: string, xb: SceneXb): SceneObst {
  return { id: id, uuid: `${id}-uuid`, xb: xb, surfId: 'WALL', permitHole: true, color: OPAQUE };
}

const WEST: SceneXb = { x1: 0, x2: 0.2, y1: 0, y2: 6, z1: 0, z2: 3 };
const EAST: SceneXb = { x1: 10, x2: 10.2, y1: 0, y2: 6, z1: 0, z2: 3 };

/**
 * Redrawing one obst without rebuilding the scene (#123).
 *
 * A full `renderObsts()` rebuilds both instance pools and re-cuts every opening
 * through CSG; at the ten thousand obsts this module is built for that is
 * seconds of work, and moving one wall must not cost it (ADR-0004).
 */
describe('ObstService - redrawing one obst', () => {
  let service: ObstService;
  let registry: SceneRegistryService;
  let picking: PickService;
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);

    TestBed.configureTestingModule({
      providers: [{
        provide: BabylonService,
        useValue: {
          scene: scene,
          camera: { setPosition: () => { }, setTarget: () => { } },
          loadShaderSources: () => Promise.reject(new Error('no shader assets under test')),
          createShaderMaterial: () => Promise.reject(new Error('no shader assets under test'))
        }
      }]
    });
    service = TestBed.inject(ObstService);
    registry = TestBed.inject(SceneRegistryService);
    picking = TestBed.inject(PickService);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  function render(obsts: SceneObst[]): void {
    service.obsts = obsts;
    service.holes = [];
    service.renderObsts();
  }

  it('draws the obst at its new box', () => {
    const west = makeObst('W', WEST);
    render([west, makeObst('E', EAST)]);

    const moved = { ...west, xb: { ...WEST, x1: 4, x2: 4.2 } };
    service.obsts = [moved, makeObst('E', EAST)];
    service.redrawObst(moved);

    expect(registry.entryFor('W-uuid').xb.x1).toBe(4);
  });

  it('leaves every other obst where it was', () => {
    const west = makeObst('W', WEST);
    render([west, makeObst('E', EAST)]);

    const moved = { ...west, xb: { ...WEST, x1: 4, x2: 4.2 } };
    service.obsts = [moved, makeObst('E', EAST)];
    service.redrawObst(moved);

    expect(registry.entryFor('E-uuid').xb).toEqual(EAST);
  });

  it('adds an obst the scene did not have', () => {
    render([makeObst('W', WEST)]);

    const added = makeObst('N', { x1: 1, x2: 2, y1: 6, y2: 6.2, z1: 0, z2: 3 });
    service.obsts = [makeObst('W', WEST), added];
    service.redrawObst(added);

    expect(registry.entryFor('N-uuid')).toBeDefined();
  });

  it('takes a deleted obst off the screen', () => {
    render([makeObst('W', WEST), makeObst('E', EAST)]);

    service.obsts = [makeObst('E', EAST)];
    service.removeObst('W-uuid');

    expect(registry.entryFor('W-uuid')).toBeUndefined();
    expect(registry.entryFor('E-uuid')).toBeDefined();
  });

  it('keeps a selected obst on a mesh of its own', () => {
    // A selected obst has been singled out of its pool so that it can be edited
    // (ADR-0006); redrawing it must not put it back and leave the highlight
    // pointing at a pooled instance
    const west = makeObst('W', WEST);
    render([west, makeObst('E', EAST)]);
    service.promote('W-uuid');

    const moved = { ...west, xb: { ...WEST, x1: 4, x2: 4.2 } };
    service.obsts = [moved, makeObst('E', EAST)];
    service.redrawObst(moved);

    expect(service.ownMeshFor('W-uuid')).toBeDefined();
    expect(registry.entryFor('W-uuid').instance).toBeUndefined();
  });

  it('says nothing about an obst the scene never drew', () => {
    render([makeObst('W', WEST)]);

    expect(() => service.removeObst('nobody')).not.toThrow();
  });

  it('draws a redrawn obst where a pick can still reach it', () => {
    const west = makeObst('W', WEST);
    render([west]);

    const moved = { ...west, xb: { x1: 4, x2: 4.2, y1: 0, y2: 6, z1: 0, z2: 3 } };
    service.obsts = [moved];
    service.redrawObst(moved);

    picking.pick(new BABYLON.Ray(
      new BABYLON.Vector3(-5, 3, 1.5), new BABYLON.Vector3(1, 0, 0), 100));

    expect(picking.lastSelected?.uuid).toBe('W-uuid');
  });
});
