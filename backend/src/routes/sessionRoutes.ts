import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { evaluateProgression } from '../engines/progressionEngine.js';

type CompletedSet = { type: 'WARMUP' | 'FEEDER' | 'WORKING' | 'TOP_SET' | 'BACK_OFF' | 'REST_PAUSE'; order: number; plannedWeight?: number; actualWeight?: number; repRangeMin: number; repRangeMax: number; completedReps?: number; loadControlled?: boolean; repsInReserve?: number; feeling?: 'GOOD' | 'NORMAL' | 'BAD'; repsClean?: boolean; notes?: string };
type CompletedExercise = { exerciseTemplateId: string; nameSnapshot: string; order: number; equipmentType: 'FREE_WEIGHT' | 'MACHINE'; workingWeight?: number; increment: number; sets: CompletedSet[] };

export async function sessionRoutes(app: FastifyInstance) {
  app.post<{ Body: { workoutDayId: string; exercises: CompletedExercise[] } }>('/api/sessions', async (request, reply) => {
    const session = await prisma.workoutSession.create({ data: {
      workoutDayId: request.body.workoutDayId,
      userId: request.user?.id,
      status: 'COMPLETED',
      exercises: { create: request.body.exercises.map((exercise) => {
        const working = exercise.sets.find((set) => set.type === 'WORKING');
        const canEvaluate = exercise.workingWeight !== undefined && working?.loadControlled !== undefined && working.repsInReserve !== undefined && working.feeling !== undefined && working.repsClean !== undefined;
        const progression = canEvaluate ? evaluateProgression({ workingWeight: exercise.workingWeight!, increment: exercise.increment, equipmentType: exercise.equipmentType, criteria: { loadControlled: working!.loadControlled!, repsInReserve: working!.repsInReserve!, feeling: working!.feeling!, repsClean: working!.repsClean! } }) : undefined;
        return {
        exerciseTemplateId: exercise.exerciseTemplateId, nameSnapshot: exercise.nameSnapshot, order: exercise.order,
        equipmentType: exercise.equipmentType, workingWeight: exercise.workingWeight, increment: exercise.increment,
        sets: { create: exercise.sets },
        progression: progression ? { create: { shouldProgress: progression.shouldProgress, nextWorkingWeight: progression.nextWorkingWeight, percentage: progression.percentage, reason: progression.reason } } : undefined,
      }; }) },
    }, include: { exercises: { include: { sets: true } } } });
    return reply.code(201).send(session);
  });

  app.get('/api/logbook', async (request) => prisma.workoutSession.findMany({
    where: { status: 'COMPLETED', userId: request.user?.id }, orderBy: { performedAt: 'desc' },
    include: { workoutDay: true, exercises: { orderBy: { order: 'asc' }, include: { sets: { orderBy: { order: 'asc' } } } } },
  }));

  app.get<{ Params: { exerciseId: string } }>('/api/exercises/:exerciseId/last-session', async (request) => {
    return prisma.workoutSet.findMany({
      where: { workoutExercise: { exerciseTemplateId: request.params.exerciseId, session: { status: 'COMPLETED' } } },
      orderBy: [{ workoutExercise: { session: { performedAt: 'desc' } } }, { order: 'asc' }],
      take: 20,
      select: { type: true, order: true, plannedWeight: true, actualWeight: true, repRangeMin: true, repRangeMax: true, completedReps: true, notes: true },
    });
  });
}
