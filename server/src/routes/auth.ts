import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth.controller';

export default async function authRoutes(fastify: FastifyInstance) {
  const authController = new AuthController(fastify);

  fastify.post('/signup', authController.register);
  fastify.post('/login', authController.login);
  fastify.post('/refresh', authController.refresh);
  fastify.post('/logout', authController.logout);
  fastify.get('/me', { preHandler: [fastify.authenticate] }, authController.me);
}
