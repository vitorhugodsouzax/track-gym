import { useEffect, useMemo, useState } from 'react';
import { deleteSession, getExerciseHistory, getHistoryExercises, getLogbook } from '../services/api';
import type { ExerciseHistoryEntry, ExerciseStatus, HistoryDayGroup, WorkoutSessionRecord } from '../types/api';
import { formatRange, SET_LABELS } from '../utils/labels';
import { Sparkline } from '../components/Sparkline';
import { Segmented } from '../components/Segmented';
import { TopBar } from '../components/TopBar';
import { TrashIcon } from '../components/Icons';

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

function sessionVolume(session: WorkoutSessionRecord) {
  let volume = 0;
  let sets = 0;
  for (const exercise of session.exercises) {
    for (const set of exercise.sets) {
      if (set.completedReps === null) continue;
      const weight = set.actualWeight ?? set.plannedWeight ?? 0;
      volume += weight * set.completedReps;
      sets += 1;
    }
  }
  return { volume, sets };
}

function formatTonnes(kg: number) {
  return kg >= 1000 ? `${(kg / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}t` : `${kg.toLocaleString('pt-BR')} kg`;
}

function weeklyVolumeSummary(sessions: WorkoutSessionRecord[]) {
  const now = Date.now();
  const week = 7 * 24 * 60 * 60 * 1000;
  let current = 0;
  let previous = 0;
  for (const session of sessions) {
    const age = now - new Date(session.performedAt).getTime();
    if (age < 0) continue;
    const { volume } = sessionVolume(session);
    if (age <= week) current += volume;
    else if (age <= week * 2) previous += volume;
  }
  const deltaPct = previous > 0 ? ((current - previous) / previous) * 100 : null;
  return { current, deltaPct };
}

export function HistoryPage() {
  const [mode, setMode] = useState<ViewMode>('exercise');
  const [groups, setGroups] = useState<HistoryDayGroup[]>([]);
  const [sessions, setSessions] = useState<WorkoutSessionRecord[]>([]);
  const [query, setQuery] = useState('');
  const [openExercise, setOpenExercise] = useState<{ id: string; name: string }>();
  const [detail, setDetail] = useState<ExerciseHistoryEntry[]>([]);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string>();
  const [expandedSessionId, setExpandedSessionId] = useState<string>();

  useEffect(() => {
    getHistoryExercises().then(setGroups).catch(() => setGroups([]));
    getLogbook().then(setSessions).catch(() => setSessions([]));
  }, []);

  useEffect(() => {
    if (!openExercise) return;
    getExerciseHistory(openExercise.id).then(setDetail).catch(() => setDetail([]));
  }, [openExercise]);

  async function removeSession(sessionId: string) {
    await deleteSession(sessionId);
    setSessions((current) => current.filter((session) => session.id !== sessionId));
    setConfirmingDeleteId(undefined);
  }

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

  const weekly = weeklyVolumeSummary(sessions);

  return (
    <section className="stack">
      <header className="page-hero">
        <p className="eyebrow">Últimas sessões</p>
        <h1>Histórico</h1>
      </header>
      {sessions.length > 0 && (
        <div className="volume-card">
          <div className="volume-card-figure">
            <span className="eyebrow">Volume semanal</span>
            <strong>{formatTonnes(weekly.current)}</strong>
            {weekly.deltaPct !== null && (
              <span className={`volume-card-delta ${weekly.deltaPct >= 0 ? 'up' : 'down'}`}>
                {weekly.deltaPct >= 0 ? '+' : ''}{weekly.deltaPct.toFixed(1)}% vs. semana anterior
              </span>
            )}
          </div>
          <Sparkline values={sessions.slice(0, 8).map((session) => sessionVolume(session).volume).reverse()} />
        </div>
      )}
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
        sessions.length === 0 ? <p className="muted">Nenhum treino concluído ainda.</p> : sessions.map((session) => {
          const { volume, sets } = sessionVolume(session);
          const expanded = expandedSessionId === session.id;
          return (
            <div className="stack" key={session.id} style={{ gap: 8 }}>
              <div className="session-row" role="button" tabIndex={0} onClick={() => setExpandedSessionId(expanded ? undefined : session.id)}>
                <div className="session-row-body">
                  <small>{new Date(session.performedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</small>
                  <strong>{session.workoutDay.name}</strong>
                  <span className="session-row-meta">{formatTonnes(volume)} · {sets} séries</span>
                </div>
                <button aria-label="Excluir sessão" className="icon-button" onClick={(event) => { event.stopPropagation(); setConfirmingDeleteId(session.id); }}>
                  <TrashIcon />
                </button>
              </div>
              {confirmingDeleteId === session.id && (
                <div className="row-actions">
                  <span className="muted">Excluir esta sessão? Não pode ser desfeito.</span>
                  <button className="danger-link" onClick={() => removeSession(session.id)}>Excluir</button>
                  <button className="ghost" onClick={() => setConfirmingDeleteId(undefined)}>Cancelar</button>
                </div>
              )}
              {expanded && session.exercises.map((exercise) => (
                <div className="log-exercise" key={exercise.id}>
                  <strong>{exercise.nameSnapshot}</strong>
                  {exercise.sets.map((set) => (
                    <p key={set.id}>
                      {SET_LABELS[set.type]}: {set.actualWeight ?? set.plannedWeight ?? '—'} kg × {set.completedReps ?? formatRange(set.repRangeMin, set.repRangeMax)}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          );
        })
      )}
    </section>
  );
}
