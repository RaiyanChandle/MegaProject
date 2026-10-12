import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { useSearch } from '../../context/SearchContext';
import { 
  BookOpen, 
  FileText, 
  ExternalLink, 
  Download, 
  Calendar, 
  User, 
  ChevronRight,
  Eye,
  X,
  FileCheck,
  Search,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import Button from '../../components/ui/Button';

export default function StudentNotes() {
  const { searchQuery } = useSearch();
  const [enrolledSubjects, setEnrolledSubjects] = useState([]);
  const [notes, setNotes] = useState([]);
  const [term, setTerm] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state for viewing notes list of selected subject
  const [selectedSubjectGroup, setSelectedSubjectGroup] = useState(null);
  const [modalSearch, setModalSearch] = useState('');

  useEffect(() => {
    const fetchStudyNotesData = async () => {
      setIsLoading(true);
      try {
        const [subjectsRes, notesRes] = await Promise.allSettled([
          apiClient.get('/students/my-subjects'),
          apiClient.get('/notes/my-notes')
        ]);

        if (subjectsRes.status === 'fulfilled') {
          const enrollments = subjectsRes.value?.enrollments || [];
          setEnrolledSubjects(enrollments);
          setTerm(subjectsRes.value?.term || null);
        }

        if (notesRes.status === 'fulfilled') {
          setNotes(Array.isArray(notesRes.value) ? notesRes.value : []);
        }
      } catch (error) {
        toast.error('Failed to load study notes and enrolled courses');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudyNotesData();
  }, []);

  // Group notes by subject, guaranteeing all allocated subjects appear
  const subjectGroups = useMemo(() => {
    const map = new Map();

    // 1. Seed all allocated subjects for the student
    enrolledSubjects.forEach(enr => {
      const sub = enr.subject;
      if (!sub) return;
      map.set(sub.id, {
        subjectId: sub.id,
        subjectCode: sub.code,
        subjectName: sub.name,
        subjectType: sub.subjectType || 'CORE',
        credits: sub.credits || 0,
        teacherName: enr.teacher?.name || 'Assigned Faculty',
        notes: []
      });
    });

    // 2. Attach uploaded notes to the allocated subjects
    notes.forEach(note => {
      const sub = note.subject;
      if (!sub) return;
      if (!map.has(sub.id)) {
        map.set(sub.id, {
          subjectId: sub.id,
          subjectCode: sub.code,
          subjectName: sub.name,
          subjectType: sub.subjectType || 'CORE',
          credits: sub.credits || 0,
          teacherName: note.teacher?.name || 'Faculty',
          notes: []
        });
      }
      map.get(sub.id).notes.push(note);
    });

    return Array.from(map.values()).map(g => ({
      ...g,
      notes: g.notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      latestDate: g.notes[0]?.createdAt || null
    }));
  }, [enrolledSubjects, notes]);

  // Filter subject groups based on universal search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return subjectGroups;
    const q = searchQuery.toLowerCase();
    return subjectGroups.filter(g => 
      g.subjectName?.toLowerCase().includes(q) ||
      g.subjectCode?.toLowerCase().includes(q) ||
      g.teacherName?.toLowerCase().includes(q) ||
      g.notes.some(n => n.topic?.toLowerCase().includes(q))
    );
  }, [subjectGroups, searchQuery]);

  // Filtered notes inside modal
  const modalNotes = useMemo(() => {
    if (!selectedSubjectGroup) return [];
    if (!modalSearch.trim()) return selectedSubjectGroup.notes;
    const q = modalSearch.toLowerCase();
    return selectedSubjectGroup.notes.filter(n => 
      n.topic?.toLowerCase().includes(q) ||
      n.teacher?.name?.toLowerCase().includes(q)
    );
  }, [selectedSubjectGroup, modalSearch]);

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 max-w-7xl pb-12">
        <div className="h-24 bg-surface-0 animate-pulse rounded-xl border border-border" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-surface-0 animate-pulse rounded-xl border border-border" />
          ))}
        </div>
        <div className="h-64 bg-surface-0 animate-pulse rounded-xl border border-border" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl pb-12">
      {/* Header Banner */}
      <div className="bg-surface-0 border border-border rounded-xl p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-ink-900 text-white flex items-center justify-center shrink-0 shadow-xs border border-ink-700">
            <FileText size={22} className="text-brass-500" />
          </div>
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-text-900 tracking-tight">
              Study Notes & Materials
            </h2>
            <p className="text-xs text-text-500 mt-0.5">
              Access lecture slides, notes, and study material uploaded for your enrolled subjects
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-text-600 bg-surface-50 px-3 py-1.5 rounded-lg border border-border self-start sm:self-auto">
          <BookOpen size={13} className="text-ink-900" />
          <span>{notes.length} Total Documents Uploaded</span>
        </div>
      </div>

      {/* KPI Cards: 2x2 on mobile, 4 in a row on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Documents */}
        <div className="bg-surface-0 border border-border rounded-xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-text-500 font-medium uppercase tracking-wide">
              Total Notes
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-ink-900/10 text-ink-900">
              <FileText size={15} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-text-900">
              {notes.length}
            </div>
            <span className="text-[10px] sm:text-[11px] text-text-500 block truncate">
              Across all courses
            </span>
          </div>
        </div>

        {/* Subjects Covered */}
        <div className="bg-surface-0 border border-border rounded-xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-text-500 font-medium uppercase tracking-wide">
              Active Courses
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <BookOpen size={15} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-text-900">
              {subjectGroups.length}
            </div>
            <span className="text-[10px] sm:text-[11px] text-text-500 block truncate">
              With uploaded resources
            </span>
          </div>
        </div>

        {/* Latest Activity */}
        <div className="bg-surface-0 border border-border rounded-xl p-3.5 sm:p-5 shadow-xs col-span-2 lg:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-text-500 font-medium uppercase tracking-wide">
              Recent Curriculum Upload
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-surface-100 text-ink-900">
              <Calendar size={15} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-center justify-between">
            <div>
              <div className="text-sm sm:text-base font-bold text-text-900 truncate">
                {notes[0]?.topic || 'No recent files'}
              </div>
              <span className="text-[10px] sm:text-[11px] text-text-500 block truncate">
                {notes[0] ? `${notes[0].subject?.name} • ${new Date(notes[0].createdAt).toLocaleDateString()}` : 'Awaiting faculty updates'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Subjects Table Structure */}
      <div className="bg-surface-0 border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-text-900">Course Materials Register</h3>
            <p className="text-xs text-text-500 mt-0.5">
              Click any subject row to browse and download all uploaded study notes in a modal.
            </p>
          </div>
          <span className="font-mono text-xs text-text-500 hidden sm:inline">
            {filteredGroups.length} Enrolled Courses
          </span>
        </div>

        {filteredGroups.length === 0 ? (
          <div className="p-12 text-center text-xs text-text-500 italic bg-surface-50">
            {searchQuery 
              ? `No subject materials match "${searchQuery}"`
              : "No study notes have been uploaded for your enrolled subjects yet."}
          </div>
        ) : (
          <>
            {/* Desktop & Tablet Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-50 border-b border-border text-text-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Assigned Faculty</th>
                    <th className="py-3 px-4">Uploaded Notes</th>
                    <th className="py-3 px-4">Latest Upload</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredGroups.map(group => (
                    <tr 
                      key={group.subjectId}
                      onClick={() => {
                        setSelectedSubjectGroup(group);
                        setModalSearch('');
                      }}
                      className="hover:bg-surface-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-surface-50 border border-border text-ink-900">
                            {group.subjectCode}
                          </span>
                          <span className="font-semibold text-text-900 group-hover:text-ink-700 transition-colors">
                            {group.subjectName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-surface-100 text-text-700">
                          {group.subjectType || 'CORE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-text-700">
                        <div className="flex items-center gap-1.5">
                          <UserCheck size={13} className="text-text-400" />
                          <span>{group.teacherName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-text-900">
                        <span className="px-2 py-0.5 rounded-full bg-surface-100 text-text-700 font-bold">
                          {group.notes.length} Documents
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-text-500">
                        {group.latestDate ? new Date(group.latestDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSubjectGroup(group);
                            setModalSearch('');
                          }}
                          className="px-2.5 py-1.5 rounded-md border border-border bg-surface-0 hover:bg-surface-100 text-text-900 font-semibold text-xs transition-colors inline-flex items-center gap-1 shadow-xs"
                        >
                          <Eye size={12} className="text-ink-900" />
                          <span>View Notes</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards (<md) */}
            <div className="md:hidden divide-y divide-border">
              {filteredGroups.map(group => (
                <div 
                  key={group.subjectId}
                  onClick={() => {
                    setSelectedSubjectGroup(group);
                    setModalSearch('');
                  }}
                  className="p-4 space-y-3 cursor-pointer hover:bg-surface-50/60 active:bg-surface-100/60 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-ink-900 text-white">
                          {group.subjectCode}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-surface-100 text-text-600">
                          {group.subjectType || 'CORE'}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-text-900 mt-1 leading-snug">
                        {group.subjectName}
                      </h4>
                      <p className="text-[11px] text-text-500 mt-0.5 flex items-center gap-1">
                        <UserCheck size={12} className="text-text-400" />
                        <span>Faculty: {group.teacherName}</span>
                      </p>
                    </div>

                    <span className="font-mono text-[10px] font-bold px-2.5 py-1 rounded-full bg-surface-100 text-text-800 border border-border shrink-0">
                      {group.notes.length} Notes
                    </span>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-xs font-semibold text-ink-900 border-t border-border/60">
                    <span className="text-[11px] text-text-400 font-mono font-normal">
                      Latest: {group.latestDate ? new Date(group.latestDate).toLocaleDateString() : '—'}
                    </span>
                    <span className="inline-flex items-center gap-1 hover:underline">
                      View Documents <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Subject Study Notes Modal (List Form) */}
      {selectedSubjectGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="bg-surface-0 border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border bg-surface-50/70 flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-ink-900 text-white uppercase">
                    {selectedSubjectGroup.subjectCode}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface-100 text-text-700">
                    {selectedSubjectGroup.subjectType}
                  </span>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-surface-0 border border-border text-ink-900">
                    {selectedSubjectGroup.notes.length} Files Available
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-text-900 leading-snug">
                  {selectedSubjectGroup.subjectName}
                </h3>
                <p className="text-xs text-text-500 flex items-center gap-1.5">
                  <UserCheck size={13} className="text-text-400" />
                  <span>Faculty: <strong>{selectedSubjectGroup.teacherName}</strong></span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSubjectGroup(null)}
                className="p-1.5 rounded-lg text-text-400 hover:text-text-900 hover:bg-surface-100 transition-colors shrink-0"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Input inside Modal */}
            <div className="p-3 border-b border-border bg-surface-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-400" />
                <input
                  type="text"
                  placeholder="Filter lecture topics or file names..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-surface-50 focus:border-ink-700 focus:ring-1 focus:ring-ink-700 placeholder:text-text-400"
                />
              </div>
            </div>

            {/* Notes List in Modal */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar">
              {modalNotes.length === 0 ? (
                <div className="py-12 px-4 text-center bg-surface-50 rounded-xl border border-border border-dashed space-y-2">
                  <div className="w-10 h-10 rounded-full bg-surface-100 text-text-400 flex items-center justify-center mx-auto">
                    <FileText size={18} />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-text-900">
                    {modalSearch.trim() 
                      ? 'No notes match your search'
                      : `No notes uploaded yet for ${selectedSubjectGroup.subjectName}`}
                  </h4>
                  <p className="text-[11px] text-text-500 max-w-sm mx-auto">
                    {modalSearch.trim()
                      ? 'Try adjusting your topic or keyword filter.'
                      : `Lecture slides and notes uploaded by ${selectedSubjectGroup.teacherName} will appear here.`}
                  </p>
                </div>
              ) : (
                modalNotes.map(note => (
                  <div
                    key={note.id}
                    className="p-3.5 sm:p-4 rounded-xl border border-border bg-surface-0 hover:bg-surface-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-semibold px-2 py-0.2 rounded bg-surface-100 text-text-600">
                          {note.division?.name ? `Div ${note.division.name}` : 'Class-wide'}
                        </span>
                        <span className="text-[11px] font-mono text-text-500 flex items-center gap-1">
                          <Calendar size={12} className="text-text-400" />
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-text-900 leading-snug">
                        {note.topic}
                      </h4>

                      <p className="text-xs text-text-500 flex items-center gap-1">
                        <User size={12} className="text-text-400" />
                        Uploaded by: {note.teacher?.name || 'Faculty'}
                      </p>
                    </div>

                    {/* Download / Open Touch Button */}
                    <div className="self-end sm:self-center shrink-0 w-full sm:w-auto">
                      <a
                        href={note.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto h-9 px-4 rounded-lg bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <ExternalLink size={13} />
                        <span>Open Document</span>
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-border bg-surface-50/60 flex items-center justify-between">
              <span className="text-xs font-mono text-text-500">
                {selectedSubjectGroup.subjectCode} • {selectedSubjectGroup.notes.length} Study Materials
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedSubjectGroup(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
