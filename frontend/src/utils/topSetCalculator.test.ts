import { describe, expect, it } from 'vitest';
import { calculateTopSet } from './topSetCalculator';

describe('calculateTopSet', () => {
  it('soma 5% para exercício livre', () => expect(calculateTopSet(100, 'FREE_WEIGHT', 1)).toBe(105));
  it('soma 10% para máquina', () => expect(calculateTopSet(100, 'MACHINE', 1)).toBe(110));
});
