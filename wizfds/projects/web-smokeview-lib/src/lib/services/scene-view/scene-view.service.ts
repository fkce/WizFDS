import { Injectable } from '@angular/core';

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
import { ViewCubeService } from '../babylon/viewCube/view-cube.service';
import { SceneAxis, SceneBoundsService } from '../scene-bounds/scene-bounds.service';
import { SceneXb } from '../drawing/scene-input';
import { LayerVisibilityService, SceneLayerState } from '../drawing/layer-visibility.service';

export type { SceneLayerState } from '../drawing/layer-visibility.service';

/** A layer of the scene that is shown and hidden as a whole. */
export type SceneLayerId =
  'mesh' | 'open' | 'hole' | 'vent' | 'fire' | 'devc' | 'geom' | 'init' | 'zone';

/** A switch that changes how the model is drawn rather than what is drawn. */
export type SceneDisplayId = 'wireframe' | 'obstOutline' | 'jetfanOutline';

/** A layer, as a control that drives it needs to know it. */
export interface SceneLayer {
  readonly id: SceneLayerId;
  /** What to call it in an interface - the FDS namelist, where there is one. */
  readonly label: string;
}

/** A display switch, as a control that drives it needs to know it. */
export interface SceneDisplay {
  readonly id: SceneDisplayId;
  readonly label: string;
}

/**
 * A standard view, named as the view cube names its own faces.
 *
 * The four an engineer reaches for: a plan, the two elevations, and the
 * isometric the camera starts in. Clicking the cube offers the rest.
 */
export interface SceneStandardView {
  /** The side ViewCubeService.zoomToSide() flies to. */
  readonly side: string;
  readonly label: string;
}

export const STANDARD_VIEWS: readonly SceneStandardView[] = [
  { side: 'top', label: 'Top' },
  { side: 'front', label: 'Front' },
  { side: 'right', label: 'Right' },
  { side: 'leftTopFront', label: 'Iso' }
];

/**
 * The icon each layer state reads as, in MDI names.
 *
 * Here rather than in each host because both of them draw the same control - the
 * ribbon's Visibility panel and the standalone viewer's control bar - and the
 * three states have to look the same in the two apps or they stop meaning the
 * same thing.
 */
export function layerStateIcon(state: SceneLayerState): string {
  return state === 'hidden' ? 'eye-off-outline'
    : state === 'edges' ? 'square-outline' : 'checkbox-blank';
}

/** The icon a display switch reads as. Same reason as above. */
export function displaySwitchIcon(on: boolean): string {
  return on ? 'checkbox-marked-outline' : 'checkbox-blank-outline';
}

/** What one layer answers about itself, whichever service draws it. */
interface LayerBinding extends SceneLayer {
  state(): SceneLayerState;
  toggle(): void;
}

/** What one display switch answers about itself. */
interface DisplayBinding extends SceneDisplay {
  isOn(): boolean;
  toggle(): void;
}

/**
 * What the user can see, and from where.
 *
 * The library draws and the host decides (ADR-0004), so the controls that used
 * to sit over the canvas - the visibility menu, the clip sliders - live in the
 * host's ribbon now (ADR-0010) and reach the scene through here. One service
 * rather than eleven injected across the boundary: which service draws a &ZONE,
 * and how it happens to count its own visibility states, is the library's
 * business and stops here.
 *
 * The state is read back off the drawing services rather than mirrored, so a
 * control shows what is on screen even after a render has reset it.
 */
@Injectable({
  providedIn: 'root'
})
export class SceneViewService {

  private readonly layerBindings: readonly LayerBinding[];
  private readonly displayBindings: readonly DisplayBinding[];

  constructor(
    private obstService: ObstService,
    private meshService: MeshService,
    private openService: OpenService,
    private ventService: VentService,
    private jetfanService: JetfanService,
    private fireService: FireService,
    private devcService: DevcService,
    private geomService: GeomService,
    private initService: InitService,
    private zoneService: ZoneService,
    private holeRegionService: HoleRegionService,
    private babylonService: BabylonService,
    private sceneBounds: SceneBoundsService,
    private viewCube: ViewCubeService,
    layerVisibility: LayerVisibilityService
  ) {
    // The states are read off LayerVisibilityService, where each drawing
    // service has bound its own translation - the same register a pick refuses
    // hidden layers by, so a button and the cursor can never disagree.
    const stateOf = (id: SceneLayerId) => () => layerVisibility.stateOf(id);

    this.layerBindings = [
      {
        id: 'mesh', label: 'MESH',
        state: stateOf('mesh'),
        toggle: () => this.meshService.toogleVisibility()
      },
      {
        id: 'open', label: 'OPEN',
        state: stateOf('open'),
        toggle: () => this.openService.toogleVisibility()
      },
      {
        id: 'hole', label: 'HOLE',
        state: stateOf('hole'),
        toggle: () => this.holeRegionService.toggleVisibility()
      },
      {
        id: 'vent', label: 'VENT',
        state: stateOf('vent'),
        toggle: () => this.ventService.toogleBasicVisibility()
      },
      {
        id: 'fire', label: 'FIRE',
        state: stateOf('fire'),
        toggle: () => this.fireService.toogleVisibility()
      },
      {
        id: 'devc', label: 'DEVC',
        state: stateOf('devc'),
        toggle: () => this.devcService.toggleVisibility()
      },
      {
        id: 'geom', label: 'GEOM',
        state: stateOf('geom'),
        toggle: () => this.geomService.toggleVisibility()
      },
      {
        id: 'init', label: 'INIT',
        state: stateOf('init'),
        toggle: () => this.initService.toggleVisibility()
      },
      {
        id: 'zone', label: 'ZONE',
        state: stateOf('zone'),
        toggle: () => this.zoneService.toggleVisibility()
      }
    ];

    this.displayBindings = [
      {
        id: 'wireframe', label: 'Wireframe',
        isOn: () => this.obstService.wireframe,
        toggle: () => this.obstService.toggleWireframe()
      },
      {
        id: 'obstOutline', label: 'OBST outline',
        isOn: () => this.obstService.outlined,
        toggle: () => this.obstService.toggleEdgesRendering()
      },
      {
        id: 'jetfanOutline', label: 'Jetfan outline',
        isOn: () => this.jetfanService.outlined,
        toggle: () => this.jetfanService.setEdgesRendering(!this.jetfanService.outlined)
      }
    ];
  }

  // ==========================================
  // Layers
  // ==========================================

  /** Every layer there is to show and hide, in the order a control lists them. */
  public get layers(): readonly SceneLayer[] {
    return this.layerBindings;
  }

  /** How much of one layer is currently drawn. */
  public layerState(id: SceneLayerId): SceneLayerState {
    return this.binding(id).state();
  }

  /** Move one layer on to its next state - what pressing its button does. */
  public toggleLayer(id: SceneLayerId): void {
    this.binding(id).toggle();
  }

  // ==========================================
  // Display switches
  // ==========================================

  /** Every switch that changes how the model is drawn. */
  public get displays(): readonly SceneDisplay[] {
    return this.displayBindings;
  }

  /** Whether one display switch is currently on. */
  public isDisplayOn(id: SceneDisplayId): boolean {
    return this.displayBinding(id).isOn();
  }

  /** Flip one display switch. */
  public toggleDisplay(id: SceneDisplayId): void {
    this.displayBinding(id).toggle();
  }

  // ==========================================
  // Section planes
  // ==========================================

  /**
   * Where a clipping plane currently cuts, in FDS metres.
   *
   * Read off the obsts, because the three planes are set on every layer together
   * and so all of them answer the same.
   */
  public clipPlane(axis: SceneAxis): number {
    return this.obstService.clipPlane(axis);
  }

  /**
   * How far a plane may be dragged, and how finely.
   *
   * In metres over the model's own extent, so a five-metre room and a
   * four-hundred-metre tunnel both get a slider worth dragging (ADR-0002).
   */
  public clipMin(axis: SceneAxis): number { return this.sceneBounds.clipMin(axis); }
  public clipMax(axis: SceneAxis): number { return this.sceneBounds.clipMax(axis); }
  public clipStep(axis: SceneAxis): number { return this.sceneBounds.clipStep(axis); }

  /** Where a plane stands, rounded to a centimetre - finer than any FDS geometry. */
  public clipLabel(axis: SceneAxis): string {
    return `${this.clipPlane(axis).toFixed(2)} m`;
  }

  /**
   * Move one clipping plane, across every element type it cuts through.
   *
   * Each drawing service owns its own materials, so each has to be told; the
   * plane is the same coordinate for all of them.
   */
  public setClip(axis: SceneAxis, metres: number): void {
    this.obstService.clip(metres, axis);
    this.fireService.clip(metres, axis);
    this.ventService.clipBasic(metres, axis);
    this.openService.clip(metres, axis);
    // Takes the planes drawn for each jetfan with it - see JetfanService.clip()
    this.jetfanService.clip(metres, axis);
    this.devcService.clip(metres, axis);
    this.geomService.clip(metres, axis);
    this.initService.clip(metres, axis);
    this.zoneService.clip(metres, axis);
    this.holeRegionService.clip(metres, axis);
  }

  /**
   * Pull every clipping plane back to showing the whole model.
   *
   * The planes are coordinates in metres, so they mean nothing once the model
   * changes: z = 4 m is the ceiling of a room and the floor of a tunnel. Drawing
   * a scenario is one moment that can happen, which is why SmokeviewApiService
   * calls this as well as the "show all" button.
   */
  public resetClipping(): void {
    this.obstService.resetClipping();
    this.fireService.resetClipping();
    this.ventService.resetClipping();
    this.openService.resetClipping();
    this.jetfanService.resetClipping();
    this.devcService.resetClipping();
    this.geomService.resetClipping();
    this.initService.resetClipping();
    this.zoneService.resetClipping();
    this.holeRegionService.resetClipping();
  }

  // ==========================================
  // Camera
  // ==========================================

  /** The standard views a control can offer, in the order it lists them. */
  public readonly standardViews = STANDARD_VIEWS;

  /**
   * Frame the whole model without turning the view (ADR-0012).
   *
   * Used to call applySceneBounds(), which also resets the direction of
   * looking - but that is what the glossary calls a view cube click, not zoom
   * extents. The ribbon button and the double middle click now agree.
   */
  public zoomExtents(): void {
    this.babylonService.zoomExtents();
  }

  /**
   * Fly to one standard view.
   *
   * The same flight clicking the view cube makes, so the cube in the canvas and
   * the buttons in the host answer to one implementation.
   */
  public viewFrom(side: string): void {
    this.viewCube.zoomToSide(side);
  }

  /** Frame one box, which is what "zoom to selection" comes down to. */
  public zoomTo(box: SceneXb): void {
    this.babylonService.frameBox(box);
  }

  private binding(id: SceneLayerId): LayerBinding {
    return this.layerBindings.find(layer => layer.id === id);
  }

  private displayBinding(id: SceneDisplayId): DisplayBinding {
    return this.displayBindings.find(display => display.id === id);
  }
}
