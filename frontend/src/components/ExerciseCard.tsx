import { useEffect, useMemo, useState } from 'react';
import type { Exercise, SetTemplate } from '../types/api';
import { calculateFeeders } from '../utils/feederCalculator';
import { formatRange, SET_LABELS } from '../utils/labels';

function setLabel(template: SetTemplate, feederNumber: number, workingNumber: number) {
  if (template.type === 'FEEDER') return `Feeder ${feederNumber}`;
  if (template.type === 'WORKING') return `WS ${workingNumber}`;
  return SET_LABELS[template.type];
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
  const [workingWeight, setWorkingWeight] = useState('');
  const feederCount = useMemo(() => exercise.setTemplates.filter((set) => set.type === 'FEEDER').length, [exercise]);
  const feeders = workingWeight ? calculateFeeders(Number(workingWeight), feederCount, Number(exercise.increment)) : [];
  const [values, setValues] = useState<Record<number, Record<string, unknown>>>({});
  const [restSeconds, setRestSeconds] = useState(0);

  useEffect(() => {
    if (restSeconds <= 0) return;
    const timer = window.setInterval(() => setRestSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [restSeconds]);

  const update = (index: number, value: Record<string, unknown>) =>
    setValues((current) => ({ ...current, [index]: { ...current[index], ...value } }));

  useEffect(() => {
    onChange?.({
      exerciseTemplateId: exercise.id,
      nameSnapshot: exercise.name,
      order: exercise.order,
      equipmentType: exercise.equipmentType,
      workingWeight: workingWeight ? Number(workingWeight) : undefined,
      increment: Number(exercise.increment),
      sets: exercise.setTemplates.map((set, index) => ({
        type: set.type,
        order: set.order,
        repRangeMin: set.repRangeMin,
        repRangeMax: set.repRangeMax,
        ...values[index],
      })),
    });
  }, [exercise, workingWeight, values, onChange]);

  return (
    <article className="exercise-card">
      <header>
        <span>{String(exercise.order).padStart(2, '0')}</span>
        <div>
          <h2>{exercise.name}</h2>
          <small>Amplitude total · {exercise.equipmentType === 'MACHINE' ? 'Máquina' : 'Livre'}</small>
        </div>
      </header>
      <label className="weight-field">
        Carga de trabalho
        <input inputMode="decimal" value={workingWeight} onChange={(event) => setWorkingWeight(event.target.value)} placeholder="kg" />
      </label>
      {exercise.setTemplates.map((set, index) => {
        const feederIndex = exercise.setTemplates.slice(0, index).filter((item) => item.type === 'FEEDER').length;
        const workingIndex = exercise.setTemplates.slice(0, index).filter((item) => item.type === 'WORKING').length;
        const planned = set.type === 'FEEDER'
          ? (feeders[feederIndex]?.weight ?? '—')
          : set.type === 'WARMUP'
            ? 'manual'
            : workingWeight || '—';
        return (
          <div className="set-block" key={set.id}>
            <div className="set-topline">
              <strong>{setLabel(set, feederIndex + 1, workingIndex + 1)}</strong>
              <span>{planned} kg × {formatRange(set.repRangeMin, set.repRangeMax)}</span>
            </div>
            {(set.type === 'WARMUP' || set.type === 'WORKING' || set.type === 'TOP_SET' || set.type === 'BACK_OFF' || set.type === 'REST_PAUSE') && (
              <div className="set-fields">
                <input aria-label={`Carga realizada ${set.order}`} inputMode="decimal" placeholder="kg feito" onChange={(event) => update(index, { actualWeight: Number(event.target.value) })} />
                {(set.type === 'WORKING' || set.type === 'REST_PAUSE') && (
                  <input aria-label={`Reps realizadas ${set.order}`} inputMode="numeric" placeholder="reps" onChange={(event) => update(index, { completedReps: Number(event.target.value) })} />
                )}
                {set.type === 'REST_PAUSE' && (
                  <button type="button" onClick={() => setRestSeconds(20)}>{restSeconds > 0 ? `${restSeconds}s` : 'Timer 20s'}</button>
                )}
              </div>
            )}
            {set.type === 'WORKING' && (
              <div className="criteria">
                <select aria-label="Controle da carga" defaultValue="" onChange={(event) => update(index, { loadControlled: event.target.value === 'yes' })}>
                  <option value="">Controle?</option>
                  <option value="yes">Controle: sim</option>
                  <option value="no">Controle: não</option>
                </select>
                <input aria-label="Reps de folga" inputMode="numeric" placeholder="RIR" onChange={(event) => update(index, { repsInReserve: Number(event.target.value) })} />
                <select aria-label="Feeling do dia" defaultValue="" onChange={(event) => update(index, { feeling: event.target.value })}>
                  <option value="">Feeling?</option>
                  <option value="GOOD">Bom</option>
                  <option value="NORMAL">Normal</option>
                  <option value="BAD">Ruim</option>
                </select>
                <select aria-label="Reps limpas" defaultValue="" onChange={(event) => update(index, { repsClean: event.target.value === 'yes' })}>
                  <option value="">Reps limpas?</option>
                  <option value="yes">Sim</option>
                  <option value="no">Não</option>
                </select>
              </div>
            )}
          </div>
        );
      })}
    </article>
  );
}
