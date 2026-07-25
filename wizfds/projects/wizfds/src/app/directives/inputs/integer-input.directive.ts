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
    // Size hint only — the actual field width comes from the shared CSS
    // form-control rule (compact numeric readout), matching decimalInput /
    // rgbInput. (Previously set an inline style.width that made 1-digit values
    // collapse to ~0.6rem and overrode the CSS.)
    if (this.el.value.length > 0) {
      this.el.size = this.el.value.length;
    }

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
