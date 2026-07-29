import { ElementRef } from '@angular/core';

import { DecimalInputDirective } from './decimal-input.directive';

describe('DecimalInputDirective', () => {
  it('should create an instance', () => {
    // The directive reads nativeElement in its constructor, so it needs a real one
    const directive = new DecimalInputDirective(new ElementRef(document.createElement('input')), null);
    expect(directive).toBeTruthy();
  });
});
