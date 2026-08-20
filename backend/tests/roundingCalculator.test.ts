import { describe, expect, it } from 'vitest';
import { roundToIncrement } from '../src/calculators/roundingCalculator.js';

describe('roundToIncrement', () => {
  it('rounds to the nearest valid increment', () => expect(roundToIncrement(102.5, 5)).toBe(105));
  it('preserves an exact increment', () => expect(roundToIncrement(47.5, 2.5)).toBe(47.5));
});
