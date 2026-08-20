export const planInclude = {
  workoutDays: {
    orderBy: { order: 'asc' as const },
    include: {
      exercises: {
        orderBy: { order: 'asc' as const },
        include: { setTemplates: { orderBy: { order: 'asc' as const } } },
      },
    },
  },
};

export const feederPercentage = (count: number, index: number) =>
  ({ 1: [85], 2: [70, 90], 3: [50, 70, 90] } as const)[count as 1 | 2 | 3]?.[index] ?? null;

export function nextDayName(existingCount: number) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (existingCount < letters.length) return `TREINO ${letters[existingCount]}`;
  return `TREINO ${existingCount + 1}`;
}
