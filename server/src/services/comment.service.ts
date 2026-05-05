import { DocumentScope } from 'nano';
import { v4 as uuidv4 } from 'uuid';

export class CommentService {
  constructor(private db: DocumentScope<any>) {}

  async checkTaskAccess(userId: string, taskId: string, userRole: string) {
    if (userRole === 'ADMIN') return true;

    const task = await this.db.get(taskId).catch(() => null);
    if (!task || task.type !== 'TASK') throw { statusCode: 404, message: 'Task not found' };

    const project = await this.db.get(task.projectId).catch(() => null);

    const qMembers = await this.db.find({
      selector: { type: 'PROJECT_MEMBER', projectId: task.projectId, userId },
      limit: 1
    });

    if (project?.ownerId !== userId && qMembers.docs.length === 0) {
      throw { statusCode: 403, message: 'Forbidden' };
    }

    return task;
  }

  async createComment(userId: string, userRole: string, taskId: string, body: string) {
    await this.checkTaskAccess(userId, taskId, userRole);

    const commentDoc = {
      _id: `comment_${uuidv4()}`,
      type: 'COMMENT',
      taskId,
      authorId: userId,
      body,
      createdAt: new Date().toISOString()
    };

    await this.db.insert(commentDoc);

    const author = await this.db.get(userId).catch(() => null);

    const { _id, ...rest } = commentDoc as any;
    return {
      id: _id,
      ...rest,
      author: author ? { id: author._id, name: author.name, avatarUrl: author.avatarUrl } : null
    };
  }

  async listComments(userId: string, userRole: string, taskId: string) {
    await this.checkTaskAccess(userId, taskId, userRole);

    const qComments = await this.db.find({
      selector: { type: 'COMMENT', taskId },
      limit: 1000
    });

    const userIds = [...new Set(qComments.docs.map(c => c.authorId))];
    const qUsers = await this.db.find({
      selector: { type: 'USER', _id: { $in: userIds } },
      limit: 1000
    });
    const userMap = new Map(qUsers.docs.map(u => [u._id, u]));

    return qComments.docs.map(c => {
      const author = userMap.get(c.authorId);
      const { _rev, _id, ...rest } = c;
      return {
        id: _id,
        ...rest,
        author: author ? { id: author._id, name: author.name, avatarUrl: author.avatarUrl } : null
      };
    }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async deleteComment(userId: string, userRole: string, id: string) {
    const comment = await this.db.get(id).catch(() => null);
    if (!comment || comment.type !== 'COMMENT') throw { statusCode: 404, message: 'Comment not found' };

    if (userRole !== 'ADMIN' && comment.authorId !== userId) {
      throw { statusCode: 403, message: 'Forbidden' };
    }

    await this.db.destroy(comment._id, comment._rev);
  }
}
