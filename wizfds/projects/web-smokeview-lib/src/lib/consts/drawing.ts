import * as BABYLON from 'babylonjs';

/**
 * How a solid body is outlined - obsts and jetfan bodies alike.
 *
 * One constant rather than a literal per service: the two are meant to read as
 * the same kind of thing on screen, and a `new Color4(...)` inside a method
 * allocates on every toggle. How thick the outline is belongs to
 * SceneBoundsService, because that follows from how big the model is.
 */
export const SOLID_EDGE_COLOR = new BABYLON.Color4(0.4, 0.4, 0.4, 1);
