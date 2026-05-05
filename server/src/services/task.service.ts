import { PrismaClient, TaskStatus, TaskPriority, UserRole } from '@prisma/client';

export class TaskService {
  constructor(private db: PrismaClient) {}

  async checkProjectAccess(userId: string, projectId: string, userRole: string) {
    if (userRole === 'ADMIN') {
      return this.db.project.findUnique({ where: { id: projectId } });
    }

    const project = await this.db.project.findUnique({
      where: { id: projectId },
      include: { members: { where: { userId } } }
    });

    if (!project) throw { statusCode: 404, message: 'Project not found' };

    if (project.ownerId !== userId && project.members.length === 0) {
      throw { statusCode: 403, message: 'Forbidden' };
    }
    return project;
  }

  async listTasks(userId: string, projectId: string, filters: any, userRole: string) {
    await this.checkProjectAccess(userId, projectId, userRole);

    const where: any = { projectId };
    if (filters.status) where.status = filters.status;
    if (filters.assigneeId) {
      where.assignments = { some: { userId: filters.assigneeId } };
    }

    const tasks = await this.db.task.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        assignments: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } }
          }
        },
        _count: { select: { comments: true } }
      }
    });

    return tasks.map(t => ({
      ...t,
      assignees: t.assignments.map(a => a.user),
      assigneeIds: t.assignments.map(a => a.userId),
      // legacy compat
      assignee: t.assignments[0]?.user || null,
      assigneeId: t.assignments[0]?.userId || null,
    }));
  }

  async createTask(userId: string, projectId: string, data: any, userRole: string) {
    await this.checkProjectAccess(userId, projectId, userRole);

    const assigneeIds: string[] = data.assigneeIds || (data.assigneeId ? [data.assigneeId] : []);

    const task = await this.db.task.create({
      data: {
        projectId,
        creatorId: userId,
        title: data.title,
        description: data.description,
        status: data.status || TaskStatus.TODO,
        priority: data.priority || TaskPriority.MEDIUM,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assignments: {
          create: assigneeIds.map(aid => ({ userId: aid }))
        }
      },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        assignments: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } }
          }
        },
        _count: { select: { comments: true } }
      }
    });

    return {
      ...task,
      assignees: task.assignments.map(a => a.user),
      assigneeIds: task.assignments.map(a => a.userId),
      assignee: task.assignments[0]?.user || null,
      assigneeId: task.assignments[0]?.userId || null,
    };
  }

  async getTask(userId: string, id: string, userRole: string) {
    const task = await this.db.task.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        assignments: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } }
          }
        },
        comments: {
          include: {
            author: { select: { id: true, name: true, avatarUrl: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!task) throw { statusCode: 404, message: 'Task not found' };

    await this.checkProjectAccess(userId, task.projectId, userRole);

    return {
      ...task,
      assignees: task.assignments.map(a => a.user),
      assigneeIds: task.assignments.map(a => a.userId),
      assignee: task.assignments[0]?.user || null,
      assigneeId: task.assignments[0]?.userId || null,
    };
  }

  async updateTask(userId: string, id: string, data: any, userRole: string) {
    const task = await this.db.task.findUnique({ where: { id } });
    if (!task) throw { statusCode: 404, message: 'Task not found' };

    await this.checkProjectAccess(userId, task.projectId, userRole);

    const updateData: any = {
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    };

    if (data.assigneeIds !== undefined || data.assigneeId !== undefined) {
      const newAssigneeIds: string[] = data.assigneeIds || (data.assigneeId ? [data.assigneeId] : []);
      updateData.assignments = {
        deleteMany: {},
        create: newAssigneeIds.map(aid => ({ userId: aid }))
      };
    }

    await this.db.task.update({
      where: { id },
      data: updateData
    });

    return this.getTask(userId, id, userRole);
  }

  async deleteTask(userId: string, id: string, userRole: string) {
    const task = await this.db.task.findUnique({
      where: { id },
      include: { project: { include: { members: { where: { userId } } } } }
    });
    if (!task) throw { statusCode: 404, message: 'Task not found' };

    const isProjectManager = task.project.members.length > 0 && task.project.members[0].role === UserRole.MANAGER;
    
    if (userRole !== 'ADMIN' && task.project.ownerId !== userId && !isProjectManager) {
      throw { statusCode: 403, message: 'Only Admins and Managers can delete tasks.' };
    }

    await this.db.task.delete({ where: { id } });
  }

  async updateStatus(userId: string, id: string, status: TaskStatus, userRole: string) {
    const task = await this.db.task.findUnique({ where: { id } });
    if (!task) throw { statusCode: 404, message: 'Task not found' };

    await this.checkProjectAccess(userId, task.projectId, userRole);

    return this.db.task.update({
      where: { id },
      data: { status }
    });
  }
}
