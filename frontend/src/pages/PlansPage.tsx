import { useEffect, useState } from 'react';
import { getPlans, useVitorWorkouts } from '../services/api';
import type { PlansPayload } from '../types/api';

export function PlansPage({
  onUseVitor,
  onOpenPersonal,
}: {
  onUseVitor: () => void;
  onOpenPersonal: () => void;
}) {
  const [data, setData] = useState<PlansPayload>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    getPlans().then(setData).catch((reason: Error) => setError(reason.message));
  }, []);

  async function selectVitor() {
    setBusy('vitor');
    try {
      await useVitorWorkouts();
      onUseVitor();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível usar as fichas do Vitor.');
    } finally {
      setBusy('');
    }
  }

  const vitorSelected = data?.selectedPlanId && data.selectedPlanId === data.vitor?.id;
  const personalSelected = data?.selectedPlanId && data.selectedPlanId === data.personal?.id;

  return (
    <section className="stack">
      <header className="page-hero">
        <p className="eyebrow">Escolha a ficha</p>
        <h1>Como você vai treinar</h1>
        <p>Use as fichas definitivas do protocolo ou monte a sua, treino a treino.</p>
      </header>
      {error && <p className="alert" role="alert">{error}</p>}
      <button className={`choice-card ${vitorSelected ? 'selected' : ''}`} onClick={selectVitor} disabled={busy === 'vitor'}>
        <span className="choice-kicker">Fonte de verdade</span>
        <strong>Workouts Vitor</strong>
        <p>As 6 fichas do Memento Mori Protocol, na ordem original, sem alterar séries nem rep range.</p>
        <span className="choice-meta">{data?.vitor?.workoutDays.length ?? 6} treinos prontos</span>
      </button>
      <button className={`choice-card secondary ${personalSelected ? 'selected' : ''}`} onClick={onOpenPersonal}>
        <span className="choice-kicker">Sua estrutura</span>
        <strong>Criar uma ficha de treino pessoal</strong>
        <p>Monte TREINO A, B, C, D, E ou quantos quiser, com os exercícios e as séries que você definir.</p>
        <span className="choice-meta">{data?.personal ? `${data.personal.workoutDays.length} treinos na sua ficha` : 'Começar do zero'}</span>
      </button>
    </section>
  );
}
