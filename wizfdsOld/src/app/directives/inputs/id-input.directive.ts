import { Directive, ElementRef } from '@angular/core';

@Directive({
  selector: '[idInput]'
})
export class IdInputDirective {

  private el: HTMLInputElement;

  constructor(private elementRef: ElementRef) {
    this.el = this.elementRef.nativeElement;
  }

  ngAfterContentChecked() {
    this.formatInput();
  }

  formatInput() {
    this.el.value = this.el.value.replace(/\s+/g, '');
  }

}
