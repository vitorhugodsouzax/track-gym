import { PrismaClient, SetType } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'node:path';
import { WORKOUTS } from '../src/data/workouts.js';
import { normalizeDatabaseUrl } from '../src/config/databaseUrl.js';

dotenv.config({ path: path.resolve(process.cwd(), '../.env'), override: true });
if (process.env.DATABASE_URL) process.env.DATABASE_URL = normalizeDatabaseUrl(process.env.DATABASE_URL);

const prisma = new PrismaClient();
const feederPercentage = (count: number, index: number) => ({ 1: [85], 2: [70, 90], 3: [50, 70, 90] } as const)[count as 1 | 2 | 3]?.[index] ?? null;

async function main() {
  await prisma.workoutPlan.deleteMany({ where: { name: 'Memento Mori Protocol' } });
  await prisma.workoutPlan.create({
    data: {
      name: 'Memento Mori Protocol',
      kind: 'VITOR',
      workoutDays: { create: WORKOUTS.map((day, dayIndex) => ({
        name: day.name,
        order: dayIndex + 1,
        exercises: { create: day.exercises.map((exercise, exerciseIndex) => {
          const feederCount = exercise.sets.filter(([type]) => type === 'FEEDER').length;
          let feederIndex = 0;
          return {
            name: exercise.name, order: exerciseIndex + 1, equipmentType: exercise.equipmentType,
            setTemplates: { create: exercise.sets.map(([type, repRangeMin, repRangeMax], setIndex) => {
              const percentage = type === 'FEEDER' ? feederPercentage(feederCount, feederIndex++) : type === 'BACK_OFF' ? 90 : null;
              return { type: type as SetType, order: setIndex + 1, repRangeMin, repRangeMax, percentage };
            }) },
          };
        }) },
      })) },
    },
  });
}

main().finally(() => prisma.$disconnect());
