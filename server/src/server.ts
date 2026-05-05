import 'dotenv/config';
import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';
import cookiePlugin from './plugins/cookie';
import corsPlugin from './plugins/cors';
import helmetPlugin from './plugins/helmet';
import rateLimitPlugin from './plugins/rateLimit';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import commentRoutes from './routes/comments';
import dashboardRoutes from './routes/dashboard';

const fastify = Fastify({
  pluginTimeout: 30000,
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' }
    }
  }
});

fastify.setErrorHandler((error, request, reply) => {
  if (error.validation) {
    reply.status(400).send({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.validation }
    });
    return;
  }

  const statusCode = error.statusCode || 500;
  reply.status(statusCode).send({
    success: false,
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: statusCode === 500 ? 'Internal Server Error' : error.message
    }
  });
});

async function build() {
  await fastify.register(sensible);
  await fastify.register(corsPlugin);
  await fastify.register(helmetPlugin);
  await fastify.register(rateLimitPlugin);
  await fastify.register(cookiePlugin);
  await fastify.register(dbPlugin);
  await fastify.register(authPlugin);

  // Register routes
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  await fastify.register(userRoutes, { prefix: '/api/v1/users' });
  await fastify.register(projectRoutes, { prefix: '/api/v1/projects' });
  await fastify.register(taskRoutes, { prefix: '/api/v1' });
  await fastify.register(commentRoutes, { prefix: '/api/v1' });
  await fastify.register(dashboardRoutes, { prefix: '/api/v1/dashboard' });

  return fastify;
}

build().then((server) => {
  const port = Number(process.env.PORT) || 3000;
  server.listen({ port, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }
    server.log.info(`Server listening at ${address}`);
  });
});
