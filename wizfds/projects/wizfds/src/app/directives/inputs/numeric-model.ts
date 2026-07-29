import { NgControl } from '@angular/forms';
import { toNumber } from 'lodash';

/**
 * Make a text input write a **number** into the model it is bound to.
 *
 * `ngModel` on an `<input>` without `type="number"` hands the model whatever the
 * DOM holds, which is a string. Every numeric field in this editor is one of
 * those, so a coordinate, a cell count or a colour channel the user typed was
 * stored as text in a field declared `number`. Nothing complains, because
 * TypeScript is not there at runtime and the value still prints correctly - it
 * shows up only where something does arithmetic:
 *
 * - `x1 + x2` on two strings concatenates. A mesh edited to span 10..40 m was
 *   drawn centred on `'1040' / 2` = 520 m, and the model left the screen.
 * - `Number.isFinite('40')` is false, so the preview could measure nothing and
 *   sized the whole scene - camera, clip ranges, edge widths - for a default
 *   ten-metre box.
 *
 * Fixed here rather than in the model because not every one of these fields has
 * a setter to fix: the colour inputs bind to an array slot (`color.rgb[0]`), and
 * an array slot is just a slot. This is the one place all of them pass through.
 * `Xb` and `Xyz` convert on assignment as well - see `primitives.ts` - because
 * they are also written to from the CAD import, which never touches a form.
 *
 * The conversion only settles the **type**. Whether the number is a whole one,
 * or within 0..255, is what the directives themselves check and mark; rounding
 * or clamping here would put a value in the model that the field on screen is
 * telling the user is wrong.
 */
export function writeNumbersToModel(control: NgControl | null): void {
  const accessor: any = control ? control.valueAccessor : null;
  if (!accessor || typeof accessor.registerOnChange !== 'function') { return; }

  // Wrapped before Angular calls it. A directive's constructor runs before the
  // ngOnChanges in which NgModel builds its control and registers the callback,
  // so this is the window in which it can still be wrapped.
  const registerOnChange = accessor.registerOnChange.bind(accessor);
  accessor.registerOnChange = (onChange: (value: any) => void) =>
    registerOnChange((value: any) => onChange(asNumber(value)));
}

/** What the field holds, as a number. Anything else is passed through. */
function asNumber(value: any): any {
  if (typeof value !== 'string') { return value; }

  // The fields accept a decimal comma and show a dot back; the model should not
  // depend on which of the two the user reached for
  return toNumber(value.replace(/,/g, '.'));
}
