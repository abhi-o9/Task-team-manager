import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DashboardService } from '../services/dashboard.service';

export class DashboardController {
  constructor(private fastify: FastifyInstance, private dashboardService: DashboardService) {}

  getSummary = async (request: FastifyRequest, reply: FastifyReply) => {
    const summary = await this.dashboardService.getSummary(request.user.id);
    return { success: true, data: summary };
  };

  getAdminStats = async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.user.role !== 'ADMIN') {
      throw { statusCode: 403, message: 'Forbidden' };
    }
    const stats = await this.dashboardService.getAdminStats();
    return { success: true, data: stats };
  };

  getManagerStats = async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.user.role !== 'ADMIN' && request.user.role !== 'MANAGER') {
      throw { statusCode: 403, message: 'Forbidden' };
    }
    const stats = await this.dashboardService.getManagerStats(request.user.id);
    return { success: true, data: stats };
  };
}
