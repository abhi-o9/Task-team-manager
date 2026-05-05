import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { UserRole, UserStatus } from '@prisma/client';
import { signupSchema, loginSchema } from '../schemas/auth.schema';

export class AuthController {
  constructor(private fastify: FastifyInstance) { }

  register = async (request: FastifyRequest, reply: FastifyReply) => {
    const data = signupSchema.parse(request.body);

    const existing = await this.fastify.db.user.findUnique({
      where: { email: data.email }
    });

    if (existing) {
      throw { statusCode: 400, message: 'User already exists' };
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await this.fastify.db.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: UserRole.MEMBER,
        status: UserStatus.PENDING,
      }
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    return { success: true, data: userWithoutPassword };
  };

  login = async (request: FastifyRequest, reply: FastifyReply) => {
    const data = loginSchema.parse(request.body);

    const user = await this.fastify.db.user.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    if (user.status === UserStatus.PENDING) {
      throw { statusCode: 403, message: 'Your account is pending approval by an administrator.' };
    }

    const userId = user.id;

    const accessToken = this.fastify.jwt.sign({ id: userId, role: user.role });
    const refreshToken = this.fastify.jwt.sign({ id: userId, role: user.role }, { expiresIn: '7d' });

    await this.fastify.db.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
      }
    });

    reply.setCookie('refreshToken', refreshToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60,
    });

    const { passwordHash: _, ...u } = user;
    return { success: true, data: { user: u, accessToken } };
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

    const storedToken = await this.fastify.db.refreshToken.findUnique({
      where: { token: refreshToken }
    });

    if (!storedToken || storedToken.userId !== decoded.id) {
      throw { statusCode: 401, message: 'Invalid refresh token' };
    }

    const user = await this.fastify.db.user.findUnique({ where: { id: decoded.id } });
    if (!user) throw { statusCode: 401, message: 'User not found' };

    const accessToken = this.fastify.jwt.sign({ id: user.id, role: user.role });

    return { success: true, data: { accessToken } };
  };

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies.refreshToken;
    if (refreshToken) {
      await this.fastify.db.refreshToken.deleteMany({
        where: { token: refreshToken }
      });
    }

    reply.clearCookie('refreshToken', {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    return { success: true, message: 'Logged out' };
  };

  me = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await this.fastify.db.user.findUnique({ where: { id: request.user.id } });
    if (!user) throw { statusCode: 404, message: 'User not found' };
    const { passwordHash: _, ...u } = user;
    return { success: true, data: u };
  };
}
