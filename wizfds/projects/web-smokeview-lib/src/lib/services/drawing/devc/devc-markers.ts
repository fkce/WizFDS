import * as BABYLON from 'babylonjs';

import { BaseShape } from '../box-instance-pool';
import { SceneDevcMarker } from '../scene-input';

/**
 * The shapes a point &DEVC is drawn as.
 *
 * SmokeView draws each device from an object script in `smv_objects.tex`, a
 * small language of its own. The library draws one recognisable primitive per
 * kind instead - enough to tell a sprinkler from a smoke detector at a glance,
 * without an interpreter for a language whose only reader would be this file
 * (ADR-0008).
 *
 * Every shape is built to the rule BoxInstancePool scales against: one metre
 * across at most, centred on the origin. The pool then puts it in the box the
 * device occupies, so a marker is sized against the model like everything else
 * (ADR-0002).
 *
 * Babylon builds its cylinders and cones along +Y; FDS stands them up along +Z,
 * so the geometry is turned once here rather than per instance.
 */

/** Turns a Babylon +Y shape into the +Z one FDS coordinates want. */
const STAND_UP = BABYLON.Matrix.RotationX(Math.PI / 2);

/** How many sides a round marker is drawn with. Small: markers are small. */
const TESSELLATION = 16;

/** A cylinder or cone standing along +Z, raised to `centreZ`. */
function upright(options: {
  height: number, diameterTop?: number, diameterBottom?: number, diameter?: number,
  centreZ?: number
}): BABYLON.VertexData {
  const vertexData = BABYLON.VertexData.CreateCylinder({
    height: options.height,
    diameter: options.diameter,
    diameterTop: options.diameterTop,
    diameterBottom: options.diameterBottom,
    tessellation: TESSELLATION
  });

  vertexData.transform(STAND_UP);
  if (options.centreZ) {
    vertexData.transform(BABYLON.Matrix.Translation(0, 0, options.centreZ));
  }
  return vertexData;
}

/** A plain sensor - a thermocouple, a gas probe. A ball. */
const SENSOR: BaseShape = () =>
  BABYLON.VertexData.CreateSphere({ diameter: 1, segments: 8 });

/** A smoke detector, as it looks on a ceiling: a shallow disc. */
const SMOKE_DETECTOR: BaseShape = () => upright({ height: 0.35, diameter: 1 });

/** A nozzle, pointing the way it sprays: a cone, wide at the top. */
const NOZZLE: BaseShape = () =>
  upright({ height: 1, diameterTop: 1, diameterBottom: 0 });

/**
 * A sprinkler: a body under a deflector plate.
 *
 * Two pieces rather than one, because a single cone would read as the nozzle -
 * the deflector is what tells the two apart at a glance, and it is what a
 * sprinkler is recognised by on a drawing.
 */
const SPRINKLER: BaseShape = () => {
  const deflector = upright({ height: 0.12, diameter: 1, centreZ: -0.3 });
  const body = upright({ height: 0.55, diameter: 0.45, centreZ: 0.12 });
  return deflector.merge(body);
};

/** The shape each kind of device is drawn as. */
export const DEVC_MARKER_SHAPES: Readonly<Record<SceneDevcMarker, BaseShape>> = {
  'sensor': SENSOR,
  'smoke detector': SMOKE_DETECTOR,
  'nozzle': NOZZLE,
  'sprinkler': SPRINKLER
};
