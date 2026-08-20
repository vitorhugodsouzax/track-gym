import type { FastifyInstance } from 'fastify';
import type { SetType } from '@prisma/client';
import { prisma } from '../db.js';
import { feederPercentage, nextDayName, planInclude } from '../repositories/planQuery.js';

type SetInput = { type: SetType; repRangeMin: number; repRangeMax: number };
type ExerciseInput = { name: string; equipmentType: 'FREE_WEIGHT' | 'MACHINE'; increment?: number; sets: SetInput[] };

function requireUser(request: { user: { id: string } | null }) {
  if (!request.user) throw new Error('unauthenticated');
  return request.user;
}

function assertSets(sets: SetInput[] | undefined) {
  if (!sets?.length) return 'Adicione pelo menos uma série.';
  if (!sets.some((set) => set.type === 'WORKING')) return 'Todo exercício precisa de pelo menos uma Working Set.';
  return null;
}

export async function planRoutes(app: FastifyInstance) {
  app.get('/api/plans', async (request) => {
    const user = requireUser(request);
    const [vitor, personal] = await Promise.all([
      prisma.workoutPlan.findFirst({ where: { kind: 'VITOR' }, include: planInclude, orderBy: { createdAt: 'asc' } }),
      prisma.workoutPlan.findFirst({ where: { kind: 'PERSONAL', userId: user.id }, include: planInclude }),
    ]);
    const me = await prisma.user.findUnique({ where: { id: user.id }, select: { selectedPlanId: true } });
    return { selectedPlanId: me?.selectedPlanId ?? null, vitor, personal };
  });

  app.post('/api/plans/use-vitor', async (request, reply) => {
    const user = requireUser(request);
    const vitor = await prisma.workoutPlan.findFirst({ where: { kind: 'VITOR' }, include: planInclude, orderBy: { createdAt: 'asc' } });
    if (!vitor) return reply.code(404).send({ message: 'Fichas do Vitor ainda não foram cadastradas.' });
    await prisma.user.update({ where: { id: user.id }, data: { selectedPlanId: vitor.id } });
    return { selectedPlanId: vitor.id, plan: vitor };
  });

  app.post<{ Body: { name?: string } }>('/api/plans/personal', async (request) => {
    const user = requireUser(request);
    const existing = await prisma.workoutPlan.findFirst({ where: { kind: 'PERSONAL', userId: user.id }, include: planInclude });
    if (existing) {
      await prisma.user.update({ where: { id: user.id }, data: { selectedPlanId: existing.id } });
      return existing;
    }
    const plan = await prisma.workoutPlan.create({
      data: { name: request.body?.name?.trim() || 'Ficha pessoal', kind: 'PERSONAL', userId: user.id },
      include: planInclude,
    });
    await prisma.user.update({ where: { id: user.id }, data: { selectedPlanId: plan.id } });
    return plan;
  });

  app.post<{ Params: { planId: string }; Body: { name?: string } }>('/api/plans/:planId/days', async (request, reply) => {
    const user = requireUser(request);
    const plan = await prisma.workoutPlan.findFirst({ where: { id: request.params.planId, kind: 'PERSONAL', userId: user.id } });
    if (!plan) return reply.code(404).send({ message: 'Ficha pessoal não encontrada.' });
    const count = await prisma.workoutDay.count({ where: { planId: plan.id } });
    const day = await prisma.workoutDay.create({
      data: { planId: plan.id, order: count + 1, name: request.body?.name?.trim() || nextDayName(count) },
      include: { exercises: { include: { setTemplates: true } } },
    });
    return reply.code(201).send(day);
  });

  app.patch<{ Params: { planId: string; dayId: string }; Body: { name?: string } }>('/api/plans/:planId/days/:dayId', async (request, reply) => {
    const user = requireUser(request);
    const name = request.body?.name?.trim();
    if (!name) return reply.code(400).send({ message: 'Informe o nome do treino.' });
    const day = await prisma.workoutDay.findFirst({
      where: { id: request.params.dayId, planId: request.params.planId, plan: { OR: [{ kind: 'VITOR' }, { kind: 'PERSONAL', userId: user.id }] } },
    });
    if (!day) return reply.code(404).send({ message: 'Treino não encontrado.' });
    const updated = await prisma.workoutDay.update({ where: { id: day.id }, data: { name } });
    return updated;
  });

  app.delete<{ Params: { planId: string; dayId: string } }>('/api/plans/:planId/days/:dayId', async (request, reply) => {
    const user = requireUser(request);
    const day = await prisma.workoutDay.findFirst({
      where: { id: request.params.dayId, planId: request.params.planId, plan: { kind: 'PERSONAL', userId: user.id } },
    });
    if (!day) return reply.code(404).send({ message: 'Treino não encontrado.' });
    await prisma.workoutDay.delete({ where: { id: day.id } });
    return { ok: true };
  });

  app.post<{ Params: { planId: string; dayId: string }; Body: ExerciseInput }>('/api/plans/:planId/days/:dayId/exercises', async (request, reply) => {
    const user = requireUser(request);
    const day = await prisma.workoutDay.findFirst({
      where: { id: request.params.dayId, planId: request.params.planId, plan: { kind: 'PERSONAL', userId: user.id } },
    });
    if (!day) return reply.code(404).send({ message: 'Treino não encontrado.' });
    const body = request.body;
    const name = body?.name?.trim();
    if (!name) return reply.code(400).send({ message: 'Informe o nome do exercício.' });
    const invalid = assertSets(body?.sets);
    if (invalid) return reply.code(400).send({ message: invalid });
    const feederCount = body.sets.filter((set) => set.type === 'FEEDER').length;
    let feederIndex = 0;
    const order = (await prisma.exercise.count({ where: { workoutDayId: day.id } })) + 1;
    const exercise = await prisma.exercise.create({
      data: {
        workoutDayId: day.id,
        name,
        order,
        equipmentType: body.equipmentType === 'MACHINE' ? 'MACHINE' : 'FREE_WEIGHT',
        increment: body.increment ?? 2.5,
        setTemplates: {
          create: body.sets.map((set, index) => {
            const percentage = set.type === 'FEEDER' ? feederPercentage(feederCount, feederIndex++) : set.type === 'BACK_OFF' ? 90 : null;
            return {
              type: set.type,
              order: index + 1,
              repRangeMin: Number(set.repRangeMin),
              repRangeMax: Number(set.repRangeMax),
              percentage,
            };
          }),
        },
      },
      include: { setTemplates: { orderBy: { order: 'asc' } } },
    });
    return reply.code(201).send(exercise);
  });

  app.delete<{ Params: { planId: string; exerciseId: string } }>('/api/plans/:planId/exercises/:exerciseId', async (request, reply) => {
    const user = requireUser(request);
    const exercise = await prisma.exercise.findFirst({
      where: { id: request.params.exerciseId, workoutDay: { planId: request.params.planId, plan: { kind: 'PERSONAL', userId: user.id } } },
    });
    if (!exercise) return reply.code(404).send({ message: 'Exercício não encontrado.' });
    await prisma.exercise.delete({ where: { id: exercise.id } });
    return { ok: true };
  });
}
