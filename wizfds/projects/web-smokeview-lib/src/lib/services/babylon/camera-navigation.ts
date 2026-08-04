import * as BABYLON from 'babylonjs';

/**
 * The camera's CAD physics (ADR-0012).
 *
 * One rule: the left button edits, the middle one drives the camera, the right
 * one is reserved. Every motion stops with the mouse - a camera that keeps
 * gliding is a film camera, not a measuring tool - and both zoom and pan are
 * computed from the current frame, so the size of the model no longer enters
 * into it (the near/far planes and radius limits still scale by it, ADR-0002).
 */

/** Fraction of the distance one wheel notch covers - AutoCAD's ZOOMFACTOR, softened. */
export const CAD_ZOOM_STEP = 0.15;

/**
 * Pixels of drag per radian of orbit.
 *
 * Babylon's default is 1000, but its default inertia repeats each pixel's
 * turn in a decaying series that sums to ten times that. With the inertia
 * gone the series is gone, so a tenth of the sensibility keeps the hand
 * feel while the glide disappears.
 */
const CAD_ANGULAR_SENSIBILITY = 100;

/**
 * Pixels of drag per world unit of pan, for the pan to be glued 1:1.
 *
 * 1/sensibility is what one pixel moves in world units, so gluing the grabbed
 * point to the cursor means matching it to the world height of the frame at
 * the target - 2·r·tan(fov/2) for a vertically-fixed fov - per canvas pixel.
 */
export function panningSensibilityFor(radius: number, fov: number, canvasHeightPx: number): number {
  return canvasHeightPx / (2 * radius * Math.tan(fov / 2));
}

/**
 * Give one camera the CAD button map, and take its inertia away.
 *
 * Babylon 9 resolves every press against `movement.input.inputMap` - first
 * matching entry wins, omitted conditions are wildcards - so the whole of
 * ADR-0012's button table is these three lines. A button with no entry simply
 * does not move the camera, which is what frees the left and right buttons.
 *
 * Applied to the view cube's corner camera as well as the model's: the cube
 * follows the orbit only because both cameras hear the same canvas, so they
 * must agree on what a drag means and how fast it turns - see ViewCubeService.
 * The cube gets only this much, and without the pan entry: its camera has
 * nothing to pan, and a pan would carry its target away from the mesh it
 * frames in the corner.
 */
export function applyCadPointerMap(
  camera: BABYLON.ArcRotateCamera,
  options: { panning: boolean } = { panning: true }
): void {
  // Every attachControl() - including the reattach PointerDragBehavior ends a
  // grip drag with - writes these two back into the map. Left at Babylon's
  // defaults (true, 2) the first grip drag would bring ctrl+left panning back,
  // so they are told what the map is about to say.
  camera._useCtrlForPanning = false;
  camera._panningMouseButton = 1;

  camera.movement.input.inputMap = [
    { source: 'pointer', button: 1, modifiers: { shift: true }, interaction: 'rotate' },
    ...(options.panning
      ? [{ source: 'pointer', button: 1, interaction: 'pan' } as const]
      : []),
    { source: 'wheel', interaction: 'zoom' }
  ];

  // Mouse stop = camera stop. The camera's own setters carry both to the
  // movement system, the zoom included.
  camera.inertia = 0;
  camera.panningInertia = 0;

  camera.angularSensibilityX = CAD_ANGULAR_SENSIBILITY;
  camera.angularSensibilityY = CAD_ANGULAR_SENSIBILITY;

  // A double tap would otherwise restore storeState()'s pose. The double
  // middle click means zoom extents instead (SmokeviewComponent), and a double
  // left click is two selections.
  camera.useInputToRestoreState = false;
}

/**
 * The model camera's full CAD navigation: the button map, the cursor-anchored
 * percentage zoom, and the pan glued 1:1 to the cursor.
 *
 * @param host where to read the canvas height from, for the 1:1 pan; the
 *             canvas in production, a stub in tests. Zero height - a canvas
 *             not laid out yet - leaves the last sensibility standing.
 */
export function applyCadNavigation(
  camera: BABYLON.ArcRotateCamera,
  host: { clientHeight: number }
): void {
  applyCadPointerMap(camera);

  // The point under the cursor stays under the cursor, and the orbit's target
  // follows the zoom - which is what keeps the pivot near the user's work.
  camera.zoomToMouseLocation = true;
  camera.wheelDeltaPercentage = CAD_ZOOM_STEP;

  // 1:1 is a property of the current frame, so it is renewed whenever the
  // frame changes - the view matrix moves on every orbit, pan and zoom.
  const glue = () => {
    if (host.clientHeight > 0) {
      camera.panningSensibility = panningSensibilityFor(camera.radius, camera.fov, host.clientHeight);
    }
  };
  glue();
  camera.onViewMatrixChangedObservable.add(glue);
}
