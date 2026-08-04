import * as BABYLON from 'babylonjs';

import {
  applyCadNavigation, panningSensibilityFor, CAD_ZOOM_STEP
} from './camera-navigation';

/**
 * The camera's CAD physics (ADR-0012): the left button belongs to editing,
 * the middle one to the camera, and every motion stops with the mouse.
 */
describe('camera navigation (ADR-0012)', () => {

  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;
  let camera: BABYLON.ArcRotateCamera;

  /** Stands in for the canvas - a detached one has no clientHeight to read. */
  const host = { clientHeight: 800 };

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    camera = new BABYLON.ArcRotateCamera('Camera', 0, 0, 2, BABYLON.Vector3.Zero(), scene);
    camera.upVector = new BABYLON.Vector3(0, 0, 1);

    applyCadNavigation(camera, host);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  /** What a press with these keys down would do to the camera. */
  const pointerAction = (button: number, modifiers: Partial<BABYLON.InputModifiers> = {}) => {
    const entry = camera.movement.input.resolveInteraction('pointer',
      { button, modifiers: { ctrl: false, alt: false, shift: false, ...modifiers } });
    return entry ? entry.interaction : null;
  };

  describe('the button map', () => {

    it('pans with the held middle button', () => {
      expect(pointerAction(1)).toBe('pan');
    });

    it('orbits with shift and the middle button', () => {
      expect(pointerAction(1, { shift: true })).toBe('rotate');
    });

    it('leaves the left button entirely to editing', () => {
      // The old contest: a left drag that missed a grip silently turned the
      // model. The camera no longer listens, so a miss does nothing.
      expect(pointerAction(0)).toBeNull();
      expect(pointerAction(0, { shift: true })).toBeNull();
    });

    it('no longer pans with ctrl and the left button', () => {
      // Ctrl+click extends the selection; the same chord must not also grab
      // the camera. Ctrl belongs to selection and gesture modifiers now.
      expect(pointerAction(0, { ctrl: true })).toBeNull();
    });

    it('keeps the right button free for a future context menu', () => {
      expect(pointerAction(2)).toBeNull();
    });

    it('zooms with the wheel', () => {
      const entry = camera.movement.input.resolveInteraction('wheel', {});
      expect(entry && entry.interaction).toBe('zoom');
    });

    it('survives the reattach a grip drag ends with', () => {
      // PointerDragBehavior detaches the camera for a drag and reattaches it
      // with attachControl(noPreventDefault, _useCtrlForPanning,
      // _panningMouseButton) - and those two setters rewrite the map's pan
      // entries. Left at Babylon's defaults (true, 2), the first grip drag
      // would quietly bring ctrl+left panning back.
      camera.attachControl(true, camera._useCtrlForPanning, camera._panningMouseButton);

      expect(pointerAction(1)).toBe('pan');
      expect(pointerAction(0, { ctrl: true })).toBeNull();
      expect(pointerAction(2)).toBeNull();
    });
  });

  describe('no inertia', () => {

    it('stops every motion with the mouse', () => {
      expect(camera.inertia).toBe(0);
      expect(camera.panningInertia).toBe(0);
    });

    it('reaches the movement system, which applies the decay', () => {
      expect(camera.movement.rotationInertia).toBe(0);
      expect(camera.movement.panInertia).toBe(0);
      expect(camera.movement.zoomInertia).toBe(0);
    });
  });

  describe('the wheel', () => {

    it('zooms towards the cursor, a step of the radius per notch', () => {
      expect(camera.zoomToMouseLocation).toBeTrue();
      expect(camera.wheelDeltaPercentage).toBe(CAD_ZOOM_STEP);
    });

    it('does not restore a stored state on double tap', () => {
      // The double middle click means zoom extents (SmokeviewComponent), and a
      // double LEFT click is two selections - neither may teleport the camera
      // to wherever storeState() last stood.
      expect(camera.useInputToRestoreState).toBeFalse();
    });
  });

  describe('pan glued to the cursor', () => {

    it('moves the grabbed point exactly one pixel per pixel', () => {
      // 1/sensibility is what one pixel of drag moves in world units. For the
      // grabbed point to track the cursor it must equal the world height of
      // the frame at the target, divided by the canvas height in pixels.
      const radius = 10, fov = 0.8, height = 800;

      const worldPerPixel = 2 * radius * Math.tan(fov / 2) / height;
      expect(1 / panningSensibilityFor(radius, fov, height)).toBeCloseTo(worldPerPixel, 12);
    });

    it('keeps up as the zoom changes the frame', () => {
      camera.radius = 42;
      scene.render();

      expect(camera.panningSensibility)
        .toBeCloseTo(panningSensibilityFor(42, camera.fov, host.clientHeight), 6);
    });

    it('holds the last sensibility when the canvas has no height yet', () => {
      const before = camera.panningSensibility;

      host.clientHeight = 0;
      try {
        camera.radius = 17;
        scene.render();
        expect(camera.panningSensibility).toBe(before);
      } finally {
        host.clientHeight = 800;
      }
    });
  });
});
