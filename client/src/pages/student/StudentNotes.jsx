import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { 
  BookOpen, 
  FileText, 
  ExternalLink, 
  Download, 
  Search, 
  Calendar, 
  User, 
  Filter 
} from 'lucide-react';

export default function StudentNotes() {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('ALL');

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const data = await apiClient.get('/notes/my-notes');
        setNotes(data);
      } catch (error) {
        toast.error('Failed to load study notes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, []);

  // Unique subjects from notes
  const uniqueSubjects = Array.from(
    new Map(notes.map(n => [n.subject?.id, n.subject])).values()
  ).filter(Boolean);

  // Filter notes by search query and subject filter
  const filteredNotes = notes.filter(n => {
    const matchesSubject = selectedSubject === 'ALL' || n.subject?.id === selectedSubject;
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      !query ||
      n.topic.toLowerCase().includes(query) ||
      n.subject?.name?.toLowerCase().includes(query) ||
      n.subject?.code?.toLowerCase().includes(query) ||
      n.teacher?.name?.toLowerCase().includes(query);

    return matchesSubject && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-text-500">
        Loading study materials...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-text-900">Study Notes & Materials</h2>
        <p className="text-sm text-text-500 mt-1">
          Access lecture slides, notes, and study material uploaded for your enrolled subjects.
        </p>
      </div>

      {/* Search & Subject Filters Bar */}
      <div className="bg-surface-0 border border-border rounded-md p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-text-500" size={16} />
            <input
              type="text"
              placeholder="Search by topic, subject, or faculty name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border bg-surface-0 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
            />
          </div>

          {/* Subject Dropdown */}
          <div className="w-full sm:w-64">
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
            >
              <option value="ALL">All Enrolled Subjects</option>
              {uniqueSubjects.map(sub => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notes Grid (Mobile-Friendly Responsive Cards) */}
      {filteredNotes.length === 0 ? (
        <EmptyState
          title="No Study Material Found"
          description={
            notes.length === 0
              ? "Your teachers haven't uploaded any notes for your enrolled subjects yet."
              : "No notes match your current search or filter."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map(note => (
            <div
              key={note.id}
              className="bg-surface-0 border border-border rounded-md p-5 flex flex-col justify-between hover:border-ink-700 transition-colors"
            >
              <div>
                {/* Subject & Code */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-50 border border-border text-text-500 font-semibold">
                    {note.subject?.code}
                  </span>
                  <span className="text-xs text-text-500">
                    {note.division?.name ? `Div ${note.division.name}` : 'Class-wide'}
                  </span>
                </div>

                {/* Topic */}
                <h3 className="text-base font-semibold text-text-900 mb-1 line-clamp-2">
                  {note.topic}
                </h3>

                <div className="text-xs font-medium text-text-500 mb-3">
                  {note.subject?.name}
                </div>
              </div>

              {/* Meta & Download Action */}
              <div className="pt-3 border-t border-border mt-3 space-y-3">
                <div className="flex items-center justify-between text-xs text-text-500">
                  <span className="flex items-center gap-1">
                    <User size={13} /> {note.teacher?.name || 'Faculty'}
                  </span>
                  <span className="font-mono text-[11px]">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <a
                  href={note.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium bg-ink-900 text-white hover:bg-ink-700 transition-colors"
                >
                  <ExternalLink size={14} /> Open / Download Material
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
