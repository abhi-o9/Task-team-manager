import { DocumentScope } from 'nano';
import { v4 as uuidv4 } from 'uuid';

export class TaskService {
  constructor(private db: DocumentScope<any>) {}

  async checkProjectAccess(userId: string, projectId: string, userRole: string) {
    if (userRole === 'ADMIN') return true;

    const project = await this.db.get(projectId).catch(() => null);
    if (!project || project.type !== 'PROJECT') throw { statusCode: 404, message: 'Project not found' };

    const qMembers = await this.db.find({
      selector: { type: 'PROJECT_MEMBER', projectId },
      limit: 1000
    });

    if (project.ownerId !== userId && !qMembers.docs.some(m => m.userId === userId)) {
      throw { statusCode: 403, message: 'Forbidden' };
    }
    return project;
  }

  async listTasks(userId: string, projectId: string, filters: any, userRole: string) {
    await this.checkProjectAccess(userId, projectId, userRole);

    const selector: any = { type: 'TASK', projectId };
    if (filters.status) selector.status = filters.status;
    if (filters.assigneeId) selector.assigneeId = filters.assigneeId;

    const qTasks = await this.db.find({ selector, limit: 1000 });
    const tasks = qTasks.docs;

    const userIds = [...new Set(tasks.flatMap(t => [t.assigneeId, t.creatorId]).filter(Boolean))];
    const qUsers = await this.db.find({
      selector: { type: 'USER', _id: { $in: userIds } },
      limit: 1000
    });
    const userMap = new Map(qUsers.docs.map(u => [u._id, u]));

    const qComments = await this.db.find({
      selector: { type: 'COMMENT', taskId: { $in: tasks.map(t => t._id) } },
      limit: 5000,
      fields: ['taskId']
    });
    const commentCounts = qComments.docs.reduce((acc, c) => {
      acc[c.taskId] = (acc[c.taskId] || 0) + 1;
      return acc;
    }, {} as any);

    return tasks.map(t => {
      const assigneeIdList: string[] = t.assigneeIds || (t.assigneeId ? [t.assigneeId] : []);
      const assignees = assigneeIdList.map(aid => {
        const u = userMap.get(aid);
        return u ? { id: u._id, name: u.name, avatarUrl: u.avatarUrl } : null;
      }).filter(Boolean);
      const creator = userMap.get(t.creatorId);
      const { _rev, _id, ...rest } = t;
      return {
        id: _id,
        ...rest,
        assigneeIds: assigneeIdList,
        assignees,
        // legacy compat
        assignee: assignees[0] || null,
        assigneeId: assigneeIdList[0] || null,
        creator: creator ? { id: creator._id, name: creator.name } : null,
        _count: { comments: commentCounts[_id] || 0 }
      };
    });
  }

  async createTask(userId: string, projectId: string, data: any, userRole: string) {
    await this.checkProjectAccess(userId, projectId, userRole);

    const assigneeIds: string[] = data.assigneeIds || (data.assigneeId ? [data.assigneeId] : []);

    const taskDoc = {
      _id: `task_${uuidv4()}`,
      type: 'TASK',
      projectId,
      creatorId: userId,
      title: data.title,
      description: data.description || null,
      status: data.status || 'TODO',
      priority: data.priority || 'MEDIUM',
      dueDate: data.dueDate || null,
      assigneeIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.db.insert(taskDoc);

    const qAssignees = assigneeIds.length > 0 ? await this.db.find({
      selector: { type: 'USER', _id: { $in: assigneeIds } }, limit: 100
    }) : { docs: [] };
    const assignees = qAssignees.docs.map(u => ({ id: u._id, name: u.name, avatarUrl: u.avatarUrl }));
    const creator = await this.db.get(userId).catch(() => null);

    const { _id, ...rest } = taskDoc as any;
    return {
      id: _id,
      ...rest,
      assigneeIds,
      assignees,
      assignee: assignees[0] || null,
      assigneeId: assigneeIds[0] || null,
      creator: creator ? { id: creator._id, name: creator.name } : null,
      _count: { comments: 0 }
    };
  }

  async getTask(userId: string, id: string, userRole: string) {
    const task = await this.db.get(id).catch(() => null);
    if (!task || task.type !== 'TASK') throw { statusCode: 404, message: 'Task not found' };

    await this.checkProjectAccess(userId, task.projectId, userRole);

    const qComments = await this.db.find({
      selector: { type: 'COMMENT', taskId: id },
      limit: 1000
    });

    const assigneeIdList: string[] = task.assigneeIds || (task.assigneeId ? [task.assigneeId] : []);
    const allUserIds = [...new Set([...assigneeIdList, task.creatorId, ...qComments.docs.map((c: any) => c.authorId)].filter(Boolean))];
    const qUsers = await this.db.find({
      selector: { type: 'USER', _id: { $in: allUserIds } },
      limit: 1000
    });
    const userMap = new Map(qUsers.docs.map(u => [u._id, u]));

    const assignees = assigneeIdList.map(aid => {
      const u = userMap.get(aid);
      return u ? { id: u._id, name: u.name, avatarUrl: u.avatarUrl } : null;
    }).filter(Boolean);
    const creator = userMap.get(task.creatorId);

    const comments = qComments.docs.map(c => {
      const author = userMap.get(c.authorId);
      const { _rev, _id, ...restC } = c;
      return {
        id: _id,
        ...restC,
        author: author ? { id: author._id, name: author.name, avatarUrl: author.avatarUrl } : null
      };
    }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const { _rev, _id, ...rest } = task;
    return {
      id: _id,
      ...rest,
      assigneeIds: assigneeIdList,
      assignees,
      assignee: assignees[0] || null,
      assigneeId: assigneeIdList[0] || null,
      creator: creator ? { id: creator._id, name: creator.name } : null,
      comments
    };
  }

  async updateTask(userId: string, id: string, data: any, userRole: string) {
    const task = await this.db.get(id).catch(() => null);
    if (!task || task.type !== 'TASK') throw { statusCode: 404, message: 'Task not found' };

    await this.checkProjectAccess(userId, task.projectId, userRole);

    task.title = data.title !== undefined ? data.title : task.title;
    task.description = data.description !== undefined ? data.description : task.description;
    task.status = data.status !== undefined ? data.status : task.status;
    task.priority = data.priority !== undefined ? data.priority : task.priority;
    task.dueDate = data.dueDate !== undefined ? data.dueDate : task.dueDate;
    if (data.assigneeIds !== undefined) {
      task.assigneeIds = data.assigneeIds || [];
      task.assigneeId = (data.assigneeIds || [])[0] || null; // legacy compat
    } else if (data.assigneeId !== undefined) {
      task.assigneeId = data.assigneeId;
      task.assigneeIds = data.assigneeId ? [data.assigneeId] : [];
    }
    task.updatedAt = new Date().toISOString();

    await this.db.insert(task);

    return this.getTask(userId, id, userRole);
  }

  async deleteTask(userId: string, id: string, userRole: string) {
    const task = await this.db.get(id).catch(() => null);
    if (!task || task.type !== 'TASK') throw { statusCode: 404, message: 'Task not found' };

    const project = await this.db.get(task.projectId).catch(() => null);
    
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      const qMembers = await this.db.find({
        selector: { type: 'PROJECT_MEMBER', projectId: task.projectId, userId },
        limit: 1
      });
      const isProjectManager = qMembers.docs.length > 0 && qMembers.docs[0].role === 'MANAGER';
      
      if (project?.ownerId !== userId && !isProjectManager) {
        throw { statusCode: 403, message: 'Only Admins and Managers can delete tasks.' };
      }
    }

    await this.db.destroy(task._id, task._rev);
  }

  async updateStatus(userId: string, id: string, status: string, userRole: string) {
    const task = await this.db.get(id).catch(() => null);
    if (!task || task.type !== 'TASK') throw { statusCode: 404, message: 'Task not found' };

    await this.checkProjectAccess(userId, task.projectId, userRole);

    task.status = status;
    task.updatedAt = new Date().toISOString();

    await this.db.insert(task);

    const { _rev, _id, ...rest } = task;
    return { id: _id, ...rest };
  }
}
