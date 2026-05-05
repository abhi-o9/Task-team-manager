import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';

export default fp(async (fastify) => {
  // Rate limit removed per user request
  // fastify.register(rateLimit, {
  //   max: 1000,
  //   timeWindow: '15 minutes'
  // });
});
