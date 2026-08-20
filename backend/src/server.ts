import Fastify from 'fastify';
import { authPlugin } from './auth/plugin.js';
import { authRoutes } from './routes/authRoutes.js';
import { planRoutes } from './routes/planRoutes.js';
import { workoutRoutes } from './routes/workoutRoutes.js';
import { sessionRoutes } from './routes/sessionRoutes.js';

export function buildServer() {
  const app = Fastify({ logger: true });
  app.get('/health', async () => ({ status: 'ok' }));
  authPlugin(app);
  app.register(authRoutes);
  app.register(planRoutes);
  app.register(workoutRoutes);
  app.register(sessionRoutes);
  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const app = buildServer();
  void app.listen({ port: 3000, host: '0.0.0.0' });
}