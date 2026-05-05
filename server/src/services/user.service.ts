import { DocumentScope } from 'nano';
import bcrypt from 'bcryptjs';

export class UserService {
  constructor(private db: DocumentScope<any>) {}

  async listUsers(page: number = 1, limit: number = 20) {
    const q = await this.db.find({
      selector: { type: 'USER' },
      limit: 1000
    });
    
    const allUsers = q.docs
      .filter(u => u.role !== 'ADMIN')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = allUsers.length;
    const skip = (page - 1) * limit;
    const data = allUsers.slice(skip, skip + limit).map(u => {
      const { passwordHash: _, _id, _rev, ...rest } = u;
      return { id: _id, ...rest };
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async listPendingUsers() {
    const q = await this.db.find({
      selector: { type: 'USER', status: 'PENDING' },
      limit: 1000
    });
    return q.docs.map(u => {
      const { passwordHash: _, _id, _rev, ...rest } = u;
      return { id: _id, ...rest };
    });
  }

  async approveUser(targetUserId: string, role: 'MANAGER' | 'MEMBER') {
    const user = await this.db.get(targetUserId).catch(() => null);
    if (!user || user.type !== 'USER') throw { statusCode: 404, message: 'User not found' };
    if (user.status !== 'PENDING') throw { statusCode: 400, message: 'User is not pending approval' };

    user.role = role;
    user.status = 'APPROVED';
    user.updatedAt = new Date().toISOString();

    await this.db.insert(user);

    const { passwordHash: _, _id, _rev, ...rest } = user;
    return { id: _id, ...rest };
  }

  async getUserById(id: string) {
    const user = await this.db.get(id).catch(() => null);
    if (!user || user.type !== 'USER') throw { statusCode: 404, message: 'User not found' };
    const { passwordHash: _, _id, _rev, ...rest } = user;
    return { id: _id, ...rest };
  }

  async updateUser(id: string, data: any) {
    const user = await this.db.get(id).catch(() => null);
    if (!user || user.type !== 'USER') throw { statusCode: 404, message: 'User not found' };

    if (data.name !== undefined) user.name = data.name;
    if (data.email !== undefined) user.email = data.email;
    if (data.role !== undefined) user.role = data.role;
    if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;
    user.updatedAt = new Date().toISOString();

    await this.db.insert(user);
    
    const { passwordHash: _, _id, _rev, ...rest } = user;
    return { id: _id, ...rest };
  }

  async changePassword(id: string, data: any) {
    const user = await this.db.get(id).catch(() => null);
    if (!user || user.type !== 'USER') throw { statusCode: 404, message: 'User not found' };

    const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isValid) throw { statusCode: 401, message: 'Incorrect current password' };

    user.passwordHash = await bcrypt.hash(data.newPassword, 12);
    user.updatedAt = new Date().toISOString();
    
    await this.db.insert(user);
  }
}
