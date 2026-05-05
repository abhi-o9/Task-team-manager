import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TaskService } from '../services/task.service';
import { taskSchema, updateTaskSchema, TaskStatus } from '../schemas/task.schema';
import { z } from 'zod';

export class TaskController {
  constructor(private fastify: FastifyInstance, private taskService: TaskService) {}

  createTask = async (request: FastifyRequest<{ Params: { projectId: string } }>, reply: FastifyReply) => {
    const data = taskSchema.parse(request.body);
    const task = await this.taskService.createTask(request.user.id, request.params.projectId, data, request.user.role);
    return { success: true, data: task };
  };

  listTasks = async (request: FastifyRequest<{ Params: { projectId: string } }>, reply: FastifyReply) => {
    const query = request.query as any;
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    
    const filters = {
      status: query.status,
      priority: query.priority,
      assigneeId: query.assigneeId,
      dueBefore: query.dueBefore,
      dueAfter: query.dueAfter
    };

    const result = await this.taskService.listTasks(request.user.id, request.params.projectId, filters, request.user.role);
    return { success: true, data: result };
  };

  getTask = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const task = await this.taskService.getTask(request.user.id, request.params.id, request.user.role);
    return { success: true, data: task };
  };

  updateTask = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const data = updateTaskSchema.parse(request.body);
    const task = await this.taskService.updateTask(request.user.id, request.params.id, data, request.user.role);
    return { success: true, data: task };
  };

  deleteTask = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.taskService.deleteTask(request.user.id, request.params.id, request.user.role);
    return { success: true, message: 'Task deleted' };
  };

  updateStatus = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { status } = z.object({ status: TaskStatus }).parse(request.body);
    const task = await this.taskService.updateStatus(request.user.id, request.params.id, status, request.user.role);
    return { success: true, data: task };
  };
}
