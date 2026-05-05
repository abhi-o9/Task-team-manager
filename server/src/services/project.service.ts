import { PrismaClient, UserRole, ProjectStatus } from '@prisma/client';

export class ProjectService {
  constructor(private db: PrismaClient) { }

  async createProject(ownerId: string, data: any, userRole?: string) {
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      throw { statusCode: 403, message: 'Only Managers and Admins can create projects.' };
    }

    const project = await this.db.project.create({
      data: {
        name: data.name,
        description: data.description,
        status: ProjectStatus.ACTIVE,
        ownerId,
        members: {
          create: {
            userId: ownerId,
            role: UserRole.MANAGER,
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true, role: true }
            }
          }
        }
      }
    });

    return project;
  }

  async listProjects(userId: string, userRole?: string) {
    let projects: any[];

    if (userRole === 'ADMIN') {
      projects = await this.db.project.findMany({
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatarUrl: true, role: true }
              }
            }
          },
          _count: { select: { tasks: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      projects = await this.db.project.findMany({
        where: {
          members: {
            some: { userId }
          }
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatarUrl: true, role: true }
              }
            }
          },
          _count: { select: { tasks: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    return projects;
  }

  async getProject(userId: string, id: string, userRole: string) {
    const project = await this.db.project.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true, role: true }
            }
          }
        }
      }
    });

    if (!project) throw { statusCode: 404, message: 'Project not found' };

    if (userRole !== 'ADMIN' && project.ownerId !== userId && !project.members.some(m => m.userId === userId)) {
      throw { statusCode: 403, message: 'Forbidden' };
    }

    return project;
  }

  async updateProject(userId: string, id: string, data: any, userRole: string) {
    const project = await this.db.project.findUnique({
      where: { id },
      include: { members: { where: { userId } } }
    });

    if (!project) throw { statusCode: 404, message: 'Project not found' };

    const isManager = project.members.length > 0 && project.members[0].role === UserRole.MANAGER;
    if (userRole !== 'ADMIN' && project.ownerId !== userId && !isManager) {
      throw { statusCode: 403, message: 'Forbidden' };
    }

    return this.db.project.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        status: data.status,
      }
    });
  }

  async addMember(userId: string, projectId: string, memberData: any, userRole: string) {
    const project = await this.db.project.findUnique({
      where: { id: projectId },
      include: { members: { where: { userId } } }
    });

    if (!project) throw { statusCode: 404, message: 'Project not found' };

    const isManager = project.members.length > 0 && project.members[0].role === UserRole.MANAGER;
    if (userRole !== 'ADMIN' && project.ownerId !== userId && !isManager) {
      throw { statusCode: 403, message: 'Forbidden' };
    }

    const member = await this.db.projectMember.create({
      data: {
        projectId,
        userId: memberData.userId,
        role: memberData.role || UserRole.MEMBER,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true, role: true }
        }
      }
    });

    return member;
  }

  async removeMember(userId: string, projectId: string, targetUserId: string, userRole: string) {
    const project = await this.db.project.findUnique({
      where: { id: projectId },
      include: { members: { where: { userId } } }
    });

    if (!project) throw { statusCode: 404, message: 'Project not found' };
    if (project.ownerId === targetUserId) throw { statusCode: 400, message: 'Cannot remove project owner' };

    const isManager = project.members.length > 0 && project.members[0].role === UserRole.MANAGER;
    if (userRole !== 'ADMIN' && project.ownerId !== userId && !isManager && userId !== targetUserId) {
      throw { statusCode: 403, message: 'Forbidden' };
    }

    await this.db.projectMember.deleteMany({
      where: { projectId, userId: targetUserId }
    });
  }

  async updateMemberRole(userId: string, projectId: string, targetUserId: string, role: UserRole, userRole: string) {
    const project = await this.db.project.findUnique({
      where: { id: projectId },
      include: { members: { where: { userId } } }
    });

    if (!project) throw { statusCode: 404, message: 'Project not found' };
    if (project.ownerId === targetUserId) throw { statusCode: 400, message: 'Cannot modify project owner role' };

    const isManager = project.members.length > 0 && project.members[0].role === UserRole.MANAGER;
    if (userRole !== 'ADMIN' && project.ownerId !== userId && !isManager) {
      throw { statusCode: 403, message: 'Forbidden' };
    }

    return this.db.projectMember.update({
      where: { projectId_userId: { projectId, userId: targetUserId } },
      data: { role }
    });
  }

  async archiveProject(userId: string, id: string, userRole: string) {
    const project = await this.db.project.findUnique({
      where: { id },
      include: { members: { where: { userId } } }
    });

    if (!project) throw { statusCode: 404, message: 'Project not found' };

    const isProjectManager = project.members.length > 0 && project.members[0].role === UserRole.MANAGER;
    if (userRole !== 'ADMIN' && project.ownerId !== userId && !isProjectManager) {
      throw { statusCode: 403, message: 'Only Admins and Managers can archive projects.' };
    }

    return this.db.project.update({
      where: { id },
      data: { status: ProjectStatus.ARCHIVED }
    });
  }

  async deleteProject(userId: string, id: string, userRole: string) {
    const project = await this.db.project.findUnique({
      where: { id },
      include: { members: { where: { userId } } }
    });

    if (!project) throw { statusCode: 404, message: 'Project not found' };

    const isProjectManager = project.members.length > 0 && project.members[0].role === UserRole.MANAGER;
    if (userRole !== 'ADMIN' && project.ownerId !== userId && !isProjectManager) {
      throw { statusCode: 403, message: 'Only Admins and Managers can delete projects.' };
    }

    await this.db.project.delete({ where: { id } });
  }

  async getProjectStats(userId: string, id: string, userRole: string) {
    const project = await this.db.project.findUnique({
      where: { id },
      include: { 
        members: { where: { userId } },
        tasks: true
      }
    });

    if (!project) throw { statusCode: 404, message: 'Project not found' };

    if (userRole !== 'ADMIN' && project.ownerId !== userId && project.members.length === 0) {
      throw { statusCode: 403, message: 'Forbidden' };
    }

    const tasks = project.tasks;
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'DONE').length;
    const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const todo = tasks.filter(t => t.status === 'TODO').length;
    const inReview = tasks.filter(t => t.status === 'IN_REVIEW').length;

    return { total, completed, inProgress, todo, inReview };
  }
}
