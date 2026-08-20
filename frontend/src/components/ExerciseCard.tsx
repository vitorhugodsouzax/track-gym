import { useEffect, useMemo, useState } from 'react';
import type { Exercise, LastPerformance, SetTemplate } from '../types/api';
import { calculateFeeders } from '../utils/feederCalculator';
import { calculateTopSet } from '../utils/topSetCalculator';
import { calculateBackOff } from '../utils/backOffCalculator';
import { evaluateProgression, evaluateRepsTrend, repTarget, type WorkingSetPerformance } from '../utils/progression';
import { formatRange, SET_LABELS } from '../utils/labels';
import { FreeWeightIcon, MachineIcon } from './Icons';

function setLabel(template: SetTemplate, feederNumber: number, workingNumber: number) {
  if (template.type === 'FEEDER') return `Feeder ${feederNumber}`;
  if (template.type === 'WORKING') return `WS ${workingNumber}`;
  return SET_LABELS[template.type];
}

function suggestedWorkingWeight(lastPerformance?: LastPerformance | null): number | undefined {
  if (!lastPerformance) return undefined;
  if (lastPerformance.progression) return lastPerformance.progression.nextWorkingWeight;
  const workingSets = lastPerformance.sets.filter((set) => set.type === 'WORKING');
  const last = workingSets[workingSets.length - 1];
  return last?.actualWeight ?? last?.plannedWeight ?? undefined;
}

function formatLastWorking(lastPerformance?: LastPerformance | null): string | null {
  if (!lastPerformance) return null;
  const workingSets = lastPerformance.sets.filter((set) => set.type === 'WORKING');
  if (workingSets.length === 0) return null;
  const weight = workingSets[0].actualWeight ?? workingSets[0].plannedWeight;
  const reps = workingSets.map((set) => set.completedReps ?? '—').join(' × ');
  return `${weight ?? '—'} kg × ${reps}`;
}

function previousForSet(lastPerformance: LastPerformance | null | undefined, type: SetTemplate['type'], order: number): string | null {
  const match = lastPerformance?.sets.find((set) => set.type === type && set.order === order);
  if (!match) return null;
  const weight = match.actualWeight ?? match.plannedWeight;
  if (weight === null || weight === undefined) return null;
  return `${weight}kg x ${match.completedReps ?? '—'}`;
}

function setsSummary(setTemplates: SetTemplate[]): string {
  const working = setTemplates.filter((set) => set.type === 'WORKING');
  if (working.length === 0) return `${setTemplates.length} séries`;
  const min = working[0].repRangeMin;
  const max = working[0].repRangeMax;
  return `${working.length}x${min}-${max}`;
}

export interface ExerciseDraft {
  exerciseTemplateId: string;
  nameSnapshot: string;
  order: number;
  equipmentType: Exercise['equipmentType'];
  workingWeight?: number;
  increment: number;
  sets: Array<Record<string, unknown>>;
}

export function ExerciseCard({ exercise, onChange }: { exercise: Exercise; onChange?: (draft: ExerciseDraft) => void }) {
  const initialWeight = useMemo(() => suggestedWorkingWeight(exercise.lastPerformance), [exercise]);
  const [workingWeight, setWorkingWeight] = useState(initialWeight !== undefined ? String(initialWeight) : '');
  const feederCount = useMemo(() => exercise.setTemplates.filter((set) => set.type === 'FEEDER').length, [exercise]);
  const feeders = useMemo(() => workingWeight ? calculateFeeders(Number(workingWeight), feederCount, Number(exercise.increment)) : [], [workingWeight, feederCount, exercise.increment]);
  const [values, setValues] = useState<Record<number, Record<string, unknown>>>({});
  const [restSeconds, setRestSeconds] = useState(0);

  useEffect(() => {
    if (restSeconds <= 0) return;
    const timer = window.setInterval(() => setRestSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [restSeconds]);

  const update = (index: number, value: Record<string, unknown>) =>
    setValues((current) => ({ ...current, [index]: { ...current[index], ...value } }));

  const workingIndexes = exercise.setTemplates
    .map((set, index) => ({ set, index }))
    .filter(({ set }) => set.type === 'WORKING')
    .map(({ index }) => index);
  const lastWorkingIndex = workingIndexes[workingIndexes.length - 1];
  const lastWorkingActual = lastWorkingIndex !== undefined ? Number(values[lastWorkingIndex]?.actualWeight) : NaN;
  const topSetBackOffBasis = lastWorkingActual > 0 ? lastWorkingActual : (workingWeight ? Number(workingWeight) : undefined);
  const topSetWeight = topSetBackOffBasis !== undefined ? calculateTopSet(topSetBackOffBasis, exercise.equipmentType, Number(exercise.increment)) : undefined;
  const backOffWeight = topSetBackOffBasis !== undefined ? calculateBackOff(topSetBackOffBasis, Number(exercise.increment)) : undefined;

  useEffect(() => {
    onChange?.({
      exerciseTemplateId: exercise.id,
      nameSnapshot: exercise.name,
      order: exercise.order,
      equipmentType: exercise.equipmentType,
      workingWeight: workingWeight ? Number(workingWeight) : undefined,
      increment: Number(exercise.increment),
      sets: exercise.setTemplates.map((set, index) => {
        const feederIndex = exercise.setTemplates.slice(0, index).filter((item) => item.type === 'FEEDER').length;
        const plannedWeight = set.type === 'FEEDER'
          ? feeders[feederIndex]?.weight
          : set.type === 'TOP_SET'
            ? topSetWeight
            : set.type === 'BACK_OFF'
              ? backOffWeight
              : (set.type === 'WORKING' || set.type === 'REST_PAUSE')
                ? (workingWeight ? Number(workingWeight) : undefined)
                : undefined;

        return {
          type: set.type,
          order: set.order,
          repRangeMin: set.repRangeMin,
          repRangeMax: set.repRangeMax,
          actualWeight: values[index]?.actualWeight !== undefined ? values[index].actualWeight : plannedWeight,
          ...values[index],
        };
      }),
    });
  }, [exercise, workingWeight, values, feeders, topSetWeight, backOffWeight, onChange]);

  const completedWorkingSets: WorkingSetPerformance[] = workingIndexes
    .map((index) => {
      const set = exercise.setTemplates[index];
      const actualWeight = values[index]?.actualWeight !== undefined ? Number(values[index].actualWeight) : (workingWeight ? Number(workingWeight) : undefined);
      return { set, input: values[index], actualWeight };
    })
    .filter(({ input, actualWeight }) => input?.completedReps !== undefined && actualWeight !== undefined)
    .map(({ set, input, actualWeight }) => ({
      order: set.order,
      repRangeMin: set.repRangeMin,
      repRangeMax: set.repRangeMax,
      completedReps: Number(input!.completedReps),
      actualWeight: actualWeight!,
    }));

  const liveProgression = completedWorkingSets.length > 0 && completedWorkingSets.length === workingIndexes.length
    ? evaluateProgression(completedWorkingSets, Number(exercise.increment))
    : undefined;
  const activeProgression = liveProgression ?? exercise.lastPerformance?.progression ?? undefined;

  const previousWorkingSets: WorkingSetPerformance[] = (exercise.lastPerformance?.sets ?? [])
    .filter((set) => set.type === 'WORKING')
    .map((set) => ({
      order: set.order,
      repRangeMin: set.repRangeMin,
      repRangeMax: set.repRangeMax,
      completedReps: set.completedReps ?? 0,
      actualWeight: set.actualWeight ?? 0,
    }));
  const showPartialProgress = !activeProgression?.shouldProgress
    && completedWorkingSets.length > 0
    && evaluateRepsTrend(completedWorkingSets, previousWorkingSets) === 'improved';

  const lastWorkingText = formatLastWorking(exercise.lastPerformance);

  return (
    <article className="exercise-card">
      <header>
        <span className="icon-circle">
          {exercise.equipmentType === 'MACHINE' ? <MachineIcon /> : <FreeWeightIcon />}
        </span>
        <div>
          <h2>{exercise.name}</h2>
          <small>{setsSummary(exercise.setTemplates)}</small>
        </div>
      </header>
      {lastWorkingText && <p className="muted">Última: {lastWorkingText}</p>}
      {activeProgression?.shouldProgress && <p className="accent">{activeProgression.reason}</p>}
      {showPartialProgress && <p className="muted">🔸 +1 rep vs. última vez</p>}
      <label className="weight-field">
        Carga de trabalho
        <input inputMode="decimal" value={workingWeight} onChange={(event) => setWorkingWeight(event.target.value)} placeholder="kg" />
      </label>
      <div className="sets-table-head">
        <span>Série</span>
        <span>Anterior</span>
        <span>Kg</span>
        <span>Reps</span>
        <span />
      </div>
      {exercise.setTemplates.map((set, index) => {
        const feederIndex = exercise.setTemplates.slice(0, index).filter((item) => item.type === 'FEEDER').length;
        const workingIndex = exercise.setTemplates.slice(0, index).filter((item) => item.type === 'WORKING').length;
        const planned = set.type === 'FEEDER'
          ? (feeders[feederIndex]?.weight ?? '—')
          : set.type === 'WARMUP'
            ? 'manual'
            : set.type === 'TOP_SET'
              ? (topSetWeight ?? '—')
              : set.type === 'BACK_OFF'
                ? (backOffWeight ?? '—')
                : workingWeight || '—';
        const hitTarget = set.type === 'WORKING' && Number(values[index]?.completedReps) >= repTarget(set.repRangeMin, set.repRangeMax);
        const editable = set.type === 'WARMUP' || set.type === 'WORKING' || set.type === 'TOP_SET' || set.type === 'BACK_OFF' || set.type === 'REST_PAUSE';
        const acceptsReps = set.type === 'WORKING' || set.type === 'REST_PAUSE';
        const previous = previousForSet(exercise.lastPerformance, set.type, set.order);
        const done = acceptsReps ? values[index]?.completedReps !== undefined : values[index]?.actualWeight !== undefined;
        return (
          <div className="sets-table-row" key={set.id}>
            <div>
              <strong>{setLabel(set, feederIndex + 1, workingIndex + 1)}</strong>
              <div className="row-item-meta">
                {formatRange(set.repRangeMin, set.repRangeMax)} reps
                {hitTarget && <span className="hit-target"> · 🔥 na meta</span>}
              </div>
            </div>
            <span className="row-item-trail">{previous ?? '—'}</span>
            {editable ? (
              <input
                aria-label={`Carga realizada ${set.order}`}
                inputMode="decimal"
                placeholder="kg"
                value={values[index]?.actualWeight !== undefined ? String(values[index].actualWeight) : (planned !== '—' && planned !== 'manual' ? String(planned) : '')}
                onChange={(event) => update(index, { actualWeight: event.target.value ? Number(event.target.value) : undefined })}
              />
            ) : (
              <span className="row-item-trail">{planned}</span>
            )}
            {acceptsReps ? (
              <input aria-label={`Reps realizadas ${set.order}`} inputMode="numeric" placeholder="—" onChange={(event) => update(index, { completedReps: Number(event.target.value) })} />
            ) : (
              <span className="row-item-trail">—</span>
            )}
            <span className={`set-check ${done ? 'done' : ''}`} aria-hidden="true">✓</span>
            {set.type === 'REST_PAUSE' && (
              <button className="ghost rest-timer" type="button" onClick={() => setRestSeconds(20)}>
                {restSeconds > 0 ? `${restSeconds}s` : 'Timer 20s'}
              </button>
            )}
          </div>
        );
      })}
    </article>
  );
}
