import { Search, UserCircle } from 'lucide-react';

export default function Topbar({ title = 'Dashboard' }) {
  return (
    <header className="h-16 bg-surface-0 border-b border-border flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center">
        <h2 className="text-xl font-semibold text-text-900">{title}</h2>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-500" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="pl-10 pr-4 py-1.5 rounded-md border border-border text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 w-64 bg-surface-50"
          />
        </div>
        
        <button className="flex items-center gap-2 text-text-900 hover:text-ink-700">
          <UserCircle size={24} />
        </button>
      </div>
    </header>
  );
}
