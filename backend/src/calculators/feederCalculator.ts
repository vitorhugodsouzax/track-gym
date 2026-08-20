import { roundToIncrement } from './roundingCalculator.js';

export const FEEDER_PERCENTAGES = {
  1: [85],
  2: [70, 90],
  3: [50, 70, 90],
} as const;

export type FeederCount = keyof typeof FEEDER_PERCENTAGES;

export interface FeederSuggestion { order: number; percentage: number; weight: number; }

export function calculateFeeders(workingWeight: number, feederCount: FeederCount, increment: number): FeederSuggestion[] {
  if (workingWeight < 0 || !Number.isFinite(workingWeight)) throw new Error('Working weight must be a non-negative finite number.');
  return FEEDER_PERCENTAGES[feederCount].map((percentage, index) => ({
    order: index + 1,
    percentage,
    weight: roundToIncrement(workingWeight * percentage / 100, increment),
  }));
}
