import { FastifyInstance } from 'fastify';
import { ProjectController } from '../controllers/project.controller';
import { ProjectService } from '../services/project.service';

export default async function projectRoutes(fastify: FastifyInstance) {
  const projectService = new ProjectService(fastify.db);
  const projectController = new ProjectController(fastify, projectService);

  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', projectController.listProjects);
  fastify.post('/', projectController.createProject);
  fastify.get('/:id', projectController.getProject);
  fastify.patch('/:id', projectController.updateProject);
  fastify.delete('/:id', projectController.archiveProject);
  fastify.delete('/:id/hard', projectController.deleteProject);
  fastify.get('/:id/stats', projectController.getStats);

  // Members
  fastify.get('/:id/members', projectController.getMembers);
  fastify.post('/:id/members', projectController.addMember);
  fastify.patch('/:id/members/:userId', projectController.updateMember);
  fastify.delete('/:id/members/:userId', projectController.removeMember);
}
