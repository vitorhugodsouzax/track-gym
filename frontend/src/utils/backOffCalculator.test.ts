import { describe, expect, it } from 'vitest';
import { calculateBackOff } from './backOffCalculator';

describe('calculateBackOff', () => {
  it('usa 90% da última working set', () => expect(calculateBackOff(100, 1)).toBe(90));
  it('arredonda ao incremento do equipamento', () => expect(calculateBackOff(53, 2.5)).toBe(47.5));
});
