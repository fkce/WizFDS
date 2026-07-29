import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { DecimalInputDirective } from './decimal-input.directive';
import { IntegerInputDirective } from './integer-input.directive';
import { RgbInputDirective } from './rgb-input.directive';

/**
 * What a numeric field leaves in the model.
 *
 * `ngModel` on a text input writes a **string**. Every one of these directives
 * validates the field and reformats what is displayed, and none of them used to
 * touch the bound value - so a number the user typed was stored as text in a
 * field declared `number`. Nothing complains until something does arithmetic:
 * `x1 + x2` on two strings concatenates, which is how a mesh edited to span
 * 10..40 m came to be drawn centred on 520 m.
 *
 * Driven through the real `ngModel` rather than by calling the directive: the
 * point of the fix is where the value crosses from the view into the model, and
 * that crossing is Angular's, not ours.
 */
@Component({
  template: `
    <input [(ngModel)]="decimal" decimalInput>
    <input [(ngModel)]="integer" integerInput>
    <input [(ngModel)]="channel" rgbInput>
    <input [(ngModel)]="plain">
  `,
  standalone: false
})
class HostComponent {
  decimal: any = 0;
  integer: any = 0;
  channel: any = 0;
  plain: any = 0;
}

describe('a numeric field', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [
        HostComponent, DecimalInputDirective, IntegerInputDirective, RgbInputDirective
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  /** Type into one of the inputs, as a user does. */
  function type(index: number, text: string): void {
    const input: HTMLInputElement = fixture.nativeElement.querySelectorAll('input')[index];
    input.value = text;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  const DECIMAL = 0, INTEGER = 1, CHANNEL = 2, PLAIN = 3;

  describe('decimalInput', () => {
    it('leaves a number in the model, not the text that was typed', () => {
      type(DECIMAL, '40');

      expect(host.decimal).toBe(40);
      expect(typeof host.decimal).toBe('number');
    });

    it('adds rather than concatenates', () => {
      type(DECIMAL, '10');

      expect(host.decimal + 40).toBe(50);
    });

    it('keeps a decimal', () => {
      type(DECIMAL, '2.75');

      expect(host.decimal).toBe(2.75);
    });

    it('reads a decimal comma, which the field accepts', () => {
      type(DECIMAL, '2,75');

      expect(host.decimal).toBe(2.75);
    });

    it('reads a cleared field as nothing rather than as text', () => {
      type(DECIMAL, '');

      expect(host.decimal).toBe(0);
    });
  });

  describe('integerInput', () => {
    it('leaves a number in the model', () => {
      type(INTEGER, '12');

      expect(host.integer).toBe(12);
      expect(typeof host.integer).toBe('number');
    });

    it('does not quietly round what the field marks as wrong', () => {
      // The directive validates integerness and shows it; rounding here would
      // put a value in the model that the field is telling the user is invalid
      type(INTEGER, '3.7');

      expect(host.integer).toBe(3.7);
    });
  });

  describe('rgbInput', () => {
    it('leaves a number in the model', () => {
      // These bind to an array slot - `surf.color.rgb[0]` - so there is no
      // setter on the model that could have caught it
      type(CHANNEL, '128');

      expect(host.channel).toBe(128);
      expect(typeof host.channel).toBe('number');
    });

    it('does not quietly clamp what the field marks as out of range', () => {
      type(CHANNEL, '300');

      expect(host.channel).toBe(300);
    });
  });

  it('leaves an input without one of these directives alone', () => {
    // The conversion belongs to the directives, not to every text field
    type(PLAIN, '40');

    expect(host.plain).toBe('40');
  });
});
