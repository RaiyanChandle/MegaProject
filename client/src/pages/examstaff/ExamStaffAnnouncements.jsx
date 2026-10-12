import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import EmptyState from '../../components/ui/EmptyState';
import Toast from '../../components/ui/Toast';
import AnnouncementCard from '../../components/announcements/AnnouncementCard';
import { 
  Megaphone, 
  Search, 
  Filter, 
  Globe, 
  Building2, 
  Users, 
  FileCheck 
} from 'lucide-react';

export default function ExamStaffAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [toast, setToast] = useState(null);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== 'ALL') params.append('type', typeFilter);
      if (search.trim()) params.append('search', search.trim());
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const data = await apiClient.get(`/announcements${queryString}`);
      setAnnouncements(data || []);
    } catch (err) {
      console.error('Failed to load announcements:', err);
      setToast({ type: 'danger', message: 'Failed to load announcements.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [typeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAnnouncements();
  };

  // Metrics
  const totalCount = announcements.length;
  const globalCount = announcements.filter((a) => !a.targetDepartmentId).length;
  const deptCount = announcements.filter((a) => a.targetDepartmentId && !a.targetClassId).length;
  const classCount = announcements.filter((a) => a.targetClassId).length;

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
            <Megaphone className="text-[#8C4A3A]" size={24} />
            Institutional & Academic Announcements
          </h1>
          <p className="text-sm text-text-500 mt-1">
            Examination department notice monitoring desk: college circulars, schedules, and departmental notices.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#8C4A3A]/10 text-[#8C4A3A] border border-[#8C4A3A]/20">
          <FileCheck size={14} />
          Exam Cell Central Feed
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-md border border-border bg-surface-0 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-500">Total Notices</span>
            <Megaphone size={16} className="text-text-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-text-900 mt-2">{totalCount}</p>
        </div>

        <div className="rounded-md border border-border bg-surface-0 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#5B3A73]">College-Wide</span>
            <Globe size={16} className="text-[#5B3A73]" />
          </div>
          <p className="text-2xl font-bold font-mono text-text-900 mt-2">{globalCount}</p>
        </div>

        <div className="rounded-md border border-border bg-surface-0 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#1F6F6F]">Departmental</span>
            <Building2 size={16} className="text-[#1F6F6F]" />
          </div>
          <p className="text-2xl font-bold font-mono text-text-900 mt-2">{deptCount}</p>
        </div>

        <div className="rounded-md border border-border bg-surface-0 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-info">Class / Division</span>
            <Users size={16} className="text-info" />
          </div>
          <p className="text-2xl font-bold font-mono text-text-900 mt-2">{classCount}</p>
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
            placeholder="Search circulars by title or keyword..."
            className="w-full pl-9 pr-4 py-1.5 text-sm rounded-md border border-border bg-surface-50 focus:bg-surface-0 focus:border-ink-700 outline-none transition-colors"
          />
        </form>

        {/* Type Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter size={15} className="text-text-500" />
          <span className="text-xs text-text-500 font-medium">Filter:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-border px-2.5 py-1.5 text-xs text-text-900 bg-surface-0 focus:border-ink-700 outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="GLOBAL">Institutional (Global)</option>
            <option value="DEPARTMENT">Department</option>
            <option value="CLASS">Class</option>
            <option value="DIVISION">Division</option>
            <option value="TEACHER">Faculty Only</option>
            <option value="PARENT">Parents Only</option>
          </select>
        </div>
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="py-16 text-center text-text-500 text-sm">
          Loading exam notice desk...
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No circulars found"
          description="There are currently no circulars matching your search or filter."
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => (
            <AnnouncementCard
              key={item.id}
              announcement={item}
            />
          ))}
        </div>
      )}
    </div>
  );
}
