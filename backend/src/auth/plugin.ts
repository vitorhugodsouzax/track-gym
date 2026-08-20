import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../db.js';

const PUBLIC_PATHS = new Set(['/health', '/api/auth/login', '/api/auth/register']);

function tokenFrom(request: FastifyRequest) {
  const header = request.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return undefined;
}

export function authPlugin(app: FastifyInstance) {
  app.decorateRequest('user', null);
  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.url.startsWith('/api') || PUBLIC_PATHS.has(request.url.split('?')[0])) return;
    const token = tokenFrom(request);
    if (!token) return reply.code(401).send({ message: 'Faça login para continuar.' });
    const session = await prisma.authSession.findUnique({
      where: { token },
      include: { user: { select: { id: true, nickname: true, selectedPlanId: true } } },
    });
    if (!session) return reply.code(401).send({ message: 'Sessão inválida.' });
    request.user = session.user;
  });
}
