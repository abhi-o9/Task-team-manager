import { FastifyInstance } from 'fastify';
import { DashboardController } from '../controllers/dashboard.controller';
import { DashboardService } from '../services/dashboard.service';

export default async function dashboardRoutes(fastify: FastifyInstance) {
  const dashboardService = new DashboardService(fastify.db);
  const dashboardController = new DashboardController(fastify, dashboardService);

  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/summary', dashboardController.getSummary);
  fastify.get('/admin', dashboardController.getAdminStats);
  fastify.get('/manager', dashboardController.getManagerStats);
}
