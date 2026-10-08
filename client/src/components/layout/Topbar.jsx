import { useState, useRef, useEffect } from 'react';
import { Search, UserCircle, LogOut, Settings as SettingsIcon, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from '../ui/Toast';

export default function Topbar({ title = 'Dashboard' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      toast.info(`Search for "${searchQuery}" is not implemented yet.`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const goToSettings = () => {
    setIsDropdownOpen(false);
    // Assuming role-based routing for settings
    const rolePath = user?.role === 'SUPER_ADMIN' ? 'superadmin' : 
                     user?.role === 'DEPARTMENT_ADMIN' ? 'deptadmin' : 
                     user?.role?.toLowerCase();
    navigate(`/${rolePath}/settings`);
  };

  return (
    <header className="h-16 bg-surface-0 border-b border-border flex items-center justify-between px-6 shrink-0 z-10 relative">
      <div className="flex items-center">
        <h2 className="text-xl font-semibold text-text-900">{title}</h2>
      </div>

      <div className="flex items-center gap-6">
        <form onSubmit={handleSearch} className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-500" />
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-1.5 rounded-md border border-border text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 w-64 bg-surface-50"
          />
        </form>
        
        <div className="relative" ref={dropdownRef}>
          <button 
            className="flex items-center gap-2 text-text-900 hover:text-ink-700 focus:outline-none"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <UserCircle size={28} className="text-text-500" />
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold leading-tight">{user?.name || 'User'}</p>
              <p className="text-xs text-text-500 leading-tight">{user?.instituteId}</p>
            </div>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-surface-0 rounded-md shadow-lg border border-border py-1 z-50">
              <div className="px-4 py-2 border-b border-border mb-1 block md:hidden">
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-xs text-text-500">{user?.instituteId}</p>
              </div>
              
              <button 
                className="w-full text-left px-4 py-2 text-sm text-text-700 hover:bg-surface-50 flex items-center gap-2"
                onClick={goToSettings}
              >
                <SettingsIcon size={16} />
                Settings
              </button>
              
              <button 
                className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-surface-50 flex items-center gap-2 mt-1 border-t border-border pt-2"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
