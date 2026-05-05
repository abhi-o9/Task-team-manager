import { Clock, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export default function PendingApproval() {
  const { logout, user } = useAuthStore();

  return (
    <div className="min-h-screen flex items-center justify-center bg-base p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-6">
          <Clock size={40} className="text-warning" />
        </div>
        <h1 className="text-3xl font-display font-bold text-white mb-3">
          Awaiting Approval
        </h1>
        <p className="text-textMuted mb-2">
          Hi <span className="text-white font-medium">{user?.name}</span>, your account has been registered successfully.
        </p>
        <p className="text-textMuted mb-8">
          An administrator or manager will review and approve your account soon. You'll be able to log in once approved.
        </p>

        <div className="bg-surface border border-border rounded-xl p-4 mb-8 text-left space-y-2">
          <p className="text-xs text-textMuted font-medium uppercase tracking-wider">What happens next?</p>
          <ul className="space-y-2 text-sm text-textMain">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">1.</span>
              An admin or manager reviews your registration.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">2.</span>
              They assign you a role: <strong>Manager</strong> or <strong>Member</strong>.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">3.</span>
              You can then log in and start collaborating!
            </li>
          </ul>
        </div>

        <button
          onClick={() => logout()}
          className="flex items-center gap-2 mx-auto text-sm text-textMuted hover:text-danger transition-colors"
        >
          <LogOut size={16} />
          Sign out and go back to login
        </button>
      </div>
    </div>
  );
}
