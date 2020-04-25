import { Injectable } from '@angular/core';
import { map, times, constant, flatten, minBy, maxBy, max, min, forEach } from 'lodash';
import { IObst, IXb } from '../drawing/interfaces';

@Injectable({
  providedIn: 'root'
})
export class HelpersService {

  constructor() { }

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
