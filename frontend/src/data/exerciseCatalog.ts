export type CatalogEquipment = 'FREE_WEIGHT' | 'MACHINE';

export type CatalogExercise = {
  name: string;
  equipmentType: CatalogEquipment;
  muscleGroup: string;
};

export const EXERCISE_CATALOG: CatalogExercise[] = [
  // Peito
  { name: 'Supino Reto Barra', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Peito' },
  { name: 'Supino Reto Halteres', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Peito' },
  { name: 'Supino Reto Máquina', equipmentType: 'MACHINE', muscleGroup: 'Peito' },
  { name: 'Supino Reto Smith', equipmentType: 'MACHINE', muscleGroup: 'Peito' },
  { name: 'Supino Inclinado Barra', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Peito' },
  { name: 'Supino Inclinado Halteres', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Peito' },
  { name: 'Supino Inclinado Máquina', equipmentType: 'MACHINE', muscleGroup: 'Peito' },
  { name: 'Supino Declinado Barra', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Peito' },
  { name: 'Supino Declinado Halteres', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Peito' },
  { name: 'Crucifixo Reto Halteres', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Peito' },
  { name: 'Crucifixo Inclinado Halteres', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Peito' },
  { name: 'Crucifixo Máquina (Peck Deck)', equipmentType: 'MACHINE', muscleGroup: 'Peito' },
  { name: 'Crossover Polia', equipmentType: 'MACHINE', muscleGroup: 'Peito' },
  { name: 'Paralelas (Mergulho)', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Peito' },
  { name: 'Flexão de Braço', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Peito' },
  { name: 'Pullover Halteres', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Peito' },

  // Costas
  { name: 'Puxada Frontal Aberta', equipmentType: 'MACHINE', muscleGroup: 'Costas' },
  { name: 'Puxada Frontal Fechada', equipmentType: 'MACHINE', muscleGroup: 'Costas' },
  { name: 'Puxada Alta Triângulo', equipmentType: 'MACHINE', muscleGroup: 'Costas' },
  { name: 'Barra Fixa (Pull-up)', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Costas' },
  { name: 'Remada Curvada Barra', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Costas' },
  { name: 'Remada Curvada Halteres', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Costas' },
  { name: 'Remada Unilateral Halteres (Serrote)', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Costas' },
  { name: 'Remada Cavalinho', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Costas' },
  { name: 'Remada Baixa Polia (Sentado)', equipmentType: 'MACHINE', muscleGroup: 'Costas' },
  { name: 'Remada Máquina Articulada', equipmentType: 'MACHINE', muscleGroup: 'Costas' },
  { name: 'Levantamento Terra', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Costas' },
  { name: 'Levantamento Terra Romeno', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Costas' },
  { name: 'Pulldown Braço Reto (Polia)', equipmentType: 'MACHINE', muscleGroup: 'Costas' },
  { name: 'Hiperextensão Lombar', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Costas' },

  // Ombro
  { name: 'Desenvolvimento Militar Barra', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Ombro' },
  { name: 'Desenvolvimento Halteres', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Ombro' },
  { name: 'Desenvolvimento Máquina', equipmentType: 'MACHINE', muscleGroup: 'Ombro' },
  { name: 'Elevação Lateral Halteres', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Ombro' },
  { name: 'Elevação Lateral Polia', equipmentType: 'MACHINE', muscleGroup: 'Ombro' },
  { name: 'Elevação Lateral Máquina', equipmentType: 'MACHINE', muscleGroup: 'Ombro' },
  { name: 'Elevação Frontal Halteres', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Ombro' },
  { name: 'Crucifixo Invertido Halteres', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Ombro' },
  { name: 'Crucifixo Invertido Máquina', equipmentType: 'MACHINE', muscleGroup: 'Ombro' },
  { name: 'Remada Alta Barra', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Ombro' },
  { name: 'Encolhimento de Ombros (Barra)', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Ombro' },
  { name: 'Encolhimento de Ombros (Halteres)', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Ombro' },

  // Perna
  { name: 'Agachamento Livre', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Perna' },
  { name: 'Agachamento Smith', equipmentType: 'MACHINE', muscleGroup: 'Perna' },
  { name: 'Agachamento Hack', equipmentType: 'MACHINE', muscleGroup: 'Perna' },
  { name: 'Agachamento Búlgaro', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Perna' },
  { name: 'Leg Press 45°', equipmentType: 'MACHINE', muscleGroup: 'Perna' },
  { name: 'Cadeira Extensora', equipmentType: 'MACHINE', muscleGroup: 'Perna' },
  { name: 'Cadeira Flexora', equipmentType: 'MACHINE', muscleGroup: 'Perna' },
  { name: 'Mesa Flexora', equipmentType: 'MACHINE', muscleGroup: 'Perna' },
  { name: 'Stiff Barra', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Perna' },
  { name: 'Stiff Halteres', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Perna' },
  { name: 'Afundo (Passada) Halteres', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Perna' },
  { name: 'Cadeira Adutora', equipmentType: 'MACHINE', muscleGroup: 'Perna' },
  { name: 'Cadeira Abdutora', equipmentType: 'MACHINE', muscleGroup: 'Perna' },
  { name: 'Panturrilha em Pé', equipmentType: 'MACHINE', muscleGroup: 'Perna' },
  { name: 'Panturrilha Sentado', equipmentType: 'MACHINE', muscleGroup: 'Perna' },
  { name: 'Panturrilha no Leg Press', equipmentType: 'MACHINE', muscleGroup: 'Perna' },
  { name: 'Elevação Pélvica (Hip Thrust) Barra', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Perna' },
  { name: 'Elevação Pélvica Máquina', equipmentType: 'MACHINE', muscleGroup: 'Perna' },

  // Bíceps
  { name: 'Rosca Direta Barra', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Bíceps' },
  { name: 'Rosca Direta Halteres', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Bíceps' },
  { name: 'Rosca Alternada Halteres', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Bíceps' },
  { name: 'Rosca Martelo Halteres', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Bíceps' },
  { name: 'Rosca Scott Barra', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Bíceps' },
  { name: 'Rosca Scott Máquina', equipmentType: 'MACHINE', muscleGroup: 'Bíceps' },
  { name: 'Rosca Concentrada Halteres', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Bíceps' },
  { name: 'Rosca Polia (Cabo)', equipmentType: 'MACHINE', muscleGroup: 'Bíceps' },
  { name: 'Rosca 21', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Bíceps' },

  // Tríceps
  { name: 'Tríceps Pulley Corda', equipmentType: 'MACHINE', muscleGroup: 'Tríceps' },
  { name: 'Tríceps Pulley Barra', equipmentType: 'MACHINE', muscleGroup: 'Tríceps' },
  { name: 'Tríceps Testa Barra', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Tríceps' },
  { name: 'Tríceps Testa Halteres', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Tríceps' },
  { name: 'Tríceps Francês Halteres', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Tríceps' },
  { name: 'Tríceps Coice (Kickback) Halteres', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Tríceps' },
  { name: 'Supino Fechado (Pegada Fechada)', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Tríceps' },
  { name: 'Mergulho no Banco (Banco Triceps)', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Tríceps' },
  { name: 'Tríceps Máquina', equipmentType: 'MACHINE', muscleGroup: 'Tríceps' },

  // Abdômen
  { name: 'Abdominal Supra no Solo', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Abdômen' },
  { name: 'Abdominal na Máquina', equipmentType: 'MACHINE', muscleGroup: 'Abdômen' },
  { name: 'Abdominal na Polia (Ajoelhado)', equipmentType: 'MACHINE', muscleGroup: 'Abdômen' },
  { name: 'Elevação de Pernas na Barra', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Abdômen' },
  { name: 'Elevação de Pernas no Solo', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Abdômen' },
  { name: 'Prancha Abdominal', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Abdômen' },
  { name: 'Abdominal Infra no Banco', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Abdômen' },
  { name: 'Abdominal Oblíquo (Bicicleta)', equipmentType: 'FREE_WEIGHT', muscleGroup: 'Abdômen' },
];

function normalize(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function searchExerciseCatalog(query: string, limit = 8): CatalogExercise[] {
  const needle = normalize(query.trim());
  if (!needle) return [];
  return EXERCISE_CATALOG.filter((exercise) => normalize(exercise.name).includes(needle)).slice(0, limit);
}

export function exerciseVideoSearchUrl(name: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} execução correta`)}`;
}
