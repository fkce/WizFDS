import { Injectable } from '@angular/core';
import { map, times, constant, flatten, minBy, maxBy, max, min, forEach } from 'lodash';
import { IObst, IXb } from '../drawing/interfaces';
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

  public getPlaneDimFromXb(xbNorm: IXb) {
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
  public getVerticesFromXb(xb: IXb) {
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
  public generateVentGeometry(xb: IXb) {
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

  /**
   * Get normals for a cube (24 vertices)
   */
  public getNormals() {
    // 6 faces × 4 vertices each = 24 normals
    // Each face has same normal for all 4 vertices
    return [
      // Bottom face (z1) - normal pointing down
      0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
      // Top face (z2) - normal pointing up  
      0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,
      // Bottom face (z1) - duplicate (seems to be how getVerticesFromXb works)
      0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
      // Top face (z2) - duplicate
      0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,
      // Bottom face (z1) - duplicate 
      0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
      // Top face (z2) - duplicate
      0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1
    ];
  }

  public getIndices(i: number) {

    function multiply(n) {
      return n + (24 * i);
    }

    let indices = [0, 1, 5, 0, 5, 4, 2, 3, 7, 2, 7, 6, 9, 10, 14, 9, 14, 13, 11, 8, 12, 11, 12, 15, 20, 21, 22, 20, 22, 23, 16, 18, 17, 16, 19, 18];
    return map(indices, multiply);
  }

}
