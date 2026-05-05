import { useEffect, useState } from 'react';
import { api } from '../api/axios';
import { CheckCircle, Clock, User, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface PendingUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function ApprovalQueue() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  const fetchPending = async () => {
    try {
      const res = await api.get('/users/pending');
      setPendingUsers(res.data.data);
    } catch {
      toast.error('Failed to load pending users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (userId: string, role: 'MANAGER' | 'MEMBER') => {
    setApproving(userId);
    try {
      await api.post(`/users/${userId}/approve`, { role });
      toast.success(`User approved as ${role}`);
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Approval failed');
    } finally {
      setApproving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center text-warning">
          <ShieldCheck size={22} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Approval Queue</h1>
          <p className="text-textMuted text-sm">Review and approve new user registrations</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-surface rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      ) : pendingUsers.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle size={32} className="text-success" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">All caught up!</h2>
          <p className="text-textMuted">No users are waiting for approval right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingUsers.map(user => (
            <div
              key={user.id}
              className="bg-surface border border-border rounded-xl p-5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-white">{user.name}</p>
                  <p className="text-sm text-textMuted">{user.email}</p>
                </div>
                <span className="flex items-center gap-1 px-2 py-1 bg-warning/10 text-warning text-xs rounded-full font-medium">
                  <Clock size={11} /> Pending
                </span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleApprove(user.id, 'MANAGER')}
                  disabled={approving === user.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/10 hover:bg-secondary/20 text-secondary text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <ShieldCheck size={15} />
                  Approve as Manager
                </button>
                <button
                  onClick={() => handleApprove(user.id, 'MEMBER')}
                  disabled={approving === user.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <User size={15} />
                  Approve as Member
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
