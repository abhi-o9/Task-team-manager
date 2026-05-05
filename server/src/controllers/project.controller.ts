import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ProjectService } from '../services/project.service';
import { projectSchema, updateProjectSchema } from '../schemas/project.schema';
import { z } from 'zod';

export class ProjectController {
  constructor(private fastify: FastifyInstance, private projectService: ProjectService) {}

  createProject = async (request: FastifyRequest, reply: FastifyReply) => {
    const data = projectSchema.parse(request.body);
    const project = await this.projectService.createProject(request.user.id, data, request.user.role);
    return { success: true, data: project };
  };

  listProjects = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as any;
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    
    const result = await this.projectService.listProjects(request.user.id, request.user.role);
    return { success: true, data: result };
  };

  getProject = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const project = await this.projectService.getProject(request.user.id, request.params.id, request.user.role);
    return { success: true, data: project };
  };

  updateProject = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const data = updateProjectSchema.parse(request.body);
    const project = await this.projectService.updateProject(request.user.id, request.params.id, data, request.user.role);
    return { success: true, data: project };
  };

  archiveProject = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.projectService.archiveProject(request.user.id, request.params.id, request.user.role);
    return { success: true, message: 'Project archived' };
  };
  
  deleteProject = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.projectService.deleteProject(request.user.id, request.params.id, request.user.role);
    return { success: true, message: 'Project permanently deleted' };
  };

  getStats = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const stats = await this.projectService.getProjectStats(request.user.id, request.params.id, request.user.role);
    return { success: true, data: stats };
  };

  // Members
  getMembers = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const project = await this.projectService.getProject(request.user.id, request.params.id, request.user.role);
    return { success: true, data: project.members };
  };

  addMember = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { userId, role } = z.object({ userId: z.string().min(1), role: z.enum(['MEMBER', 'MANAGER']) }).parse(request.body);
    const member = await this.projectService.addMember(request.user.id, request.params.id, { userId, role }, request.user.role);
    return { success: true, data: member };
  };

  updateMember = async (request: FastifyRequest<{ Params: { id: string, userId: string } }>, reply: FastifyReply) => {
    const { role } = z.object({ role: z.enum(['MEMBER', 'MANAGER']) }).parse(request.body);
    const member = await this.projectService.updateMemberRole(request.user.id, request.params.id, request.params.userId, role, request.user.role);
    return { success: true, data: member };
  };

  removeMember = async (request: FastifyRequest<{ Params: { id: string, userId: string } }>, reply: FastifyReply) => {
    await this.projectService.removeMember(request.user.id, request.params.id, request.params.userId, request.user.role);
    return { success: true, message: 'Member removed' };
  };
}
