import { describe, expect, it } from 'vitest';
import { roundToIncrement } from './roundingCalculator';

describe('roundToIncrement', () => {
  it('arredonda para o incremento válido mais próximo', () => expect(roundToIncrement(102.5, 5)).toBe(105));
  it('preserva um incremento exato', () => expect(roundToIncrement(47.5, 2.5)).toBe(47.5));
});
