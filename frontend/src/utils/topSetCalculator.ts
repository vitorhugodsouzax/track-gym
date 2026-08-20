import { roundToIncrement } from './roundingCalculator';

export type EquipmentType = 'FREE_WEIGHT' | 'MACHINE';

export function calculateTopSet(lastWorkingSetWeight: number, equipmentType: EquipmentType, increment: number): number {
  const percentage = equipmentType === 'MACHINE' ? 1.10 : 1.05;
  return roundToIncrement(lastWorkingSetWeight * percentage, increment);
}
