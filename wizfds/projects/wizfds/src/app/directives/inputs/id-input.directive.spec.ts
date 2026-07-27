import { ElementRef } from '@angular/core';

import { IdInputDirective } from './id-input.directive';

describe('IdInputDirective', () => {
  it('should create an instance', () => {
    const directive = new IdInputDirective(new ElementRef(document.createElement('input')));
    expect(directive).toBeTruthy();
  });
});
