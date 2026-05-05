import { PrismaClient, TaskStatus, UserRole } from '@prisma/client';

export class DashboardService {
  constructor(private db: PrismaClient) {}

  async getSummary(userId: string) {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const userTasks = await this.db.task.findMany({
      where: { assignments: { some: { userId } } },
      orderBy: { dueDate: 'asc' }
    });

    const totalTasks = userTasks.length;
    const statusGroups = userTasks.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {} as any);

    let overdueCount = 0;
    let dueSoonCount = 0;
    const tasksDueThisWeek = [];
    const completedRecent = [];

    for (const t of userTasks) {
      if (t.status !== TaskStatus.DONE && t.dueDate) {
        const due = new Date(t.dueDate);
        if (due < now) overdueCount++;
        else if (due <= nextWeek) {
          dueSoonCount++;
          tasksDueThisWeek.push(t);
        }
      }
      if (t.status === TaskStatus.DONE && t.updatedAt) {
        const updated = new Date(t.updatedAt);
        if (updated >= sevenDaysAgo) completedRecent.push(t);
      }
    }

    const topDueThisWeek = tasksDueThisWeek.slice(0, 5);

    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      days[d.toISOString().split('T')[0]] = 0;
    }
    completedRecent.forEach(t => {
      const dateStr = t.updatedAt.toISOString().split('T')[0];
      if (days[dateStr] !== undefined) {
        days[dateStr]++;
      }
    });

    const completedLast7Days = Object.entries(days).map(([date, count]) => ({ date, count }));

    return {
      totalTasks,
      byStatus: statusGroups,
      overdueCount,
      dueSoonCount,
      tasksDueThisWeek: topDueThisWeek,
      completedLast7Days
    };
  }

  async getAdminStats() {
    const [totalUsers, totalProjects, totalTasks, doneTasks, recentSignups] = await Promise.all([
      this.db.user.count(),
      this.db.project.count(),
      this.db.task.count(),
      this.db.task.count({ where: { status: TaskStatus.DONE } }),
      this.db.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, createdAt: true }
      })
    ]);

    const completionRate = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;

    return {
      totalUsers,
      totalProjects,
      totalTasks,
      completionRate,
      recentSignups
    };
  }

  async getManagerStats(userId: string) {
    const managedProjects = await this.db.project.findMany({
      where: {
        members: {
          some: { userId, role: UserRole.MANAGER }
        }
      },
      include: {
        tasks: true,
        members: true
      }
    });

    if (managedProjects.length === 0) {
      return {
        totalProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        activeMembers: 0,
        projectBreakdown: []
      };
    }

    const totalProjects = managedProjects.length;
    let totalTasks = 0;
    let completedTasks = 0;
    const uniqueMemberIds = new Set<string>();

    const projectBreakdown = managedProjects.map(p => {
      const pTasks = p.tasks;
      const done = pTasks.filter(t => t.status === TaskStatus.DONE).length;
      totalTasks += pTasks.length;
      completedTasks += done;
      p.members.forEach(m => uniqueMemberIds.add(m.userId));

      return {
        id: p.id,
        name: p.name,
        taskCount: pTasks.length,
        completedCount: done,
        progress: pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0
      };
    });

    return {
      totalProjects,
      totalTasks,
      completedTasks,
      activeMembers: uniqueMemberIds.size,
      projectBreakdown
    };
  }
}
