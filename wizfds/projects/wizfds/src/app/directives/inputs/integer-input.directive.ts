import { Directive, HostListener, ElementRef, OnInit, Input } from '@angular/core';
import { isInteger, toNumber } from 'lodash';

@Directive({
    selector: '[integerInput]',
    standalone: false
})
export class IntegerInputDirective {

  private el: HTMLInputElement;

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

  formatInput() {
    //this.el.value = this.currencyPipe.parse(value); // opossite of transform

    // Set auto size
    //if (this.el.value.length < 3) {
    //  this.el.size = 3;
    //}
    //else {
    this.el.style.width = 0.6 * this.el.value.length + 'rem';
    //}

    // Validation only: red border when not an integer; otherwise defer to the CSS
    // form-control style (grey box, green on focus) — matches text inputs.
    if (!isInteger(toNumber(this.el.value))) {
      this.el.style.borderColor = 'var(--danger)';
    }
    else {
      this.el.style.borderColor = '';
    }

  }

}
