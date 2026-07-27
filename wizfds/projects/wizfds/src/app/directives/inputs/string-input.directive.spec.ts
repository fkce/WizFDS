import { ElementRef } from '@angular/core';

import { StringInputDirective } from './string-input.directive';

describe('StringInputDirective', () => {
  it('should create an instance', () => {
    const directive = new StringInputDirective(new ElementRef(document.createElement('input')));
    expect(directive).toBeTruthy();
  });
});
