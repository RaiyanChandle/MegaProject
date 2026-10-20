import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import EmptyState from '../../components/ui/EmptyState';
import Toast from '../../components/ui/Toast';
import AnnouncementCard from '../../components/announcements/AnnouncementCard';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Megaphone, 
  Search, 
  Filter, 
  Users, 
  Globe, 
  Building2, 
  GraduationCap,
  Sparkles,
  Info
} from 'lucide-react';

const CATEGORY_TABS = [
  { value: 'ALL', key: 'allNotices' },
  { value: 'PARENT', key: 'forParents' },
  { value: 'DEPARTMENT', key: 'department' },
  { value: 'CLASS', key: 'class' },
  { value: 'DIVISION', key: 'division' },
  { value: 'GLOBAL', key: 'collegeWide' },
];

export default function ParentAnnouncements() {
  const { t, currentLanguage, changeLanguage, languages } = useLanguage();

  const [announcements, setAnnouncements] = useState([]);
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [toast, setToast] = useState(null);

  // 1. Fetch linked children on mount
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        setLoadingChildren(true);
        const data = await apiClient.get('/parents/my-children');
        const list = Array.isArray(data) ? data : [];
        setChildren(list);
      } catch (err) {
        console.error('Failed to load linked children:', err);
      } finally {
        setLoadingChildren(false);
      }
    };
    fetchChildren();
  }, []);

  // 2. Fetch announcements when filter, child selection, or search changes
  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== 'ALL') params.append('type', typeFilter);
      if (selectedChildId !== 'ALL') params.append('studentId', selectedChildId);
      if (search.trim()) params.append('search', search.trim());

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const data = await apiClient.get(`/announcements${queryString}`);
      setAnnouncements(data || []);
    } catch (err) {
      console.error('Failed to load announcements for parent:', err);
      setToast({ type: 'danger', message: 'Failed to load announcements.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [typeFilter, selectedChildId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAnnouncements();
  };

  // Metrics
  const totalCount = announcements.length;
  const parentNoticeCount = announcements.filter((a) => a.type === 'PARENT').length;
  const deptCount = announcements.filter((a) => a.type === 'DEPARTMENT').length;
  const classDivCount = announcements.filter((a) => a.type === 'CLASS' || a.type === 'DIVISION').length;

  const activeChild = children.find(c => c.id === selectedChildId);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-900 tracking-tight flex items-center gap-2.5">
            <Megaphone className="text-brass-500" size={24} />
            {t('announcementsTitle')}
          </h1>
          <p className="text-sm text-text-500 mt-1">
            {t('announcementsSubtitle')}
          </p>
        </div>

        {/* Quick In-Page Language Selector & Feed Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-surface-50 text-xs shadow-2xs">
            <span className="text-text-400 font-semibold hidden md:inline">{t('selectLanguage')}:</span>
            <select
              id="parent-announcements-lang-select"
              value={currentLanguage}
              onChange={(e) => changeLanguage(e.target.value)}
              className="bg-transparent text-text-900 font-bold focus:outline-none cursor-pointer"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code} className="bg-surface-0 text-text-900">
                  {l.native} ({l.name})
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            {t('liveAcademicFeed')}
          </div>
        </div>
      </div>

      {/* Child Switcher (If multiple children exist) */}
      {children.length > 0 && (
        <div className="p-3.5 rounded-lg border border-border bg-surface-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-900 uppercase tracking-wider flex items-center gap-1.5">
              <Users size={14} className="text-brass-500" />
              {t('viewingNoticesFor')}
            </span>
            {activeChild && (
              <span className="text-xs text-text-500 font-mono">
                {activeChild.department?.name || t('department')} • {activeChild.division ? `${t('division')} ${activeChild.division.name}` : 'Batch ' + activeChild.batchYear}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => setSelectedChildId('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                selectedChildId === 'ALL'
                  ? 'bg-ink-900 text-white border-ink-900'
                  : 'bg-surface-50 text-text-900 border-border hover:bg-surface-100'
              }`}
            >
              {t('allLinkedChildren')} ({children.length})
            </button>

            {children.map((child) => {
              const selected = selectedChildId === child.id;
              return (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildId(child.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border flex items-center gap-1.5 ${
                    selected
                      ? 'bg-ink-900 text-white border-ink-900'
                      : 'bg-surface-50 text-text-900 border-border hover:bg-surface-100'
                  }`}
                >
                  <GraduationCap size={13} className={selected ? 'text-brass-300' : 'text-text-500'} />
                  <span>{child.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded ${selected ? 'bg-white/20' : 'bg-surface-200 text-text-600'}`}>
                    {child.department?.code || t('student')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-md border border-border bg-surface-0 p-3.5">
          <div className="flex items-center justify-between text-xs text-text-500">
            <span>{t('totalCirculars')}</span>
            <Megaphone size={14} className="text-text-400" />
          </div>
          <p className="text-xl font-bold font-mono text-text-900 mt-1.5">{totalCount}</p>
        </div>

        <div className="rounded-md border border-border bg-surface-0 p-3.5">
          <div className="flex items-center justify-between text-xs text-[#5B3A73]">
            <span>{t('parentNotices')}</span>
            <Sparkles size={14} className="text-[#5B3A73]" />
          </div>
          <p className="text-xl font-bold font-mono text-text-900 mt-1.5">{parentNoticeCount}</p>
        </div>

        <div className="rounded-md border border-border bg-surface-0 p-3.5">
          <div className="flex items-center justify-between text-xs text-[#1F6F6F]">
            <span>{t('departmentNotices')}</span>
            <Building2 size={14} className="text-[#1F6F6F]" />
          </div>
          <p className="text-xl font-bold font-mono text-text-900 mt-1.5">{deptCount}</p>
        </div>

        <div className="rounded-md border border-border bg-surface-0 p-3.5">
          <div className="flex items-center justify-between text-xs text-info">
            <span>{t('classDivisionNotices')}</span>
            <Users size={14} className="text-info" />
          </div>
          <p className="text-xl font-bold font-mono text-text-900 mt-1.5">{classDivCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-0 p-3 rounded-md border border-border">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchCircularsPlaceholder')}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-md border border-border bg-surface-0 focus:border-ink-700 outline-none text-text-900 placeholder:text-text-400"
          />
        </form>

        {/* Filter Dropdown Selector (Always visible on all screen sizes) */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border bg-surface-50 text-xs shadow-2xs">
            <Filter size={14} className="text-brass-500 shrink-0" />
            <span className="text-text-600 font-semibold shrink-0">{t('filterLabel')}</span>
            <select
              id="announcements-filter-dropdown"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-text-900 font-semibold focus:outline-none cursor-pointer pr-1"
            >
              {CATEGORY_TABS.map((tab) => (
                <option key={tab.value} value={tab.value} className="bg-surface-0 text-text-900">
                  {t(tab.key)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Feed List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-text-500 text-sm animate-pulse rounded-md border border-border bg-surface-0">
            {t('loadingAnnouncements')}
          </div>
        ) : announcements.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title={t('noAnnouncementsTitle')}
            description={
              search || typeFilter !== 'ALL' || selectedChildId !== 'ALL'
                ? t('filterAdjustNotice')
                : t('noAnnouncementsDesc')
            }
          />
        ) : (
          announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
            />
          ))
        )}
      </div>
    </div>
  );
}
