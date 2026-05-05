import { PrismaClient } from '@prisma/client';

export class CommentService {
  constructor(private db: PrismaClient) { }

  async createComment(userId: string, userRole: string, taskId: string, content: string) {
    const task = await this.db.task.findUnique({
      where: { id: taskId },
      include: { project: { include: { members: { where: { userId } } } } }
    });

    if (!task) throw { statusCode: 404, message: 'Task not found' };

    if (userRole !== 'ADMIN' && task.project.ownerId !== userId && task.project.members.length === 0) {
      throw { statusCode: 403, message: 'Forbidden' };
    }

    return this.db.comment.create({
      data: {
        taskId,
        authorId: userId,
        content
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } }
      }
    });
  }

  async listComments(userId: string, userRole: string, taskId: string) {
    const task = await this.db.task.findUnique({
      where: { id: taskId },
      include: { project: { include: { members: { where: { userId } } } } }
    });

    if (!task) throw { statusCode: 404, message: 'Task not found' };

    if (userRole !== 'ADMIN' && task.project.ownerId !== userId && task.project.members.length === 0) {
      throw { statusCode: 403, message: 'Forbidden' };
    }

    return this.db.comment.findMany({
      where: { taskId },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async deleteComment(userId: string, userRole: string, id: string) {
    const comment = await this.db.comment.findUnique({
      where: { id },
      include: { task: { include: { project: true } } }
    });

    if (!comment) throw { statusCode: 404, message: 'Comment not found' };

    const isProjectOwner = comment.task.project.ownerId === userId;
    const isCommentAuthor = comment.authorId === userId;

    if (userRole !== 'ADMIN' && !isProjectOwner && !isCommentAuthor) {
      throw { statusCode: 403, message: 'Forbidden' };
    }

    await this.db.comment.delete({ where: { id } });
  }

  async updateComment(userId: string, id: string, content: string) {
    const comment = await this.db.comment.findUnique({ where: { id } });
    if (!comment) throw { statusCode: 404, message: 'Comment not found' };

    if (comment.authorId !== userId) {
      throw { statusCode: 403, message: 'Forbidden' };
    }

    return this.db.comment.update({
      where: { id },
      data: { content },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } }
      }
    });
  }
}
