import { describe, expect, it } from 'vitest';
import { calculateFeeders } from '../src/calculators/feederCalculator.js';

describe('calculateFeeders', () => {
  it('calculates 3 feeders using 50%, 70%, and the automatic 90% default', () => {
    expect(calculateFeeders(100, 3, 1).map(({ weight }) => weight)).toEqual([50, 70, 90]);
  });
  it('calculates 2 feeders using 70% and 90%', () => {
    expect(calculateFeeders(100, 2, 1).map(({ weight }) => weight)).toEqual([70, 90]);
  });
  it('calculates 1 feeder using 85%', () => {
    expect(calculateFeeders(100, 1, 1).map(({ weight }) => weight)).toEqual([85]);
  });
  it('rounds feeder weights to the equipment increment', () => {
    expect(calculateFeeders(53, 3, 2.5).map(({ weight }) => weight)).toEqual([27.5, 37.5, 47.5]);
  });
});
