import { useEffect, useState } from 'react';
import { getLogbook } from '../services/api';

export function ProgressionPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    getLogbook().then((sessions) => {
      const recommendations = sessions.flatMap((session: any) =>
        session.exercises
          .filter((exercise: any) => exercise.progression)
          .map((exercise: any) => ({ ...exercise.progression, name: exercise.nameSnapshot, date: session.performedAt })),
      );
      setItems(recommendations);
    }).catch(() => setItems([]));
  }, []);

  return (
    <section className="stack">
      <header className="page-hero">
        <p className="eyebrow">Próxima sessão</p>
        <h1>Progressão</h1>
        <p>A carga só sobe na próxima sessão, e somente se os critérios estiverem fechados.</p>
      </header>
      {items.length === 0 ? (
        <p className="muted">Conclua um treino com os critérios preenchidos para receber recomendações.</p>
      ) : items.map((item) => (
        <article className="log-card" key={`${item.name}-${item.date}`}>
          <h2>{item.name}</h2>
          <p className={item.shouldProgress ? 'accent' : ''}>
            {item.shouldProgress ? `Próxima sessão: ${item.nextWorkingWeight} kg` : 'Carga mantida'}
          </p>
          <small>{item.reason}</small>
        </article>
      ))}
    </section>
  );
}
