import { useState, useRef, useEffect } from 'react';
import { Search, LogOut, Settings as SettingsIcon, ChevronDown, X, Menu, Languages } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSearch } from '../../context/SearchContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigate, useLocation } from 'react-router-dom';

const ROLE_ACCENTS = {
  SUPER_ADMIN: '#5B3A73',
  DEPARTMENT_ADMIN: '#1F6F6F',
  TEACHER: '#C98A3E',
  STUDENT: '#2B4C7E',
  PARENT: '#5B6B8C',
  EXAM_STAFF: '#8C4A3A',
};

export default function Topbar({ title = 'Dashboard', onToggleMobileMenu }) {
  const { user, logout } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const { currentLanguage, changeLanguage, languages } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const dropdownRef = useRef(null);
  const langRef = useRef(null);
  const mobileInputRef = useRef(null);

  const roleAccent = ROLE_ACCENTS[user?.role] || '#16213E';

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target)) {
        setIsLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear search on page navigation and close mobile search
  useEffect(() => {
    setSearchQuery('');
    setIsMobileSearchOpen(false);
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
    <header className="h-16 bg-surface-0 border-b border-border flex items-center justify-between px-3 sm:px-6 shrink-0 z-20 relative select-none shadow-xs">
      {/* Mobile Active Search Bar: Takes full width so nothing is hidden or cramped */}
      {isMobileSearchOpen ? (
        <div className="flex md:hidden items-center gap-2 w-full">
          <form onSubmit={handleSearch} className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-500" />
            <input 
              ref={mobileInputRef}
              type="text" 
              placeholder="Search across page..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-border text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 bg-surface-50 transition-colors placeholder:text-text-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-500 hover:text-text-900 p-1 rounded transition-colors"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </form>
          <button
            type="button"
            onClick={() => {
              setIsMobileSearchOpen(false);
              setSearchQuery('');
            }}
            className="px-2.5 py-2 rounded-lg text-xs font-semibold text-text-600 hover:text-text-900 hover:bg-surface-50 shrink-0"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          {/* Left Title Cluster */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 max-w-[65%] sm:max-w-none">
            {onToggleMobileMenu && (
              <button
                type="button"
                onClick={onToggleMobileMenu}
                className="md:hidden p-2 -ml-1 rounded-lg text-text-500 hover:text-text-900 hover:bg-surface-50 focus:outline-none shrink-0"
                title="Toggle Navigation Menu"
              >
                <Menu size={20} />
              </button>
            )}
            <h2 className="text-base sm:text-xl font-semibold text-text-900 tracking-tight truncate">{title}</h2>
          </div>

          {/* Right Controls Cluster */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Mobile Search Toggle Icon */}
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(true)}
              className="md:hidden p-2 rounded-lg text-text-500 hover:text-text-900 hover:bg-surface-50 transition-colors relative"
              title="Open search"
            >
              <Search size={18} />
              {searchQuery && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-ink-900 ring-2 ring-surface-0" />
              )}
            </button>

            {/* Desktop Full Search Bar */}
            <form onSubmit={handleSearch} className="relative hidden md:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-500" />
              <input 
                type="text" 
                placeholder="Search across page..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 py-1.5 rounded-md border border-border text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 w-56 lg:w-72 bg-surface-50 transition-colors placeholder:text-text-500"
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

            {/* Language Selector (Indian Languages for Parents) */}
            {user?.role === 'PARENT' && (
              <div className="relative" ref={langRef}>
                <button
                  type="button"
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className="h-9 px-2.5 sm:px-3 rounded-lg border border-border bg-surface-50 hover:bg-surface-100 text-text-900 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                  title="Change Language"
                >
                  <Languages size={15} className="text-ink-900" />
                  <span className="font-medium">
                    {languages.find(l => l.code === currentLanguage)?.native || 'English'}
                  </span>
                  <ChevronDown size={13} className="text-text-500" />
                </button>

                {isLangOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-surface-0 rounded-xl shadow-xl border border-border py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-y-auto custom-scrollbar">
                    <div className="px-3 py-1.5 border-b border-border text-[11px] font-bold text-text-400 uppercase tracking-wider">
                      Select Language
                    </div>
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          changeLanguage(lang.code);
                          setIsLangOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                          currentLanguage === lang.code
                            ? 'bg-ink-900 text-white font-bold'
                            : 'text-text-900 hover:bg-surface-50 font-medium'
                        }`}
                      >
                        <span>{lang.native}</span>
                        <span className={`text-[10px] font-mono ${currentLanguage === lang.code ? 'text-brass-400' : 'text-text-400'}`}>
                          {lang.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* User Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button 
                className="flex items-center gap-2 p-1 sm:p-1.5 rounded-lg hover:bg-surface-50 transition-colors focus:outline-none"
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
      </>
      )}
    </header>
  );
}
