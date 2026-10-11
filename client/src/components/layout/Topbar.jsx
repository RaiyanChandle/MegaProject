import { useState, useRef, useEffect } from 'react';
import { Search, LogOut, Settings as SettingsIcon, ChevronDown, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSearch } from '../../context/SearchContext';
import { useNavigate, useLocation } from 'react-router-dom';

const ROLE_ACCENTS = {
  SUPER_ADMIN: '#5B3A73',
  DEPARTMENT_ADMIN: '#1F6F6F',
  TEACHER: '#C98A3E',
  STUDENT: '#2B4C7E',
  PARENT: '#5B6B8C',
  EXAM_STAFF: '#8C4A3A',
};

export default function Topbar({ title = 'Dashboard' }) {
  const { user, logout } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const roleAccent = ROLE_ACCENTS[user?.role] || '#16213E';

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear search on page navigation
  useEffect(() => {
    setSearchQuery('');
  }, [location.pathname, setSearchQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const goToSettings = () => {
    setIsDropdownOpen(false);
    const rolePath = user?.role === 'SUPER_ADMIN' ? 'superadmin' : 
                     user?.role === 'DEPARTMENT_ADMIN' ? 'deptadmin' : 
                     user?.role?.toLowerCase();
    navigate(`/${rolePath}/settings`);
  };

  return (
    <header className="h-16 bg-surface-0 border-b border-border flex items-center justify-between px-6 shrink-0 z-20 relative select-none shadow-xs">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-text-900 tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center gap-5">
        <form onSubmit={handleSearch} className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-500" />
          <input 
            type="text" 
            placeholder="Search across page..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 py-1.5 rounded-md border border-border text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 w-64 md:w-72 bg-surface-50 transition-colors placeholder:text-text-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-500 hover:text-text-900 p-0.5 rounded transition-colors"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </form>
        
        <div className="relative" ref={dropdownRef}>
          <button 
            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-surface-50 transition-colors focus:outline-none"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0"
              style={{ backgroundColor: roleAccent }}
            >
              {(user?.name || user?.instituteId || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-text-900 leading-tight">
                {user?.name || 'Administrator'}
              </p>
              <p className="text-xs font-mono text-text-500 leading-tight mt-0.5">
                {user?.instituteId || user?.role}
              </p>
            </div>
            <ChevronDown size={14} className="text-text-500 hidden md:block" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-surface-0 rounded-lg shadow-lg border border-border py-1.5 z-50">
              <div className="px-4 py-2 border-b border-border mb-1 block md:hidden">
                <p className="text-sm font-semibold text-text-900">{user?.name}</p>
                <p className="text-xs font-mono text-text-500">{user?.instituteId}</p>
              </div>
              
              <button 
                className="w-full text-left px-4 py-2 text-sm text-text-900 hover:bg-surface-50 flex items-center gap-2.5 transition-colors"
                onClick={goToSettings}
              >
                <SettingsIcon size={15} className="text-text-500" />
                Account Settings
              </button>
              
              <div className="my-1 border-t border-border" />

              <button 
                className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/10 flex items-center gap-2.5 transition-colors font-medium"
                onClick={handleLogout}
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
