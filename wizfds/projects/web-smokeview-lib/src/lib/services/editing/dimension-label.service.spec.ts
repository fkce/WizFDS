import { TestBed } from '@angular/core/testing';
import * as BABYLON from 'babylonjs';

import { DimensionLabelService } from './dimension-label.service';
import { GizmoService } from './gizmo.service';
import { SnapService } from './snap.service';
import { PickService } from '../picking/pick.service';
import { SceneRegistryService } from '../babylon/scene-registry.service';
import { SceneBoundsService } from '../scene-bounds/scene-bounds.service';
import { BabylonService } from '../babylon/babylon.service';
import { SceneInput, SceneXb } from '../drawing/scene-input';

/** A wall four metres long, two deep, three high. */
const WALL: SceneXb = { x1: 1, x2: 5, y1: 1, y2: 3, z1: 0, z2: 3 };

function emptyScene(): SceneInput {
  return {
    meshes: [], obsts: [], holes: [], opens: [], vents: [], fires: [],
    jetfans: [], devcs: [], geoms: [], inits: [], zones: []
  };
}

/**
 * The extent labels of the selection (#127): three numbers per selected
 * element, drawn in the library as presentational state (ADR-0004), following
 * the element while the gizmo moves it.
 */
describe('DimensionLabelService', () => {

  let labels: DimensionLabelService;
  let picking: PickService;
  let gizmo: GizmoService;
  let registry: SceneRegistryService;
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);

    const camera = new BABYLON.ArcRotateCamera(
      'camera', 0, Math.PI / 2, 10, new BABYLON.Vector3(5, 3, 1.5), scene);
    camera.fov = Math.PI / 2;
    camera.setPosition(new BABYLON.Vector3(5, -10, 1.5));

    TestBed.configureTestingModule({
      providers: [{
        provide: BabylonService,
        useValue: {
          scene: scene, camera: camera,
          canvas: { clientHeight: 800, style: {} }, engine: engine
        }
      }]
    });

    TestBed.inject(SceneBoundsService).setFrom([{ x1: 0, x2: 10, y1: 0, y2: 6, z1: 0, z2: 3 }]);
    registry = TestBed.inject(SceneRegistryService);
    picking = TestBed.inject(PickService);
    gizmo = TestBed.inject(GizmoService);
    labels = TestBed.inject(DimensionLabelService);

    TestBed.inject(SnapService).setScene(emptyScene());
    gizmo.enabled = true;

    draw('wall', WALL);
  });

  afterEach(() => {
    labels.setEnabled(false);
    scene.dispose();
    engine.dispose();
  });

  /** Put an element on screen, as a drawing service would. */
  function draw(uuid: string, xb: SceneXb): void {
    registry.register(uuid, {
      mesh: new BABYLON.Mesh(uuid, scene), type: 'obst', id: uuid.toUpperCase(), xb: xb
    });
  }

  /** The label meshes currently on screen. */
  function drawn(): BABYLON.AbstractMesh[] {
    return scene.meshes.filter(mesh => mesh.name.startsWith('dimLabel'));
  }

  it('draws nothing while the toggle is off', () => {
    picking.setSelected(['wall']);

    expect(labels.enabled).toBeFalse();
    expect(drawn().length).toBe(0);
  });

  it('labels the three extents of what is selected once toggled on', () => {
    picking.setSelected(['wall']);

    labels.toggle();

    expect(labels.enabled).toBeTrue();
    expect(drawn().length).toBe(3);
    // Anchored to the edges the label measures - the width label at the
    // midpoint of the front bottom edge
    expect(drawn()[0].position.asArray()).toEqual([3, 1, 0]);
  });

  it('labels a selection made after the toggle was switched on', () => {
    labels.toggle();
    expect(drawn().length).toBe(0);

    picking.setSelected(['wall']);

    expect(drawn().length).toBe(3);
  });

  it('labels every element of a multiple selection', () => {
    draw('second', { x1: 6, x2: 8, y1: 1, y2: 2, z1: 0, z2: 1 });
    picking.setSelected(['wall', 'second']);

    labels.toggle();

    expect(drawn().length).toBe(6);
  });

  it('takes the labels down with the toggle', () => {
    picking.setSelected(['wall']);
    labels.toggle();

    labels.toggle();

    expect(drawn().length).toBe(0);
  });

  it('takes them down when the selection is dropped', () => {
    picking.setSelected(['wall']);
    labels.toggle();

    picking.setSelected([]);

    expect(drawn().length).toBe(0);
  });

  it('follows the element while the gizmo moves it', () => {
    picking.setSelected(['wall']);
    labels.toggle();

    gizmo.beginMove();
    gizmo.trackMove({ dx: 2, dy: 0, dz: 1 }, ['x', 'y', 'z']);

    expect(drawn()[0].position.asArray()).toEqual([5, 1, 1]);

    gizmo.cancel();
  });

  it('re-anchors on the committed geometry when the gesture ends', () => {
    picking.setSelected(['wall']);
    labels.toggle();

    gizmo.beginMove();
    gizmo.trackMove({ dx: 2, dy: 0, dz: 0 }, ['x', 'y', 'z']);
    // The app never applied the move, so the redraw puts the element - and
    // the labels - back where the scenario has it
    gizmo.cancel();

    expect(drawn()[0].position.asArray()).toEqual([3, 1, 0]);
  });

  it('reads the dragged extent off a resize preview', () => {
    picking.setSelected(['wall']);
    labels.toggle();

    gizmo.setMode('resize');
    gizmo.beginResize('x2');
    gizmo.trackResize(7);

    // The width label follows the stretch: x now spans 1..7
    expect(drawn()[0].position.asArray()).toEqual([4, 1, 0]);

    gizmo.cancel();
  });
});
