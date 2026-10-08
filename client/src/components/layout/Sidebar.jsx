import { Link, useLocation } from 'react-router-dom';
import { navigationConfig } from '../../config/navigation.js';
import { LogOut } from 'lucide-react';

export default function Sidebar({ role = 'SUPER_ADMIN' }) {
  const location = useLocation();
  const navItems = navigationConfig[role] || [];

  return (
    <div className="w-64 bg-ink-900 text-white flex flex-col h-full shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-ink-700">
        <h1 className="text-xl font-semibold tracking-wider">NEXUS</h1>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-ink-700 text-white' 
                  : 'text-text-500 hover:bg-ink-700 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-ink-700">
        <button className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-text-500 hover:bg-ink-700 hover:text-white transition-colors">
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
