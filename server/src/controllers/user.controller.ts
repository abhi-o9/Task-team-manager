import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../services/user.service';
import { updateUserSchema, updatePasswordSchema } from '../schemas/user.schema';

export class UserController {
  constructor(private fastify: FastifyInstance, private userService: UserService) {}

  listUsers = async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.user.role !== 'ADMIN' && request.user.role !== 'MANAGER') {
      throw { statusCode: 403, message: 'Forbidden' };
    }
    const query = request.query as any;
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    
    const result = await this.userService.listUsers(page, limit);
    return { success: true, ...result };
  };

  getUser = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await this.userService.getUserById(request.params.id);
    return { success: true, data: user };
  };

  updateUser = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    if (request.user.id !== request.params.id && request.user.role !== 'ADMIN') {
      throw { statusCode: 403, message: 'Forbidden' };
    }
    const data = updateUserSchema.parse(request.body);
    const user = await this.userService.updateUser(request.params.id, data);
    return { success: true, data: user };
  };

  changePassword = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    if (request.user.id !== request.params.id) {
      throw { statusCode: 403, message: 'Forbidden' };
    }
    const data = updatePasswordSchema.parse(request.body);
    await this.userService.changePassword(request.params.id, data);
    return { success: true, message: 'Password updated successfully' };
  };
}
