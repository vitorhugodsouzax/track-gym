import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { createSessionToken, hashPassword, verifyPassword } from '../auth/password.js';

type Credentials = { nickname?: string; password?: string };

function normalizeNickname(value: string) {
  return value.trim().toLowerCase();
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: Credentials }>('/api/auth/register', async (request, reply) => {
    const nickname = normalizeNickname(request.body?.nickname ?? '');
    const password = request.body?.password ?? '';
    if (nickname.length < 2 || nickname.length > 24) return reply.code(400).send({ message: 'Nickname deve ter entre 2 e 24 caracteres.' });
    if (!/^[a-z0-9._-]+$/.test(nickname)) return reply.code(400).send({ message: 'Use apenas letras, números, ponto, _ ou -.' });
    if (password.length < 4) return reply.code(400).send({ message: 'A senha precisa ter pelo menos 4 caracteres.' });
    const exists = await prisma.user.findUnique({ where: { nickname } });
    if (exists) return reply.code(409).send({ message: 'Esse nickname já está em uso.' });
    const user = await prisma.user.create({ data: { nickname, passwordHash: await hashPassword(password) } });
    const token = createSessionToken();
    await prisma.authSession.create({ data: { token, userId: user.id } });
    return reply.code(201).send({ token, user: { id: user.id, nickname: user.nickname, selectedPlanId: user.selectedPlanId } });
  });

  app.post<{ Body: Credentials }>('/api/auth/login', async (request, reply) => {
    const nickname = normalizeNickname(request.body?.nickname ?? '');
    const password = request.body?.password ?? '';
    const user = await prisma.user.findUnique({ where: { nickname } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return reply.code(401).send({ message: 'Nickname ou senha inválidos.' });
    }
    const token = createSessionToken();
    await prisma.authSession.create({ data: { token, userId: user.id } });
    return { token, user: { id: user.id, nickname: user.nickname, selectedPlanId: user.selectedPlanId } };
  });

  app.get('/api/auth/me', async (request) => ({
    user: request.user,
  }));

  app.post('/api/auth/logout', async (request) => {
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (token) await prisma.authSession.deleteMany({ where: { token } });
    return { ok: true };
  });
}
