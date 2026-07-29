import { Directive, ElementRef, HostListener , Optional, Self } from '@angular/core';
import { NgControl } from '@angular/forms';

import { writeNumbersToModel } from './numeric-model';
import { isNumber, toNumber, isNaN, isArray, isArrayLikeObject, toArray, ary, map, remove } from 'lodash';

@Directive({
    selector: '[rgbInput]',
    standalone: false
})
export class RgbInputDirective {
  private el: HTMLInputElement;
  private focused: boolean = false;

  constructor(
    private elementRef: ElementRef,
    /** Absent when the field is not bound to a model - then there is nothing to convert. */
    @Optional() @Self() ngControl: NgControl
  ) {
    this.el = this.elementRef.nativeElement;
    writeNumbersToModel(ngControl);
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
