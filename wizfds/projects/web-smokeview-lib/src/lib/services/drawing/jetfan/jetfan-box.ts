import { SceneJetfan, SceneXb } from '../scene-input';

/**
 * The box drawn for a jetfan whose coordinates are all zero.
 *
 * A jetfan is normally placed in CAD; until it is, the scenario holds no
 * geometry for it and there is nothing to draw. Rather than a degenerate point,
 * the preview shows a stand-in box - which is how it has always behaved.
 */
const UNPLACED_JETFAN_XB: SceneXb = { x1: 2.0, x2: 8.0, y1: 3.0, y2: 5.0, z1: 1.0, z2: 3.0 };

/**
 * The box a jetfan is actually drawn as, standing in for one that was never
 * placed.
 *
 * Lives outside the drawing service because the scene bounds are measured before
 * anything is drawn, and measuring an unplaced jetfan by its zeroes would put
 * the camera somewhere the geometry is not.
 */
export function jetfanDrawnBox(jetfan: SceneJetfan): SceneXb {
  const xb = jetfan.xb;
  const isUnplaced = xb.x1 === xb.x2 && xb.y1 === xb.y2 && xb.z1 === xb.z2 && xb.x1 === 0;
  return isUnplaced ? UNPLACED_JETFAN_XB : xb;
}
