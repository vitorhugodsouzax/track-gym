import { useEffect, useMemo, useState } from 'react';
import { getExerciseHistory, getHistoryExercises, getLogbook } from '../services/api';
import type { ExerciseHistoryEntry, ExerciseStatus, HistoryDayGroup, WorkoutSessionRecord } from '../types/api';
import { formatRange, SET_LABELS } from '../utils/labels';
import { Sparkline } from '../components/Sparkline';
import { Segmented } from '../components/Segmented';
import { TopBar } from '../components/TopBar';

const MODE_OPTIONS = [
  { id: 'exercise' as const, label: 'Por exercício' },
  { id: 'session' as const, label: 'Por sessão' },
];

type ViewMode = 'exercise' | 'session';

function statusLabel(status: ExerciseStatus, detail: string | null) {
  if (status === 'progressed') return `▲ ${detail ?? 'Progressão garantida'}`;
  if (status === 'partial') return `🔸 ${detail ?? '+1 rep vs. última vez'}`;
  if (status === 'maintained') return 'Mantendo';
  return 'Sem histórico ainda';
}

export function HistoryPage() {
  const [mode, setMode] = useState<ViewMode>('exercise');
  const [groups, setGroups] = useState<HistoryDayGroup[]>([]);
  const [sessions, setSessions] = useState<WorkoutSessionRecord[]>([]);
  const [query, setQuery] = useState('');
  const [openExercise, setOpenExercise] = useState<{ id: string; name: string }>();
  const [detail, setDetail] = useState<ExerciseHistoryEntry[]>([]);

  useEffect(() => {
    getHistoryExercises().then(setGroups).catch(() => setGroups([]));
    getLogbook().then(setSessions).catch(() => setSessions([]));
  }, []);

  useEffect(() => {
    if (!openExercise) return;
    getExerciseHistory(openExercise.id).then(setDetail).catch(() => setDetail([]));
  }, [openExercise]);

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return groups;
    const needle = query.trim().toLowerCase();
    return groups
      .map((group) => ({ ...group, exercises: group.exercises.filter((exercise) => exercise.name.toLowerCase().includes(needle)) }))
      .filter((group) => group.exercises.length > 0);
  }, [groups, query]);

  if (openExercise) {
    return (
      <section className="stack">
        <TopBar title={openExercise.name} onBack={() => setOpenExercise(undefined)} />
        {detail.length === 0 && <p className="muted">Sem sessões registradas ainda.</p>}
        {detail.map((entry) => (
          <article className="log-card" key={entry.performedAt}>
            <small>{new Date(entry.performedAt).toLocaleDateString('pt-BR')}</small>
            {entry.sets.map((set) => (
              <p key={`${set.type}-${set.order}`}>
                {SET_LABELS[set.type]}: {set.actualWeight ?? set.plannedWeight ?? '—'} kg × {set.completedReps ?? formatRange(set.repRangeMin, set.repRangeMax)}
              </p>
            ))}
          </article>
        ))}
      </section>
    );
  }

  return (
    <section className="stack">
      <header className="page-hero">
        <p className="eyebrow">Evolução</p>
        <h1>Histórico</h1>
      </header>
      <Segmented options={MODE_OPTIONS} value={mode} onChange={setMode} />
      {mode === 'exercise' ? (
        <>
          <input className="history-search" placeholder="Buscar exercício..." value={query} onChange={(event) => setQuery(event.target.value)} />
          {filteredGroups.length === 0 && <p className="muted">Nenhum treino concluído ainda.</p>}
          {filteredGroups.map((group) => (
            <div key={group.workoutDayName}>
              <h2>{group.workoutDayName}</h2>
              {group.exercises.map((exercise) => (
                <button
                  className="row-item"
                  key={exercise.exerciseTemplateId}
                  onClick={() => setOpenExercise({ id: exercise.exerciseTemplateId, name: exercise.name })}
                >
                  <div className="row-item-body">
                    <span className="row-item-title">{exercise.name}</span>
                    <span className="row-item-meta">{statusLabel(exercise.status, exercise.statusDetail)}</span>
                  </div>
                  <span className="row-item-trail">
                    {exercise.currentWeight ?? '—'} kg
                    <Sparkline values={exercise.trendPoints} />
                  </span>
                </button>
              ))}
            </div>
          ))}
        </>
      ) : (
        sessions.length === 0 ? <p className="muted">Nenhum treino concluído ainda.</p> : sessions.map((session) => (
          <article className="log-card" key={session.id}>
            <header>
              <h2>{session.workoutDay.name}</h2>
              <small>{new Date(session.performedAt).toLocaleDateString('pt-BR')}</small>
            </header>
            {session.exercises.map((exercise) => (
              <div className="log-exercise" key={exercise.id}>
                <strong>{exercise.nameSnapshot}</strong>
                {exercise.sets.map((set) => (
                  <p key={set.id}>
                    {SET_LABELS[set.type]}: {set.actualWeight ?? set.plannedWeight ?? '—'} kg × {set.completedReps ?? formatRange(set.repRangeMin, set.repRangeMax)}
                  </p>
                ))}
              </div>
            ))}
          </article>
        ))
      )}
    </section>
  );
}
