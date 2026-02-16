import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'positiveNumber',
    standalone: false
})
export class PositiveNumberPipe implements PipeTransform {

  transform(value: any, ...args: any[]): any {

    return Math.abs(value);
  }

}
