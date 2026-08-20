import { roundToIncrement } from './roundingCalculator';

export function calculateBackOff(lastWorkingSetWeight: number, increment: number): number {
  return roundToIncrement(lastWorkingSetWeight * 0.9, increment);
}
