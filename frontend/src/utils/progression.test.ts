import { describe, expect, it } from 'vitest';
import { evaluateProgression, evaluateRepsTrend, repTarget } from './progression';

describe('repTarget', () => {
  it('soma 2 reps quando o range é fixo', () => expect(repTarget(8, 8)).toBe(10));
  it('usa o topo do range quando ele é aberto', () => expect(repTarget(8, 12)).toBe(12));
});

describe('evaluateProgression', () => {
  it('progride 5% quando todas as working sets batem o alvo', () => {
    const result = evaluateProgression([
      { order: 1, repRangeMin: 8, repRangeMax: 8, completedReps: 10, actualWeight: 100 },
      { order: 2, repRangeMin: 8, repRangeMax: 8, completedReps: 10, actualWeight: 100 },
    ], 2.5);
    expect(result).toMatchObject({ shouldProgress: true, nextWorkingWeight: 105, percentage: 5 });
  });

  it('mantém a carga quando qualquer working set não bate o alvo', () => {
    const result = evaluateProgression([
      { order: 1, repRangeMin: 8, repRangeMax: 8, completedReps: 7, actualWeight: 100 },
    ], 2.5);
    expect(result).toMatchObject({ shouldProgress: false, nextWorkingWeight: 100, percentage: null });
  });

  it('lança erro quando nenhuma working set é fornecida', () => {
    expect(() => evaluateProgression([], 2.5)).toThrow();
  });
});

describe('evaluateRepsTrend', () => {
  it('reporta melhora quando alguma série bate mais reps que a sessão anterior', () => {
    const current = [{ order: 1, repRangeMin: 8, repRangeMax: 8, completedReps: 9, actualWeight: 100 }];
    const previous = [{ order: 1, repRangeMin: 8, repRangeMax: 8, completedReps: 8, actualWeight: 100 }];
    expect(evaluateRepsTrend(current, previous)).toBe('improved');
  });

  it('reporta "same" quando não há sessão anterior', () => {
    const current = [{ order: 1, repRangeMin: 8, repRangeMax: 8, completedReps: 10, actualWeight: 100 }];
    expect(evaluateRepsTrend(current, [])).toBe('same');
  });
});
