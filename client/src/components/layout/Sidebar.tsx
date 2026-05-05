import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, ShieldCheck, Users, LogOut, Menu } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../stores/uiStore';
import clsx from 'clsx';

export default function Sidebar() {
  const { logout, user } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUiStore();

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', show: true },
    { to: '/projects', icon: FolderKanban, label: 'Projects', show: true },
    { to: '/approvals', icon: ShieldCheck, label: 'Approvals', show: isAdminOrManager },
    { to: '/users', icon: Users, label: 'Users', show: user?.role === 'ADMIN' },
  ].filter(l => l.show);

  return (
    <div className={clsx(
      "bg-surface border-r border-border transition-all duration-300 flex flex-col",
      sidebarOpen ? "w-64" : "w-20"
    )}>
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {sidebarOpen && <span className="font-display font-bold text-xl text-primary tracking-wide">TaskFlow</span>}
        <button onClick={toggleSidebar} className="p-2 rounded-md hover:bg-elevated text-textMuted hover:text-primary transition-colors">
          <Menu size={20} />
        </button>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => clsx(
              "flex items-center px-3 py-2.5 rounded-md transition-colors group",
              isActive 
                ? "bg-primary/10 text-primary font-medium" 
                : "text-textMuted hover:bg-elevated hover:text-textMain"
            )}
          >
            <link.icon size={20} className={clsx("flex-shrink-0", !sidebarOpen && "mx-auto")} />
            {sidebarOpen && <span className="ml-3">{link.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        {sidebarOpen ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white font-medium flex-shrink-0">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="truncate text-sm">
                <p className="font-medium text-textMain truncate">{user?.name}</p>
                <p className="text-xs text-textMuted truncate capitalize">{user?.role?.toLowerCase()}</p>
              </div>
            </div>
            <button onClick={() => logout()} className="text-textMuted hover:text-danger p-1">
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button onClick={() => logout()} className="w-full flex justify-center text-textMuted hover:text-danger">
            <LogOut size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
