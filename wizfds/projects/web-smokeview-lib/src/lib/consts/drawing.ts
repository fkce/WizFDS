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

/**
 * The accent, in the scene: azure, the one colour this product uses to say
 * "the tool did something".
 *
 * The SCSS side of the library reads it from `var(--accent, #3b82f6)`, but a
 * Babylon material cannot (ADR-0010) - so the same triple has to exist here.
 * Once, rather than in each service that draws a handle or a marker, because
 * four copies of it drift.
 */
export const ACCENT_COLOR = new BABYLON.Color3(0.23, 0.51, 0.96);

/** The same, where an alpha is wanted - edge rendering takes a Color4. */
export const ACCENT_EDGE_COLOR = new BABYLON.Color4(0.23, 0.51, 0.96, 1);
