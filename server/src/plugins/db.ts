import fp from 'fastify-plugin';
import nano, { ServerScope, DocumentScope } from 'nano';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export default fp(async (fastify) => {
  const url = process.env.COUCHDB_URL || 'http://admin:admin@127.0.0.1:5984';
  const maskedUrl = url.replace(/:([^@]+)@/, ':****@');
  fastify.log.info(`Connecting to CouchDB at: ${maskedUrl}`);
  const couch: ServerScope = nano(url);

  const dbName = 'taskflow';

  try {
    await couch.db.get(dbName);
  } catch (e: any) {
    if (e.statusCode === 404) {
      await couch.db.create(dbName);
      fastify.log.info(`Created CouchDB database: ${dbName}`);
    } else {
      fastify.log.error(e);
      throw e;
    }
  }

  const db: DocumentScope<any> = couch.use(dbName);

  // Setup basic indexes
  try {
    await db.createIndex({ index: { fields: ['type'] } });
    await db.createIndex({ index: { fields: ['email'] } });
    await db.createIndex({ index: { fields: ['type', 'projectId'] } });
    await db.createIndex({ index: { fields: ['type', 'taskId'] } });
    await db.createIndex({ index: { fields: ['type', 'assigneeId'] } });
    await db.createIndex({ index: { fields: ['type', 'status'] } });
  } catch (e) {
    // Indexes might already exist
  }

  // Auto-create Super Admin if none exists
  try {
    const adminQ = await db.find({ selector: { type: 'USER', role: 'ADMIN' }, limit: 1 });
    if (adminQ.docs.length === 0) {
      const passwordHash = await bcrypt.hash('Admin@123', 12);
      await db.insert({
        _id: `user_${uuidv4()}`,
        type: 'USER',
        name: 'Super Admin',
        email: 'admin@taskflow.dev',
        passwordHash,
        role: 'ADMIN',
        status: 'APPROVED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
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

  fastify.decorate('db', db);
});
