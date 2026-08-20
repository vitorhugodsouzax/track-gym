import { useEffect, useMemo, useState } from 'react';
import { ExerciseCard, type ExerciseDraft } from '../components/ExerciseCard';
import { completeSession, getWorkouts } from '../services/api';
import type { WorkoutDay, WorkoutPlan, WorkoutSessionRecord } from '../types/api';

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

  useEffect(() => {
    getWorkouts()
      .then((plans) => {
        const next = plans[0];
        setPlan(next);
        setSelected(next?.workoutDays[0]);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const subtitle = useMemo(() => plan?.kind === 'VITOR' ? 'Workouts Vitor' : plan?.name ?? 'Treino', [plan]);

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
      const session = await completeSession(selected.id, Object.values(drafts));
      setSummary(session);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o treino.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack">
      <header className="page-hero">
        <p className="eyebrow">{subtitle}</p>
        <h1>{selected?.name ?? 'Treino'}</h1>
        <p>Informe a carga de trabalho. O app calcula Feeders, Top Set e Back Off quando existirem na ficha.</p>
      </header>
      <nav className="day-tabs">
        {plan.workoutDays.map((day) => (
          <button className={selected?.id === day.id ? 'active' : ''} key={day.id} onClick={() => setSelected(day)}>
            {day.name.replace('TREINO ', '')}
          </button>
        ))}
      </nav>
      {selected?.exercises.map((exercise) => (
        <ExerciseCard
          exercise={exercise}
          key={exercise.id}
          onChange={(draft) => setDrafts((current) => ({ ...current, [draft.exerciseTemplateId]: draft }))}
        />
      ))}
      {selected && (
        <button className="primary finish" disabled={busy} onClick={finish}>
          {busy ? 'Salvando…' : 'Marcar treino como concluído'}
        </button>
      )}
    </section>
  );
}
