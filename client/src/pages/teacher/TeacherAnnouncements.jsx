import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Toast from '../../components/ui/Toast';
import AnnouncementCard from '../../components/announcements/AnnouncementCard';
import CreateAnnouncementModal from '../../components/announcements/CreateAnnouncementModal';
import { 
  Megaphone, 
  Plus, 
  Search, 
  Filter, 
  BookOpen, 
  Users 
} from 'lucide-react';

export default function TeacherAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const handleCreated = (newNotice) => {
    setAnnouncements((prev) => [newNotice, ...prev]);
    setToast({ type: 'success', message: 'Class announcement posted successfully!' });
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/announcements/${id}`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      setToast({ type: 'success', message: 'Announcement deleted successfully.' });
    } catch (err) {
      console.error('Failed to delete announcement:', err);
      setToast({ type: 'danger', message: err?.message || 'Failed to delete announcement.' });
    }
  };

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
            Classroom & Course Announcements
          </h1>
          <p className="text-sm text-text-500 mt-1">
            Publish updates, assignment reminders, and examination alerts for your allocated classes.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsModalOpen(true)}
          className="self-start sm:self-auto shrink-0"
        >
          <Plus size={16} />
          Post Announcement
        </Button>
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
            placeholder="Search class announcements..."
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
            <option value="ALL">All Types</option>
            <option value="CLASS">Class Notice</option>
            <option value="DIVISION">Division Notice</option>
            <option value="DEPARTMENT">Department Notice</option>
            <option value="GLOBAL">Global Notice</option>
          </select>
        </div>
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="py-16 text-center text-text-500 text-sm">
          Loading announcements...
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No class announcements yet"
          description="You haven't posted any announcements yet. Click 'Post Announcement' to share an update with your students."
          actionLabel="Post Announcement"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => (
            <AnnouncementCard
              key={item.id}
              announcement={item}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <CreateAnnouncementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
