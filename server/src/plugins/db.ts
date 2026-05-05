import fp from 'fastify-plugin';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

declare module 'fastify' {
  interface FastifyInstance {
    db: PrismaClient;
  }
}

export default fp(async (fastify) => {
  const connectionString = process.env.DATABASE_URL;
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({
    adapter,
    log: ['error'],
  });

  try {
    await prisma.$connect();
    fastify.log.info('Connected to PostgreSQL via Prisma');
  } catch (e) {
    fastify.log.error(e, 'Failed to connect to PostgreSQL');
    throw e;
  }

  // Auto-create Super Admin if none exists
  try {
    const adminCount = await prisma.user.count({
      where: { role: UserRole.ADMIN }
    });

    if (adminCount === 0) {
      const passwordHash = await bcrypt.hash('Admin@123', 12);
      await prisma.user.create({
        data: {
          name: 'Super Admin',
          email: 'admin@taskflow.dev',
          passwordHash,
          role: UserRole.ADMIN,
          status: UserStatus.APPROVED,
        }
      });
      fastify.log.info('========================================');
      fastify.log.info('  Super Admin created automatically!');
      fastify.log.info('  Email:    admin@taskflow.dev');
      fastify.log.info('  Password: Admin@123');
      fastify.log.info('========================================');
    }
  } catch (e) {
    fastify.log.error({ err: e }, 'Failed to create super admin');
  }

  fastify.decorate('db', prisma);

  fastify.addHook('onClose', async (instance) => {
    await instance.db.$disconnect();
  });
});
