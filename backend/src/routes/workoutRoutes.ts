import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { planInclude } from '../repositories/planQuery.js';

export async function workoutRoutes(app: FastifyInstance) {
  app.get('/api/workouts', async (request) => {
    const selectedPlanId = request.user?.selectedPlanId;
    if (!selectedPlanId) return [];
    const plan = await prisma.workoutPlan.findFirst({
      where: {
        id: selectedPlanId,
        OR: [{ kind: 'VITOR' }, { kind: 'PERSONAL', userId: request.user?.id }],
      },
      include: planInclude,
    });
    return plan ? [plan] : [];
  });

  app.get<{ Params: { dayId: string } }>('/api/workout-days/:dayId', async (request, reply) => {
    const day = await prisma.workoutDay.findFirst({
      where: {
        id: request.params.dayId,
        plan: { OR: [{ kind: 'VITOR' }, { kind: 'PERSONAL', userId: request.user?.id }] },
      },
      include: { exercises: { orderBy: { order: 'asc' }, include: { setTemplates: { orderBy: { order: 'asc' } } } } },
    });
    if (!day) return reply.code(404).send({ message: 'Ficha não encontrada.' });
    return day;
  });
}
