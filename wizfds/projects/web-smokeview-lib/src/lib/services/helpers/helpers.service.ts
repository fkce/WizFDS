import { Injectable } from '@angular/core';
import { map, times, constant, flatten } from 'lodash';
import { SceneColor, SceneXb } from '../drawing/scene-input';

// TODO!!! move to parsers wizObject !!!
/**
 * Turning boxes and colours into the arrays a vertex buffer wants.
 *
 * The scene is drawn in FDS metres 1:1 (ADR-0002), so every `xb` reaching this
 * service is already a scene coordinate and nothing here transforms anything.
 * How big the model is - and everything sized against it - belongs to
 * SceneBoundsService.
 */
@Injectable({
  providedIn: 'root'
})
export class HelpersService {

  constructor() { }

  /** A colour as the flat rgba array the vertex buffers are built from. */
  public toRgba(color: SceneColor): number[] {
    return [color.r, color.g, color.b, color.a];
  }

  /**
   * Convert XB array [x1, x2, y1, y2, z1, z2] to babylonjs vertices
   * @param xb [x1, x2, y1, y2, z1, z2]
   */
  public getVerticesFromXb(xb: SceneXb) {
    return [
      xb.x1, xb.y1, xb.z1, xb.x2, xb.y1, xb.z1, xb.x2, xb.y2, xb.z1, xb.x1, xb.y2, xb.z1,
      xb.x1, xb.y1, xb.z2, xb.x2, xb.y1, xb.z2, xb.x2, xb.y2, xb.z2, xb.x1, xb.y2, xb.z2,
      xb.x1, xb.y1, xb.z1, xb.x2, xb.y1, xb.z1, xb.x2, xb.y2, xb.z1, xb.x1, xb.y2, xb.z1,
      xb.x1, xb.y1, xb.z2, xb.x2, xb.y1, xb.z2, xb.x2, xb.y2, xb.z2, xb.x1, xb.y2, xb.z2,
      xb.x1, xb.y1, xb.z1, xb.x2, xb.y1, xb.z1, xb.x2, xb.y2, xb.z1, xb.x1, xb.y2, xb.z1,
      xb.x1, xb.y1, xb.z2, xb.x2, xb.y1, xb.z2, xb.x2, xb.y2, xb.z2, xb.x1, xb.y2, xb.z2
    ];
  }

  /**
   * Convert XB array [x1, x2, y1, y2, z1, z2] to babylonjs vertices
   * @param xb [x1, x2, y1, y2, z1, z2]
   */
  public getVertices(xb: number[]) {
    return [
      xb[0], xb[2], xb[4], xb[1], xb[2], xb[4], xb[1], xb[3], xb[4], xb[0], xb[3], xb[4],
      xb[0], xb[2], xb[5], xb[1], xb[2], xb[5], xb[1], xb[3], xb[5], xb[0], xb[3], xb[5],
      xb[0], xb[2], xb[4], xb[1], xb[2], xb[4], xb[1], xb[3], xb[4], xb[0], xb[3], xb[4],
      xb[0], xb[2], xb[5], xb[1], xb[2], xb[5], xb[1], xb[3], xb[5], xb[0], xb[3], xb[5],
      xb[0], xb[2], xb[4], xb[1], xb[2], xb[4], xb[1], xb[3], xb[4], xb[0], xb[3], xb[4],
      xb[0], xb[2], xb[5], xb[1], xb[2], xb[5], xb[1], xb[3], xb[5], xb[0], xb[3], xb[5]
    ];
  }

  /**
   * Generate vent geometry (plane) from XB coordinates
   * @param xb 
   */
  public generateVentGeometry(xb: SceneXb) {
    let vertices: number[] = [];
    let normals: number[] = [];
    let indices: number[] = [];

    // Determine which plane the vent represents by checking which coordinate is constant
    if (xb.x1 === xb.x2) {
      // X-plane (YZ plane)
      const x = xb.x1;
      vertices = [
        x, xb.y1, xb.z1,  // Bottom left
        x, xb.y2, xb.z1,  // Bottom right
        x, xb.y2, xb.z2,  // Top right
        x, xb.y1, xb.z2   // Top left
      ];
      normals = [
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0
      ];
    } else if (xb.y1 === xb.y2) {
      // Y-plane (XZ plane)
      const y = xb.y1;
      vertices = [
        xb.x1, y, xb.z1,  // Bottom left
        xb.x2, y, xb.z1,  // Bottom right
        xb.x2, y, xb.z2,  // Top right
        xb.x1, y, xb.z2   // Top left
      ];
      normals = [
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0
      ];
    } else if (xb.z1 === xb.z2) {
      // Z-plane (XY plane)
      const z = xb.z1;
      vertices = [
        xb.x1, xb.y1, z,  // Bottom left
        xb.x2, xb.y1, z,  // Bottom right
        xb.x2, xb.y2, z,  // Top right
        xb.x1, xb.y2, z   // Top left
      ];
      normals = [
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1
      ];
    }

    // Two triangles forming a rectangle
    indices = [
      0, 1, 2,  // First triangle
      0, 2, 3   // Second triangle
    ];

    return {
      vertices,
      normals,
      indices
    };
  }

  public getColors(color: number[]) {
    return flatten(times(24, constant(color)));
  }

  public getIndices(i: number) {

    function multiply(n) {
      return n + (24 * i);
    }

    let indices = [0, 1, 5, 0, 5, 4, 2, 3, 7, 2, 7, 6, 9, 10, 14, 9, 14, 13, 11, 8, 12, 11, 12, 15, 20, 21, 22, 20, 22, 23, 16, 18, 17, 16, 19, 18];
    return map(indices, multiply);
  }

}
