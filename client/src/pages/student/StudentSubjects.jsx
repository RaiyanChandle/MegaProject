import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSearch } from '../../context/SearchContext';
import { 
  BookOpen, 
  Clock, 
  FileText, 
  FileCheck, 
  Award, 
  Layers, 
  GraduationCap, 
  UserCheck, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  ArrowRight,
  Mail,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Link } from 'react-router-dom';

export default function StudentSubjects() {
  const { user } = useAuth();
  const { searchQuery } = useSearch();

  const [data, setData] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [expandedSubjectId, setExpandedSubjectId] = useState(null);

  useEffect(() => {
    const fetchSubjectsData = async () => {
      setIsLoading(true);
      try {
        const [subRes, attRes] = await Promise.allSettled([
          apiClient.get('/students/my-subjects'),
          apiClient.get('/attendance/my-summary')
        ]);

        if (subRes.status === 'fulfilled') {
          setData(subRes.value);
        }
        if (attRes.status === 'fulfilled') {
          setAttendanceSummary(attRes.value);
        }
      } catch (err) {
        console.error('Failed to load enrolled subjects:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubjectsData();
  }, []);

  const enrollments = data?.enrollments || [];
  const term = data?.term || attendanceSummary?.term;
  const studentInfo = data?.student || attendanceSummary?.student;

  // Map attendance stats by subjectId for telemetry
  const attendanceMap = useMemo(() => {
    const map = new Map();
    if (attendanceSummary?.subjects) {
      attendanceSummary.subjects.forEach(s => {
        map.set(s.subjectId, s);
      });
    }
    return map;
  }, [attendanceSummary]);

  // Compute metrics
  const totalCredits = useMemo(() => {
    return enrollments.reduce((sum, enr) => sum + (enr.subject?.credits || 0), 0);
  }, [enrollments]);

  const coreCount = useMemo(() => {
    return enrollments.filter(e => e.subject?.subjectType === 'CORE').length;
  }, [enrollments]);

  const electiveCount = useMemo(() => {
    return enrollments.filter(e => e.subject?.subjectType === 'ELECTIVE').length;
  }, [enrollments]);

  const backlogCount = useMemo(() => {
    return enrollments.filter(e => (e.attemptNumber > 1 || e.isBacklog)).length;
  }, [enrollments]);

  // Filter enrollments based on tab and universal search
  const filteredEnrollments = useMemo(() => {
    return enrollments.filter(enr => {
      if (activeTab === 'CORE' && enr.subject?.subjectType !== 'CORE') return false;
      if (activeTab === 'ELECTIVE' && enr.subject?.subjectType !== 'ELECTIVE') return false;
      if (activeTab === 'BACKLOG' && !(enr.attemptNumber > 1 || enr.isBacklog)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const code = enr.subject?.code?.toLowerCase() || '';
        const name = enr.subject?.name?.toLowerCase() || '';
        const teacher = enr.teacher?.name?.toLowerCase() || '';
        if (!code.includes(q) && !name.includes(q) && !teacher.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [enrollments, activeTab, searchQuery]);

  const toggleExpand = (id) => {
    setExpandedSubjectId(prev => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Mobile-Friendly Banner */}
      <div className="bg-surface-0 border border-border rounded-xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-ink-900 text-white flex items-center justify-center shrink-0 shadow-xs border border-ink-700">
              <BookOpen size={22} className="text-brass-500" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-2xl font-bold text-text-900 tracking-tight truncate">
                  My Enrolled Subjects
                </h2>
                {term && (
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-50 border border-border text-ink-900 font-semibold">
                    {term.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-500 mt-0.5">
                Current semester curriculum and active course schedule
              </p>
            </div>
          </div>

          {/* Action Navigation */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
            <Link
              to="/student/electives"
              className="text-center justify-center px-3 py-2 rounded-lg border border-border bg-surface-50 hover:bg-surface-100 text-text-900 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-xs"
            >
              <Layers size={13} className="text-ink-900 shrink-0" />
              <span>Electives</span>
            </Link>
            <Link
              to="/student/attendance"
              className="text-center justify-center px-3 py-2 rounded-lg bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-xs"
            >
              <Clock size={13} className="shrink-0" />
              <span>Attendance</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards: 2x2 Grid with Proper Mobile Spacing */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Courses */}
        <div className="bg-surface-0 border border-border rounded-xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-text-500 font-medium uppercase tracking-wide">
              Courses
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-ink-900/10 text-ink-900">
              <BookOpen size={15} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-text-900">
              {enrollments.length}
            </div>
            <span className="text-[10px] sm:text-[11px] text-text-500 block truncate">
              Active semester
            </span>
          </div>
        </div>

        {/* Total Credits */}
        <div className="bg-surface-0 border border-border rounded-xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-text-500 font-medium uppercase tracking-wide">
              Credits
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <GraduationCap size={15} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-text-900">
              {totalCredits}
            </div>
            <span className="text-[10px] sm:text-[11px] text-text-500 block truncate">
              Total credit load
            </span>
          </div>
        </div>

        {/* Core vs Elective */}
        <div className="bg-surface-0 border border-border rounded-xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-text-500 font-medium uppercase tracking-wide">
              Structure
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-surface-100 text-text-700">
              <Layers size={15} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-lg sm:text-2xl font-bold font-mono text-text-900">
              {coreCount} <span className="text-xs font-normal text-text-400">Core</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-text-500 block truncate">
              {electiveCount} Elective course{electiveCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Backlogs */}
        <div className="bg-surface-0 border border-border rounded-xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-text-500 font-medium uppercase tracking-wide">
              Backlogs
            </span>
            <div className={`p-1.5 sm:p-2 rounded-lg ${backlogCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-surface-100 text-emerald-700'}`}>
              <Award size={15} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className={`text-xl sm:text-2xl font-bold font-mono ${backlogCount > 0 ? 'text-amber-800' : 'text-text-900'}`}>
              {backlogCount}
            </div>
            <span className="text-[10px] sm:text-[11px] text-text-500 block truncate">
              {backlogCount > 0 ? 'Re-attempts required' : 'Zero backlogs'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs: Horizontal Scroll with Thumb Spacing */}
      <div className="bg-surface-0 border border-border rounded-xl p-1 shadow-xs flex items-center gap-1 overflow-x-auto no-scrollbar">
        {[
          { key: 'ALL', label: 'All Courses', count: enrollments.length },
          { key: 'CORE', label: 'Core', count: coreCount },
          { key: 'ELECTIVE', label: 'Electives', count: electiveCount },
          ...(backlogCount > 0 ? [{ key: 'BACKLOG', label: 'Backlogs', count: backlogCount }] : [])
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 sm:flex-initial px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
              activeTab === tab.key
                ? 'bg-ink-900 text-white shadow-xs'
                : 'text-text-600 hover:text-text-900 hover:bg-surface-50'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
              activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-surface-100 text-text-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Course List: Mobile Ergonomic Cards */}
      {isLoading ? (
        <div className="bg-surface-0 border border-border rounded-xl p-10 text-center text-xs text-text-500">
          <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-ink-700" />
          Loading enrolled curriculum...
        </div>
      ) : filteredEnrollments.length > 0 ? (
        <div className="space-y-3.5 sm:space-y-4">
          {filteredEnrollments.map((enr) => {
            const subject = enr.subject || {};
            const teacher = enr.teacher;
            const att = attendanceMap.get(subject.id);
            const isExpanded = expandedSubjectId === enr.id;
            const components = subject.assessmentComponents || [];
            const isBacklog = enr.attemptNumber > 1 || enr.isBacklog;
            const attPct = att?.percentage !== undefined ? att.percentage : 100;
            const isLow = att?.isLowAttendance;

            return (
              <div 
                key={enr.id} 
                className="bg-surface-0 border border-border rounded-xl shadow-xs overflow-hidden transition-all hover:border-ink-700/60"
              >
                {/* Subject Body */}
                <div className="p-4 sm:p-5 space-y-3.5">
                  
                  {/* Badges Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-ink-900 text-white tracking-wide uppercase">
                        {subject.code || 'CODE'}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-surface-50 border border-border text-text-700">
                        {subject.subjectType || 'CORE'}
                      </span>
                      <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-surface-50 border border-border text-ink-900">
                        {subject.credits} Credits
                      </span>
                    </div>

                    {isBacklog && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        Re-attempt #{enr.attemptNumber}
                      </span>
                    )}
                  </div>

                  {/* Course Title */}
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-text-900 leading-snug">
                      {subject.name}
                    </h3>

                    {/* Faculty Details */}
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-text-600">
                      <div className="w-6 h-6 rounded-full bg-surface-100 flex items-center justify-center text-ink-900 font-bold text-[10px] shrink-0 border border-border">
                        {(teacher?.name || 'F').charAt(0)}
                      </div>
                      <span className="font-medium text-text-800 truncate">
                        {teacher?.name || 'Assigned Faculty'}
                      </span>
                      {teacher?.email && (
                        <span className="text-text-400 font-mono text-[11px] hidden sm:inline">
                          ({teacher.email})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Attendance Health Progress Bar */}
                  <div className="bg-surface-50 border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-text-700 flex items-center gap-1.5">
                        <Clock size={13} className="text-ink-900" />
                        <span>Attendance Health</span>
                      </span>
                      <span className={`font-mono font-bold text-sm ${isLow ? 'text-danger' : 'text-emerald-700'}`}>
                        {att ? `${attPct}%` : '100%'}
                      </span>
                    </div>

                    {/* Progress Bar Track */}
                    <div className="w-full bg-surface-200 rounded-full h-2 overflow-hidden border border-border/40">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${isLow ? 'bg-danger' : 'bg-emerald-600'}`}
                        style={{ width: `${Math.min(attPct, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-text-500 font-mono pt-0.5">
                      <span>{att?.attendedSessions || 0} of {att?.totalSessions || 0} sessions attended</span>
                      <span className={isLow ? 'text-danger font-semibold' : 'text-emerald-700'}>
                        {isLow ? 'Deficit (<75%)' : 'Healthy'}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Touch Action Buttons (2x2 on mobile, 4 in a row on tablet/desktop) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <Link
                      to="/student/attendance"
                      className="h-10 px-3 rounded-lg border border-border bg-surface-0 hover:bg-surface-50 text-xs font-semibold text-text-800 transition-colors inline-flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98]"
                    >
                      <Clock size={13} className="text-ink-900 shrink-0" />
                      <span>Attendance</span>
                    </Link>
                    <Link
                      to="/student/notes"
                      className="h-10 px-3 rounded-lg border border-border bg-surface-0 hover:bg-surface-50 text-xs font-semibold text-text-800 transition-colors inline-flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98]"
                    >
                      <FileText size={13} className="text-brass-600 shrink-0" />
                      <span>Study Notes</span>
                    </Link>
                    <Link
                      to="/student/assignments"
                      className="h-10 px-3 rounded-lg border border-border bg-surface-0 hover:bg-surface-50 text-xs font-semibold text-text-800 transition-colors inline-flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98]"
                    >
                      <FileCheck size={13} className="text-emerald-600 shrink-0" />
                      <span>Assignments</span>
                    </Link>
                    <Link
                      to="/student/marks"
                      className="h-10 px-3 rounded-lg border border-border bg-surface-0 hover:bg-surface-50 text-xs font-semibold text-text-800 transition-colors inline-flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98]"
                    >
                      <Award size={13} className="text-ink-900 shrink-0" />
                      <span>Marks & Tests</span>
                    </Link>
                  </div>

                  {/* Evaluation Criteria Collapsible Toggle */}
                  <button
                    onClick={() => toggleExpand(enr.id)}
                    className="w-full py-2 px-3 rounded-lg bg-surface-50 hover:bg-surface-100 text-xs font-semibold text-ink-900 transition-colors flex items-center justify-between border border-border/60"
                  >
                    <span className="flex items-center gap-1.5">
                      <Award size={14} className="text-ink-900" />
                      <span>Evaluation Scheme ({components.length} components)</span>
                    </span>
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                </div>

                {/* Collapsible Evaluation Schema */}
                {isExpanded && (
                  <div className="bg-surface-50 border-t border-border p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold text-text-900 uppercase tracking-wide">
                        Assessment Breakdown
                      </h4>
                      <span className="text-[11px] text-text-500 font-mono">
                        University Passing Criteria
                      </span>
                    </div>

                    {components.length === 0 ? (
                      <p className="text-xs text-text-500 italic py-1">
                        No specific assessment components have been configured for this course yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {components.map((comp) => (
                          <div 
                            key={comp.id} 
                            className="bg-surface-0 border border-border rounded-lg p-3 shadow-xs flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-text-900 truncate">{comp.name}</p>
                              <p className="text-[10px] text-text-500 font-mono uppercase mt-0.5">
                                Category: {comp.category || 'EXAM'}
                              </p>
                            </div>
                            <div className="text-right shrink-0 font-mono text-xs">
                              <span className="text-text-900 font-bold">{comp.maxMarks} max</span>
                              <span className="text-text-400 block text-[10px]">Pass: {comp.passingMarks}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-surface-0 border border-border rounded-xl p-10 text-center text-xs text-text-500">
          <BookOpen size={28} className="mx-auto mb-2 text-text-400" />
          <p className="font-bold text-sm text-text-900">
            {searchQuery ? `No courses matching "${searchQuery}"` : 'No enrolled courses found'}
          </p>
          <p className="text-text-400 mt-1 max-w-sm mx-auto">
            {searchQuery 
              ? 'Try clearing the search query or changing your filter tab.' 
              : 'You do not have any enrolled courses assigned for the active academic term.'
            }
          </p>
        </div>
      )}
    </div>
  );
}
