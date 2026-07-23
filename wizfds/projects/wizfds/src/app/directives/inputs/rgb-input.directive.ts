import { Directive, ElementRef, HostListener } from '@angular/core';
import { isNumber, toNumber, isNaN, isArray, isArrayLikeObject, toArray, ary, map, remove } from 'lodash';

@Directive({
    selector: '[rgbInput]',
    standalone: false
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

    // Validation only: red border when outside 0–255; otherwise defer to the CSS
    // form-control style (grey box, green on focus) — matches text inputs.
    if (toNumber(this.el.value) < 0 || toNumber(this.el.value) > 255) {
      this.el.style.borderColor = 'var(--danger)';
    }
    else {
      this.el.style.borderColor = '';
    }


  }
}
