import { DocumentScope } from 'nano';

export class DashboardService {
  constructor(private db: DocumentScope<any>) {}

  async getSummary(userId: string) {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const qTasks = await this.db.find({
      selector: { type: 'TASK', assigneeId: userId },
      limit: 5000
    });
    const userTasks = qTasks.docs;

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
      if (t.status !== 'DONE' && t.dueDate) {
        const due = new Date(t.dueDate);
        if (due < now) overdueCount++;
        else if (due <= nextWeek) {
          dueSoonCount++;
          tasksDueThisWeek.push(t);
        }
      }
      if (t.status === 'DONE' && t.updatedAt) {
        const updated = new Date(t.updatedAt);
        if (updated >= sevenDaysAgo) completedRecent.push(t);
      }
    }

    tasksDueThisWeek.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    const topDueThisWeek = tasksDueThisWeek.slice(0, 5).map(t => {
      const { _rev, _id, ...rest } = t;
      return { id: _id, ...rest };
    });

    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      days[d.toISOString().split('T')[0]] = 0;
    }
    completedRecent.forEach(t => {
      const dateStr = t.updatedAt.split('T')[0];
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
    const qUsers = await this.db.find({ selector: { type: 'USER' }, limit: 10000 });
    const qProjects = await this.db.find({ selector: { type: 'PROJECT' }, limit: 10000 });
    const qTasks = await this.db.find({ selector: { type: 'TASK' }, limit: 10000 });

    const totalUsers = qUsers.docs.length;
    const totalProjects = qProjects.docs.length;
    const totalTasks = qTasks.docs.length;
    
    const doneTasks = qTasks.docs.filter(t => t.status === 'DONE').length;
    const completionRate = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;

    const recentSignups = qUsers.docs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(u => ({ id: u._id, name: u.name, email: u.email, createdAt: u.createdAt }));

    return {
      totalUsers,
      totalProjects,
      totalTasks,
      completionRate,
      recentSignups
    };
  }

  async getManagerStats(userId: string) {
    // 1. Find projects where user is MANAGER
    const qMembers = await this.db.find({
      selector: { type: 'PROJECT_MEMBER', userId, role: 'MANAGER' },
      limit: 1000
    });
    const projectIds = qMembers.docs.map(m => m.projectId);

    if (projectIds.length === 0) {
      return {
        totalProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        activeMembers: 0,
        projectBreakdown: []
      };
    }

    // 2. Fetch projects
    const qProjects = await this.db.find({
      selector: { type: 'PROJECT', _id: { $in: projectIds } },
      limit: 1000
    });

    // 3. Fetch tasks for these projects
    const qTasks = await this.db.find({
      selector: { type: 'TASK', projectId: { $in: projectIds } },
      limit: 5000
    });

    // 4. Fetch all members for these projects to count unique members
    const qAllMembers = await this.db.find({
      selector: { type: 'PROJECT_MEMBER', projectId: { $in: projectIds } },
      limit: 5000
    });

    const totalProjects = qProjects.docs.length;
    const totalTasks = qTasks.docs.length;
    const completedTasks = qTasks.docs.filter(t => t.status === 'DONE').length;
    const uniqueMemberIds = new Set(qAllMembers.docs.map(m => m.userId));
    const activeMembers = uniqueMemberIds.size;

    const projectBreakdown = qProjects.docs.map(p => {
      const pTasks = qTasks.docs.filter(t => t.projectId === p._id);
      const done = pTasks.filter(t => t.status === 'DONE').length;
      const prog = pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0;
      
      return {
        id: p._id,
        name: p.name,
        taskCount: pTasks.length,
        completedCount: done,
        progress: prog
      };
    });

    return {
      totalProjects,
      totalTasks,
      completedTasks,
      activeMembers,
      projectBreakdown
    };
  }
}
