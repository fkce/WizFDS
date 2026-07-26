import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { SliderDirective } from './slider.directive';

describe('SliderDirective', () => {
  it('should create an instance', () => {
    TestBed.configureTestingModule({
      providers: [
        SliderDirective,
        { provide: ElementRef, useValue: new ElementRef(document.createElement('div')) }
      ]
    });

    expect(TestBed.inject(SliderDirective)).toBeTruthy();
  });
});
