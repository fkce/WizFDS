import { Injectable } from '@angular/core';
import { map, times, constant, flatten, max, forEach } from 'lodash';
import { SceneColor, SceneXb } from '../drawing/scene-input';
import { Vector3 } from 'babylonjs';

// TODO!!! move to parsers wizObject !!!
@Injectable({
  providedIn: 'root'
})
export class HelpersService {

  // Norm variables
  normDelta: number = 1;
  normXMin: number = 0;
  normYMin: number = 0;
  normZMin: number = 0;
  normXMax: number = 1;
  normYMax: number = 1;
  normZMax: number = 1;

  constructor() { }

  /**
   * Whether anything has set the scene bounds yet.
   *
   * Nothing enforces the order the drawing services run in, so each of them used
   * to carry its own copy of this check and compute the bounds itself if it
   * happened to be first. Phase 2 (#86) removes the whole notion along with
   * normalisation.
   */
  private get hasBounds(): boolean {
    return !(this.normDelta === 1 &&
      this.normXMin === 0 &&
      this.normYMin === 0 &&
      this.normZMin === 0);
  }

  /**
   * Set the scene bounds from these boxes unless something already has.
   *
   * For the services that only get to define the scene when nothing else did -
   * a scenario with no &MESH still has to be drawn somewhere.
   */
  public ensureBounds(boxes: readonly SceneXb[]): void {
    if (this.hasBounds) { return; }
    this.setBoundsFrom(boxes);
  }

  /**
   * Set the scene bounds from a set of boxes, in metres.
   *
   * Which elements get to define them is the caller's decision: meshes when the
   * scenario has any, otherwise whichever service found itself first.
   */
  public setBoundsFrom(boxes: readonly SceneXb[]): void {
    if (boxes.length === 0) { return; }

    let xMin = boxes[0].x1, yMin = boxes[0].y1, zMin = boxes[0].z1;
    let xMax = boxes[0].x2, yMax = boxes[0].y2, zMax = boxes[0].z2;

    forEach(boxes, (xb: SceneXb) => {
      xMin = xb.x1 < xMin ? xb.x1 : xMin;
      xMax = xb.x2 > xMax ? xb.x2 : xMax;
      yMin = xb.y1 < yMin ? xb.y1 : yMin;
      yMax = xb.y2 > yMax ? xb.y2 : yMax;
      zMin = xb.z1 < zMin ? xb.z1 : zMin;
      zMax = xb.z2 > zMax ? xb.z2 : zMax;
    });

    this.normXMin = xMin;
    this.normYMin = yMin;
    this.normZMin = zMin;
    this.normDelta = max([xMax - xMin, yMax - yMin, zMax - zMin]);

    // The clip sliders are calibrated against these, so they have to be the
    // bounds after the transformation, not before it
    const far = this.normalizeXb({ x1: xMax, x2: xMax, y1: yMax, y2: yMax, z1: zMax, z2: zMax });
    this.normXMax = far.x1;
    this.normYMax = far.y1;
    this.normZMax = far.z1;
  }

  /**
   * Squeeze a box given in metres into the unit cube the scene is drawn in.
   *
   * Returns a new box: the element it came from belongs to the app (ADR-0004) and
   * is never written to. Phase 2 (#86) removes this step - the scene will be in
   * metres 1:1 (ADR-0002).
   */
  public normalizeXb(xb: SceneXb): SceneXb {
    const shiftX = (this.normXMin < 0) ? -this.normXMin : this.normXMin;
    const shiftY = (this.normYMin < 0) ? -this.normYMin : this.normYMin;
    const shiftZ = (this.normZMin < 0) ? -this.normZMin : this.normZMin;

    return {
      x1: (xb.x1 + shiftX) / this.normDelta,
      x2: (xb.x2 + shiftX) / this.normDelta,
      y1: (xb.y1 + shiftY) / this.normDelta,
      y2: (xb.y2 + shiftY) / this.normDelta,
      z1: (xb.z1 + shiftZ) / this.normDelta,
      z2: (xb.z2 + shiftZ) / this.normDelta
    };
  }

  /** A colour as the flat rgba array the vertex buffers are built from. */
  public toRgba(color: SceneColor): number[] {
    return [color.r, color.g, color.b, color.a];
  }

  public getPlaneDimFromXb(xbNorm: SceneXb) {
    let options: any = {};
    if (xbNorm.x1 == xbNorm.x2) {
      options.height = xbNorm.y2 - xbNorm.y1;
      options.width = xbNorm.z2 - xbNorm.z1;
      options.rotate = new Vector3(0, 1, 0);
      options.center = new BABYLON.Vector3(xbNorm.x1, xbNorm.y1 + (xbNorm.y2 - xbNorm.y1) / 2, xbNorm.z1 + (xbNorm.z2 - xbNorm.z1) / 2);
    }
    else if (xbNorm.y1 == xbNorm.y2) {
      options.width = xbNorm.x2 - xbNorm.x1;
      options.height = xbNorm.z2 - xbNorm.z1;
      options.rotate = new Vector3(1, 0, 0);
      options.center = new BABYLON.Vector3(xbNorm.x1 + (xbNorm.x2 - xbNorm.x1) / 2, xbNorm.y1, xbNorm.z1 + (xbNorm.z2 - xbNorm.z1) / 2);
    }
    else if (xbNorm.z1 == xbNorm.z2) {
      options.height = xbNorm.x2 - xbNorm.x1;
      options.width = xbNorm.y2 - xbNorm.y1;
      options.rotate = new Vector3(0, 0, 1);
      options.center = new BABYLON.Vector3(xbNorm.x1 + (xbNorm.x2 - xbNorm.x1) / 2, xbNorm.y1 + (xbNorm.y2 - xbNorm.y1) / 2, xbNorm.z1);
    }
    return options;
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
