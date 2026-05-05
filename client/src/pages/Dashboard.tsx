import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../api/axios';
import { 
  CheckCircle2, Clock, ListTodo, AlertCircle, 
  Users, Briefcase, Activity, TrendingUp,
  UserPlus, ArrowRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid
} from 'recharts';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [summaryData, setSummaryData] = useState<any>(null);
  const [adminData, setAdminData] = useState<any>(null);
  const [managerData, setManagerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
        const [summaryRes, adminRes, managerRes] = await Promise.all([
          api.get('/dashboard/summary'),
          user?.role === 'ADMIN' ? api.get('/dashboard/admin') : Promise.resolve({ data: { data: null } }),
          isManager ? api.get('/dashboard/manager') : Promise.resolve({ data: { data: null } })
        ]);
        
        setSummaryData(summaryRes.data.data);
        if (adminRes.data.data) {
          setAdminData(adminRes.data.data);
        }
        if (managerRes.data.data) {
          setManagerData(managerRes.data.data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [user?.role]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-textMuted font-medium animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const personalStats = [
    { label: 'My Tasks', value: summaryData?.totalTasks || 0, icon: ListTodo, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'In Progress', value: summaryData?.byStatus?.IN_PROGRESS || 0, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Completed', value: summaryData?.byStatus?.DONE || 0, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Overdue', value: summaryData?.overdueCount || 0, icon: AlertCircle, color: 'text-danger', bg: 'bg-danger/10' },
  ];

  const adminStats = [
    { label: 'Total Users', value: adminData?.totalUsers || 0, icon: Users, color: 'text-secondary', bg: 'bg-secondary/10' },
    { label: 'Active Projects', value: adminData?.totalProjects || 0, icon: Briefcase, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Global Tasks', value: adminData?.totalTasks || 0, icon: Activity, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Completion Rate', value: `${Math.round(adminData?.completionRate || 0)}%`, icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
  ];

  const chartData = summaryData?.completedLast7Days?.map((item: any) => ({
    name: format(new Date(item.date), 'MMM dd'),
    completed: item.count
  })) || [];

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-white tracking-tight">
            {getGreeting()}, <span className="text-primary">{user?.name}</span>
          </h1>
          <p className="text-textMuted mt-2 flex items-center gap-2">
            <Clock size={16} /> {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </p>
        </div>
        
        {user?.role === 'ADMIN' && (
          <div className="flex gap-3">
            <Link 
              to="/approvals" 
              className="flex items-center gap-2 px-4 py-2 bg-warning/10 text-warning rounded-lg border border-warning/20 hover:bg-warning/20 transition-all font-medium text-sm"
            >
              <UserPlus size={18} />
              Review Approvals
            </Link>
          </div>
        )}
      </div>

      {/* Admin Stats Section */}
      {user?.role === 'ADMIN' && adminData && (
        <section className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="text-secondary" size={20} />
              Platform Overview
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {adminStats.map((stat, idx) => (
              <div key={idx} className="bg-surface/50 backdrop-blur-sm rounded-2xl p-6 border border-border flex items-center space-x-4 hover:border-primary/30 transition-all group">
                <div className={`p-4 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon size={24} />
                </div>
                <div>
                  <p className="text-textMuted text-sm font-medium">{stat.label}</p>
                  <h3 className="text-3xl font-bold text-white mt-1">{stat.value}</h3>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Manager Stats Section */}
      {(user?.role === 'MANAGER' || user?.role === 'ADMIN') && managerData && managerData.totalProjects > 0 && (
        <section className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Briefcase className="text-primary" size={20} />
              Project Portfolio
            </h2>
            <Link to="/projects" className="text-sm text-primary hover:underline font-medium">Manage all</Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="bg-surface/30 p-5 rounded-2xl border border-border/50">
              <p className="text-textMuted text-xs font-bold uppercase tracking-widest mb-1">Total Managed</p>
              <h4 className="text-2xl font-bold text-white">{managerData.totalProjects} Projects</h4>
            </div>
            <div className="bg-surface/30 p-5 rounded-2xl border border-border/50">
              <p className="text-textMuted text-xs font-bold uppercase tracking-widest mb-1">Global Backlog</p>
              <h4 className="text-2xl font-bold text-white">{managerData.totalTasks} Tasks</h4>
            </div>
            <div className="bg-surface/30 p-5 rounded-2xl border border-border/50">
              <p className="text-textMuted text-xs font-bold uppercase tracking-widest mb-1">Project Members</p>
              <h4 className="text-2xl font-bold text-white">{managerData.activeMembers} People</h4>
            </div>
            <div className="bg-surface/30 p-5 rounded-2xl border border-border/50">
              <p className="text-textMuted text-xs font-bold uppercase tracking-widest mb-1">Overall Health</p>
              <h4 className="text-2xl font-bold text-white">
                {managerData.totalTasks > 0 ? Math.round((managerData.completedTasks / managerData.totalTasks) * 100) : 0}% Done
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {managerData.projectBreakdown.slice(0, 4).map((proj: any) => (
              <Link 
                key={proj.id} 
                to={`/projects/${proj.id}`}
                className="bg-surface/50 border border-border rounded-2xl p-6 hover:border-primary/50 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{proj.name}</h4>
                  <span className="text-xs font-mono text-textMuted">{proj.completedCount}/{proj.taskCount} Tasks</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-textMuted">Progress</span>
                    <span className="text-primary font-bold">{proj.progress}%</span>
                  </div>
                  <div className="h-2 bg-base rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-1000 ease-out" 
                      style={{ width: `${proj.progress}%` }} 
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Personal Stats Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="text-primary" size={20} />
          Your Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {personalStats.map((stat, idx) => (
            <div key={idx} className="bg-surface/50 backdrop-blur-sm rounded-2xl p-6 border border-border flex items-center space-x-4 hover:border-primary/30 transition-all group">
              <div className={`p-4 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-textMuted text-sm font-medium">{stat.label}</p>
                <h3 className="text-3xl font-bold text-white mt-1">{stat.value}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Chart */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-surface/50 backdrop-blur-sm rounded-2xl p-6 border border-border h-full">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-white">Task Completion Velocity</h3>
              <div className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider">
                Personal Progress
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F8EF7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4F8EF7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#8B95A9" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#8B95A9" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    cursor={{ stroke: '#4F8EF7', strokeWidth: 2 }} 
                    contentStyle={{ backgroundColor: '#1E2330', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="completed" stroke="#4F8EF7" strokeWidth={3} fillOpacity={1} fill="url(#colorCompleted)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Due Soon / Admin Activity */}
        <div className="space-y-8">
          {/* Admin: Recent Signups */}
          {user?.role === 'ADMIN' && adminData?.recentSignups?.length > 0 && (
            <div className="bg-surface/50 backdrop-blur-sm rounded-2xl p-6 border border-border flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Recent Signups</h3>
                <span className="text-xs text-textMuted">Latest 5</span>
              </div>
              <div className="space-y-4">
                {adminData.recentSignups.map((signup: any) => (
                  <div key={signup.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold text-sm">
                      {signup.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{signup.name}</p>
                      <p className="text-xs text-textMuted truncate">{signup.email}</p>
                    </div>
                    <div className="text-[10px] text-textMuted text-right">
                      {format(new Date(signup.createdAt), 'MMM dd')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Personal: My Tasks */}
          <div className="bg-surface/50 backdrop-blur-sm rounded-2xl p-6 border border-border flex flex-col flex-1">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">My Tasks</h3>
              <span className="text-sm text-primary font-medium">{summaryData?.tasksDueThisWeek?.length || 0} due soon</span>
            </div>
            
            <div className="space-y-3 max-h-[400px] overflow-auto pr-2 custom-scrollbar">
              {summaryData?.tasksDueThisWeek?.length > 0 ? (
                summaryData.tasksDueThisWeek.map((task: any) => {
                  const isOverdue = new Date(task.dueDate) < new Date();
                  return (
                    <Link 
                      key={task.id} 
                      to={`/projects/${task.projectId}?taskId=${task.id}`}
                      className={`block p-4 rounded-xl border bg-base/50 hover:bg-elevated transition-all transform hover:-translate-y-1 ${isOverdue ? 'border-l-4 border-l-danger border-y-border border-r-border' : 'border-border'}`}
                    >
                      <h4 className="text-sm font-semibold text-white truncate mb-2">{task.title}</h4>
                      <div className="flex items-center justify-between text-xs">
                        <span className={`flex items-center gap-1 ${isOverdue ? 'text-danger font-medium' : 'text-textMuted'}`}>
                          <Clock size={12} />
                          {task.dueDate ? format(new Date(task.dueDate), 'MMM dd') : 'No date'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          task.priority === 'URGENT' ? 'bg-danger/10 text-danger' : 
                          task.priority === 'HIGH' ? 'bg-warning/10 text-warning' : 
                          task.priority === 'MEDIUM' ? 'bg-primary/10 text-primary' : 'bg-surface text-textMuted'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-textMuted text-center">
                  <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle2 size={24} className="text-success/50" />
                  </div>
                  <p className="text-sm">No urgent tasks!</p>
                </div>
              )}
            </div>
            
            <Link to="/projects" className="mt-6 flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 font-medium group">
              View all projects
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

