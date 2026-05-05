import { FastifyInstance } from 'fastify';
import { UserController } from '../controllers/user.controller';
import { UserService } from '../services/user.service';
import { z } from 'zod';

export default async function userRoutes(fastify: FastifyInstance) {
  const userService = new UserService(fastify.db);
  const userController = new UserController(fastify, userService);

  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', userController.listUsers);
  fastify.get('/:id', userController.getUser);
  fastify.patch('/:id', userController.updateUser);
  fastify.patch('/:id/password', userController.changePassword);

  // Approval queue — admin and manager only
  fastify.get('/pending', async (request, reply) => {
    const user = request.user as any;
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      throw { statusCode: 403, message: 'Forbidden' };
    }
    const pending = await userService.listPendingUsers();
    return { success: true, data: pending };
  });

  fastify.post('/:id/approve', async (request, reply) => {
    const user = request.user as any;
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      throw { statusCode: 403, message: 'Forbidden' };
    }
    const { id } = request.params as { id: string };
    const { role } = z.object({ role: z.enum(['MANAGER', 'MEMBER']) }).parse(request.body);
    const approved = await userService.approveUser(id, role);
    return { success: true, data: approved };
  });
}
