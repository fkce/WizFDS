import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'largeNumber',
    standalone: false
})
export class LargeNumberPipe implements PipeTransform {

  transform(value: any, ...args: any[]): any {
    
    const largeNumber: string = value.toLocaleString('en-EN').replace(',', ' ');
    return largeNumber;
  }

}
