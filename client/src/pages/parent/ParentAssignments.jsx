import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import { toast } from '../../components/ui/Toast';
import { useSearch } from '../../context/SearchContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  FileCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  GraduationCap, 
  BookOpen, 
  ChevronRight, 
  X, 
  Calendar, 
  RefreshCw 
} from 'lucide-react';
import Button from '../../components/ui/Button';

export default function ParentAssignments() {
  const { searchQuery } = useSearch();
  const { t, currentLanguage, changeLanguage, languages } = useLanguage();
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [enrolledSubjects, setEnrolledSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

  // Modal state for viewing selected subject tasks
  const [selectedSubjectGroup, setSelectedSubjectGroup] = useState(null);

  // 1. Fetch linked children
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const data = await apiClient.get('/parents/my-children');
        const list = Array.isArray(data) ? data : [];
        setChildren(list);
        if (list.length > 0) {
          setSelectedChildId(list[0].id);
        }
      } catch (error) {
        toast.error('Failed to load linked children');
      } finally {
        setIsLoadingChildren(false);
      }
    };
    fetchChildren();
  }, []);

  // 2. Fetch enrolled subjects and assignments for selected child
  useEffect(() => {
    if (!selectedChildId) return;

    const fetchChildData = async () => {
      setIsLoadingAssignments(true);
      try {
        const [subjectsRes, assignmentsRes] = await Promise.allSettled([
          apiClient.get(`/students/my-subjects?studentId=${selectedChildId}`),
          apiClient.get(`/assignments/my-assignments?studentId=${selectedChildId}`)
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
        setIsLoadingAssignments(false);
      }
    };

    fetchChildData();
  }, [selectedChildId]);

  const selectedChild = useMemo(() => {
    return children.find(c => c.id === selectedChildId) || children[0] || null;
  }, [children, selectedChildId]);

  // Group assignments by subject, ensuring all enrolled subjects appear
  const subjectGroups = useMemo(() => {
    const map = new Map();

    // 1. Seed enrolled subjects
    enrolledSubjects.forEach(enr => {
      const sub = enr.subject;
      if (!sub) return;
      map.set(sub.id, {
        subjectId: sub.id,
        subjectCode: sub.code,
        subjectName: sub.name,
        teacherName: enr.teacher?.name || 'Assigned Faculty',
        assignments: []
      });
    });

    // 2. Attach assignments
    assignments.forEach(a => {
      const sub = a.subject;
      if (!sub) return;
      if (!map.has(sub.id)) {
        map.set(sub.id, {
          subjectId: sub.id,
          subjectCode: sub.code,
          subjectName: sub.name,
          teacherName: a.teacher?.name || 'Faculty',
          assignments: []
        });
      }
      map.get(sub.id).assignments.push(a);
    });

    return Array.from(map.values()).map(g => {
      const pending = g.assignments.filter(a => !a.hasSubmitted).length;
      const submitted = g.assignments.filter(a => a.hasSubmitted).length;
      const overdue = g.assignments.filter(a => a.isPastDeadline && !a.hasSubmitted).length;

      return {
        ...g,
        totalTasks: g.assignments.length,
        pendingCount: pending,
        submittedCount: submitted,
        overdueCount: overdue
      };
    });
  }, [enrolledSubjects, assignments]);

  // Overall KPI counts
  const totalPending = useMemo(() => {
    return assignments.filter(a => !a.hasSubmitted).length;
  }, [assignments]);

  const totalOverdue = useMemo(() => {
    return assignments.filter(a => a.isPastDeadline && !a.hasSubmitted).length;
  }, [assignments]);

  const totalSubmitted = useMemo(() => {
    return assignments.filter(a => a.hasSubmitted).length;
  }, [assignments]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return subjectGroups;
    const q = searchQuery.toLowerCase();
    return subjectGroups.filter(g =>
      g.subjectName?.toLowerCase().includes(q) ||
      g.subjectCode?.toLowerCase().includes(q) ||
      g.teacherName?.toLowerCase().includes(q)
    );
  }, [subjectGroups, searchQuery]);

  if (isLoadingChildren) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto pb-12">
        <div className="h-24 bg-surface-0 animate-pulse rounded-xl border border-border" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-0 animate-pulse rounded-xl border border-border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-surface-0 border border-border rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-900 tracking-tight">
            {t('assignmentsRecord')}
          </h2>
          <p className="text-xs sm:text-sm text-text-500 mt-1">
            {t('assignmentsSubtitle')} {selectedChild?.name || t('student')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Quick Language Dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-surface-50 text-xs">
            <span className="text-text-400 font-semibold hidden md:inline">{t('selectLanguage')}:</span>
            <select
              value={currentLanguage}
              onChange={(e) => changeLanguage(e.target.value)}
              className="bg-transparent text-text-900 font-bold focus:outline-none cursor-pointer"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.native} ({l.name})
                </option>
              ))}
            </select>
          </div>

          {selectedChild && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-50 border border-border text-xs text-text-700 font-mono">
              <span className="font-semibold text-text-900">{selectedChild.name}</span>
              <span className="text-text-400">•</span>
              <span>{t('roll')}: {selectedChild.rollNumber || '--'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Ward Switcher */}
      {children.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-xs font-semibold text-text-500 uppercase tracking-wide mr-1 shrink-0">
            {t('student')}:
          </span>
          {children.map(child => {
            const isSelected = child.id === selectedChildId;
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => {
                  setSelectedChildId(child.id);
                  setSelectedSubjectGroup(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-ink-900 text-white border-ink-900 shadow-xs'
                    : 'bg-surface-0 text-text-700 border-border hover:bg-surface-50'
                }`}
              >
                <GraduationCap size={13} className={isSelected ? 'text-brass-500' : 'text-text-400'} />
                <span>{child.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3 Summary Cards */}
      {isLoadingAssignments ? (
        <div key="loading-overview-panel" className="bg-surface-0 border border-border rounded-xl p-8 text-center text-xs text-text-500">
          <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-ink-700" />
          <span>Loading assignments overview...</span>
        </div>
      ) : (
        <div key="summary-overview-grid" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Pending Tasks */}
          <div className={`rounded-xl p-4 sm:p-5 border shadow-xs ${
            totalPending > 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-surface-0 border-border'
          }`}>
            <span className="text-xs font-semibold text-text-500 uppercase tracking-wider block">
              {t('pendingSubmissions')}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-3xl font-extrabold font-mono tracking-tight ${
                totalPending > 0 ? 'text-amber-800' : 'text-emerald-700'
              }`}>
                {totalPending}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                totalPending > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-700'
              }`}>
                {totalPending > 0 ? t('actionNeeded') : t('allClear')}
              </span>
            </div>
            <p className="text-xs text-text-500 mt-1.5">
              <span>{totalOverdue > 0 ? `${totalOverdue} ${t('pastScheduledDeadline')}` : t('noOverdueAssignments')}</span>
            </p>
          </div>

          {/* Submitted Tasks */}
          <div className="bg-surface-0 border border-border rounded-xl p-4 sm:p-5 shadow-xs">
            <span className="text-xs font-semibold text-text-500 uppercase tracking-wider block">
              {t('turnedIn')}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-emerald-700 tracking-tight">
                {totalSubmitted}
              </span>
              <span className="text-sm font-mono text-text-400 font-medium">
                / {assignments.length}
              </span>
            </div>
            <p className="text-xs text-text-500 mt-1.5">
              <span>{t('turnedInSubtext')}</span>
            </p>
          </div>

          {/* Subjects Active */}
          <div className="bg-surface-0 border border-border rounded-xl p-4 sm:p-5 shadow-xs">
            <span className="text-xs font-semibold text-text-500 uppercase tracking-wider block">
              {t('enrolledCourses')}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-text-900 tracking-tight">
                {subjectGroups.length}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-surface-100 text-text-700">
                {t('currentTerm')}
              </span>
            </div>
            <p className="text-xs text-text-500 mt-1.5">
              <span>{t('acrossRegistered')}</span> ({subjectGroups.length})
            </p>
          </div>
        </div>
      )}

      {/* Gentle Advisory if any Overdue */}
      {totalOverdue > 0 && (
        <div className="bg-danger/5 border border-danger/25 rounded-xl p-3.5 sm:p-4 flex items-start gap-3">
          <AlertTriangle className="text-danger shrink-0 mt-0.5" size={18} />
          <div className="text-xs text-danger leading-relaxed">
            <strong className="font-bold">{t('overdueAlert')}: </strong>
            <span>{selectedChild?.name}</span>{' '}
            <span>{t('overdueAlertNotice')}</span>
          </div>
        </div>
      )}

      {/* Subject-wise Pending vs Submitted Overview */}
      <div className="bg-surface-0 border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-text-900">
              {t('subjectAssignmentStatus')}
            </h3>
            <p className="text-xs text-text-500 mt-0.5">
              {t('assignmentsHint')}
            </p>
          </div>
          <span className="text-xs text-text-500 font-medium hidden sm:inline">
            {filteredGroups.length} {t('enrolledCourses')}
          </span>
        </div>

        {filteredGroups.length === 0 ? (
          <div className="p-10 text-center text-xs text-text-500 italic bg-surface-50">
            {searchQuery ? `No subject matches "${searchQuery}"` : t('noSubjectsFound')}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredGroups.map(group => {
              const hasPending = group.pendingCount > 0;
              const hasOverdue = group.overdueCount > 0;

              return (
                <div
                  key={group.subjectId}
                  onClick={() => setSelectedSubjectGroup(group)}
                  className="p-4 sm:p-5 hover:bg-surface-50/70 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  {/* Left: Subject Name & Faculty */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-text-700 px-2 py-0.5 rounded bg-surface-100">
                        {group.subjectCode}
                      </span>
                      <h4 className="font-bold text-sm sm:text-base text-text-900 group-hover:text-ink-700 transition-colors truncate">
                        {group.subjectName}
                      </h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-500">
                      <span>{t('faculty')}: {group.teacherName}</span>
                      <span>•</span>
                      <span>{group.totalTasks} {t('assignments')}</span>
                    </div>
                  </div>

                  {/* Right: Pending Status Pill & Submitted Count */}
                  <div className="flex items-center gap-3 sm:gap-4 shrink-0 justify-between sm:justify-end">
                    <div className="text-right">
                      {group.totalTasks === 0 ? (
                        <span className="text-xs font-mono text-text-400 italic">
                          {t('noTasksPublished')}
                        </span>
                      ) : (
                        <div>
                          <span className={`text-sm sm:text-base font-extrabold font-mono ${
                            hasOverdue ? 'text-danger' : hasPending ? 'text-amber-800' : 'text-emerald-700'
                          }`}>
                            {hasPending ? `${group.pendingCount} ${t('pendingBadge')}` : t('allDone')}
                          </span>
                          <span className="text-xs text-text-500 block font-mono">
                            {group.submittedCount} / {group.totalTasks} {t('submittedBadge')}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-[85px] text-right">
                      {group.totalTasks === 0 ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface-100 text-text-500">
                          {t('allClear')}
                        </span>
                      ) : hasOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-danger/10 text-danger border border-danger/20">
                          <AlertTriangle size={12} /> {t('overdueBadge')}
                        </span>
                      ) : hasPending ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock size={12} /> {t('pendingBadge')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={12} /> {t('completedBadge')}
                        </span>
                      )}
                    </div>

                    <ChevronRight size={18} className="text-text-400 group-hover:text-text-900 group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Minimal Subject Assignments Modal */}
      {selectedSubjectGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="bg-surface-0 border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border bg-surface-50/70 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-ink-900 text-white">
                    {selectedSubjectGroup.subjectCode}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    selectedSubjectGroup.pendingCount > 0
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {selectedSubjectGroup.pendingCount > 0 ? `${selectedSubjectGroup.pendingCount} ${t('pendingBadge')}` : t('allDone')}
                  </span>
                </div>
                <h3 className="text-base font-bold text-text-900 mt-1">
                  {selectedSubjectGroup.subjectName}
                </h3>
                <p className="text-xs text-text-500 mt-0.5">
                  {t('faculty')}: {selectedSubjectGroup.teacherName} • {selectedSubjectGroup.submittedCount} / {selectedSubjectGroup.totalTasks} {t('submittedBadge')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSubjectGroup(null)}
                className="p-1.5 rounded-lg text-text-400 hover:text-text-900 hover:bg-surface-100 transition-colors"
                title={t('close')}
              >
                <X size={18} />
              </button>
            </div>

            {/* Assignment List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
              {selectedSubjectGroup.assignments.length === 0 ? (
                <div className="py-10 text-center text-xs text-text-500 italic bg-surface-50 rounded-lg">
                  {t('noTasksPublished')}
                </div>
              ) : (
                selectedSubjectGroup.assignments.map(a => {
                  const hasSubmitted = a.hasSubmitted;
                  const isPast = a.isPastDeadline;

                  return (
                    <div
                      key={a.id}
                      className="p-3.5 rounded-lg border border-border bg-surface-0 space-y-1.5 text-xs shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-sm text-text-900 leading-snug">
                          {a.title}
                        </h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          hasSubmitted
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isPast
                              ? 'bg-danger/10 text-danger border border-danger/20'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {hasSubmitted ? t('submittedBadge') : isPast ? t('pastDeadlineBadge') : t('pendingBadge')}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-text-500 text-[11px] font-mono pt-1 border-t border-border/50">
                        <span className={`flex items-center gap-1 ${isPast && !hasSubmitted ? 'text-danger font-semibold' : ''}`}>
                          <Calendar size={12} />
                          {t('due')}: {new Date(a.deadline).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>

                        <span className="text-text-600 font-semibold">
                          {a.marks} {t('points')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-border bg-surface-50/60 flex items-center justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedSubjectGroup(null)}
                className="text-xs"
              >
                {t('close')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
