import { ElementRef } from '@angular/core';

import { RgbInputDirective } from './rgb-input.directive';

describe('RgbInputDirective', () => {
  it('should create an instance', () => {
    const directive = new RgbInputDirective(new ElementRef(document.createElement('input')));
    expect(directive).toBeTruthy();
  });
});
