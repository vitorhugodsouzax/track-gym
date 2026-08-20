import { describe, expect, it } from 'vitest';
import { evaluateProgression } from '../src/engines/progressionEngine.js';

const qualifiedCriteria = { loadControlled: true, repsInReserve: 2, feeling: 'NORMAL' as const, repsClean: true };

describe('evaluateProgression', () => {
  it('recommends +2.5% for a qualified free-weight exercise, for the next session only', () => {
    expect(evaluateProgression({ workingWeight: 100, increment: 2.5, equipmentType: 'FREE_WEIGHT', criteria: qualifiedCriteria })).toMatchObject({ shouldProgress: true, nextWorkingWeight: 102.5, percentage: 2.5 });
  });
  it('rounds a free-weight recommendation to the machine increment when configured', () => {
    expect(evaluateProgression({ workingWeight: 100, increment: 5, equipmentType: 'FREE_WEIGHT', criteria: qualifiedCriteria }).nextWorkingWeight).toBe(105);
  });
  it('recommends +5% for a qualified machine exercise', () => {
    expect(evaluateProgression({ workingWeight: 100, increment: 1, equipmentType: 'MACHINE', criteria: qualifiedCriteria })).toMatchObject({ shouldProgress: true, nextWorkingWeight: 105, percentage: 5 });
  });
  it.each([
    { ...qualifiedCriteria, loadControlled: false },
    { ...qualifiedCriteria, repsInReserve: 1 },
    { ...qualifiedCriteria, feeling: 'BAD' as const },
    { ...qualifiedCriteria, repsClean: false },
  ])('keeps the load when any criterion fails', (criteria) => {
    expect(evaluateProgression({ workingWeight: 100, increment: 2.5, equipmentType: 'FREE_WEIGHT', criteria }).shouldProgress).toBe(false);
  });
});
