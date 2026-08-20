import Fastify from 'fastify';
import cors from '@fastify/cors';
import { authPlugin } from './auth/plugin.js';
import { authRoutes } from './routes/authRoutes.js';
import { planRoutes } from './routes/planRoutes.js';
import { workoutRoutes } from './routes/workoutRoutes.js';
import { sessionRoutes } from './routes/sessionRoutes.js';
import { historyRoutes } from './routes/historyRoutes.js';

export function buildServer() {
  const app = Fastify({ logger: true });
  const allowedOrigin = (process.env.FRONTEND_URL ?? '').replace(/\/$/, '');
  void app.register(cors, {
    origin: allowedOrigin || true,
    credentials: true,
  });
  app.get('/health', async () => ({ status: 'ok' }));
  authPlugin(app);
  app.register(authRoutes);
  app.register(planRoutes);
  app.register(workoutRoutes);
  app.register(sessionRoutes);
  app.register(historyRoutes);
  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const app = buildServer();
  const port = Number(process.env.PORT) || 3000;
  void app.listen({ port, host: '0.0.0.0' });
}