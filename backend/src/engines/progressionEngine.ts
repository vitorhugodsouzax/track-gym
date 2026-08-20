import { roundToIncrement } from '../calculators/roundingCalculator.js';

export type EquipmentType = 'FREE_WEIGHT' | 'MACHINE';
export type Feeling = 'GOOD' | 'NORMAL' | 'BAD';

export interface ProgressionCriteria {
  loadControlled: boolean;
  repsInReserve: number;
  feeling: Feeling;
  repsClean: boolean;
}

export interface ProgressionInput {
  workingWeight: number;
  increment: number;
  equipmentType: EquipmentType;
  criteria: ProgressionCriteria;
}

export interface ProgressionResult {
  shouldProgress: boolean;
  nextWorkingWeight: number;
  percentage: number | null;
  reason: string;
}

export function evaluateProgression(input: ProgressionInput): ProgressionResult {
  const { criteria } = input;
  const criteriaMet = criteria.loadControlled && criteria.repsInReserve >= 2 && criteria.feeling !== 'BAD' && criteria.repsClean;
  if (!criteriaMet) {
    return { shouldProgress: false, nextWorkingWeight: input.workingWeight, percentage: null, reason: 'Os critérios de progressão ainda não foram atingidos.' };
  }

  const percentage = input.equipmentType === 'MACHINE' ? 5 : 2.5;
  return {
    shouldProgress: true,
    nextWorkingWeight: roundToIncrement(input.workingWeight * (1 + percentage / 100), input.increment),
    percentage,
    reason: 'Progressão liberada: carga controlada, ao menos 2 reps de folga, feeling adequado e reps limpas.',
  };
}
