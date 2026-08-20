import { Prisma, type SetType } from '@prisma/client';
import { prisma } from '../db.js';

const performanceInclude = {
  sets: { orderBy: { order: 'asc' as const } },
  progression: true,
  session: { select: { performedAt: true } },
} satisfies Prisma.WorkoutExerciseInclude;

type PerformanceExercise = Prisma.WorkoutExerciseGetPayload<{ include: typeof performanceInclude }>;

export interface PerformanceSet {
  type: SetType;
  order: number;
  actualWeight: number | null;
  plannedWeight: number | null;
  completedReps: number | null;
  repRangeMin: number;
  repRangeMax: number;
}

export interface PerformanceRecord {
  sessionId: string;
  performedAt: Date;
  equipmentType: PerformanceExercise['equipmentType'];
  increment: number;
  sets: PerformanceSet[];
  progression: {
    shouldProgress: boolean;
    nextWorkingWeight: number;
    percentage: number | null;
    reason: string;
  } | null;
}

function toRecord(exercise: PerformanceExercise): PerformanceRecord {
  return {
    sessionId: exercise.sessionId,
    performedAt: exercise.session.performedAt,
    equipmentType: exercise.equipmentType,
    increment: Number(exercise.increment),
    sets: exercise.sets.map((set) => ({
      type: set.type,
      order: set.order,
      actualWeight: set.actualWeight === null ? null : Number(set.actualWeight),
      plannedWeight: set.plannedWeight === null ? null : Number(set.plannedWeight),
      completedReps: set.completedReps,
      repRangeMin: set.repRangeMin,
      repRangeMax: set.repRangeMax,
    })),
    progression: exercise.progression
      ? {
          shouldProgress: exercise.progression.shouldProgress,
          nextWorkingWeight: Number(exercise.progression.nextWorkingWeight),
          percentage: exercise.progression.percentage === null ? null : Number(exercise.progression.percentage),
          reason: exercise.progression.reason,
        }
      : null,
  };
}

export async function getRecentCompletedExercises(
  exerciseTemplateId: string,
  userId: string | undefined,
  take: number,
): Promise<PerformanceRecord[]> {
  const exercises = await prisma.workoutExercise.findMany({
    where: { exerciseTemplateId, session: { status: 'COMPLETED', userId } },
    orderBy: { session: { performedAt: 'desc' } },
    take,
    include: performanceInclude,
  });
  return exercises.map(toRecord);
}

export async function getLatestCompletedExercisesBatch(
  exerciseTemplateIds: string[],
  userId: string | undefined,
): Promise<Map<string, PerformanceRecord>> {
  if (exerciseTemplateIds.length === 0) return new Map();
  const exercises = await prisma.workoutExercise.findMany({
    where: { exerciseTemplateId: { in: exerciseTemplateIds }, session: { status: 'COMPLETED', userId } },
    orderBy: { session: { performedAt: 'desc' } },
    include: performanceInclude,
  });
  const result = new Map<string, PerformanceRecord>();
  for (const exercise of exercises) {
    if (!exercise.exerciseTemplateId || result.has(exercise.exerciseTemplateId)) continue;
    result.set(exercise.exerciseTemplateId, toRecord(exercise));
  }
  return result;
}

export async function getRecentCompletedExercisesBatch(
  exerciseTemplateIds: string[],
  userId: string | undefined,
  take: number,
): Promise<Map<string, PerformanceRecord[]>> {
  if (exerciseTemplateIds.length === 0) return new Map();
  const exercises = await prisma.workoutExercise.findMany({
    where: { exerciseTemplateId: { in: exerciseTemplateIds }, session: { status: 'COMPLETED', userId } },
    orderBy: { session: { performedAt: 'desc' } },
    include: performanceInclude,
  });
  const result = new Map<string, PerformanceRecord[]>();
  for (const exercise of exercises) {
    if (!exercise.exerciseTemplateId) continue;
    const list = result.get(exercise.exerciseTemplateId);
    if (list) {
      if (list.length < take) list.push(toRecord(exercise));
    } else {
      result.set(exercise.exerciseTemplateId, [toRecord(exercise)]);
    }
  }
  return result;
}
