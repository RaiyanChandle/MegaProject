import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { useSearch } from '../../context/SearchContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Users, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  BookOpen,
  GraduationCap,
  Building2,
  Eye,
  X,
  ChevronRight,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import Button from '../../components/ui/Button';

export default function ParentAttendance() {
  const { searchQuery } = useSearch();
  const { t, currentLanguage, changeLanguage, languages } = useLanguage();
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [attendanceData, setAttendanceData] = useState(null);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  // Modal state for viewing subject attendance sessions in list form
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [sessionFilter, setSessionFilter] = useState('ALL'); // ALL, PRESENT, ABSENT

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

  // 2. Fetch child attendance whenever child changes
  useEffect(() => {
    if (!selectedChildId) return;

    const fetchAttendance = async () => {
      setIsLoadingAttendance(true);
      try {
        const res = await apiClient.get(`/attendance/student/${selectedChildId}`);
        setAttendanceData(res);
      } catch (error) {
        toast.error('Failed to load child attendance record');
        setAttendanceData(null);
      } finally {
        setIsLoadingAttendance(false);
      }
    };

    fetchAttendance();
  }, [selectedChildId]);

  const selectedChild = useMemo(() => {
    return children.find(c => c.id === selectedChildId) || children[0] || null;
  }, [children, selectedChildId]);

  const overall = attendanceData?.overallStats;
  const subjects = attendanceData?.subjects || [];
  const atRiskSubjects = useMemo(() => subjects.filter(s => s.isLowAttendance), [subjects]);

  // Filter subjects based on universal search
  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjects;
    const q = searchQuery.toLowerCase();
    return subjects.filter(s => 
      s.subjectName?.toLowerCase().includes(q) ||
      s.subjectCode?.toLowerCase().includes(q) ||
      s.className?.toLowerCase().includes(q)
    );
  }, [subjects, searchQuery]);

  // Filtered session list inside modal
  const filteredSessions = useMemo(() => {
    if (!selectedSubject) return [];
    const list = selectedSubject.sessions || [];
    if (sessionFilter === 'PRESENT') return list.filter(s => s.present);
    if (sessionFilter === 'ABSENT') return list.filter(s => !s.present);
    return list;
  }, [selectedSubject, sessionFilter]);

  if (isLoadingChildren) {
    return (
      <div className="space-y-4 sm:space-y-6 max-w-7xl pb-12">
        <div className="h-24 bg-surface-0 animate-pulse rounded-xl border border-border" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-0 animate-pulse rounded-xl border border-border" />
          ))}
        </div>
        <div className="h-64 bg-surface-0 animate-pulse rounded-xl border border-border" />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <EmptyState
        title={t('myChildren')}
        description={t('noChildrenLinked')}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner - Clean, Minimal & Welcoming */}
      <div className="bg-surface-0 border border-border rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-900 tracking-tight">
            {t('attendanceRecord')}
          </h2>
          <p className="text-xs sm:text-sm text-text-500 mt-1">
            {t('attendanceSubtitle')} {selectedChild?.name || t('student')}
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

      {/* Ward Switcher (Only if parent has multiple children) */}
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
                  setSelectedSubject(null);
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

      {/* Simple Attendance Summary Cards */}
      {isLoadingAttendance ? (
        <div className="bg-surface-0 border border-border rounded-xl p-8 text-center text-xs text-text-500">
          <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-ink-700" />
          Loading attendance summary...
        </div>
      ) : overall ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Cumulative Attendance */}
          <div className={`rounded-xl p-4 sm:p-5 border shadow-xs ${
            overall.isLowAttendance 
              ? 'bg-danger/5 border-danger/25' 
              : 'bg-surface-0 border-border'
          }`}>
            <span className="text-xs font-semibold text-text-500 uppercase tracking-wider block">
              {t('overallAttendance')}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-3xl font-extrabold font-mono tracking-tight ${
                overall.isLowAttendance ? 'text-danger' : 'text-text-900'
              }`}>
                {overall.percentage}%
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                overall.isLowAttendance 
                  ? 'bg-danger/10 text-danger' 
                  : 'bg-emerald-50 text-emerald-700'
              }`}>
                {overall.isLowAttendance ? '< 75%' : t('goodStanding')}
              </span>
            </div>
            <p className="text-xs text-text-500 mt-1.5">
              {overall.attendedSessions} / {overall.totalSessions} {t('sessionsRecorded')}
            </p>
          </div>

          {/* Classes Attended */}
          <div className="bg-surface-0 border border-border rounded-xl p-4 sm:p-5 shadow-xs">
            <span className="text-xs font-semibold text-text-500 uppercase tracking-wider block">
              {t('classesAttended')}
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold font-mono text-emerald-700 tracking-tight">
                {overall.attendedSessions}
              </span>
              <span className="text-sm font-mono text-text-400 font-medium">
                / {overall.totalSessions}
              </span>
            </div>
            <p className="text-xs text-text-500 mt-1.5">
              {t('acrossRegistered')} ({subjects.length})
            </p>
          </div>

          {/* Subjects Status */}
          <div className="bg-surface-0 border border-border rounded-xl p-4 sm:p-5 shadow-xs">
            <span className="text-xs font-semibold text-text-500 uppercase tracking-wider block">
              {t('courseHealth')}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-3xl font-extrabold font-mono tracking-tight ${
                atRiskSubjects.length > 0 ? 'text-danger' : 'text-emerald-700'
              }`}>
                {subjects.length - atRiskSubjects.length} / {subjects.length}
              </span>
              <span className="text-xs text-text-500 font-medium">
                {t('target')}
              </span>
            </div>
            <p className="text-xs text-text-500 mt-1.5">
              {atRiskSubjects.length === 0
                ? t('allHealthyAttendance')
                : `${atRiskSubjects.length} ${t('requireAttention')}`}
            </p>
          </div>
        </div>
      ) : null}

      {/* Gentle Notice if Attendance is Below Threshold */}
      {atRiskSubjects.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 sm:p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-700 shrink-0 mt-0.5" size={18} />
          <div className="text-xs text-amber-900 leading-relaxed">
            <strong className="font-bold">{t('lowAttendanceWarning')}:</strong> {selectedChild?.name} {t('lowAttendanceNotice')}{' '}
            <span className="font-semibold underline">
              {atRiskSubjects.map(s => `${s.subjectName} (${s.percentage}%)`).join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* Clean Subject Attendance List */}
      <div className="bg-surface-0 border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-text-900">
              {t('subjectWiseBreakdown')}
            </h3>
            <p className="text-xs text-text-500 mt-0.5">
              {t('attendanceHint')}
            </p>
          </div>
          <span className="text-xs text-text-500 font-medium hidden sm:inline">
            {filteredSubjects.length} {t('enrolledCourses')}
          </span>
        </div>

        {filteredSubjects.length === 0 ? (
          <div className="p-10 text-center text-xs text-text-500 italic bg-surface-50">
            {searchQuery ? `No subject matches "${searchQuery}"` : t('noSubjectsFound')}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredSubjects.map(sub => {
              const isLow = sub.isLowAttendance;
              return (
                <div
                  key={sub.enrollmentId}
                  onClick={() => {
                    setSelectedSubject(sub);
                    setSessionFilter('ALL');
                  }}
                  className="p-4 sm:p-5 hover:bg-surface-50/70 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  {/* Left: Subject Name & Meta */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-text-700 px-2 py-0.5 rounded bg-surface-100">
                        {sub.subjectCode}
                      </span>
                      <h4 className="font-bold text-sm sm:text-base text-text-900 group-hover:text-ink-700 transition-colors truncate">
                        {sub.subjectName}
                      </h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-500">
                      <span>{t('classesAttended')}: <strong>{sub.attendedSessions}</strong> / {sub.totalSessions}</span>
                      <span>•</span>
                      <span>{sub.className || 'Regular'}</span>
                    </div>
                  </div>

                  {/* Right: Progress bar & Percentage */}
                  <div className="flex items-center gap-3 sm:gap-4 shrink-0 justify-between sm:justify-end">
                    <div className="w-28 sm:w-36 space-y-1">
                      <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden border border-border/40">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${isLow ? 'bg-danger' : 'bg-emerald-600'}`}
                          style={{ width: `${Math.min(sub.percentage, 100)}%` }}
                        />
                      </div>
                      <div className="text-[11px] font-mono text-right text-text-500">
                        {t('target')}
                      </div>
                    </div>

                    <div className="text-right min-w-[70px]">
                      <div className={`text-base sm:text-lg font-extrabold font-mono ${isLow ? 'text-danger' : 'text-text-900'}`}>
                        {sub.percentage}%
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                        isLow
                          ? 'bg-danger/10 text-danger'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {isLow ? t('lowStanding') : t('goodStanding')}
                      </span>
                    </div>

                    <ChevronRight size={18} className="text-text-400 group-hover:text-text-900 group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Class Attendance Details Modal (Minimal & Focused) */}
      {selectedSubject && (
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
                    {selectedSubject.subjectCode}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    selectedSubject.isLowAttendance 
                      ? 'bg-danger/10 text-danger' 
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {selectedSubject.percentage}% {selectedSubject.isLowAttendance ? t('lowStanding') : t('goodStanding')}
                  </span>
                </div>
                <h3 className="text-base font-bold text-text-900 mt-1">
                  {selectedSubject.subjectName}
                </h3>
                <p className="text-xs text-text-500 mt-0.5">
                  {selectedSubject.attendedSessions} / {selectedSubject.totalSessions} {t('sessionsRecorded')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSubject(null)}
                className="p-1.5 rounded-lg text-text-400 hover:text-text-900 hover:bg-surface-100 transition-colors"
                title={t('close')}
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter Tabs (All / Present / Missed) */}
            <div className="px-4 py-2 border-b border-border bg-surface-0 flex items-center gap-1.5">
              {[
                { key: 'ALL', label: `${t('allSessions')} (${selectedSubject.sessions?.length || 0})` },
                { key: 'PRESENT', label: `${t('attendedFilter')} (${selectedSubject.sessions?.filter(s => s.present).length || 0})` },
                { key: 'ABSENT', label: `${t('missedFilter')} (${selectedSubject.sessions?.filter(s => !s.present).length || 0})` }
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSessionFilter(tab.key)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    sessionFilter === tab.key
                      ? 'bg-ink-900 text-white'
                      : 'bg-surface-50 text-text-600 hover:text-text-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Session History List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {filteredSessions.length === 0 ? (
                <div className="py-10 text-center text-xs text-text-500 italic bg-surface-50 rounded-lg">
                  {t('noSessionsFound')}
                </div>
              ) : (
                filteredSessions.map((sess) => (
                  <div
                    key={sess.recordId}
                    className="p-3 rounded-lg border border-border bg-surface-0 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-text-900 flex items-center gap-1.5">
                        <Calendar size={13} className="text-text-400" />
                        <span>{sess.date}</span>
                        {sess.startTime && (
                          <span className="text-text-400 font-mono text-[11px] font-normal">
                            ({sess.startTime} - {sess.endTime})
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-500">
                        {sess.topic || 'Lecture session'} {sess.teacherName ? `• ${sess.teacherName}` : ''}
                      </p>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 shrink-0 ${
                      sess.present
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-danger/10 text-danger border border-danger/20'
                    }`}>
                      {sess.present ? (
                        <>
                          <CheckCircle2 size={12} /> {t('presentBadge')}
                        </>
                      ) : (
                        <>
                          <XCircle size={12} /> {t('missedBadge')}
                        </>
                      )}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-border bg-surface-50/60 flex items-center justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedSubject(null)}
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
