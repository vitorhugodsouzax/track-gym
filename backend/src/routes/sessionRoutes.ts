import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { evaluateProgression, evaluateRepsTrend, type WorkingSetPerformance } from '../engines/progressionEngine.js';
import { getLatestCompletedExercisesBatch } from '../repositories/performanceHistory.js';

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

    const templateIds = sortedExercises
      .map((exercise) => exercise.exerciseTemplateId)
      .filter((id): id is string => Boolean(id));
    const previousByTemplateId = await getLatestCompletedExercisesBatch(templateIds, userId);

    const trendByOrder = new Map<number, 'improved' | 'same'>();
    for (let i = 0; i < sortedExercises.length; i++) {
      const exercise = sortedExercises[i];
      const order = i + 1;
      if (!exercise.exerciseTemplateId) continue;
      const workingSets = exercise.sets.filter((set) => set.type === 'WORKING');
      if (workingSets.length === 0) continue;
      const previous = previousByTemplateId.get(exercise.exerciseTemplateId);
      const previousWorking = (previous?.sets ?? [])
        .filter((set) => set.type === 'WORKING')
        .map((set) => ({ order: set.order, repRangeMin: set.repRangeMin, repRangeMax: set.repRangeMax, completedReps: set.completedReps ?? 0, actualWeight: set.actualWeight ?? 0 }));
      trendByOrder.set(order, evaluateRepsTrend(workingSets.map(toPerformance), previousWorking));
    }

    const sessionId = randomUUID();
    const exerciseRows = sortedExercises.map((exercise, i) => {
      const order = i + 1;
      const workingSets = exercise.sets.filter((set) => set.type === 'WORKING');
      const canEvaluate = workingSets.length > 0 && workingSets.every((set) => set.actualWeight !== undefined && set.completedReps !== undefined);
      const progression = canEvaluate ? evaluateProgression(workingSets.map(toPerformance), exercise.increment) : undefined;
      return {
        id: randomUUID(),
        order,
        exerciseTemplateId: exercise.exerciseTemplateId,
        nameSnapshot: exercise.nameSnapshot,
        equipmentType: exercise.equipmentType,
        workingWeight: exercise.workingWeight,
        increment: exercise.increment,
        sets: exercise.sets,
        progression,
      };
    });

    await prisma.$transaction([
      prisma.workoutSession.create({
        data: { id: sessionId, workoutDayId: request.body.workoutDayId, userId, status: 'COMPLETED' },
      }),
      prisma.workoutExercise.createMany({
        data: exerciseRows.map((row) => ({
          id: row.id,
          sessionId,
          exerciseTemplateId: row.exerciseTemplateId,
          nameSnapshot: row.nameSnapshot,
          order: row.order,
          equipmentType: row.equipmentType,
          workingWeight: row.workingWeight,
          increment: row.increment,
        })),
      }),
      prisma.workoutSet.createMany({
        data: exerciseRows.flatMap((row) =>
          row.sets.map((set, setIndex) => ({
            id: randomUUID(),
            workoutExerciseId: row.id,
            type: set.type,
            order: setIndex + 1,
            plannedWeight: set.plannedWeight,
            actualWeight: set.actualWeight,
            repRangeMin: set.repRangeMin,
            repRangeMax: set.repRangeMax,
            completedReps: set.completedReps,
            notes: set.notes,
          })),
        ),
      }),
      prisma.progressionResult.createMany({
        data: exerciseRows
          .filter((row) => row.progression)
          .map((row) => ({
            id: randomUUID(),
            workoutExerciseId: row.id,
            shouldProgress: row.progression!.shouldProgress,
            nextWorkingWeight: row.progression!.nextWorkingWeight,
            percentage: row.progression!.percentage,
            reason: row.progression!.reason,
          })),
      }),
    ]);

    const session = await prisma.workoutSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: { workoutDay: true, exercises: { orderBy: { order: 'asc' }, include: { sets: { orderBy: { order: 'asc' } }, progression: true } } },
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

  app.delete<{ Params: { sessionId: string } }>('/api/logbook/:sessionId', async (request, reply) => {
    const userId = request.user?.id;
    const session = await prisma.workoutSession.findFirst({ where: { id: request.params.sessionId, userId } });
    if (!session) return reply.code(404).send({ message: 'Sessão não encontrada.' });
    await prisma.workoutSession.delete({ where: { id: session.id } });
    return { ok: true };
  });
}
