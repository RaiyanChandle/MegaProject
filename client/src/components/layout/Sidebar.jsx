import { Link, useLocation } from 'react-router-dom';
import { navigationConfig } from '../../config/navigation.js';
import { LogOut, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

// Institutional role colors defined in design.md
const ROLE_THEMES = {
  SUPER_ADMIN: { label: 'Super Admin', color: '#5B3A73', bgClass: 'bg-[#5B3A73]' },
  DEPARTMENT_ADMIN: { label: 'Dept Admin', color: '#1F6F6F', bgClass: 'bg-[#1F6F6F]' },
  TEACHER: { label: 'Faculty', color: '#C98A3E', bgClass: 'bg-[#C98A3E]' },
  STUDENT: { label: 'Student', color: '#2B4C7E', bgClass: 'bg-[#2B4C7E]' },
  PARENT: { label: 'Parent', color: '#5B6B8C', bgClass: 'bg-[#5B6B8C]' },
  EXAM_STAFF: { label: 'Exam Staff', color: '#8C4A3A', bgClass: 'bg-[#8C4A3A]' },
};

// Root routes where exact matching is strictly required to avoid multiple highlights
const ROOT_DASHBOARD_ROUTES = [
  '/superadmin',
  '/deptadmin',
  '/teacher',
  '/student',
  '/parent',
  '/examstaff'
];

export default function Sidebar({ role = 'SUPER_ADMIN', isMobileOpen = false, onMobileClose }) {
  const location = useLocation();
  const navItems = navigationConfig[role] || [];
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const getTranslatedName = (name) => {
    if (role !== 'PARENT') return name;
    switch (name) {
      case 'Dashboard': return t('portal');
      case 'Announcements': return t('announcements');
      case 'Attendance': return t('attendance');
      case 'Marks & Results': return t('marks');
      case 'Assignments': return t('assignments');
      case 'Children': return t('myChildren');
      default: return name;
    }
  };

  const roleMeta = ROLE_THEMES[role] || {
    label: role.replace('_', ' '),
    color: '#2B3A5C',
    bgClass: 'bg-ink-700'
  };

  const isItemActive = (href) => {
    if (ROOT_DASHBOARD_ROUTES.includes(href)) {
      return location.pathname === href || location.pathname === `${href}/`;
    }
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`w-64 bg-ink-900 text-white flex flex-col h-full shrink-0 border-r border-ink-700/60 select-none shadow-xl z-50 transition-transform duration-200 md:translate-x-0 ${
        isMobileOpen ? 'fixed inset-y-0 left-0 translate-x-0' : 'fixed inset-y-0 left-0 -translate-x-full md:relative md:translate-x-0'
      }`}>
          {/* Brand Header */}
          <div className="h-16 flex items-center px-5 border-b border-ink-700/60 bg-ink-900/60 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center shadow-xs shrink-0">
                <img 
                  src="/kitcoek.svg" 
                  alt="KITCOEK" 
                  className="w-full h-full object-contain" 
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-base font-bold tracking-wider text-white">NEXUS</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-ink-700 text-brass-500 font-semibold tracking-wider border border-brass-500/20">
                    ERP
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono tracking-tight mt-1">
                  ACADEMIC SUITE
                </span>
              </div>
            </div>

            {/* Mobile Close Button */}
            {isMobileOpen && (
              <button
                onClick={onMobileClose}
                className="md:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-ink-700 transition-colors"
                title="Close navigation"
                aria-label="Close navigation menu"
              >
                <span className="text-xl leading-none">&times;</span>
              </button>
            )}
          </div>

          {/* Role Pill Banner */}
          <div className="px-5 py-2.5 border-b border-ink-700/40 bg-ink-900/40 flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Portal Scope
            </span>
            <span 
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full text-white shadow-xs inline-flex items-center gap-1"
              style={{ backgroundColor: roleMeta.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
              {roleMeta.label}
            </span>
          </div>

          {/* Navigation List */}
          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => {
              const active = isItemActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => {
                    if (onMobileClose) onMobileClose();
                  }}
                  className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium transition-all duration-150 outline-none focus:outline-none focus-visible:ring-1 focus-visible:ring-brass-500/50 ${
                    active
                      ? 'bg-ink-700 text-white font-semibold shadow-sm border-l-4 border-brass-500 pl-2.5'
                      : 'text-slate-300 hover:text-white hover:bg-ink-700/50 border-l-4 border-transparent pl-2.5'
                  }`}
                >
                  <Icon 
                    size={18} 
                    className={`transition-colors shrink-0 ${
                      active 
                        ? 'text-brass-500' 
                        : 'text-slate-400 group-hover:text-slate-200'
                    }`} 
                  />
                  <span className="truncate">{getTranslatedName(item.name)}</span>
                </Link>
              );
            })}
          </nav>

      {/* User Footer Profile & Sign Out */}
      <div className="p-3 border-t border-ink-700/60 bg-ink-900/80">
        <div className="flex items-center justify-between p-2 rounded-md bg-ink-700/40 border border-ink-700/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs"
              style={{ backgroundColor: roleMeta.color }}
            >
              {(user?.name || user?.instituteId || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-100 truncate leading-tight">
                {user?.name || 'Authorized User'}
              </p>
              <p className="text-[11px] font-mono text-slate-400 truncate leading-tight mt-0.5">
                {user?.instituteId || roleMeta.label}
              </p>
            </div>
          </div>
          <button 
            onClick={logout}
            title="Sign Out"
            className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/15 transition-colors shrink-0 outline-none focus:outline-none"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
