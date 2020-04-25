import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[stringInput]'
})
export class StringInputDirective {

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
    if (this.el.value.length > 0) {
      this.el.size = this.el.value.length;
    }
  }

}
