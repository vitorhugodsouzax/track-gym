/** Rounds a non-negative weight to the nearest available equipment increment. */
export function roundToIncrement(weight: number, increment: number): number {
  if (!Number.isFinite(weight) || weight < 0) throw new Error('Weight must be a non-negative finite number.');
  if (!Number.isFinite(increment) || increment <= 0) throw new Error('Increment must be greater than zero.');

  // Decimal values such as 102.5 / 5 can be represented as 20.499999... in IEEE 754.
  // The epsilon preserves the intended conventional "half up" rounding.
  const rounded = Math.round((weight / increment) + 1e-9) * increment;
  return Number(rounded.toFixed(10));
}
