import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExerciseCard, type ExerciseDraft } from '../components/ExerciseCard';
import { ChevronLeftIcon, ClockIcon, PencilIcon } from '../components/Icons';
import { completeSession, getWorkouts, renameDay } from '../services/api';
import type { WorkoutDay, WorkoutPlan, WorkoutSessionRecord } from '../types/api';

const TIMER_KEY = 'memento-mori-workout-start';

function formatElapsed(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function exerciseStatusLabel(exercise: WorkoutSessionRecord['exercises'][number]) {
  if (exercise.progression?.shouldProgress) return `▲ +${exercise.progression.percentage}% na próxima`;
  if (exercise.trend === 'improved') return '🔸 +1 rep vs. última vez';
  return 'Mantendo';
}

export function WorkoutPage({ onNeedPlan, onFinished }: { onNeedPlan: () => void; onFinished: () => void }) {
  const [plan, setPlan] = useState<WorkoutPlan>();
  const [selected, setSelected] = useState<WorkoutDay>();
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, ExerciseDraft>>({});
  const [summary, setSummary] = useState<WorkoutSessionRecord>();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [renamingDayId, setRenamingDayId] = useState<string>();
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');

  const handleDraftChange = useCallback((draft: ExerciseDraft) => {
    setDrafts((current) => ({ ...current, [draft.exerciseTemplateId]: draft }));
  }, []);

  useEffect(() => {
    getWorkouts()
      .then((plans) => setPlan(plans[0]))
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected || summary) return;
    let start = Number(sessionStorage.getItem(TIMER_KEY));
    if (!start) {
      start = Date.now();
      sessionStorage.setItem(TIMER_KEY, String(start));
    }
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [selected, summary]);

  function startDay(day: WorkoutDay) {
    setDrafts({});
    setSelected(day);
  }

  function backToList() {
    setSelected(undefined);
  }

  function startRename(day: WorkoutDay) {
    setRenamingDayId(day.id);
    setRenameValue(day.name);
    setRenameError('');
  }

  async function saveRename(planId: string) {
    if (!renamingDayId) return;
    const name = renameValue.trim();
    if (!name) return;
    try {
      await renameDay(planId, renamingDayId, name);
      setPlan((current) => current && {
        ...current,
        workoutDays: current.workoutDays.map((day) => day.id === renamingDayId ? { ...day, name } : day),
      });
      setRenamingDayId(undefined);
    } catch (reason) {
      setRenameError(reason instanceof Error ? reason.message : 'Não foi possível renomear o treino.');
    }
  }

  const subtitle = useMemo(() => plan?.kind === 'VITOR' ? 'Workouts Vitor' : plan?.name ?? 'Treino', [plan]);

  const stats = useMemo(() => {
    let volume = 0;
    let sets = 0;
    for (const draft of Object.values(drafts)) {
      for (const set of draft.sets) {
        if (set.completedReps === undefined) continue;
        const reps = Number(set.completedReps);
        if (Number.isNaN(reps)) continue;
        sets += 1;
        const weight = Number(set.actualWeight);
        if (!Number.isNaN(weight)) volume += weight * reps;
      }
    }
    return { volume, sets };
  }, [drafts]);

  if (error) return <section className="stack"><h1>Treino</h1><p className="alert" role="alert">{error}</p></section>;

  if (summary) {
    return (
      <section className="stack">
        <header className="page-hero">
          <p className="eyebrow">Treino concluído</p>
          <h1>{summary.exercises.length} exercícios</h1>
        </header>
        {summary.exercises.map((exercise) => (
          <div className="summary-row" key={exercise.id}>
            <strong>{exercise.nameSnapshot}</strong>
            <span className={exercise.progression?.shouldProgress ? 'accent' : ''}>{exerciseStatusLabel(exercise)}</span>
          </div>
        ))}
        <button className="primary" onClick={onFinished}>Ver no Histórico</button>
      </section>
    );
  }

  if (loading) {
    return <section className="stack"><p className="muted">Carregando treino...</p></section>;
  }

  if (!plan) {
    return (
      <section className="stack">
        <header className="page-hero">
          <p className="eyebrow">Sessão</p>
          <h1>Nenhuma ficha ativa</h1>
          <p>Escolha os workouts do Vitor ou crie a sua ficha pessoal para começar.</p>
        </header>
        <button className="primary" onClick={onNeedPlan}>Ir para fichas</button>
      </section>
    );
  }

  async function finish() {
    if (!selected) return;
    setBusy(true);
    try {
      const selectedExerciseIds = new Set(selected.exercises.map((e) => e.id));
      const payload = Object.values(drafts).filter((draft) => selectedExerciseIds.has(draft.exerciseTemplateId));
      const session = await completeSession(selected.id, payload);
      sessionStorage.removeItem(TIMER_KEY);
      setSummary(session);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o treino.');
    } finally {
      setBusy(false);
    }
  }

  if (!selected) {
    return (
      <section className="stack">
        <header className="page-hero">
          <p className="eyebrow">{subtitle}</p>
          <h1>Minhas rotinas</h1>
        </header>
        {plan.workoutDays.map((day) => {
          const startable = renamingDayId !== day.id && day.exercises.length > 0;
          return (
            <article
              className={`log-card day-card ${startable ? 'day-card-clickable' : ''}`}
              key={day.id}
              role={startable ? 'button' : undefined}
              tabIndex={startable ? 0 : undefined}
              onClick={() => startable && startDay(day)}
              onKeyDown={(event) => { if (startable && (event.key === 'Enter' || event.key === ' ')) startDay(day); }}
            >
              {renamingDayId === day.id ? (
                <div className="row-actions" onClick={(event) => event.stopPropagation()}>
                  <input autoFocus value={renameValue} onChange={(event) => setRenameValue(event.target.value)} placeholder="Nome do treino" />
                  <button className="ghost" onClick={() => saveRename(plan.id)}>Salvar</button>
                  <button className="ghost" onClick={() => setRenamingDayId(undefined)}>Cancelar</button>
                </div>
              ) : (
                <div className="row-actions">
                  <strong>{day.name}</strong>
                  <button
                    aria-label="Renomear treino"
                    className="icon-button"
                    onClick={(event) => { event.stopPropagation(); startRename(day); }}
                  >
                    <PencilIcon />
                  </button>
                </div>
              )}
              {renamingDayId === day.id && renameError && <p className="alert" role="alert">{renameError}</p>}
              <p className="muted">{day.exercises.map((exercise) => exercise.name).join(', ') || 'Sem exercícios ainda.'}</p>
            </article>
          );
        })}
      </section>
    );
  }

  return (
    <section className="stack">
      <header className="workout-action-bar">
        <button aria-label="Voltar" className="icon-button" onClick={backToList}>
          <ChevronLeftIcon />
        </button>
        <div className="workout-action-bar-title">
          <span className="workout-timer"><ClockIcon /> {formatElapsed(elapsedSeconds)}</span>
          <h1>{selected.name}</h1>
        </div>
        <button className="primary compact" disabled={busy} onClick={finish}>
          {busy ? 'Salvando…' : 'Finalizar'}
        </button>
      </header>
      <div className="stats-row">
        <div>
          <strong>{formatElapsed(elapsedSeconds)}</strong>
          <span>Duração</span>
        </div>
        <div>
          <strong>{stats.volume.toLocaleString('pt-BR')} kg</strong>
          <span>Volume</span>
        </div>
        <div>
          <strong>{stats.sets}</strong>
          <span>Séries</span>
        </div>
      </div>
      {selected.exercises.map((exercise) => (
        <ExerciseCard
          exercise={exercise}
          key={exercise.id}
          onChange={handleDraftChange}
        />
      ))}
    </section>
  );
}
