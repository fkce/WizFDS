import { TestBed } from '@angular/core/testing';

import { SmokeviewApiService } from './smokeview-api.service';
import { SceneHole, SceneInput, SceneObst, SceneVent, SceneXb } from '../drawing/scene-input';
import { MeshService } from '../drawing/mesh/mesh.service';
import { ObstService } from '../drawing/obst/obst.service';
import { OpenService } from '../drawing/open/open.service';
import { JetfanService } from '../drawing/jetfan/jetfan.service';
import { FireService } from '../drawing/fire/fire.service';
import { VentService } from '../drawing/vent/vent.service';
import { HoleRegionService } from '../drawing/hole/hole-region.service';
import { HoleService } from '../drawing/hole/hole.service';
import { BabylonService } from '../babylon/babylon.service';
import { PickService } from '../picking/pick.service';

const OPAQUE = { r: 1, g: 0.8, b: 0, a: 1 };
const GREEN = { r: 0.6, g: 0.9, b: 0.3, a: 0.35 };

function obst(uuid: string, xb: SceneXb): SceneObst {
  return { uuid: uuid, id: uuid.toUpperCase(), xb: xb, surfId: 'WALL', permitHole: true, color: OPAQUE };
}

function hole(uuid: string, xb: SceneXb): SceneHole {
  return { uuid: uuid, id: uuid.toUpperCase(), xb: xb, color: GREEN };
}

function vent(uuid: string, xb: SceneXb): SceneVent {
  return { uuid: uuid, id: uuid.toUpperCase(), xb: xb, color: OPAQUE };
}

const WALL: SceneXb = { x1: 0, x2: 0.2, y1: 0, y2: 6, z1: 0, z2: 3 };
const FAR_WALL: SceneXb = { x1: 10, x2: 10.2, y1: 0, y2: 6, z1: 0, z2: 3 };
const DOORWAY: SceneXb = { x1: -0.1, x2: 0.3, y1: 1, y2: 2, z1: 0, z2: 2.1 };

/** A scene with nothing in it, to be spread over with whatever a test needs. */
function emptyScene(): SceneInput {
  return {
    meshes: [], obsts: [], holes: [], opens: [], vents: [], fires: [], jetfans: [],
    devcs: [], geoms: [], inits: [], zones: []
  };
}

/**
 * Redrawing what changed, instead of the whole scenario (#123).
 *
 * `render()` rebuilds the instance pools, cuts every &HOLE out through CSG and
 * builds the materials - seconds of work at the scale this module is built for.
 * The app applied the command itself, so it can say what changed, and this is
 * the entry point that takes it (ADR-0004, the 2026-07-30 note).
 */
describe('SmokeviewApiService.update', () => {
  let service: SmokeviewApiService;
  let obstService: any;
  let ventService: any;
  let holeRegion: any;
  let picking: any;
  let redrawn: string[];

  beforeEach(() => {
    redrawn = [];

    obstService = {
      obsts: [] as readonly SceneObst[], holes: [] as readonly SceneHole[],
      renderObsts: () => { redrawn.push('every obst'); },
      redrawObst: (changed: SceneObst) => { redrawn.push(`obst ${changed.uuid}`); },
      removeObst: (uuid: string) => { redrawn.push(`obst ${uuid} gone`); },
      resetClipping: () => { }
    };
    ventService = {
      basicVents: [] as readonly SceneVent[],
      renderBasicVents: () => { redrawn.push('vents'); return Promise.resolve(); },
      resetClipping: () => { }
    };
    holeRegion = {
      holes: [] as readonly SceneHole[],
      renderHoles: () => { redrawn.push('holes'); return Promise.resolve(); },
      resetClipping: () => { }
    };
    picking = {
      redrawSelection: () => { redrawn.push('selection'); },
      setSelected: () => { }
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ObstService, useValue: obstService },
        { provide: VentService, useValue: ventService },
        { provide: HoleRegionService, useValue: holeRegion },
        { provide: PickService, useValue: picking },
        {
          provide: MeshService,
          useValue: { meshes: [], renderMeshes: () => { redrawn.push('meshes'); } }
        },
        {
          provide: OpenService,
          useValue: { opens: [], renderOpens: () => Promise.resolve(), resetClipping: () => { } }
        },
        {
          provide: JetfanService,
          useValue: { jetfans: [], render: () => Promise.resolve(), resetClipping: () => { } }
        },
        {
          provide: FireService,
          useValue: { fires: [], renderFires: () => Promise.resolve(), resetClipping: () => { } }
        },
        { provide: BabylonService, useValue: { applySceneBounds: () => { } } }
      ]
    });
    service = TestBed.inject(SmokeviewApiService);
  });

  /** Draw a starting scenario, and forget what that took. */
  async function drawn(scene: Partial<SceneInput>): Promise<void> {
    await service.render({ ...emptyScene(), ...scene });
    redrawn = [];
  }

  it('redraws only the obst that moved', async () => {
    await drawn({ obsts: [obst('w1', WALL), obst('w2', FAR_WALL)] });

    const moved = obst('w1', { ...WALL, x1: 4, x2: 4.2 });
    await service.update({ changed: [{ type: 'obst', element: moved }] });

    expect(redrawn).not.toContain('every obst');
    expect(redrawn).toContain('obst w1');
    expect(redrawn).not.toContain('obst w2');
  });

  it('leaves the obst service holding the scenario as it now is', async () => {
    // The next full render has to draw what the incremental one drew
    await drawn({ obsts: [obst('w1', WALL)] });

    const moved = obst('w1', { ...WALL, x1: 4, x2: 4.2 });
    await service.update({ changed: [{ type: 'obst', element: moved }] });

    expect(obstService.obsts.map((o: SceneObst) => o.xb.x1)).toEqual([4]);
  });

  it('draws an obst the scenario did not have', async () => {
    await drawn({ obsts: [obst('w1', WALL)] });

    await service.update({ added: [{ type: 'obst', element: obst('w2', FAR_WALL) }] });

    expect(redrawn).toContain('obst w2');
    expect(obstService.obsts.length).toBe(2);
  });

  it('takes a deleted obst off the screen and out of the list', async () => {
    await drawn({ obsts: [obst('w1', WALL), obst('w2', FAR_WALL)] });

    await service.update({ removed: [{ type: 'obst', uuid: 'w1' }] });

    expect(redrawn).toContain('obst w1 gone');
    expect(obstService.obsts.map((o: SceneObst) => o.uuid)).toEqual(['w2']);
  });

  it('redraws a layer that is not pooled, with its new list', async () => {
    await drawn({ vents: [vent('v1', { x1: 0, x2: 2, y1: 0, y2: 0, z1: 0, z2: 2 })] });

    const moved = vent('v1', { x1: 4, x2: 6, y1: 0, y2: 0, z1: 0, z2: 2 });
    await service.update({ changed: [{ type: 'vent', element: moved }] });

    expect(redrawn).toContain('vents');
    expect(ventService.basicVents[0].xb.x1).toBe(4);
  });

  it('leaves alone the layers the change never mentions', async () => {
    await drawn({
      obsts: [obst('w1', WALL)],
      vents: [vent('v1', { x1: 0, x2: 2, y1: 0, y2: 0, z1: 0, z2: 2 })]
    });

    const moved = obst('w1', { ...WALL, x1: 4, x2: 4.2 });
    await service.update({ changed: [{ type: 'obst', element: moved }] });

    expect(redrawn).not.toContain('vents');
    expect(redrawn).not.toContain('meshes');
  });

  describe('a &HOLE that moves', () => {
    // An opening is cut out of every obst it overlaps, so moving one changes
    // both the obsts it has left and the obsts it has reached.

    it('recuts the obst it was cut out of', async () => {
      await drawn({ obsts: [obst('w1', WALL), obst('w2', FAR_WALL)], holes: [hole('d', DOORWAY)] });

      const moved = hole('d', { ...DOORWAY, x1: 9.9, x2: 10.3 });
      await service.update({ changed: [{ type: 'hole', element: moved }] });

      expect(redrawn).toContain('obst w1');
    });

    it('cuts the obst it has moved into', async () => {
      await drawn({ obsts: [obst('w1', WALL), obst('w2', FAR_WALL)], holes: [hole('d', DOORWAY)] });

      const moved = hole('d', { ...DOORWAY, x1: 9.9, x2: 10.3 });
      await service.update({ changed: [{ type: 'hole', element: moved }] });

      expect(redrawn).toContain('obst w2');
    });

    it('redraws the opening in its own right as well', async () => {
      await drawn({ obsts: [obst('w1', WALL)], holes: [hole('d', DOORWAY)] });

      const moved = hole('d', { ...DOORWAY, x1: 0.05, x2: 0.45 });
      await service.update({ changed: [{ type: 'hole', element: moved }] });

      expect(redrawn).toContain('holes');
    });

    it('restores the obst a deleted opening was cut out of', async () => {
      await drawn({ obsts: [obst('w1', WALL)], holes: [hole('d', DOORWAY)] });

      await service.update({ removed: [{ type: 'hole', uuid: 'd' }] });

      expect(redrawn).toContain('obst w1');
      expect(obstService.holes.length).toBe(0);
    });
  });

  it('moves the highlight with what was selected', async () => {
    // The outline is drawn around the box the element occupied when it was
    // selected, so an element that moves leaves its highlight behind
    await drawn({ obsts: [obst('w1', WALL)] });

    await service.update({
      changed: [{ type: 'obst', element: obst('w1', { ...WALL, x1: 4, x2: 4.2 }) }]
    });

    expect(redrawn).toContain('selection');
  });

  it('applies overlapping updates one after another', async () => {
    // Ctrl+Z held down sends them faster than they are drawn, and each one folds
    // its change into the scene the last one left - so they cannot interleave
    await drawn({ obsts: [obst('w1', WALL)] });

    const first = service.update({
      changed: [{ type: 'obst', element: obst('w1', { ...WALL, x1: 1, x2: 1.2 }) }]
    });
    const second = service.update({
      changed: [{ type: 'obst', element: obst('w1', { ...WALL, x1: 2, x2: 2.2 }) }]
    });
    await Promise.all([first, second]);

    expect(redrawn).toEqual(['obst w1', 'selection', 'obst w1', 'selection']);
    expect(obstService.obsts[0].xb.x1).toBe(2);
  });

  it('does nothing at all when the change is empty', async () => {
    await drawn({ obsts: [obst('w1', WALL)] });

    await service.update({ changed: [], added: [], removed: [] });

    expect(redrawn).toEqual([]);
  });

  it('does nothing before anything has been rendered', async () => {
    await service.update({
      changed: [{ type: 'obst', element: obst('w1', WALL) }]
    });

    expect(redrawn).toEqual([]);
  });
});
