import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CommentService } from '../services/comment.service';
import { commentSchema } from '../schemas/comment.schema';

export class CommentController {
  constructor(private fastify: FastifyInstance, private commentService: CommentService) {}

  createComment = async (request: FastifyRequest<{ Params: { taskId: string } }>, reply: FastifyReply) => {
    const data = commentSchema.parse(request.body);
    const comment = await this.commentService.createComment(request.user.id, request.user.role, request.params.taskId, data.body);
    return { success: true, data: comment };
  };

  listComments = async (request: FastifyRequest<{ Params: { taskId: string } }>, reply: FastifyReply) => {
    const comments = await this.commentService.listComments(request.user.id, request.user.role, request.params.taskId);
    return { success: true, data: comments };
  };

  deleteComment = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.commentService.deleteComment(request.user.id, request.user.role, request.params.id);
    return { success: true, message: 'Comment deleted' };
  };
}
