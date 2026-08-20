import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user: { id: string; nickname: string; selectedPlanId: string | null } | null;
  }
}
