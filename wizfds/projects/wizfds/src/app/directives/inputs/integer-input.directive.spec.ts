import { ElementRef } from '@angular/core';

import { IntegerInputDirective } from './integer-input.directive';

describe('IntegerInputDirective', () => {
  it('should create an instance', () => {
    const directive = new IntegerInputDirective(new ElementRef(document.createElement('input')), null);
    expect(directive).toBeTruthy();
  });
});
