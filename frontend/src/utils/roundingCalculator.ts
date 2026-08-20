export function roundToIncrement(weight: number, increment: number): number {
  const rounded = Math.round(weight / increment + 1e-9) * increment;
  return Number(rounded.toFixed(10));
}
