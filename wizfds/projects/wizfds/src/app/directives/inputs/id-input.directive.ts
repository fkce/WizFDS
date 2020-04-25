import { Directive, ElementRef, HostListener } from '@angular/core';

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

  @HostListener('keydown', ['$event'])
  onKeyDown(event: any) {
    // Enter
    if (event.keyCode === 13) { 
      this.el.blur();
    }
  }

  formatInput() {
    this.el.value = this.el.value.replace(/\s+/g, '');
  }

}
