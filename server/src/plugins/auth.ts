import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { FastifyReply, FastifyRequest } from 'fastify';
import { DocumentScope } from 'nano';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any;
    db: DocumentScope<any>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string, role: string };
    user: { id: string, role: string };
  }
}

export default fp(async (fastify) => {
  fastify.register(fastifyJwt, {
    secret: process.env.ACCESS_TOKEN_SECRET || 'supersecret'
  });

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });
});
