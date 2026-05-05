import fp from 'fastify-plugin';
import cors from '@fastify/cors';

export default fp(async (fastify) => {
  fastify.register(cors, {
    origin: [
      'http://localhost:5173',
      process.env.FRONTEND_URL || 'http://localhost:5173'
    ],
    credentials: true
  });
});
