import { Directive, HostListener, ElementRef, OnInit, Input } from '@angular/core';
import { isNumber, toNumber, isNaN } from 'lodash';

@Directive({
    selector: '[decimalInput]',
    standalone: false
})
export class DecimalInputDirective {
  private el: HTMLInputElement;
  private focused: boolean = false;

  constructor(private elementRef: ElementRef) {
    this.el = this.elementRef.nativeElement;
  }

  ngAfterContentChecked() {
    this.formatInput();
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: any) {
    // Enter
    if (event.keyCode === 13) { 
      this.el.blur();
    }
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

    // Replace comma to dot
    this.el.value = this.el.value.replace(/,/g, '.');

    // Validation only: red border when the value is not a number; otherwise defer
    // to the CSS form-control style (grey box, green on focus) — matches text inputs.
    if (isNaN(toNumber(this.el.value))) {
      this.el.style.borderColor = 'var(--danger)';
    }
    else {
      this.el.style.borderColor = '';
    }
  }

}