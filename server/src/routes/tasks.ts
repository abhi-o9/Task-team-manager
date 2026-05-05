import { FastifyInstance } from 'fastify';
import { TaskController } from '../controllers/task.controller';
import { TaskService } from '../services/task.service';

export default async function taskRoutes(fastify: FastifyInstance) {
  const taskService = new TaskService(fastify.db);
  const taskController = new TaskController(fastify, taskService);

  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/projects/:projectId/tasks', taskController.listTasks);
  fastify.post('/projects/:projectId/tasks', taskController.createTask);
  
  fastify.get('/tasks/:id', taskController.getTask);
  fastify.patch('/tasks/:id', taskController.updateTask);
  fastify.delete('/tasks/:id', taskController.deleteTask);
  fastify.patch('/tasks/:id/status', taskController.updateStatus);
}
