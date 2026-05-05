import { useEffect, useState } from 'react';
import { api } from '../api/axios';
import { Users as UsersIcon, Mail, Shield, CheckCircle, XCircle, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'MEMBER';
  status: 'PENDING' | 'APPROVED';
  createdAt: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'ALL' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-danger/10 text-danger border-danger/20';
      case 'MANAGER': return 'bg-secondary/10 text-secondary border-secondary/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary shadow-lg shadow-secondary/5">
          <UsersIcon size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-white">User Management</h1>
          <p className="text-textMuted text-sm mt-1">Manage and monitor all platform members</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-surface/50 p-4 rounded-xl border border-border">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            className="w-full bg-base border border-border rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
          <select 
            className="w-full bg-base border border-border rounded-lg pl-10 pr-4 py-2 text-white appearance-none focus:outline-none focus:border-primary transition-colors"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="ALL">All Roles</option>
            <option value="MANAGER">Managers</option>
            <option value="MEMBER">Members</option>
          </select>
        </div>
      </div>

      <div className="bg-surface/50 border border-border rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-border">
                <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-textMuted uppercase tracking-wider">Joined At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-6"><div className="h-10 w-40 bg-white/5 rounded-lg" /></td>
                    <td className="px-6 py-6"><div className="h-6 w-20 bg-white/5 rounded-full" /></td>
                    <td className="px-6 py-6"><div className="h-6 w-20 bg-white/5 rounded-full" /></td>
                    <td className="px-6 py-6"><div className="h-6 w-32 bg-white/5 rounded-lg" /></td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-textMuted">
                    No users found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-inner">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-white group-hover:text-primary transition-colors">{user.name}</p>
                          <div className="flex items-center gap-1 text-xs text-textMuted mt-0.5">
                            <Mail size={12} />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.status === 'APPROVED' ? (
                        <span className="flex items-center gap-1 text-success text-sm font-medium">
                          <CheckCircle size={14} /> Approved
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-warning text-sm font-medium">
                          <Shield size={14} /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-textMuted font-mono">
                      {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
