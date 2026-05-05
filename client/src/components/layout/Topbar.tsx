import { Search, Bell } from 'lucide-react';

export default function Topbar() {
  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
          <input 
            type="text" 
            placeholder="Search tasks, projects... (Cmd+K)" 
            className="w-full bg-base border border-border rounded-md py-2 pl-10 pr-4 text-sm text-textMain placeholder-textDisabled focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <button className="relative p-2 text-textMuted hover:text-primary transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-warning rounded-full border border-surface"></span>
        </button>
      </div>
    </header>
  );
}
