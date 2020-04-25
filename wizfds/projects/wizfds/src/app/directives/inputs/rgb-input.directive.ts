import { Directive, ElementRef, HostListener } from '@angular/core';
import { isNumber, toNumber, isNaN, isArray, isArrayLikeObject, toArray, ary, map, remove } from 'lodash';

@Directive({
  selector: '[rgbInput]'
})
export class RgbInputDirective {
  private el: HTMLInputElement;
  private focused: boolean = false;

  constructor(private elementRef: ElementRef) {
    this.el = this.elementRef.nativeElement;
  }

  ngAfterContentChecked() {
    this.formatInput();
  }

  @HostListener('focus', ['$event']) onFocus(e) {
    this.focused = true;
  }
  @HostListener('blur', ['$event']) onblur(e) {
    this.focused = false;
  }

  formatInput() {
    if (this.el.value.length > 0) {
      this.el.size = this.el.value.length;
    }
    else {
      this.el.size = 1;
    }

    // Allow only digits and comma
    this.el.value = this.el.value.replace(/\D/g, '');

    // Set background if invalid value
    if (toNumber(this.el.value) < 0 || toNumber(this.el.value) > 255) {
      this.el.style.borderBottom = 'solid 2px red';
    }
    else if (this.focused == true) {
      this.el.style.borderBottom = 'solid 2px #FF9800';
    }
    else {
      this.el.style.borderBottom = '2px solid rgba(255,255,255,.7)';
    }


  }
}
