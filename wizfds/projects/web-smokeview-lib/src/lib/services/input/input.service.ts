import { Injectable } from '@angular/core';
import { toNumber, find, lowerCase } from 'lodash';
import { colors } from '../../consts/colors';

@Injectable({
  providedIn: 'root'
})
export class InputService {

  constructor() { }

  public testParam(text: string, parameter: string) {

    let re = new RegExp(parameter, 'gi');
    let textRes = re.exec(text);
    return textRes ? true : false;

  }

  public parseXb(text: string) {

    let re = /[xb|XB]\s*=\s*(\-{0,1}\d+\.{0,1}\d*\s*,\s*\-{0,1}\d+\.{0,1}\d*\s*,\s*\-{0,1}\d+\.{0,1}\d*\s*,\s*\-{0,1}\d+\.{0,1}\d*\s*,\s*\-{0,1}\d+\.{0,1}\d*\s*,\s*\-{0,1}\d+\.{0,1}\d*)\s*,{0,1}/g;
    let xbRes = re.exec(text);
    return xbRes && xbRes[1] ? xbRes[1].split(',').map(function (n) { return toNumber(n) }) : '';

  }

  public parseText(text: string, parameter: string) {

    let re = new RegExp(parameter + '\s*=\s*[\'|\"](.*?)[\'|\"]', 'gi');
    let textRes = re.exec(text);
    return textRes && textRes[1] ? textRes[1] : '';

  }

  public parseRgb(surfs: any[], surfId: string) {

    let surf = find(surfs, (o) => { return o.id == surfId; });
    let color = find(colors, (o) => { return lowerCase(o.label) == lowerCase(surf.color) })
    return [color.rgb[0] / 255, color.rgb[1] / 255, color.rgb[2] / 255, 1.0];

  }


}
