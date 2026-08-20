import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { planInclude } from '../repositories/planQuery.js';
import { getRecentCompletedExercises, getRecentCompletedExercisesBatch, type PerformanceRecord } from '../repositories/performanceHistory.js';

function buildSummary(exerciseTemplateId: string, name: string, recent: PerformanceRecord[]) {
  if (recent.length === 0) {
    return { exerciseTemplateId, name, currentWeight: null, status: 'none' as const, statusDetail: null, trendPoints: [] as number[] };
  }
  const [latest, previous] = recent;
  const latestWorking = latest.sets.filter((set) => set.type === 'WORKING');
  const currentWeight = latestWorking[latestWorking.length - 1]?.actualWeight ?? null;

  let status: 'progressed' | 'partial' | 'maintained' = 'maintained';
  let statusDetail: string | null = null;
  if (latest.progression?.shouldProgress) {
    status = 'progressed';
    statusDetail = `+${latest.progression.percentage}% garantido na próxima sessão`;
  } else if (previous) {
    const previousWorking = previous.sets.filter((set) => set.type === 'WORKING');
    const improved = latestWorking.some((set) => {
      const match = previousWorking.find((prev) => prev.order === set.order);
      return match !== undefined && (set.completedReps ?? 0) > (match.completedReps ?? 0);
    });
    if (improved) {
      status = 'partial';
      statusDetail = '+1 rep vs. última vez';
    }
  }

  const trendPoints = [...recent].reverse().map((record) => {
    const working = record.sets.filter((set) => set.type === 'WORKING');
    return working[working.length - 1]?.actualWeight ?? 0;
  });

  return { exerciseTemplateId, name, currentWeight, status, statusDetail, trendPoints };
}

export async function historyRoutes(app: FastifyInstance) {
  app.get('/api/history/exercises', async (request) => {
    const userId = request.user?.id;
    const plans = await prisma.workoutPlan.findMany({
      where: { OR: [{ kind: 'VITOR' }, { kind: 'PERSONAL', userId }] },
      include: planInclude,
    });
    const exerciseIds = plans.flatMap((plan) => plan.workoutDays.flatMap((day) => day.exercises.map((exercise) => exercise.id)));
    const recentByExerciseId = await getRecentCompletedExercisesBatch(exerciseIds, userId, 6);

    const groups = [];
    for (const plan of plans) {
      for (const day of plan.workoutDays) {
        const exercises = day.exercises.map((exercise) =>
          buildSummary(exercise.id, exercise.name, recentByExerciseId.get(exercise.id) ?? []),
        );
        groups.push({ workoutDayName: day.name, exercises });
      }
    }
    return groups;
  });

  app.get<{ Params: { exerciseId: string } }>('/api/exercises/:exerciseId/history', async (request) => {
    const records = await getRecentCompletedExercises(request.params.exerciseId, request.user?.id, 20);
    return records.map((record) => ({ performedAt: record.performedAt, sets: record.sets }));
  });
}
