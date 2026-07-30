import { TestBed } from '@angular/core/testing';

import { SceneViewService } from './scene-view.service';
import { ObstService } from '../drawing/obst/obst.service';
import { MeshService } from '../drawing/mesh/mesh.service';
import { OpenService } from '../drawing/open/open.service';
import { VentService } from '../drawing/vent/vent.service';
import { JetfanService } from '../drawing/jetfan/jetfan.service';
import { FireService } from '../drawing/fire/fire.service';
import { DevcService } from '../drawing/devc/devc.service';
import { GeomService } from '../drawing/geom/geom.service';
import { InitService } from '../drawing/init/init.service';
import { ZoneService } from '../drawing/zone/zone.service';
import { HoleRegionService } from '../drawing/hole/hole-region.service';
import { BabylonService } from '../babylon/babylon.service';
import { SceneBoundsService } from '../scene-bounds/scene-bounds.service';

/** A layer drawn through ClippedPlaneLayer: edges only → edges and fill → hidden. */
function planeLayer(record: string[], name: string) {
  return {
    visibility: 0,
    toogleVisibility: () => record.push(`toggle:${name}`),
    clip: (metres: number, axis: string) => record.push(`clip:${name}:${axis}:${metres}`),
    resetClipping: () => record.push(`reset:${name}`)
  };
}

/** A layer that is simply drawn or not - a region, a geom, a device. */
function twoStateLayer(record: string[], name: string) {
  return {
    visible: true,
    toggleVisibility: () => record.push(`toggle:${name}`),
    clip: (metres: number, axis: string) => record.push(`clip:${name}:${axis}:${metres}`),
    resetClipping: () => record.push(`reset:${name}`)
  };
}

describe('SceneViewService', () => {
  let service: SceneViewService;
  let record: string[];

  beforeEach(() => {
    record = [];

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ObstService,
          useValue: {
            wireframe: false,
            outlined: true,
            toggleWireframe: () => record.push('toggle:wireframe'),
            toggleEdgesRendering: () => record.push('toggle:obstOutline'),
            clip: (metres: number, axis: string) => record.push(`clip:obst:${axis}:${metres}`),
            clipPlane: (axis: string) => (axis === 'z' ? 2.5 : 0),
            resetClipping: () => record.push('reset:obst')
          }
        },
        {
          provide: MeshService,
          // Its own numbering, which is not the plane layers': 1 is edges only,
          // 2 is edges and fill, 0 is hidden.
          useValue: { visibility: 1, toogleVisibility: () => record.push('toggle:mesh') }
        },
        { provide: OpenService, useValue: planeLayer(record, 'open') },
        {
          provide: VentService,
          useValue: {
            basicVisibility: 0,
            toogleBasicVisibility: () => record.push('toggle:vent'),
            clipBasic: (metres: number, axis: string) => record.push(`clip:vent:${axis}:${metres}`),
            resetClipping: () => record.push('reset:vent')
          }
        },
        {
          provide: JetfanService,
          useValue: {
            outlined: true,
            setEdgesRendering: (on: boolean) => record.push(`jetfanOutline:${on}`),
            clip: (metres: number, axis: string) => record.push(`clip:jetfan:${axis}:${metres}`),
            resetClipping: () => record.push('reset:jetfan')
          }
        },
        { provide: FireService, useValue: planeLayer(record, 'fire') },
        { provide: DevcService, useValue: twoStateLayer(record, 'devc') },
        { provide: GeomService, useValue: twoStateLayer(record, 'geom') },
        { provide: InitService, useValue: twoStateLayer(record, 'init') },
        { provide: ZoneService, useValue: twoStateLayer(record, 'zone') },
        { provide: HoleRegionService, useValue: twoStateLayer(record, 'hole') },
        {
          provide: BabylonService,
          useValue: {
            applySceneBounds: () => record.push('zoomExtents'),
            frameBox: (box: any) => record.push(`frame:${box.x1}-${box.x2}`)
          }
        },
        {
          provide: SceneBoundsService,
          useValue: {
            clipMin: () => -1, clipMax: () => 11, clipStep: () => 0.1
          }
        }
      ]
    });

    service = TestBed.inject(SceneViewService);
  });

  it('names every layer the menu in the library used to drive', () => {
    // The control moved to the host (ADR-0010), so the list of what there is to
    // control has to cross the boundary rather than be spelled out again there.
    //
    // No &OBST among them, as there was no button for one: hiding the obsts
    // would leave a scenario with nothing in it. What the user turns off there
    // is the outline, which is a display switch.
    expect(service.layers.map(layer => layer.id))
      .toEqual(['mesh', 'open', 'hole', 'vent', 'fire', 'devc', 'geom', 'init', 'zone']);
  });

  describe('layer visibility', () => {
    it('reads a three-state layer off the layer that draws it', () => {
      const open = TestBed.inject(OpenService) as any;

      expect(service.layerState('open')).toBe('edges');
      open.visibility = 1;
      expect(service.layerState('open')).toBe('filled');
      open.visibility = 2;
      expect(service.layerState('open')).toBe('hidden');
    });

    it('reads a &MESH through its own numbering', () => {
      // MeshService counts its three states differently from every plane layer -
      // it stores the state it has just moved *to*, so 1 is where it starts.
      const mesh = TestBed.inject(MeshService) as any;

      expect(service.layerState('mesh')).toBe('edges');
      mesh.visibility = 2;
      expect(service.layerState('mesh')).toBe('filled');
      mesh.visibility = 0;
      expect(service.layerState('mesh')).toBe('hidden');
    });

    it('reads a two-state layer as drawn or not', () => {
      const geom = TestBed.inject(GeomService) as any;

      expect(service.layerState('geom')).toBe('filled');
      geom.visible = false;
      expect(service.layerState('geom')).toBe('hidden');
    });

    it('toggling a layer asks the service that draws it', () => {
      service.toggleLayer('vent');
      service.toggleLayer('hole');
      service.toggleLayer('mesh');

      expect(record).toEqual(['toggle:vent', 'toggle:hole', 'toggle:mesh']);
    });
  });

  describe('display switches', () => {
    it('reports what is currently on', () => {
      expect(service.isDisplayOn('wireframe')).toBe(false);
      expect(service.isDisplayOn('obstOutline')).toBe(true);
      expect(service.isDisplayOn('jetfanOutline')).toBe(true);
    });

    it('flips the switch on the service that owns it', () => {
      service.toggleDisplay('wireframe');
      service.toggleDisplay('obstOutline');
      service.toggleDisplay('jetfanOutline');

      expect(record).toEqual(['toggle:wireframe', 'toggle:obstOutline', 'jetfanOutline:false']);
    });
  });

  describe('clipping', () => {
    it('moves one plane across every layer it cuts through', () => {
      // Each drawing service owns its own materials, so each has to be told; the
      // plane is the same coordinate in metres for all of them (ADR-0002).
      service.setClip('z', 2.5);

      expect(record).toEqual([
        'clip:obst:z:2.5', 'clip:fire:z:2.5', 'clip:vent:z:2.5', 'clip:open:z:2.5',
        'clip:jetfan:z:2.5', 'clip:devc:z:2.5', 'clip:geom:z:2.5', 'clip:init:z:2.5',
        'clip:zone:z:2.5', 'clip:hole:z:2.5'
      ]);
    });

    it('pulls every plane back to showing the whole model', () => {
      service.resetClipping();

      expect(record).toEqual([
        'reset:obst', 'reset:fire', 'reset:vent', 'reset:open', 'reset:jetfan',
        'reset:devc', 'reset:geom', 'reset:init', 'reset:zone', 'reset:hole'
      ]);
    });

    it('answers where a plane stands, and how far it may be dragged', () => {
      expect(service.clipPlane('z')).toBe(2.5);
      expect(service.clipMin('z')).toBe(-1);
      expect(service.clipMax('z')).toBe(11);
      expect(service.clipStep('z')).toBe(0.1);
    });

    it('labels a plane in metres, to the centimetre', () => {
      expect(service.clipLabel('z')).toBe('2.50 m');
    });
  });

  describe('camera', () => {
    it('frames the whole model', () => {
      service.zoomExtents();
      expect(record).toEqual(['zoomExtents']);
    });

    it('frames one box - what "zoom to selection" means', () => {
      service.zoomTo({ x1: 1, x2: 3, y1: 0, y2: 1, z1: 0, z2: 2 });
      expect(record).toEqual(['frame:1-3']);
    });
  });
});
