import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { signupSchema, loginSchema } from '../schemas/auth.schema';

export class AuthController {
  constructor(private fastify: FastifyInstance) { }

  register = async (request: FastifyRequest, reply: FastifyReply) => {
    const data = signupSchema.parse(request.body);

    const q = await this.fastify.db.find({
      selector: { type: 'USER', email: data.email },
      limit: 1
    });

    if (q.docs.length > 0) {
      throw { statusCode: 400, message: 'User already exists' };
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const userDoc = {
      _id: `user_${uuidv4()}`,
      type: 'USER',
      name: data.name,
      email: data.email,
      passwordHash,
      role: 'MEMBER',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.fastify.db.insert(userDoc);

    const { passwordHash: _, ...userWithoutPassword } = userDoc;
    return { success: true, data: userWithoutPassword };
  };

  login = async (request: FastifyRequest, reply: FastifyReply) => {
    const data = loginSchema.parse(request.body);

    const q = await this.fastify.db.find({
      selector: { type: 'USER', email: data.email },
      limit: 1
    });

    const user = q.docs[0];
    if (!user) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    if (user.status === 'PENDING') {
      throw { statusCode: 403, message: 'Your account is pending approval by an administrator.' };
    }

    // Since _id acts as id for the client
    const userId = user._id;

    const accessToken = this.fastify.jwt.sign({ id: userId, role: user.role });
    const refreshToken = this.fastify.jwt.sign({ id: userId, role: user.role }, { expiresIn: '7d' });

    const tokenDoc = {
      _id: `token_${uuidv4()}`,
      type: 'REFRESH_TOKEN',
      token: refreshToken,
      userId,
      createdAt: new Date().toISOString()
    };
    await this.fastify.db.insert(tokenDoc);

    reply.setCookie('refreshToken', refreshToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60,
    });

    const { passwordHash: _, _id, _rev, ...u } = user;
    return { success: true, data: { user: { id: _id, ...u }, accessToken } };
  };

  refresh = async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies.refreshToken;
    if (!refreshToken) throw { statusCode: 401, message: 'No user found' };

    let decoded: any;
    try {
      decoded = this.fastify.jwt.verify(refreshToken);
    } catch (e) {
      throw { statusCode: 401, message: 'Invalid refresh token' };
    }

    const q = await this.fastify.db.find({
      selector: { type: 'REFRESH_TOKEN', token: refreshToken, userId: decoded.id },
      limit: 1
    });

    if (q.docs.length === 0) {
      throw { statusCode: 401, message: 'Invalid refresh token' };
    }

    const userDoc = await this.fastify.db.get(decoded.id);

    const accessToken = this.fastify.jwt.sign({ id: userDoc._id, role: userDoc.role });

    return { success: true, data: { accessToken } };
  };

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies.refreshToken;
    if (refreshToken) {
      const q = await this.fastify.db.find({
        selector: { type: 'REFRESH_TOKEN', token: refreshToken },
        limit: 1
      });
      if (q.docs.length > 0) {
        await this.fastify.db.destroy(q.docs[0]._id, q.docs[0]._rev);
      }
    }

    reply.clearCookie('refreshToken', {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    return { success: true, message: 'Logged out' };
  };

  me = async (request: FastifyRequest, reply: FastifyReply) => {
    const userDoc = await this.fastify.db.get(request.user.id);
    const { passwordHash: _, _id, _rev, ...u } = userDoc;
    return { success: true, data: { id: _id, ...u } };
  };
}
