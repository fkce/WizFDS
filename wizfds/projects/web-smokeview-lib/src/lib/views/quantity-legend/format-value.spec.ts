import { formatScaleValue } from './format-value';

/**
 * How a number is written on the legend.
 *
 * FDS quantities run from mole fractions around 1e-6 to HRRPUV around 1e6, so
 * a fixed number of decimals lies at one end or the other: `0.00` for a
 * concentration, `340.00000` for a temperature nobody measured that finely.
 * Three significant digits, and the exponent where the plain reading stops
 * being one.
 */
describe('formatScaleValue', () => {

    it('writes an everyday reading plainly', () => {
        expect(formatScaleValue(20)).toBe('20');
        expect(formatScaleValue(340)).toBe('340');
        expect(formatScaleValue(-5)).toBe('-5');
        expect(formatScaleValue(0)).toBe('0');
    });

    it('keeps three significant digits and no more', () => {
        expect(formatScaleValue(3.4567)).toBe('3.46');
        expect(formatScaleValue(512.49)).toBe('512');
        expect(formatScaleValue(1234)).toBe('1230');
    });

    it('does not pad a round number with zeros it does not have', () => {
        expect(formatScaleValue(12)).toBe('12');
        expect(formatScaleValue(1.5)).toBe('1.5');
    });

    it('goes exponential once a plain reading stops being readable', () => {
        expect(formatScaleValue(1234567)).toBe('1.23e+6');
        expect(formatScaleValue(0.0000123)).toBe('1.23e-5');
        expect(formatScaleValue(-0.0000123)).toBe('-1.23e-5');
    });

    it('stays plain right up to the threshold', () => {
        expect(formatScaleValue(99900)).toBe('99900');
        expect(formatScaleValue(0.0123)).toBe('0.0123');
    });

    it('has something to say about a number that is not one', () => {
        // A range should never hold these, but a legend that renders "NaN"
        // reads as a value rather than as the absence of one.
        expect(formatScaleValue(Number.NaN)).toBe('-');
        expect(formatScaleValue(Number.POSITIVE_INFINITY)).toBe('-');
    });
});
