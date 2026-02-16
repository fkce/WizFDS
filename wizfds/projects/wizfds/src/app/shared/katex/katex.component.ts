import { Component, Input, ElementRef, AfterViewInit, OnChanges } from '@angular/core';
import katex from 'katex';

@Component({
    selector: 'ng-katex',
    template: '',
    standalone: false
})
export class NgKatexShimComponent implements AfterViewInit, OnChanges {
  @Input() equation: string = '';

  constructor(private host: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    this.render();
  }

  ngOnChanges(): void {
    this.render();
  }

  private render(): void {
    try {
      if (!this.host?.nativeElement) return;
      katex.render(this.equation || '', this.host.nativeElement, {
        throwOnError: false,
        displayMode: false,
        strict: 'ignore',
      });
    } catch {
      // ignore rendering errors
    }
  }
}
