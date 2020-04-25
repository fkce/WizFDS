import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'minSec'
})
export class MinSecPipe implements PipeTransform {

  transform(value: any, ...args: any[]): any {
    const minutes: number = Math.floor(value / 60);
    return minutes.toString().padStart(2, '0') + ':' + (value - minutes * 60).toString().padStart(2, '0');
  }

}
