import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { evaluateProgression, evaluateRepsTrend, type WorkingSetPerformance } from '../engines/progressionEngine.js';
import { getRecentCompletedExercises } from '../repositories/performanceHistory.js';

type SetType = 'WARMUP' | 'FEEDER' | 'WORKING' | 'TOP_SET' | 'BACK_OFF' | 'REST_PAUSE';

type CompletedSet = {
  type: SetType;
  order: number;
  plannedWeight?: number;
  actualWeight?: number;
  repRangeMin: number;
  repRangeMax: number;
  completedReps?: number;
  notes?: string;
};

type CompletedExercise = {
  exerciseTemplateId?: string;
  nameSnapshot: string;
  order: number;
  equipmentType: 'FREE_WEIGHT' | 'MACHINE';
  workingWeight?: number;
  increment: number;
  sets: CompletedSet[];
};

function toPerformance(set: CompletedSet): WorkingSetPerformance {
  return {
    order: set.order,
    repRangeMin: set.repRangeMin,
    repRangeMax: set.repRangeMax,
    completedReps: set.completedReps ?? 0,
    actualWeight: set.actualWeight ?? 0,
  };
}

export async function sessionRoutes(app: FastifyInstance) {
  app.post<{ Body: { workoutDayId: string; exercises: CompletedExercise[] } }>('/api/sessions', async (request, reply) => {
    const userId = request.user?.id;
    
    // Sort exercises by their original order and reassign to 1, 2, 3... to avoid unique constraint violations
    const sortedExercises = [...request.body.exercises].sort((a, b) => a.order - b.order);

    const trendByOrder = new Map<number, 'improved' | 'same'>();
    for (let i = 0; i < sortedExercises.length; i++) {
      const exercise = sortedExercises[i];
      const order = i + 1;
      if (!exercise.exerciseTemplateId) continue;
      const workingSets = exercise.sets.filter((set) => set.type === 'WORKING');
      if (workingSets.length === 0) continue;
      const [previous] = await getRecentCompletedExercises(exercise.exerciseTemplateId, userId, 1);
      const previousWorking = (previous?.sets ?? [])
        .filter((set) => set.type === 'WORKING')
        .map((set) => ({ order: set.order, repRangeMin: set.repRangeMin, repRangeMax: set.repRangeMax, completedReps: set.completedReps ?? 0, actualWeight: set.actualWeight ?? 0 }));
      trendByOrder.set(order, evaluateRepsTrend(workingSets.map(toPerformance), previousWorking));
    }

    const session = await prisma.workoutSession.create({
      data: {
        workoutDayId: request.body.workoutDayId,
        userId,
        status: 'COMPLETED',
        exercises: {
          create: sortedExercises.map((exercise, i) => {
            const order = i + 1;
            const workingSets = exercise.sets.filter((set) => set.type === 'WORKING');
            const canEvaluate = workingSets.length > 0 && workingSets.every((set) => set.actualWeight !== undefined && set.completedReps !== undefined);
            const progression = canEvaluate ? evaluateProgression(workingSets.map(toPerformance), exercise.increment) : undefined;
            return {
              exerciseTemplateId: exercise.exerciseTemplateId,
              nameSnapshot: exercise.nameSnapshot,
              order,
              equipmentType: exercise.equipmentType,
              workingWeight: exercise.workingWeight,
              increment: exercise.increment,
              sets: {
                create: exercise.sets.map((set, setIndex) => ({
                  type: set.type,
                  order: setIndex + 1,
                  plannedWeight: set.plannedWeight,
                  actualWeight: set.actualWeight,
                  repRangeMin: set.repRangeMin,
                  repRangeMax: set.repRangeMax,
                  completedReps: set.completedReps,
                  notes: set.notes,
                })),
              },
              progression: progression
                ? { create: { shouldProgress: progression.shouldProgress, nextWorkingWeight: progression.nextWorkingWeight, percentage: progression.percentage, reason: progression.reason } }
                : undefined,
            };
          }),
        },
      },
      include: { workoutDay: true, exercises: { include: { sets: true, progression: true } } },
    });

    const withTrend = {
      ...session,
      exercises: session.exercises.map((exercise) => ({ ...exercise, trend: trendByOrder.get(exercise.order) ?? null })),
    };
    return reply.code(201).send(withTrend);
  });

  app.get('/api/logbook', async (request) => prisma.workoutSession.findMany({
    where: { status: 'COMPLETED', userId: request.user?.id }, orderBy: { performedAt: 'desc' },
    include: { workoutDay: true, exercises: { orderBy: { order: 'asc' }, include: { sets: { orderBy: { order: 'asc' } }, progression: true } } },
  }));
}
