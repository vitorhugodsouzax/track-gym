import { useEffect, useState, type FormEvent } from 'react';
import {
  addPersonalDay,
  addPersonalExercise,
  deletePersonalDay,
  deletePersonalExercise,
  getPlans,
  openPersonalPlan,
} from '../services/api';
import type { SetType, WorkoutDay, WorkoutPlan } from '../types/api';
import { formatRange, SET_LABELS } from '../utils/labels';
import { FreeWeightIcon, MachineIcon } from '../components/Icons';
import { TopBar } from '../components/TopBar';

const SET_TYPES: SetType[] = ['WARMUP', 'FEEDER', 'WORKING', 'TOP_SET', 'BACK_OFF', 'REST_PAUSE'];

type DraftSet = { type: SetType; min: string; max: string };

const emptySet = (): DraftSet => ({ type: 'WORKING', min: '8', max: '8' });

export function PersonalPlanPage({ onTrain, onBack }: { onTrain: () => void; onBack: () => void }) {
  const [plan, setPlan] = useState<WorkoutPlan>();
  const [selectedDay, setSelectedDay] = useState<WorkoutDay>();
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [equipment, setEquipment] = useState<'FREE_WEIGHT' | 'MACHINE'>('FREE_WEIGHT');
  const [sets, setSets] = useState<DraftSet[]>([emptySet()]);

  async function refresh() {
    const payload = await getPlans();
    const next = payload.personal ?? await openPersonalPlan();
    setPlan(next);
    setSelectedDay((current) => next.workoutDays.find((day) => day.id === current?.id) ?? next.workoutDays[0]);
  }

  useEffect(() => {
    openPersonalPlan().then((next) => {
      setPlan(next);
      setSelectedDay(next.workoutDays[0]);
    }).catch((reason: Error) => setError(reason.message));
  }, []);

  async function addDay() {
    if (!plan) return;
    try {
      await addPersonalDay(plan.id);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível criar o treino.');
    }
  }

  async function removeDay(dayId: string) {
    if (!plan) return;
    await deletePersonalDay(plan.id, dayId);
    await refresh();
  }

  async function addExercise(event: FormEvent) {
    event.preventDefault();
    if (!plan || !selectedDay) return;
    try {
      await addPersonalExercise(plan.id, selectedDay.id, {
        name,
        equipmentType: equipment,
        sets: sets.map((set) => ({
          type: set.type,
          repRangeMin: Number(set.min),
          repRangeMax: Number(set.max || set.min),
        })),
      });
      setName('');
      setSets([emptySet()]);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o exercício.');
    }
  }

  if (!plan) {
    return (
      <section className="stack">
        <TopBar title="Ficha pessoal" onBack={onBack} />
        {error && <p className="alert">{error}</p>}
      </section>
    );
  }

  return (
    <section className="stack">
      <TopBar title={plan.name} onBack={onBack} />
      {error && <p className="alert" role="alert">{error}</p>}
      <div className="row-actions">
        <button className="primary" onClick={addDay}>Novo treino</button>
        <button className="ghost" onClick={onTrain} disabled={!plan.workoutDays.length}>Usar esta ficha</button>
      </div>
      <nav className="day-tabs">
        {plan.workoutDays.map((day) => (
          <button className={selectedDay?.id === day.id ? 'active' : ''} key={day.id} onClick={() => setSelectedDay(day)}>
            {day.name}
          </button>
        ))}
      </nav>
      {!selectedDay && <p className="muted">Crie o primeiro treino para começar a montar a ficha.</p>}
      {selectedDay && (
        <>
          <div className="section-head">
            <h2>{selectedDay.name}</h2>
            <button className="danger-link" onClick={() => removeDay(selectedDay.id)}>Remover treino</button>
          </div>
          {selectedDay.exercises.length === 0 && <p className="muted">Nenhum exercício ainda.</p>}
          {selectedDay.exercises.map((exercise) => (
            <div className="row-item" key={exercise.id}>
              <span className="icon-circle">
                {exercise.equipmentType === 'MACHINE' ? <MachineIcon /> : <FreeWeightIcon />}
              </span>
              <div className="row-item-body">
                <span className="row-item-title">{exercise.name}</span>
                <span className="row-item-meta">{exercise.setTemplates.map((set) => `${SET_LABELS[set.type]} ${formatRange(set.repRangeMin, set.repRangeMax)}`).join(' · ')}</span>
              </div>
              <button className="danger-link" onClick={() => deletePersonalExercise(plan.id, exercise.id).then(refresh)}>Remover</button>
            </div>
          ))}
          <form className="composer" onSubmit={addExercise}>
            <h2>Adicionar exercício</h2>
            <label>
              Nome
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="ex: Supino reto" required />
            </label>
            <label>
              Equipamento
              <select value={equipment} onChange={(event) => setEquipment(event.target.value as 'FREE_WEIGHT' | 'MACHINE')}>
                <option value="FREE_WEIGHT">Livre</option>
                <option value="MACHINE">Máquina</option>
              </select>
            </label>
            {sets.map((set, index) => (
              <div className="composer-set" key={index}>
                <select value={set.type} onChange={(event) => setSets((current) => current.map((item, i) => i === index ? { ...item, type: event.target.value as SetType } : item))}>
                  {SET_TYPES.map((type) => <option key={type} value={type}>{SET_LABELS[type]}</option>)}
                </select>
                <input inputMode="numeric" value={set.min} onChange={(event) => setSets((current) => current.map((item, i) => i === index ? { ...item, min: event.target.value } : item))} placeholder="min" />
                <input inputMode="numeric" value={set.max} onChange={(event) => setSets((current) => current.map((item, i) => i === index ? { ...item, max: event.target.value } : item))} placeholder="max" />
                <button type="button" className="ghost" onClick={() => setSets((current) => current.filter((_, i) => i !== index))} disabled={sets.length === 1}>×</button>
              </div>
            ))}
            <div className="row-actions">
              <button type="button" className="ghost" onClick={() => setSets((current) => [...current, emptySet()])}>Adicionar série</button>
              <button className="primary" type="submit">Salvar exercício</button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}
