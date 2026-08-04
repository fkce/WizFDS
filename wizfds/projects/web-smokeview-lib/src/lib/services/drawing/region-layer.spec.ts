import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { BabylonService } from '../babylon/babylon.service';
import { HelpersService } from '../helpers/helpers.service';
import { SceneRegistryService } from '../babylon/scene-registry.service';
import { SceneBoundsService } from '../scene-bounds/scene-bounds.service';
import { SceneRegion, SceneXb } from './scene-input';
import { RegionLayer } from './region-layer';

const VIOLET = { r: 0.67, g: 0.39, b: 1, a: 0.25 };

function region(id: string, xb: SceneXb): SceneRegion {
  return { id: id, uuid: `${id}-uuid`, xb: xb, color: VIOLET };
}

describe('RegionLayer', () => {
  let layer: RegionLayer;
  let registry: SceneRegistryService;
  let bounds: SceneBoundsService;
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
          // No WGSL is served in the suite, so hand out a bare ShaderMaterial
          createShaderMaterial: (spec: { name: string }) => Promise.resolve(
            new BABYLON.ShaderMaterial(spec.name, scene, { vertexSource: '', fragmentSource: '' }, {})
          )
        }
      }]
    });
    registry = TestBed.inject(SceneRegistryService);
    bounds = TestBed.inject(SceneBoundsService);
    bounds.setFrom([{ x1: 0, x2: 10, y1: 0, y2: 8, z1: 0, z2: 4 }]);

    layer = new RegionLayer(
      { poolName: 'testRegions', materialName: 'testRegionShader', type: 'init' },
      TestBed.inject(BabylonService), TestBed.inject(HelpersService),
      bounds, registry, 'RegionLayerSpec');
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  /** The box a registered element actually occupies, read off its instance. */
  function drawnBox(uuid: string): SceneXb {
    const entry = registry.entryFor(uuid);
    const matrix = (entry.mesh as BABYLON.Mesh).thinInstanceGetWorldMatrices()[entry.instance];
    const corner = (x: number, y: number, z: number) =>
      BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(x, y, z), matrix);
    const low = corner(-0.5, -0.5, -0.5);
    const high = corner(0.5, 0.5, 0.5);
    return { x1: low.x, x2: high.x, y1: low.y, y2: high.y, z1: low.z, z2: high.z };
  }

  it('draws each region as the box its XB describes', async () => {
    await layer.render([region('HOT_LAYER', { x1: 0, x2: 10, y1: 0, y2: 8, z1: 2.5, z2: 4 })]);

    const box = drawnBox('HOT_LAYER-uuid');
    expect(box.x1).toBeCloseTo(0, 6);
    expect(box.x2).toBeCloseTo(10, 6);
    expect(box.z1).toBeCloseTo(2.5, 6);
    expect(box.z2).toBeCloseTo(4, 6);
  });

  it('draws every region of one layer from a single mesh', async () => {
    // They are boxes, which is the case instancing exists for (ADR-0006)
    await layer.render([
      region('A', { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 }),
      region('B', { x1: 2, x2: 3, y1: 0, y2: 1, z1: 0, z2: 1 })
    ]);

    expect(registry.entryFor('A-uuid').mesh).toBe(layer.mesh);
    expect(registry.entryFor('B-uuid').mesh).toBe(layer.mesh);
    expect(registry.entryFor('A-uuid').instance).not.toBe(registry.entryFor('B-uuid').instance);
  });

  it('registers every region it draws, by uuid', async () => {
    await layer.render([region('SHAFT', { x1: 8, x2: 10, y1: 6, y2: 8, z1: 0, z2: 4 })]);

    expect(registry.entryFor('SHAFT-uuid')).toBeTruthy();
  });

  it('forgets the regions when the scenario has none left', async () => {
    await layer.render([region('SHAFT', { x1: 8, x2: 10, y1: 6, y2: 8, z1: 0, z2: 4 })]);

    await layer.render([]);

    expect(registry.entryFor('SHAFT-uuid')).toBeUndefined();
  });

  it('answers a pick, because a region is an element like any other', async () => {
    // It used to refuse one, so that the wall inside it stayed reachable. #121
    // makes every drawn type selectable and moves that concern to where a pick is
    // resolved: a region yields to anything solid behind it (see PickService).
    await layer.render([region('SHAFT', { x1: 0, x2: 10, y1: 0, y2: 8, z1: 0, z2: 4 })]);

    expect(layer.mesh.isPickable).toBeTrue();
  });

  it('outlines the boxes, so a region reads as a region rather than a block', async () => {
    await layer.render([region('SHAFT', { x1: 8, x2: 10, y1: 6, y2: 8, z1: 0, z2: 4 })]);

    expect(layer.mesh.edgesWidth).toBe(bounds.edgeWidth);
  });

  it('does not grow the scene on repeated renders', async () => {
    const regions = [region('A', { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 })];
    await layer.render(regions);
    const afterFirst = scene.meshes.length;

    await layer.render(regions);
    await layer.render(regions);

    expect(scene.meshes.length).toBe(afterFirst);
  });

  describe('visibility', () => {
    it('takes the regions off screen and puts them back', async () => {
      await layer.render([region('A', { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 })]);

      layer.toggleVisibility();
      expect(layer.visible).toBeFalse();
      expect(layer.mesh.isEnabled()).toBeFalse();

      layer.toggleVisibility();
      expect(layer.mesh.isEnabled()).toBeTrue();
    });

    it('survives a render, so a hidden layer stays hidden', async () => {
      await layer.render([region('A', { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 })]);
      layer.toggleVisibility();

      await layer.render([region('A', { x1: 0, x2: 2, y1: 0, y2: 1, z1: 0, z2: 1 })]);

      expect(layer.mesh.isEnabled()).toBeFalse();
    });

    it('draws nothing when the scenario holds no region, however visible it is', async () => {
      await layer.render([]);

      expect(layer.mesh.isEnabled()).toBeFalse();
    });

    it('turns the wheel every three-state layer turns: filled → hidden → edges', async () => {
      // Started filled, so the scene looks as it always has when a scenario
      // loads; the button then walks the same cycle as the plane layers.
      await layer.render([region('A', { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 })]);
      expect(layer.state()).toBe('filled');

      layer.toggleVisibility();
      expect(layer.state()).toBe('hidden');

      layer.toggleVisibility();
      expect(layer.state()).toBe('edges');

      layer.toggleVisibility();
      expect(layer.state()).toBe('filled');
    });

    it('keeps the boxes on screen in the edges state - only the fill goes', async () => {
      await layer.render([region('A', { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 })]);

      layer.toggleVisibility();
      layer.toggleVisibility();

      expect(layer.state()).toBe('edges');
      expect(layer.visible).toBeTrue();
      expect(layer.mesh.isEnabled()).toBeTrue();
      expect(layer.mesh.edgesWidth).toBe(bounds.edgeWidth);
    });

    it('starts the next scene filled again', async () => {
      await layer.render([region('A', { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 })]);
      layer.toggleVisibility();

      layer.resetSceneState();

      expect(layer.state()).toBe('filled');
    });
  });

  describe('clipping', () => {
    it('starts with the planes pulled back to showing the whole model', () => {
      expect(layer.clipX).toBe(bounds.openClipAt('x'));
      expect(layer.clipZ).toBe(bounds.openClipAt('z'));
    });

    it('remembers where a plane was put', () => {
      layer.clip(3.5, 'y');

      expect(layer.clipY).toBe(3.5);
    });
  });

  it('leaves the layer able to draw into the next scene', async () => {
    await layer.render([region('A', { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 })]);

    layer.resetSceneState();
    await layer.render([region('A', { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 })]);

    expect(registry.entryFor('A-uuid').mesh).toBe(layer.mesh);
  });
});
