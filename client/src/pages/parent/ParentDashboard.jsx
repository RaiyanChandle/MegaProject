import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSearch } from '../../context/SearchContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Clock, 
  Award, 
  ChevronRight, 
  AlertTriangle, 
  BookOpen, 
  GraduationCap, 
  RefreshCw,
  FileCheck,
  Layers
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Link } from 'react-router-dom';

export default function ParentDashboard() {
  const { user } = useAuth();
  const { searchQuery } = useSearch();
  const { t, currentLanguage, changeLanguage, languages } = useLanguage();

  // State
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [childAttendance, setChildAttendance] = useState(null);
  const [childMarks, setChildMarks] = useState(null);
  const [childAssignments, setChildAssignments] = useState([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // 1. Fetch linked children
  useEffect(() => {
    const fetchChildren = async () => {
      setIsLoadingChildren(true);
      try {
        const data = await apiClient.get('/parents/my-children');
        const list = Array.isArray(data) ? data : [];
        setChildren(list);
        if (list.length > 0) {
          setSelectedChildId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load children:', err);
      } finally {
        setIsLoadingChildren(false);
      }
    };
    fetchChildren();
  }, []);

  // 2. Fetch selected child telemetry (Attendance, Marks, Assignments)
  useEffect(() => {
    if (!selectedChildId) {
      setChildAttendance(null);
      setChildMarks(null);
      setChildAssignments([]);
      return;
    }

    const fetchChildData = async () => {
      setIsLoadingDetails(true);
      try {
        const [attRes, marksRes, assignRes] = await Promise.allSettled([
          apiClient.get(`/attendance/student/${selectedChildId}`),
          apiClient.get(`/marks/my-marks?studentId=${selectedChildId}`),
          apiClient.get(`/assignments/my-assignments?studentId=${selectedChildId}`)
        ]);

        if (attRes.status === 'fulfilled') setChildAttendance(attRes.value);
        else setChildAttendance(null);

        if (marksRes.status === 'fulfilled') setChildMarks(marksRes.value);
        else setChildMarks(null);

        if (assignRes.status === 'fulfilled') setChildAssignments(Array.isArray(assignRes.value) ? assignRes.value : []);
        else setChildAssignments([]);
      } catch (err) {
        console.error('Failed to load child telemetry:', err);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchChildData();
  }, [selectedChildId]);

  // Selected child object
  const activeChild = useMemo(() => {
    return children.find(c => c.id === selectedChildId) || children[0] || null;
  }, [children, selectedChildId]);

  // Attendance metrics
  const overallPct = childAttendance?.overallStats?.percentage;
  const attendedSessions = childAttendance?.overallStats?.attendedSessions || 0;
  const totalSessions = childAttendance?.overallStats?.totalSessions || 0;
  const isLowAttendance = childAttendance?.overallStats?.isLowAttendance;
  const subjects = childAttendance?.subjects || [];

  // Marks metrics
  const passedSubjectsCount = useMemo(() => {
    if (!childMarks?.subjects) return 0;
    return childMarks.subjects.filter(s => s.subjectResult?.isPass === true).length;
  }, [childMarks]);

  const totalEvaluatedSubjects = childMarks?.subjects?.length || 0;

  // Assignments metrics
  const pendingAssignmentsCount = useMemo(() => {
    return childAssignments.filter(a => !a.hasSubmitted).length;
  }, [childAssignments]);

  const overdueAssignmentsCount = useMemo(() => {
    return childAssignments.filter(a => a.isPastDeadline && !a.hasSubmitted).length;
  }, [childAssignments]);

  // Filtered subjects based on search
  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjects;
    const q = searchQuery.toLowerCase();
    return subjects.filter(s =>
      s.subjectName?.toLowerCase().includes(q) ||
      s.subjectCode?.toLowerCase().includes(q)
    );
  }, [subjects, searchQuery]);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto pb-12">
      {/* Welcome & Navigation Header */}
      <div className="bg-surface-0 border border-border rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-text-900 tracking-tight">
              {t('welcomeParent')}, {user?.name || t('student')}
            </h2>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-50 border border-border text-ink-900 font-semibold">
              {t('portal')}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-500 mt-1">
            {t('subtitle')}
          </p>
        </div>

        {/* Quick Actions & In-Page Language Selector */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Quick Language Dropdown right on dashboard */}
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

          <Link
            to="/parent/attendance"
            className="px-3 py-1.5 rounded-lg border border-border bg-surface-50 hover:bg-surface-100 text-text-900 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-xs"
          >
            <Clock size={13} className="text-ink-900" />
            <span>{t('attendance')}</span>
          </Link>
          <Link
            to="/parent/results"
            className="px-3 py-1.5 rounded-lg border border-brass-500/30 bg-brass-500/10 hover:bg-brass-500/20 text-brass-800 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-xs"
          >
            <Award size={13} className="text-brass-700" />
            <span>Result Card</span>
          </Link>
          <Link
            to="/parent/marks"
            className="px-3 py-1.5 rounded-lg border border-border bg-surface-50 hover:bg-surface-100 text-text-900 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-xs"
          >
            <Layers size={13} className="text-ink-900" />
            <span>{t('marks')}</span>
          </Link>
          <Link
            to="/parent/assignments"
            className="px-3 py-1.5 rounded-lg bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-xs"
          >
            <BookOpen size={13} />
            <span>{t('assignments')}</span>
          </Link>
        </div>
      </div>

      {/* Ward Selector (For parents with multiple children) */}
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
                onClick={() => setSelectedChildId(child.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-ink-900 text-white border-ink-900 shadow-xs'
                    : 'bg-surface-0 text-text-700 border-border hover:bg-surface-50'
                }`}
              >
                <GraduationCap size={13} className={isSelected ? 'text-brass-500' : 'text-text-400'} />
                <span>{child.name}</span>
                <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded ${
                  isSelected ? 'bg-ink-700 text-slate-200' : 'bg-surface-100 text-text-500'
                }`}>
                  {child.rollNumber || child.instituteId}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Deficit Alert if Selected Ward is Below 75% */}
      {isLowAttendance && (
        <div className="bg-danger/5 border border-danger/25 rounded-xl p-3.5 sm:p-4 flex items-start gap-3">
          <AlertTriangle className="text-danger shrink-0 mt-0.5" size={18} />
          <div className="text-xs text-danger leading-relaxed">
            <strong className="font-bold">{t('lowAttendanceWarning')}:</strong> {activeChild?.name} {t('lowAttendanceNotice')} ({overallPct}%).
          </div>
        </div>
      )}

      {/* Minimal 3-Card Core Overview */}
      {isLoadingDetails ? (
        <div className="bg-surface-0 border border-border rounded-xl p-8 text-center text-xs text-text-500">
          <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-ink-700" />
          Loading student overview...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Attendance */}
          <Link
            to="/parent/attendance"
            className="bg-surface-0 border border-border hover:border-ink-700 rounded-xl p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-500 uppercase tracking-wider">
                  {t('attendanceHealth')}
                </span>
                <Clock size={16} className={isLowAttendance ? 'text-danger' : 'text-ink-900'} />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-3xl font-extrabold font-mono tracking-tight ${
                  isLowAttendance ? 'text-danger' : 'text-text-900'
                }`}>
                  {overallPct !== undefined ? `${overallPct}%` : '--%'}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isLowAttendance ? 'bg-danger/10 text-danger' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {isLowAttendance ? t('lowStanding') : t('goodStanding')}
                </span>
              </div>
            </div>
            <p className="text-xs text-text-500 mt-2 flex items-center justify-between">
              <span>{attendedSessions} / {totalSessions} {t('totalSessions')}</span>
              <ChevronRight size={14} className="text-text-400 group-hover:text-text-900 group-hover:translate-x-0.5 transition-all" />
            </p>
          </Link>

          {/* Card 2: Marks & Result Card */}
          <Link
            to="/parent/results"
            className="bg-surface-0 border border-border hover:border-brass-600 rounded-xl p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-500 uppercase tracking-wider">
                  Result Card & Grades
                </span>
                <Award size={16} className="text-brass-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-emerald-700 tracking-tight">
                  {passedSubjectsCount}
                </span>
                <span className="text-sm font-mono text-text-400 font-medium">
                  / {totalEvaluatedSubjects} {t('subjectsCleared')}
                </span>
              </div>
            </div>
            <p className="text-xs text-text-500 mt-2 flex items-center justify-between">
              <span>Current term evaluations</span>
              <ChevronRight size={14} className="text-text-400 group-hover:text-text-900 group-hover:translate-x-0.5 transition-all" />
            </p>
          </Link>

          {/* Card 3: Pending Homework */}
          <Link
            to="/parent/assignments"
            className="bg-surface-0 border border-border hover:border-ink-700 rounded-xl p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-500 uppercase tracking-wider">
                  {t('pendingAssignments')}
                </span>
                <FileCheck size={16} className={pendingAssignmentsCount > 0 ? 'text-amber-700' : 'text-emerald-700'} />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-3xl font-extrabold font-mono tracking-tight ${
                  pendingAssignmentsCount > 0 ? 'text-amber-800' : 'text-emerald-700'
                }`}>
                  {pendingAssignmentsCount}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  pendingAssignmentsCount > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {pendingAssignmentsCount > 0 ? t('actionNeeded') : t('allClear')}
                </span>
              </div>
            </div>
            <p className="text-xs text-text-500 mt-2 flex items-center justify-between">
              <span>{overdueAssignmentsCount > 0 ? `${overdueAssignmentsCount} overdue` : t('allDone')}</span>
              <ChevronRight size={14} className="text-text-400 group-hover:text-text-900 group-hover:translate-x-0.5 transition-all" />
            </p>
          </Link>
        </div>
      )}

      {/* Clean Subject Attendance Breakdown */}
      {activeChild && subjects.length > 0 && (
        <div className="bg-surface-0 border border-border rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-text-900">
                {t('attendanceOverview')}
              </h3>
              <p className="text-xs text-text-500 mt-0.5">
                {activeChild.name} • {subjects.length} registered subjects
              </p>
            </div>
            <Link
              to="/parent/attendance"
              className="text-xs font-semibold text-ink-900 hover:underline inline-flex items-center gap-1"
            >
              {t('viewDetails')} <ChevronRight size={14} />
            </Link>
          </div>

          <div className="divide-y divide-border">
            {filteredSubjects.map(sub => {
              const pct = sub.percentage !== undefined ? sub.percentage : 100;
              const isSubLow = sub.isLowAttendance;

              return (
                <Link
                  key={sub.enrollmentId || sub.subjectId}
                  to="/parent/attendance"
                  className="p-4 sm:p-5 hover:bg-surface-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group block"
                >
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
                      <span>{sub.attendedSessions || 0} of {sub.totalSessions || 0} {t('classesAttended')}</span>
                      <span>•</span>
                      <span>Faculty: {sub.teacher?.name || 'Assigned Faculty'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4 shrink-0 justify-between sm:justify-end">
                    <div className="w-28 sm:w-36 space-y-1">
                      <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden border border-border/40">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${isSubLow ? 'bg-danger' : 'bg-emerald-600'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <div className="text-[11px] font-mono text-right text-text-500">
                        {t('target')}
                      </div>
                    </div>

                    <div className="text-right min-w-[65px]">
                      <div className={`text-base sm:text-lg font-extrabold font-mono ${isSubLow ? 'text-danger' : 'text-text-900'}`}>
                        {pct}%
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                        isSubLow ? 'bg-danger/10 text-danger' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {isSubLow ? t('lowStanding') : t('goodStanding')}
                      </span>
                    </div>

                    <ChevronRight size={18} className="text-text-400 group-hover:text-text-900 group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
