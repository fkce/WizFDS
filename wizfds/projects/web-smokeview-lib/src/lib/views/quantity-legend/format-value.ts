/** Above this, and below its reciprocal band, a plain reading stops being one. */
const PLAIN_MAX = 1e5;
const PLAIN_MIN = 1e-2;

/**
 * A value as the legend writes it: three significant digits, and an exponent
 * only where the plain form has stopped being readable.
 *
 * Three digits because that is what can be read off a colour bar honestly - the
 * eye resolves a band, not a value - and significant rather than decimal
 * because FDS quantities span ten orders of magnitude. A fixed `toFixed(1)`
 * would print every mole fraction as `0.0`.
 */
export function formatScaleValue(value: number): string {
    if (!Number.isFinite(value)) { return '-'; }
    if (value === 0) { return '0'; }

    const magnitude = Math.abs(value);
    if (magnitude >= PLAIN_MAX || magnitude < PLAIN_MIN) {
        return value.toExponential(2);
    }

    // Round to three digits, then let the number print itself: toPrecision()
    // would turn 1234 into `1.23e+3` on its own, and this band is exactly the
    // one where that is not wanted.
    return String(Number(value.toPrecision(3)));
}
