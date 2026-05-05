import { FastifyInstance } from 'fastify';
import { CommentController } from '../controllers/comment.controller';
import { CommentService } from '../services/comment.service';

export default async function commentRoutes(fastify: FastifyInstance) {
  const commentService = new CommentService(fastify.db);
  const commentController = new CommentController(fastify, commentService);

  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/tasks/:taskId/comments', commentController.listComments);
  fastify.post('/tasks/:taskId/comments', commentController.createComment);
  fastify.delete('/comments/:id', commentController.deleteComment);
}
