import { roundToIncrement } from './roundingCalculator';

export interface WorkingSetPerformance {
  order: number;
  repRangeMin: number;
  repRangeMax: number;
  completedReps: number;
  actualWeight: number;
}

export interface ProgressionPreview {
  shouldProgress: boolean;
  nextWorkingWeight: number;
  percentage: number | null;
  reason: string;
}

export function repTarget(repRangeMin: number, repRangeMax: number): number {
  return Math.max(repRangeMax, repRangeMin + 2);
}

export function evaluateProgression(workingSets: WorkingSetPerformance[], increment: number): ProgressionPreview {
  const sorted = [...workingSets].sort((a, b) => a.order - b.order);
  const lastSet = sorted[sorted.length - 1];
  const allMet = sorted.every((set) => set.completedReps >= repTarget(set.repRangeMin, set.repRangeMax));
  if (!allMet) {
    return {
      shouldProgress: false,
      nextWorkingWeight: lastSet.actualWeight,
      percentage: null,
      reason: 'Carga mantida: nem todas as Working Sets bateram a meta de reps.',
    };
  }
  return {
    shouldProgress: true,
    nextWorkingWeight: roundToIncrement(lastSet.actualWeight * 1.05, increment),
    percentage: 5,
    reason: 'Progressão liberada: todas as Working Sets bateram a meta de reps.',
  };
}

export function evaluateRepsTrend(currentSets: WorkingSetPerformance[], previousSets: WorkingSetPerformance[]): 'improved' | 'same' {
  if (previousSets.length === 0) return 'same';
  const improved = currentSets.some((current) => {
    const previous = previousSets.find((set) => set.order === current.order);
    return previous !== undefined && current.completedReps > previous.completedReps;
  });
  return improved ? 'improved' : 'same';
}
