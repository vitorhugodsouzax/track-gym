import { useEffect, useState } from 'react';
import { getLogbook } from '../services/api';
import { formatRange, SET_LABELS } from '../utils/labels';

export function LogbookPage() {
  const [entries, setEntries] = useState<any[]>([]);
  useEffect(() => {
    getLogbook().then(setEntries).catch(() => setEntries([]));
  }, []);

  return (
    <section className="stack">
      <header className="page-hero">
        <p className="eyebrow">Histórico</p>
        <h1>Logbook</h1>
        <p>Snapshot do que realmente aconteceu em cada sessão.</p>
      </header>
      {entries.length === 0 ? <p className="muted">Nenhum treino concluído ainda.</p> : entries.map((session) => (
        <article className="log-card" key={session.id}>
          <header>
            <h2>{session.workoutDay.name}</h2>
            <small>{new Date(session.performedAt).toLocaleDateString('pt-BR')}</small>
          </header>
          {session.exercises.map((exercise: any) => (
            <div className="log-exercise" key={exercise.id}>
              <strong>{exercise.nameSnapshot}</strong>
              {exercise.sets.map((set: any) => (
                <p key={set.id}>
                  {SET_LABELS[set.type as keyof typeof SET_LABELS] ?? set.type}: {set.actualWeight ?? set.plannedWeight ?? '—'} kg × {set.completedReps ?? formatRange(set.repRangeMin, set.repRangeMax)}
                </p>
              ))}
            </div>
          ))}
        </article>
      ))}
    </section>
  );
}
