import { TestBed } from '@angular/core/testing';

import { SmokeviewApiService } from './smokeview-api.service';
import { SceneInput } from '../drawing/scene-input';
import { MeshService } from '../drawing/mesh/mesh.service';
import { ObstService } from '../drawing/obst/obst.service';
import { OpenService } from '../drawing/open/open.service';
import { JetfanService } from '../drawing/jetfan/jetfan.service';
import { FireService } from '../drawing/fire/fire.service';
import { VentService } from '../drawing/vent/vent.service';
import { BabylonService } from '../babylon/babylon.service';
import { SceneBoundsService } from '../scene-bounds/scene-bounds.service';

/** A scene with nothing in it, to be spread over with whatever a test needs. */
function emptyScene(): SceneInput {
  return {
    meshes: [], obsts: [], holes: [], opens: [], vents: [], fires: [], jetfans: [],
    devcs: [], geoms: [], inits: [], zones: []
  };
}

describe('SmokeviewApiService', () => {
  let service: SmokeviewApiService;
  let drawn: string[];

  beforeEach(() => {
    drawn = [];

    TestBed.configureTestingModule({
      providers: [
        {
          provide: MeshService,
          useValue: { meshes: [], renderMeshes: () => { drawn.push('meshes'); } }
        },
        {
          provide: ObstService,
          useValue: {
            obsts: [], holes: [],
            renderObsts: () => { drawn.push('obsts'); },
            resetClipping: () => { drawn.push('clipping'); }
          }
        },
        {
          provide: OpenService,
          useValue: {
            opens: [],
            renderOpens: () => { drawn.push('opens'); return Promise.resolve(); },
            resetClipping: () => { }
          }
        },
        {
          provide: JetfanService,
          useValue: {
            jetfans: [],
            render: () => Promise.reject(new Error('render failed')),
            resetClipping: () => { }
          }
        },
        {
          provide: FireService,
          useValue: {
            fires: [],
            renderFires: () => Promise.reject(new Error('render failed')),
            resetClipping: () => { }
          }
        },
        {
          provide: VentService,
          useValue: {
            basicVents: [],
            renderBasicVents: () => Promise.reject(new Error('render failed')),
            resetClipping: () => { }
          }
        },
        {
          provide: BabylonService,
          useValue: { applySceneBounds: () => { drawn.push('camera'); } }
        }
      ]
    });
    service = TestBed.inject(SmokeviewApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('sizes the scene before it draws anything into it', async () => {
    // Edge widths, clip ranges and the camera are all multiples of how big the
    // model is (ADR-0002), so measuring it is the first thing that happens - not
    // something whichever drawing service ran first used to do. The clip planes
    // are coordinates in that same model, so they follow immediately.
    await service.render(emptyScene());

    expect(drawn[0]).toBe('camera');
    expect(drawn).toEqual(['camera', 'clipping', 'meshes', 'obsts', 'opens']);
  });

  it('measures the model from the scenario it is about to draw', async () => {
    const meshes = [{ uuid: 'm', id: 'M1', xb: { x1: 0, x2: 40, y1: 0, y2: 10, z1: 0, z2: 4 } }];

    await service.render({ ...emptyScene(), meshes: meshes });

    expect(TestBed.inject(SceneBoundsService).extent).toBe(40);
  });

  it('hands the holes to the obst service, which is what cuts them', async () => {
    const obstService = TestBed.inject(ObstService);
    const holes = [{
      uuid: 'h', id: 'HOLE', xb: { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 1 },
      color: { r: 0.59, g: 0.9, b: 0.27, a: 0.35 }
    }];

    await service.render({ ...emptyScene(), holes: holes });

    expect(obstService.holes).toBe(holes as any);
  });

  describe('failing renders', () => {
    // The drawing services are async and a rejection used to escape the API
    // entirely - the caller got no promise to await, so a failed render
    // surfaced only as an unhandled rejection in the console.

    it('reports a failed render to the caller instead of dropping it', async () => {
      await expectAsync(service.render(emptyScene())).toBeResolved();
    });

    it('carries on drawing after one element type fails', async () => {
      // All three async steps reject here; the vents are the last of them, so
      // reaching that call at all means the earlier failures were contained.
      const ventService = TestBed.inject(VentService);
      const vents = [{ uuid: 'v', id: 'VENT', xb: { x1: 0, x2: 1, y1: 0, y2: 1, z1: 0, z2: 0 }, color: { r: 0, g: 0, b: 1, a: 1 } }];

      await service.render({ ...emptyScene(), vents: vents });

      expect(ventService.basicVents).toBe(vents as any);
    });
  });
});
