import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

export class UserService {
  constructor(private db: PrismaClient) {}

  async listUsers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    
    const [allUsers, total] = await Promise.all([
      this.db.user.findMany({
        where: { role: { not: UserRole.ADMIN } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        }
      }),
      this.db.user.count({
        where: { role: { not: UserRole.ADMIN } }
      })
    ]);

    return { data: allUsers, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async listPendingUsers() {
    return this.db.user.findMany({
      where: { status: UserStatus.PENDING },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      }
    });
  }

  async approveUser(targetUserId: string, role: UserRole) {
    const user = await this.db.user.update({
      where: { id: targetUserId },
      data: {
        role,
        status: UserStatus.APPROVED,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return user;
  }

  async getUserById(id: string) {
    const user = await this.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    if (!user) throw { statusCode: 404, message: 'User not found' };
    return user;
  }

  async updateUser(id: string, data: any) {
    const user = await this.db.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        avatarUrl: data.avatarUrl,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    return user;
  }

  async changePassword(id: string, data: any) {
    const user = await this.db.user.findUnique({ where: { id } });
    if (!user) throw { statusCode: 404, message: 'User not found' };

    const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isValid) throw { statusCode: 401, message: 'Incorrect current password' };

    const passwordHash = await bcrypt.hash(data.newPassword, 12);
    await this.db.user.update({
      where: { id },
      data: { passwordHash }
    });
  }
}
