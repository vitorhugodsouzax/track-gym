export type SetType = 'WARMUP' | 'FEEDER' | 'WORKING' | 'TOP_SET' | 'BACK_OFF' | 'REST_PAUSE';
export type ExerciseSeed = { name: string; equipmentType: 'FREE_WEIGHT' | 'MACHINE'; sets: readonly [SetType, number, number][] };
export type WorkoutSeed = { name: string; exercises: readonly ExerciseSeed[] };

const W = (min: number, max = min): [SetType, number, number] => ['WARMUP', min, max];
const F = (min: number, max = min): [SetType, number, number] => ['FEEDER', min, max];
const WS = (min: number, max = min): [SetType, number, number] => ['WORKING', min, max];
const T = (min: number, max = min): [SetType, number, number] => ['TOP_SET', min, max];
const B = (min: number, max = min): [SetType, number, number] => ['BACK_OFF', min, max];
const R = (min: number, max = min): [SetType, number, number] => ['REST_PAUSE', min, max];

// Mirrors docs/workouts.md. Equipment classification is used only for future progression defaults.
export const WORKOUTS: readonly WorkoutSeed[] = [
  { name: 'TREINO 1', exercises: [
    { name: 'T Bar Row', equipmentType: 'FREE_WEIGHT', sets: [W(10,15),F(3,5),F(3,5),F(3,5),WS(8),WS(8),B(8,12)] },
    { name: 'Remada baixa / remada com cabo', equipmentType: 'MACHINE', sets: [F(3,5),F(3,5),WS(8),T(6,8)] },
    { name: 'Supino Inclinado', equipmentType: 'FREE_WEIGHT', sets: [F(3,5),F(3,5),F(3,5),WS(8),WS(8)] },
    { name: 'Supino reto máquina', equipmentType: 'MACHINE', sets: [F(3,5),F(3,5),WS(8),T(6,8)] },
    { name: 'Desenvolvimento', equipmentType: 'FREE_WEIGHT', sets: [F(3,5),F(3,5),WS(8),T(6,8)] },
    { name: 'Tríceps polia alta', equipmentType: 'MACHINE', sets: [F(3,5),F(3,5),WS(8,12),WS(8,12)] },
    { name: 'Tríceps polia alta / variação com Rest Pause', equipmentType: 'MACHINE', sets: [F(3,5),F(3,5),WS(8,12),R(8,12)] },
  ] },
  { name: 'TREINO 2', exercises: [
    { name: 'RDL', equipmentType: 'FREE_WEIGHT', sets: [W(10,15),F(3,5),F(3,5),WS(8),WS(8),B(8,12)] },
    { name: 'Cadeira flexora', equipmentType: 'MACHINE', sets: [F(3,5),F(3,5),WS(8),WS(8)] },
    { name: 'Hack Squat', equipmentType: 'MACHINE', sets: [F(3,5),F(3),F(3),WS(8),T(6,8)] },
    { name: 'Cadeira extensora', equipmentType: 'MACHINE', sets: [F(3,5),F(3,5),WS(8),R(8)] },
    { name: 'Bíceps rosca polia', equipmentType: 'MACHINE', sets: [F(3,5),F(3,5),WS(8,12),WS(8,12)] },
    { name: 'Bíceps rosca unilateral', equipmentType: 'FREE_WEIGHT', sets: [F(3,5),F(3,5),WS(8,12),WS(8,12)] },
  ] },
  { name: 'TREINO 3', exercises: [
    { name: 'Remada curvada', equipmentType: 'FREE_WEIGHT', sets: [W(10,15),F(3),F(3),F(3),WS(8),WS(8),B(8,12)] },
    { name: 'Puxada alta / puxada na pegada indicada pela ficha', equipmentType: 'MACHINE', sets: [F(3,5),F(3,5),WS(8),R(8)] },
    { name: 'Supino Inclinado', equipmentType: 'FREE_WEIGHT', sets: [F(3),F(3),F(3),WS(8),T(6,8)] },
    { name: 'Supino reto máquina', equipmentType: 'MACHINE', sets: [F(3,5),F(3,5),WS(8),WS(8)] },
    { name: 'Tríceps polia alta', equipmentType: 'MACHINE', sets: [F(3,5),F(3,5),WS(8,12),WS(8,12),WS(8,12)] },
    { name: 'Tríceps francês', equipmentType: 'FREE_WEIGHT', sets: [F(3,5),F(3,5),WS(8,12),R(8,12)] },
    { name: 'Elevação unilateral', equipmentType: 'FREE_WEIGHT', sets: [F(3,5),WS(8,12),WS(8,12),WS(8,12)] },
  ] },
  { name: 'TREINO 4', exercises: [
    { name: 'Cadeira flexora', equipmentType: 'MACHINE', sets: [W(10,15),F(3),F(3),WS(8),T(6,8)] },
    { name: 'Agachamento Smith', equipmentType: 'MACHINE', sets: [F(3,5),F(3,5),F(3,5),WS(8),T(6,8)] },
    { name: 'Cadeira extensora', equipmentType: 'MACHINE', sets: [F(3,5),F(3,5),WS(8),WS(8),T(6,8)] },
    { name: 'Elevação pélvica', equipmentType: 'FREE_WEIGHT', sets: [F(3),F(3),F(3),WS(8),T(6,8)] },
    { name: 'Mesa flexora', equipmentType: 'MACHINE', sets: [F(3,5),F(3,5),WS(8),R(8)] },
    { name: 'Bíceps rosca polia', equipmentType: 'MACHINE', sets: [F(3,5),F(3,5),WS(8,12),WS(8,12)] },
    { name: 'Bíceps rosca unilateral', equipmentType: 'FREE_WEIGHT', sets: [F(3,5),F(3,5),WS(8),R(8)] },
  ] },
  { name: 'TREINO 5', exercises: [
    { name: 'Remada máquina', equipmentType: 'MACHINE', sets: [W(10,15),F(3,5),F(3,5),WS(8),WS(8),B(8,12)] },
    { name: 'T Bar Row máquina', equipmentType: 'MACHINE', sets: [F(3,5),F(3,5),WS(8),T(6,8)] },
    { name: 'Supino Inclinado', equipmentType: 'FREE_WEIGHT', sets: [F(3,5),F(3,5),F(3,5),WS(8),T(6,8)] },
    { name: 'Supino reto máquina', equipmentType: 'MACHINE', sets: [F(3,5),F(3,5),WS(8),WS(8)] },
    { name: 'Desenvolvimento', equipmentType: 'FREE_WEIGHT', sets: [F(3,5),F(3,5),WS(8),WS(8)] },
    { name: 'Tríceps polia alta', equipmentType: 'MACHINE', sets: [F(3,5),F(3,5),WS(8,12),WS(8,12)] },
    { name: 'Tríceps cruzado na polia', equipmentType: 'MACHINE', sets: [F(3,5),F(3,5),WS(8,12),R(8,12)] },
  ] },
  { name: 'TREINO 6', exercises: [
    { name: 'Cadeira flexora', equipmentType: 'MACHINE', sets: [W(10,15),F(3),F(3),WS(8),T(6,8)] },
    { name: 'Leg Press 45°', equipmentType: 'MACHINE', sets: [F(3,5),F(3,5),F(3,5),WS(8),T(6,8)] },
    { name: 'Sumo Deadlift', equipmentType: 'FREE_WEIGHT', sets: [F(3,5),F(3,5),WS(5,8),T(3,5),B(3,8)] },
    { name: 'Cadeira extensora', equipmentType: 'MACHINE', sets: [F(3,5),F(3,5),WS(8),WS(8)] },
    { name: 'Bíceps rosca polia', equipmentType: 'MACHINE', sets: [F(3,5),F(3,5),WS(8,12),WS(8,12)] },
    { name: 'Bíceps rosca martelo', equipmentType: 'FREE_WEIGHT', sets: [F(3,5),F(3,5),WS(8,12),WS(8,12)] },
    { name: 'Elevação lateral', equipmentType: 'FREE_WEIGHT', sets: [F(3,5),F(3,5),WS(8,12),WS(8,12)] },
  ] },
];
