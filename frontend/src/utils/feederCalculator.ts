const percentages: Record<number, number[]> = { 1: [85], 2: [70, 90], 3: [50, 70, 90] };
export function calculateFeeders(weight: number, count: number, increment: number) {
  return (percentages[count] ?? []).map((percentage) => ({ percentage, weight: Math.round((weight * percentage / 100) / increment) * increment }));
}
