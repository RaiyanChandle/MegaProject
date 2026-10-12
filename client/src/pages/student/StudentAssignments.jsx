import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { useSearch } from '../../context/SearchContext';
import { 
  FileText, 
  Calendar, 
  Clock, 
  Upload, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle,
  FileCheck,
  Paperclip,
  Check,
  ChevronRight,
  Eye,
  X,
  BookOpen,
  UserCheck,
  RefreshCw,
  Search
} from 'lucide-react';

export default function StudentAssignments() {
  const { searchQuery } = useSearch();
  const [assignments, setAssignments] = useState([]);
  const [enrolledSubjects, setEnrolledSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state for viewing assignments of selected subject
  const [selectedSubjectGroup, setSelectedSubjectGroup] = useState(null);
  const [taskFilter, setTaskFilter] = useState('ALL'); // ALL, PENDING, SUBMITTED

  // Submit Modal state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [activeAssignmentForSubmit, setActiveAssignmentForSubmit] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch student assignments and enrolled subjects
  const fetchAssignmentsData = async () => {
    setIsLoading(true);
    try {
      const [subjectsRes, assignmentsRes] = await Promise.allSettled([
        apiClient.get('/students/my-subjects'),
        apiClient.get('/assignments/my-assignments')
      ]);

      if (subjectsRes.status === 'fulfilled') {
        const enrollments = subjectsRes.value?.enrollments || [];
        setEnrolledSubjects(enrollments);
      }

      if (assignmentsRes.status === 'fulfilled') {
        setAssignments(Array.isArray(assignmentsRes.value) ? assignmentsRes.value : []);
      }
    } catch (error) {
      toast.error('Failed to load assignments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignmentsData();
  }, []);

  // Group assignments by subject, guaranteeing all allocated subjects appear
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
        assignments: []
      });
    });

    // 2. Attach assignments to subjects
    assignments.forEach(a => {
      const sub = a.subject;
      if (!sub) return;
      const subId = sub.id;

      if (!map.has(subId)) {
        map.set(subId, {
          subjectId: subId,
          subjectCode: sub.code,
          subjectName: sub.name,
          subjectType: sub.subjectType || 'CORE',
          credits: sub.credits || 0,
          teacherName: a.teacher?.name || 'Faculty',
          assignments: []
        });
      }
      map.get(subId).assignments.push(a);
    });

    return Array.from(map.values()).map(g => {
      const pending = g.assignments.filter(a => !a.hasSubmitted).length;
      const submitted = g.assignments.filter(a => a.hasSubmitted).length;
      
      // Sort upcoming deadlines first
      const sorted = g.assignments.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
      const nextUpcoming = sorted.find(a => !a.isPastDeadline && !a.hasSubmitted) || sorted[0];

      return {
        ...g,
        assignments: sorted,
        pendingCount: pending,
        submittedCount: submitted,
        nextDeadline: nextUpcoming?.deadline,
        hasNextOverdue: g.assignments.some(a => a.isPastDeadline && !a.hasSubmitted)
      };
    });
  }, [enrolledSubjects, assignments]);

  // Overall metrics
  const totalPending = useMemo(() => {
    return assignments.filter(a => !a.hasSubmitted).length;
  }, [assignments]);

  const totalSubmitted = useMemo(() => {
    return assignments.filter(a => a.hasSubmitted).length;
  }, [assignments]);

  // Filter subject groups based on universal search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return subjectGroups;
    const q = searchQuery.toLowerCase();
    return subjectGroups.filter(g => 
      g.subjectName?.toLowerCase().includes(q) ||
      g.subjectCode?.toLowerCase().includes(q) ||
      g.teacherName?.toLowerCase().includes(q) ||
      g.assignments.some(a => a.title?.toLowerCase().includes(q))
    );
  }, [subjectGroups, searchQuery]);

  // Filtered task list inside modal
  const modalTasks = useMemo(() => {
    if (!selectedSubjectGroup) return [];
    const list = selectedSubjectGroup.assignments || [];
    if (taskFilter === 'PENDING') return list.filter(a => !a.hasSubmitted);
    if (taskFilter === 'SUBMITTED') return list.filter(a => a.hasSubmitted);
    return list;
  }, [selectedSubjectGroup, taskFilter]);

  // Open submission dialog
  const handleOpenSubmit = (assignment) => {
    setActiveAssignmentForSubmit(assignment);
    setSelectedFile(null);
    setIsSubmitModalOpen(true);
  };

  // Submit assignment solution file
  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select your assignment file to submit');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      await apiClient.post(`/assignments/${activeAssignmentForSubmit.id}/submit`, formData);
      toast.success(
        activeAssignmentForSubmit.hasSubmitted 
          ? 'Assignment submission updated successfully!' 
          : 'Assignment submitted successfully!'
      );

      setIsSubmitModalOpen(false);
      setActiveAssignmentForSubmit(null);
      setSelectedFile(null);

      // Refresh assignments
      await fetchAssignments();

      // Update selectedSubjectGroup if active
      if (selectedSubjectGroup) {
        const updated = await apiClient.get('/assignments/my-assignments');
        if (Array.isArray(updated)) {
          setAssignments(updated);
          const currentSubId = selectedSubjectGroup.subjectId;
          const freshSubAssignments = updated.filter(a => a.subject?.id === currentSubId);
          setSelectedSubjectGroup(prev => prev ? {
            ...prev,
            assignments: freshSubAssignments
          } : null);
        }
      }
    } catch (error) {
      toast.error(error.message || 'Failed to submit assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

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
      {/* Top Banner */}
      <div className="bg-surface-0 border border-border rounded-xl p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-ink-900 text-white flex items-center justify-center shrink-0 shadow-xs border border-ink-700">
            <FileCheck size={22} className="text-brass-500" />
          </div>
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-text-900 tracking-tight">
              Course Assignments
            </h2>
            <p className="text-xs text-text-500 mt-0.5">
              Review tasks for your enrolled courses and submit assignments before the deadline
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-text-600 bg-surface-50 px-3 py-1.5 rounded-lg border border-border self-start sm:self-auto">
          <FileText size={13} className="text-ink-900" />
          <span>{assignments.length} Total Assignments</span>
        </div>
      </div>

      {/* KPI Cards: 2x2 on mobile, 4 in a row on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Tasks */}
        <div className="bg-surface-0 border border-border rounded-xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-text-500 font-medium uppercase tracking-wide">
              Total Tasks
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-ink-900/10 text-ink-900">
              <FileText size={15} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-text-900">
              {assignments.length}
            </div>
            <span className="text-[10px] sm:text-[11px] text-text-500 block truncate">
              Across enrolled courses
            </span>
          </div>
        </div>

        {/* Pending Submissions */}
        <div className="bg-surface-0 border border-border rounded-xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-text-500 font-medium uppercase tracking-wide">
              Pending
            </span>
            <div className={`p-1.5 sm:p-2 rounded-lg ${totalPending > 0 ? 'bg-amber-50 text-amber-700' : 'bg-surface-100 text-emerald-700'}`}>
              <Clock size={15} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className={`text-xl sm:text-2xl font-bold font-mono ${totalPending > 0 ? 'text-amber-800' : 'text-text-900'}`}>
              {totalPending}
            </div>
            <span className="text-[10px] sm:text-[11px] text-text-500 block truncate">
              {totalPending > 0 ? 'Needs submission' : 'All submitted'}
            </span>
          </div>
        </div>

        {/* Submitted */}
        <div className="bg-surface-0 border border-border rounded-xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-text-500 font-medium uppercase tracking-wide">
              Submitted
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle size={15} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700">
              {totalSubmitted}
            </div>
            <span className="text-[10px] sm:text-[11px] text-text-500 block truncate">
              Turned in solutions
            </span>
          </div>
        </div>

        {/* Courses with Tasks */}
        <div className="bg-surface-0 border border-border rounded-xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-text-500 font-medium uppercase tracking-wide">
              Active Courses
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-surface-100 text-text-700">
              <BookOpen size={15} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-text-900">
              {subjectGroups.length}
            </div>
            <span className="text-[10px] sm:text-[11px] text-text-500 block truncate">
              With assigned work
            </span>
          </div>
        </div>
      </div>

      {/* Main Table Structure of Courses with Assignments */}
      <div className="bg-surface-0 border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-text-900">Course Assignments Register</h3>
            <p className="text-xs text-text-500 mt-0.5">
              Click any course row to view tasks, problem statements, and submit solutions in a modal.
            </p>
          </div>
          <span className="font-mono text-xs text-text-500 hidden sm:inline">
            {filteredGroups.length} Courses
          </span>
        </div>

        {filteredGroups.length === 0 ? (
          <div className="p-12 text-center text-xs text-text-500 italic bg-surface-50">
            {searchQuery 
              ? `No course assignments match "${searchQuery}"`
              : "No assignments have been published for your enrolled subjects right now."}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-50 border-b border-border text-text-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Faculty</th>
                    <th className="py-3 px-4">Total Tasks</th>
                    <th className="py-3 px-4 min-w-[160px]">Submission Status</th>
                    <th className="py-3 px-4">Next Deadline</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredGroups.map(group => {
                    const total = group.assignments.length;
                    const subCount = group.submittedCount;
                    const pct = total > 0 ? Math.round((subCount / total) * 100) : 100;

                    return (
                      <tr 
                        key={group.subjectId}
                        onClick={() => {
                          setSelectedSubjectGroup(group);
                          setTaskFilter('ALL');
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
                          {total} Tasks
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between font-mono text-[11px]">
                              <span>{subCount} of {total} Submitted</span>
                              <span className={group.pendingCount > 0 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                                {group.pendingCount > 0 ? `${group.pendingCount} Pending` : 'All Done'}
                              </span>
                            </div>
                            <div className="w-full bg-surface-100 rounded-full h-1.5 overflow-hidden border border-border/40">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${group.pendingCount > 0 ? 'bg-amber-500' : 'bg-emerald-600'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-text-600">
                          {group.nextDeadline ? (
                            <span className={group.hasNextOverdue ? 'text-danger font-semibold' : ''}>
                              {new Date(group.nextDeadline).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSubjectGroup(group);
                              setTaskFilter('ALL');
                            }}
                            className="px-2.5 py-1.5 rounded-md border border-border bg-surface-0 hover:bg-surface-100 text-text-900 font-semibold text-xs transition-colors inline-flex items-center gap-1 shadow-xs"
                          >
                            <Eye size={12} className="text-ink-900" />
                            <span>View Tasks</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Table List (<md) */}
            <div className="md:hidden divide-y divide-border">
              {filteredGroups.map(group => {
                const total = group.assignments.length;
                const subCount = group.submittedCount;
                const pct = total > 0 ? Math.round((subCount / total) * 100) : 100;

                return (
                  <div 
                    key={group.subjectId}
                    onClick={() => {
                      setSelectedSubjectGroup(group);
                      setTaskFilter('ALL');
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

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        group.pendingCount > 0 
                          ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {group.pendingCount > 0 ? `${group.pendingCount} Pending` : 'All Done'}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-text-500 text-[11px]">
                          {subCount} of {total} Submitted
                        </span>
                        <span className="font-bold text-xs text-text-900">
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full bg-surface-100 rounded-full h-1.5 overflow-hidden border border-border/40">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${group.pendingCount > 0 ? 'bg-amber-500' : 'bg-emerald-600'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-xs font-semibold text-ink-900 border-t border-border/60">
                      <span className="text-[11px] text-text-400 font-mono font-normal">
                        {group.nextDeadline ? `Due: ${new Date(group.nextDeadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : 'No deadlines'}
                      </span>
                      <span className="inline-flex items-center gap-1 hover:underline">
                        View Assignment List <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Course Assignments List Modal */}
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
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    selectedSubjectGroup.pendingCount > 0
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {selectedSubjectGroup.pendingCount > 0 ? `${selectedSubjectGroup.pendingCount} Pending Submission` : 'All Submitted'}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-text-900 leading-snug">
                  {selectedSubjectGroup.subjectName}
                </h3>
                <p className="text-xs text-text-500 flex items-center gap-1.5 font-mono">
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

            {/* Filter Pills inside Modal */}
            <div className="px-4 py-2.5 border-b border-border bg-surface-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { key: 'ALL', label: `All Tasks (${selectedSubjectGroup.assignments.length})` },
                { key: 'PENDING', label: `Pending (${selectedSubjectGroup.assignments.filter(a => !a.hasSubmitted).length})` },
                { key: 'SUBMITTED', label: `Submitted (${selectedSubjectGroup.assignments.filter(a => a.hasSubmitted).length})` }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setTaskFilter(tab.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                    taskFilter === tab.key
                      ? 'bg-ink-900 text-white shadow-xs'
                      : 'bg-surface-50 text-text-600 hover:text-text-900 hover:bg-surface-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Assignment List in Modal */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar">
              {modalTasks.length === 0 ? (
                <div className="py-12 px-4 text-center bg-surface-50 rounded-xl border border-border border-dashed space-y-2">
                  <div className="w-10 h-10 rounded-full bg-surface-100 text-text-400 flex items-center justify-center mx-auto">
                    <FileCheck size={18} />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-text-900">
                    {taskFilter !== 'ALL'
                      ? 'No tasks match the selected filter'
                      : `No assignments assigned yet for ${selectedSubjectGroup.subjectName}`}
                  </h4>
                  <p className="text-[11px] text-text-500 max-w-sm mx-auto">
                    {taskFilter !== 'ALL'
                      ? 'Try switching tabs between All, Pending, and Submitted.'
                      : `Assignments and tasks published by ${selectedSubjectGroup.teacherName} will appear here.`}
                  </p>
                </div>
              ) : (
                modalTasks.map(assignment => {
                  const isPast = assignment.isPastDeadline;
                  const hasSubmitted = assignment.hasSubmitted;
                  const submission = assignment.submission;
                  const formattedDeadline = new Date(assignment.deadline).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={assignment.id}
                      className="p-4 rounded-xl border border-border bg-surface-0 hover:bg-surface-50 transition-colors space-y-3 shadow-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm sm:text-base text-text-900">
                              {assignment.title}
                            </h4>
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-100 text-text-700 font-semibold">
                              {assignment.marks} pts
                            </span>
                          </div>
                          {assignment.description && (
                            <p className="text-xs text-text-600 line-clamp-2">
                              {assignment.description}
                            </p>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div className="self-start sm:self-auto shrink-0">
                          {hasSubmitted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle size={13} /> Submitted
                            </span>
                          ) : isPast ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-danger/10 text-danger border border-danger/20">
                              <AlertTriangle size={13} /> Past Deadline
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock size={13} /> Pending
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Deadline & Meta */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-500 font-mono pt-2 border-t border-border/60">
                        <span className={`flex items-center gap-1.5 ${isPast && !hasSubmitted ? 'text-danger font-semibold' : ''}`}>
                          <Clock size={13} />
                          Deadline: {formattedDeadline}
                        </span>

                        {hasSubmitted && submission?.submittedAt && (
                          <span className="text-emerald-700">
                            Turned in: {new Date(submission.submittedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Submission Results / Evaluation */}
                      {submission?.evaluatedAt && (
                        <div className="bg-surface-50 p-2.5 rounded-lg border border-border flex items-center justify-between text-xs">
                          <span className="font-medium text-text-700">Faculty Evaluation:</span>
                          <span className="font-mono font-bold text-text-900">
                            Score: {submission.obtainedMarks} / {assignment.marks}
                          </span>
                        </div>
                      )}

                      {/* Actions: Submit or Open Submission File */}
                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        {hasSubmitted ? (
                          <>
                            {submission?.fileUrl && (
                              <a
                                href={submission.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-9 px-3 rounded-lg border border-border bg-surface-0 hover:bg-surface-100 text-xs font-semibold text-text-900 inline-flex items-center gap-1.5 shadow-xs"
                              >
                                <ExternalLink size={13} />
                                <span>View Submitted Solution</span>
                              </a>
                            )}
                            {!isPast && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-9 text-xs"
                                onClick={() => handleOpenSubmit(assignment)}
                              >
                                Update Submission
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full sm:w-auto h-9 text-xs font-semibold shadow-xs"
                            disabled={isPast}
                            onClick={() => handleOpenSubmit(assignment)}
                          >
                            <Upload size={13} className="mr-1.5" />
                            {isPast ? 'Deadline Passed' : 'Submit Assignment'}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-border bg-surface-50/60 flex items-center justify-between">
              <span className="text-xs font-mono text-text-500">
                {selectedSubjectGroup.subjectCode} • {selectedSubjectGroup.assignments.length} Tasks
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

      {/* File Upload Submission Modal */}
      {isSubmitModalOpen && (
        <Modal
          isOpen={isSubmitModalOpen}
          onClose={() => {
            if (!isSubmitting) {
              setIsSubmitModalOpen(false);
              setActiveAssignmentForSubmit(null);
              setSelectedFile(null);
            }
          }}
          title={activeAssignmentForSubmit?.hasSubmitted ? 'Update Solution File' : 'Submit Assignment Solution'}
        >
          <form onSubmit={handleSubmitAssignment} className="space-y-4">
            <div className="bg-surface-50 p-3 rounded-lg border border-border text-xs space-y-1">
              <div className="font-bold text-text-900 text-sm">
                {activeAssignmentForSubmit?.title}
              </div>
              <div className="text-text-500 font-mono">
                {activeAssignmentForSubmit?.subject?.code} - {activeAssignmentForSubmit?.subject?.name}
              </div>
              <div className="text-text-500 font-mono">
                Max Marks: {activeAssignmentForSubmit?.marks} Points
              </div>
            </div>

            <Field label="Assignment Solution File (PDF, ZIP, DOCX, etc.)" required>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-border rounded-lg bg-surface-0 hover:border-ink-700 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-10 w-10 text-text-400" />
                  <div className="flex text-sm text-text-600 justify-center">
                    <label className="relative cursor-pointer rounded-md font-semibold text-ink-900 hover:text-ink-700 focus-within:outline-none">
                      <span>Choose file to upload</span>
                      <input 
                        type="file" 
                        className="sr-only" 
                        onChange={(e) => setSelectedFile(e.target.files[0])}
                        disabled={isSubmitting}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-text-400">PDF, ZIP, DOCX, TXT up to 25MB</p>
                </div>
              </div>

              {selectedFile && (
                <div className="mt-2 flex items-center justify-between p-2 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  <span className="font-mono truncate font-medium">{selectedFile.name}</span>
                  <span className="font-mono text-emerald-600 shrink-0 ml-2">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              )}
            </Field>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => {
                  setIsSubmitModalOpen(false);
                  setActiveAssignmentForSubmit(null);
                  setSelectedFile(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !selectedFile}
              >
                {isSubmitting ? 'Uploading & Submitting...' : 'Confirm Submission'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
