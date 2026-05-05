import { DocumentScope } from 'nano';
import { v4 as uuidv4 } from 'uuid';

export class ProjectService {
  constructor(private db: DocumentScope<any>) { }

  async createProject(ownerId: string, data: any, userRole?: string) {
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      throw { statusCode: 403, message: 'Only Managers and Admins can create projects.' };
    }
    const projectId = `proj_${uuidv4()}`;
    const now = new Date().toISOString();

    const projectDoc = {
      _id: projectId,
      type: 'PROJECT',
      name: data.name,
      description: data.description,
      status: 'ACTIVE',
      ownerId,
      createdAt: now,
      updatedAt: now
    };

    await this.db.insert(projectDoc);

    const userDoc = await this.db.get(ownerId);

    const memberDoc = {
      _id: `member_${uuidv4()}`,
      type: 'PROJECT_MEMBER',
      projectId,
      userId: ownerId,
      role: 'MANAGER',
      joinedAt: now
    };

    await this.db.insert(memberDoc);

    const { _id, ...p } = projectDoc as any;
    return {
      id: _id,
      ...p,
      members: [
        {
          id: memberDoc._id,
          projectId,
          userId: ownerId,
          role: 'MANAGER',
          user: { id: userDoc._id, name: userDoc.name, email: userDoc.email, avatarUrl: userDoc.avatarUrl }
        }
      ]
    };
  }

  async listProjects(userId: string, userRole?: string) {
    let projects: any[];

    if (userRole === 'ADMIN') {
      // Admin sees ALL projects across all managers
      const qProjects = await this.db.find({
        selector: { type: 'PROJECT' },
        limit: 1000
      });
      projects = qProjects.docs;
    } else {
      // MANAGER and MEMBER: only see projects they are explicitly a member of
      const qMembers = await this.db.find({
        selector: { type: 'PROJECT_MEMBER', userId },
        limit: 1000
      });
      const projectIds = qMembers.docs.map((m: any) => m.projectId);

      if (projectIds.length === 0) return [];

      const qProjects = await this.db.find({
        selector: { type: 'PROJECT', _id: { $in: projectIds } },
        limit: 1000
      });
      projects = qProjects.docs;
    }

    // Fetch members and tasks counts for all these projects
    const qAllMembers = await this.db.find({
      selector: { type: 'PROJECT_MEMBER', projectId: { $in: projects.map(p => p._id) } },
      limit: 5000
    });

    const userIds = [...new Set(qAllMembers.docs.map(m => m.userId))];
    const qUsers = await this.db.find({
      selector: { type: 'USER', _id: { $in: userIds } },
      limit: 1000
    });
    const userMap = new Map(qUsers.docs.map(u => [u._id, u]));

    const qTasks = await this.db.find({
      selector: { type: 'TASK', projectId: { $in: projects.map(p => p._id) } },
      limit: 5000,
      fields: ['projectId']
    });
    const taskCounts = qTasks.docs.reduce((acc, t) => {
      acc[t.projectId] = (acc[t.projectId] || 0) + 1;
      return acc;
    }, {} as any);

    return projects.map(p => {
      const projMembers = qAllMembers.docs.filter(m => m.projectId === p._id).map(m => {
        const u = userMap.get(m.userId);
        return {
          id: m._id,
          projectId: m.projectId,
          userId: m.userId,
          role: m.role,
          user: u ? { id: u._id, name: u.name, email: u.email, avatarUrl: u.avatarUrl, role: u.role } : null
        };
      });

      const { _rev, _id, ...rest } = p;
      return {
        id: _id,
        ...rest,
        _count: { tasks: taskCounts[p._id] || 0 },
        members: projMembers
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getProject(userId: string, id: string, userRole: string) {
    const project = await this.db.get(id).catch(() => null);
    if (!project || project.type !== 'PROJECT') throw { statusCode: 404, message: 'Project not found' };

    const qMembers = await this.db.find({
      selector: { type: 'PROJECT_MEMBER', projectId: id },
      limit: 1000
    });

    if (userRole !== 'ADMIN' && project.ownerId !== userId && !qMembers.docs.some(m => m.userId === userId)) {
      throw { statusCode: 403, message: 'Forbidden' };
    }

    const userIds = [...new Set(qMembers.docs.map(m => m.userId))];
    const qUsers = await this.db.find({
      selector: { type: 'USER', _id: { $in: userIds } },
      limit: 1000
    });
    const userMap = new Map(qUsers.docs.map(u => [u._id, u]));

    const members = qMembers.docs.map(m => {
      const u = userMap.get(m.userId);
      return {
        id: m._id,
        projectId: m.projectId,
        userId: m.userId,
        role: m.role,
        user: u ? { id: u._id, name: u.name, email: u.email, avatarUrl: u.avatarUrl, role: u.role } : null
      };
    });

    const { _rev, _id, ...rest } = project;
    return {
      id: _id,
      ...rest,
      members
    };
  }

  async updateProject(userId: string, id: string, data: any, userRole: string) {
    const project = await this.db.get(id).catch(() => null);
    if (!project || project.type !== 'PROJECT') throw { statusCode: 404, message: 'Project not found' };

    const qMembers = await this.db.find({
      selector: { type: 'PROJECT_MEMBER', projectId: id, userId },
      limit: 1
    });

    const isManager = qMembers.docs.length > 0 && qMembers.docs[0].role === 'MANAGER';
    if (userRole !== 'ADMIN' && project.ownerId !== userId && !isManager) {
      throw { statusCode: 403, message: 'Forbidden' };
    }

    project.name = data.name !== undefined ? data.name : project.name;
    project.description = data.description !== undefined ? data.description : project.description;
    project.status = data.status !== undefined ? data.status : project.status;
    project.updatedAt = new Date().toISOString();

    await this.db.insert(project);

    const { _rev, _id, ...rest } = project;
    return { id: _id, ...rest };
  }

  async addMember(userId: string, projectId: string, memberData: any, userRole: string) {
    const project = await this.db.get(projectId).catch(() => null);
    if (!project || project.type !== 'PROJECT') throw { statusCode: 404, message: 'Project not found' };

    const qMembers = await this.db.find({
      selector: { type: 'PROJECT_MEMBER', projectId, userId },
      limit: 1
    });
    const isManager = qMembers.docs.length > 0 && qMembers.docs[0].role === 'MANAGER';

    if (userRole !== 'ADMIN' && project.ownerId !== userId && !isManager) {
      throw { statusCode: 403, message: 'Forbidden' };
    }

    const qExisting = await this.db.find({
      selector: { type: 'PROJECT_MEMBER', projectId, userId: memberData.userId },
      limit: 1
    });
    if (qExisting.docs.length > 0) throw { statusCode: 400, message: 'User is already a member' };

    const memberDoc = {
      _id: `member_${uuidv4()}`,
      type: 'PROJECT_MEMBER',
      projectId,
      userId: memberData.userId,
      role: memberData.role || 'MEMBER',
      joinedAt: new Date().toISOString()
    };
    await this.db.insert(memberDoc);

    const targetUser = await this.db.get(memberData.userId).catch(() => null);

    return {
      id: memberDoc._id,
      projectId,
      userId: memberData.userId,
      role: memberData.role,
      user: targetUser ? { id: targetUser._id, name: targetUser.name, email: targetUser.email, avatarUrl: targetUser.avatarUrl, role: targetUser.role } : null
    };
  }

  async removeMember(userId: string, projectId: string, targetUserId: string, userRole: string) {
    const project = await this.db.get(projectId).catch(() => null);
    if (!project || project.type !== 'PROJECT') throw { statusCode: 404, message: 'Project not found' };

    if (project.ownerId === targetUserId) throw { statusCode: 400, message: 'Cannot remove project owner' };

    const qMembers = await this.db.find({
      selector: { type: 'PROJECT_MEMBER', projectId, userId },
      limit: 1
    });
    const isManager = qMembers.docs.length > 0 && qMembers.docs[0].role === 'MANAGER';

    if (userRole !== 'ADMIN' && project.ownerId !== userId && !isManager && userId !== targetUserId) {
      throw { statusCode: 403, message: 'Forbidden' };
    }

    const qTarget = await this.db.find({
      selector: { type: 'PROJECT_MEMBER', projectId, userId: targetUserId },
      limit: 1
    });
    if (qTarget.docs.length > 0) {
      await this.db.destroy(qTarget.docs[0]._id, qTarget.docs[0]._rev);
    }
  }

  async updateMemberRole(userId: string, projectId: string, targetUserId: string, role: string, userRole: string) {
    const project = await this.db.get(projectId).catch(() => null);
    if (!project || project.type !== 'PROJECT') throw { statusCode: 404, message: 'Project not found' };

    if (project.ownerId === targetUserId) throw { statusCode: 400, message: 'Cannot modify project owner role' };

    const qMembers = await this.db.find({
      selector: { type: 'PROJECT_MEMBER', projectId, userId },
      limit: 1
    });
    const isManager = qMembers.docs.length > 0 && qMembers.docs[0].role === 'MANAGER';

    if (userRole !== 'ADMIN' && project.ownerId !== userId && !isManager) {
      throw { statusCode: 403, message: 'Forbidden' };
    }

    const qTarget = await this.db.find({
      selector: { type: 'PROJECT_MEMBER', projectId, userId: targetUserId },
      limit: 1
    });
    if (qTarget.docs.length === 0) throw { statusCode: 404, message: 'Member not found' };

    const targetDoc = qTarget.docs[0];
    targetDoc.role = role;
    await this.db.insert(targetDoc);

    return {
      id: targetDoc._id,
      projectId,
      userId: targetDoc.userId,
      role: targetDoc.role
    };
  }
  async archiveProject(userId: string, id: string, userRole: string) {
    const project = await this.db.get(id).catch(() => null);
    if (!project || project.type !== 'PROJECT') throw { statusCode: 404, message: 'Project not found' };

    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      const qMembers = await this.db.find({
        selector: { type: 'PROJECT_MEMBER', projectId: id, userId },
        limit: 1
      });
      const isProjectManager = qMembers.docs.length > 0 && qMembers.docs[0].role === 'MANAGER';
      if (project.ownerId !== userId && !isProjectManager) {
        throw { statusCode: 403, message: 'Only Admins and Managers can archive projects.' };
      }
    }

    project.status = 'ARCHIVED';
    project.updatedAt = new Date().toISOString();

    await this.db.insert(project);

    const { _rev, _id, ...rest } = project as any;
    return { id: _id, ...rest };
  }

  async deleteProject(userId: string, id: string, userRole: string) {
    console.log(`Deleting project ${id} by user ${userId} (role: ${userRole})`);
    const project = await this.db.get(id).catch(() => null);
    if (!project || project.type !== 'PROJECT') {
      console.log(`Project ${id} not found`);
      throw { statusCode: 404, message: 'Project not found' };
    }

    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      const qMembers = await this.db.find({
        selector: { type: 'PROJECT_MEMBER', projectId: id, userId },
        limit: 1
      });
      const isProjectManager = qMembers.docs.length > 0 && qMembers.docs[0].role === 'MANAGER';
      console.log(`User ${userId} isProjectManager: ${isProjectManager}, owner: ${project.ownerId === userId}`);
      if (project.ownerId !== userId && !isProjectManager) {
        throw { statusCode: 403, message: 'Only Admins and Managers can delete projects.' };
      }
    }

    // Find all related documents (members, tasks, comments)
    let qMembers, qTasks, qComments;
    try {
      qMembers = await this.db.find({ selector: { type: 'PROJECT_MEMBER', projectId: id }, limit: 1000 });
      qTasks = await this.db.find({ selector: { type: 'TASK', projectId: id }, limit: 1000 });
      const taskIds = qTasks.docs.map(t => t._id);
      qComments = taskIds.length > 0 ? await this.db.find({ selector: { type: 'COMMENT', taskId: { $in: taskIds } }, limit: 5000 }) : { docs: [] };
      console.log(`Found ${qMembers.docs.length} members, ${qTasks.docs.length} tasks, ${qComments.docs.length} comments to delete`);
    } catch (err: any) {
      console.error('Error finding related documents:', err);
      throw { statusCode: 400, message: 'Error finding related documents for deletion' };
    }

    const docsToDelete = [
      { _id: project._id, _rev: project._rev, _deleted: true },
      ...qMembers.docs.map(d => ({ _id: d._id, _rev: d._rev, _deleted: true })),
      ...qTasks.docs.map(d => ({ _id: d._id, _rev: d._rev, _deleted: true })),
      ...qComments.docs.map(d => ({ _id: d._id, _rev: d._rev, _deleted: true }))
    ];

    if (docsToDelete.length > 0) {
      console.log(`Executing deletion for ${docsToDelete.length} documents`);
      try {
        await Promise.all(docsToDelete.map(doc => this.db.destroy(doc._id, doc._rev)));
        console.log('All documents deleted successfully');
      } catch (err: any) {
        console.error('Error in deletion operation:', err);
        throw { statusCode: 400, message: `Failed to delete all project documents: ${err.message || 'Unknown error'}` };
      }
    }
  }

  async getProjectStats(userId: string, id: string, userRole: string) {
    const project = await this.db.get(id).catch(() => null);
    if (!project || project.type !== 'PROJECT') throw { statusCode: 404, message: 'Project not found' };

    const qMembers = await this.db.find({
      selector: { type: 'PROJECT_MEMBER', projectId: id, userId },
      limit: 1
    });

    if (userRole !== 'ADMIN' && project.ownerId !== userId && qMembers.docs.length === 0) {
      throw { statusCode: 403, message: 'Forbidden' };
    }

    const qTasks = await this.db.find({
      selector: { type: 'TASK', projectId: id },
      limit: 1000
    });

    const tasks = qTasks.docs;
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'DONE').length;
    const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const todo = tasks.filter(t => t.status === 'TODO').length;
    const inReview = tasks.filter(t => t.status === 'IN_REVIEW').length;

    return { total, completed, inProgress, todo, inReview };
  }
}
