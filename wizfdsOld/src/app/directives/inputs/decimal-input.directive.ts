import { Directive, HostListener, ElementRef, OnInit, Input } from '@angular/core';
import { isNumber, toNumber, isNaN } from 'lodash';

@Directive({
  selector: '[decimalInput]'
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

    // Set background if invalid value
    if (isNaN(toNumber(this.el.value))) {
      this.el.style.borderBottom = 'solid 2px red';
    }
    else if(this.focused == true) {
      this.el.style.borderBottom = 'solid 2px #FF9800';
    }
    else {
      this.el.style.borderBottom = '2px solid rgba(255,255,255,.7)';
    }


  }

}