import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  DollarSign, 
  FileCheck, 
  Layers, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  ArrowRight,
  TrendingUp,
  Download,
  GraduationCap,
  Sparkles,
  Award
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/ui/StatusBadge';

export default function StudentDashboard() {
  const { user } = useAuth();
  
  // Data states
  const [attendanceData, setAttendanceData] = useState(null);
  const [enrolledSubjectsData, setEnrolledSubjectsData] = useState(null);
  const [activeSubjectTab, setActiveSubjectTab] = useState('ALL');
  const [assignments, setAssignments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [marksData, setMarksData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const [attRes, assignRes, notesRes, marksRes, subRes] = await Promise.allSettled([
          apiClient.get('/attendance/my-summary'),
          apiClient.get('/assignments/my-assignments'),
          apiClient.get('/notes/my-notes'),
          apiClient.get('/marks/my-marks'),
          apiClient.get('/students/my-subjects')
        ]);

        if (attRes.status === 'fulfilled') setAttendanceData(attRes.value);
        if (assignRes.status === 'fulfilled') setAssignments(assignRes.value || []);
        if (notesRes.status === 'fulfilled') setNotes(notesRes.value || []);
        if (marksRes.status === 'fulfilled') setMarksData(marksRes.value);
        if (subRes.status === 'fulfilled') setEnrolledSubjectsData(subRes.value);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Attendance metrics
  const overallPct = attendanceData?.overallStats?.percentage;
  const totalSessions = attendanceData?.overallStats?.totalSessions || 0;
  const attendedSessions = attendanceData?.overallStats?.attendedSessions || 0;
  const isLow = attendanceData?.overallStats?.isLowAttendance;
  const currentTerm = attendanceData?.term || enrolledSubjectsData?.term;
  const studentInfo = attendanceData?.student || enrolledSubjectsData?.student;

  // Unified Subjects combining attendance telemetry and curriculum metadata (Rule 6: current + backlog together)
  const subjects = useMemo(() => {
    const attSubjects = attendanceData?.subjects || [];
    const enrList = enrolledSubjectsData?.enrollments || [];

    if (attSubjects.length === 0 && enrList.length > 0) {
      return enrList.map(e => ({
        enrollmentId: e.id,
        subjectId: e.subject?.id,
        subjectName: e.subject?.name,
        subjectCode: e.subject?.code,
        subjectType: e.subject?.subjectType,
        credits: e.subject?.credits,
        className: e.class?.name,
        attemptNumber: e.attemptNumber || 1,
        isBacklog: e.attemptNumber > 1 || e.isBacklog,
        totalSessions: 0,
        attendedSessions: 0,
        percentage: 100,
        isLowAttendance: false,
        teacher: e.teacher
      }));
    }

    return attSubjects.map(sub => {
      const matchingEnr = enrList.find(e => e.id === sub.enrollmentId || e.subjectId === sub.subjectId);
      return {
        ...sub,
        attemptNumber: sub.attemptNumber || matchingEnr?.attemptNumber || 1,
        isBacklog: sub.isBacklog || (sub.attemptNumber > 1) || matchingEnr?.isBacklog || (matchingEnr?.attemptNumber > 1),
        teacher: matchingEnr?.teacher || null,
        className: sub.className || matchingEnr?.class?.name
      };
    });
  }, [attendanceData, enrolledSubjectsData]);

  // Breakdown of Regular vs Backlog re-attempt subjects
  const regularSubjects = useMemo(() => {
    return subjects.filter(s => !s.isBacklog && (s.attemptNumber === 1 || !s.attemptNumber));
  }, [subjects]);

  const backlogSubjects = useMemo(() => {
    return subjects.filter(s => s.isBacklog || (s.attemptNumber && s.attemptNumber > 1));
  }, [subjects]);

  // Filtered view based on user tab selection
  const filteredSubjects = useMemo(() => {
    if (activeSubjectTab === 'REGULAR') return regularSubjects;
    if (activeSubjectTab === 'BACKLOG') return backlogSubjects;
    return subjects;
  }, [subjects, regularSubjects, backlogSubjects, activeSubjectTab]);

  // Assignment metrics
  const pendingAssignments = useMemo(() => {
    return assignments.filter(a => !a.submission || a.submission.status === 'DRAFT');
  }, [assignments]);

  const submittedAssignments = useMemo(() => {
    return assignments.filter(a => a.submission && a.submission.status === 'SUBMITTED');
  }, [assignments]);

  // Recent notes (latest 3)
  const recentNotes = useMemo(() => {
    return (notes || []).slice(0, 4);
  }, [notes]);

  // At risk subjects (<75%)
  const lowAttendanceSubjects = useMemo(() => {
    return subjects.filter(s => s.isLowAttendance);
  }, [subjects]);

  return (
    <div className="space-y-6 pb-12">
      {/* Student Welcome & Profile Banner */}
      <div className="bg-surface-0 border border-border rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start md:items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-ink-900 text-white font-bold text-xl flex items-center justify-center shrink-0 shadow-xs border border-ink-700">
            {(user?.name || 'S').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-text-900 tracking-tight">
                Welcome back, {user?.name || 'Student'}
              </h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-50 border border-border text-ink-900 font-semibold">
                {user?.instituteId || studentInfo?.instituteId || 'STKIT'}
              </span>
            </div>
            <p className="text-xs text-text-500 mt-1 flex flex-wrap items-center gap-3">
              <span>Department: <strong className="text-text-900">{user?.department?.name || 'Engineering'}</strong></span>
              <span>•</span>
              <span>Division: <strong className="text-text-900">{studentInfo?.division?.name || user?.division?.name || 'Sec A'}</strong></span>
              <span>•</span>
              <span>Roll No: <strong className="text-text-900">{studentInfo?.rollNumber || '--'}</strong></span>
              {currentTerm && (
                <>
                  <span>•</span>
                  <span>Active Term: <strong className="text-ink-900">{currentTerm.name}</strong></span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          <Link
            to="/student/attendance"
            className="flex-1 sm:flex-initial text-center justify-center px-3 py-2 rounded-lg border border-border bg-surface-50 hover:bg-surface-100 text-text-900 text-xs font-medium transition-colors inline-flex items-center gap-1.5 shadow-xs"
          >
            <Clock size={13} className="text-ink-900 shrink-0" />
            <span>Detailed Attendance</span>
          </Link>
          <Link
            to="/student/assignments"
            className="flex-1 sm:flex-initial text-center justify-center px-3 py-2 rounded-lg bg-ink-900 hover:bg-ink-800 text-white text-xs font-medium transition-colors inline-flex items-center gap-1.5 shadow-xs"
          >
            <FileText size={13} className="shrink-0" />
            <span>My Assignments</span>
          </Link>
        </div>
      </div>

      {/* Critical Attendance Warning if Low */}
      {isLow && (
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-lg bg-danger/20 text-danger shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-danger">Attendance Deficit Warning (&lt; 75%)</h4>
              <p className="text-xs text-danger/90 mt-0.5 leading-relaxed">
                Your cumulative attendance is currently {overallPct}%. Minimum 75% attendance is required to remain eligible for term-end university examinations.
              </p>
            </div>
          </div>
          <Link
            to="/student/attendance"
            className="text-xs font-semibold text-danger hover:underline whitespace-nowrap shrink-0 flex items-center gap-1 self-end sm:self-auto"
          >
            View At-Risk Subjects <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Card */}
        <Link 
          to="/student/attendance" 
          className="bg-surface-0 border border-border hover:border-ink-700 rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-500 font-medium uppercase tracking-wide">Overall Attendance</span>
            <div className={`p-2 rounded-lg ${isLow ? 'bg-danger/10 text-danger' : 'bg-emerald-50 text-emerald-700'}`}>
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <div className={`text-2xl font-bold font-mono ${isLow ? 'text-danger' : 'text-text-900'}`}>
                {overallPct !== undefined ? `${overallPct}%` : '--%'}
              </div>
              <span className="text-xs text-text-500">
                {attendedSessions} of {totalSessions} sessions logged
              </span>
            </div>
            <ArrowRight size={14} className="text-text-400 group-hover:text-ink-700 group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>

        {/* Enrolled Courses */}
        <Link 
          to="/student/subjects" 
          className="bg-surface-0 border border-border hover:border-ink-700 rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-500 font-medium uppercase tracking-wide">Enrolled Subjects</span>
            <div className={`p-2 rounded-lg ${backlogSubjects.length > 0 ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-ink-900/10 text-ink-900'}`}>
              <BookOpen size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold font-mono text-text-900">
                  {subjects.length}
                </span>
                {backlogSubjects.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 font-mono">
                    {backlogSubjects.length} Backlog
                  </span>
                )}
              </div>
              <span className="text-xs text-text-500 mt-0.5 block">
                {backlogSubjects.length > 0
                  ? `${regularSubjects.length} Regular • ${backlogSubjects.length} Re-attempt`
                  : (lowAttendanceSubjects.length > 0 ? `${lowAttendanceSubjects.length} low attendance` : 'All regular subjects')}
              </span>
            </div>
            <ArrowRight size={14} className="text-text-400 group-hover:text-ink-700 group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>

        {/* Pending Assignments */}
        <Link 
          to="/student/assignments" 
          className="bg-surface-0 border border-border hover:border-ink-700 rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-500 font-medium uppercase tracking-wide">Assignments</span>
            <div className={`p-2 rounded-lg ${pendingAssignments.length > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
              <FileCheck size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-bold font-mono text-text-900">
                {pendingAssignments.length}
              </div>
              <span className="text-xs text-text-500">
                Pending submission ({submittedAssignments.length} submitted)
              </span>
            </div>
            <ArrowRight size={14} className="text-text-400 group-hover:text-ink-700 group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>

        {/* Study Notes & Resources */}
        <Link 
          to="/student/notes" 
          className="bg-surface-0 border border-border hover:border-ink-700 rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-500 font-medium uppercase tracking-wide">Study Materials</span>
            <div className="p-2 rounded-lg bg-brass-500/10 text-brass-600">
              <FileText size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-bold font-mono text-text-900">
                {notes.length}
              </div>
              <span className="text-xs text-text-500">
                Notes uploaded by faculty
              </span>
            </div>
            <ArrowRight size={14} className="text-text-400 group-hover:text-ink-700 group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>
      </div>

      {/* Main Content Grid: Left Subjects & Progress, Right Tasks & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Enrolled Subjects Attendance & Details (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Rule 6: Dedicated Concurrent Backlog Academic Track Banner */}
          {backlogSubjects.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-200/80 text-amber-900 shrink-0">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                      <span>Concurrent Backlog Re-Attempt Track</span>
                      <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                        Rule 6 Active
                      </span>
                    </h3>
                    <p className="text-[11px] text-amber-800">
                      You are enrolled in {backlogSubjects.length} backlog re-attempt subject{backlogSubjects.length > 1 ? 's' : ''} running concurrently with your current semester curriculum.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to="/student/hall-tickets"
                    className="px-2.5 py-1.5 rounded-md bg-amber-200 hover:bg-amber-300 text-amber-950 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <FileText size={13} />
                    <span>Makeup Hall Ticket</span>
                  </Link>
                  <Link
                    to="/student/subjects"
                    className="px-2.5 py-1.5 rounded-md border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-medium transition-colors"
                  >
                    <span>Curriculum</span>
                  </Link>
                </div>
              </div>

              {/* Backlog Subjects Quick Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {backlogSubjects.map((bSub) => (
                  <div 
                    key={bSub.enrollmentId || bSub.subjectId}
                    className="bg-surface-0 border border-amber-200 rounded-lg p-3.5 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                            {bSub.subjectCode}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-100/60 px-1.5 py-0.5 rounded">
                            Attempt #{bSub.attemptNumber || 2}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-text-900 mt-1 leading-snug">
                          {bSub.subjectName}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-text-500 shrink-0">
                        {bSub.credits} Credits
                      </span>
                    </div>

                    <div className="text-[11px] text-text-500 space-y-1 pt-1.5 border-t border-border/50">
                      <div className="flex items-center justify-between">
                        <span>Curriculum Source:</span>
                        <strong className="text-text-800">{bSub.className || 'Previous Sem'}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Faculty:</span>
                        <span className={bSub.teacher ? 'text-text-800 font-medium' : 'text-amber-700 italic'}>
                          {bSub.teacher?.name || 'Pending Allocation'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Attendance:</span>
                        <span className={`font-mono font-bold ${bSub.isLowAttendance ? 'text-danger' : 'text-emerald-700'}`}>
                          {bSub.percentage !== undefined ? `${bSub.percentage}%` : '100%'} ({bSub.attendedSessions || 0}/{bSub.totalSessions || 0})
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enrolled Subjects & Attendance Health Card */}
          <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-ink-900" />
                <h3 className="text-sm font-bold text-text-900">Enrolled Subjects & Attendance Health</h3>
              </div>

              {/* Sub-filter tabs for Regular vs Backlog */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center bg-surface-50 p-1 rounded-lg border border-border text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => setActiveSubjectTab('ALL')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      activeSubjectTab === 'ALL'
                        ? 'bg-surface-0 text-text-900 shadow-2xs font-bold border border-border'
                        : 'text-text-500 hover:text-text-800'
                    }`}
                  >
                    All ({subjects.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubjectTab('REGULAR')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      activeSubjectTab === 'REGULAR'
                        ? 'bg-surface-0 text-text-900 shadow-2xs font-bold border border-border'
                        : 'text-text-500 hover:text-text-800'
                    }`}
                  >
                    Regular ({regularSubjects.length})
                  </button>
                  {backlogSubjects.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveSubjectTab('BACKLOG')}
                      className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                        activeSubjectTab === 'BACKLOG'
                          ? 'bg-amber-100 text-amber-900 shadow-2xs font-bold border border-amber-300'
                          : 'text-amber-800 hover:text-amber-950 font-medium'
                      }`}
                    >
                      <span>Backlog ({backlogSubjects.length})</span>
                    </button>
                  )}
                </div>

                <Link 
                  to="/student/attendance"
                  className="text-xs text-ink-900 hover:underline flex items-center gap-1 font-medium ml-1"
                >
                  Logs <ArrowRight size={12} />
                </Link>
              </div>
            </div>

            {filteredSubjects.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-500 border border-dashed border-border rounded-lg">
                No subjects found for the selected filter.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {filteredSubjects.map((sub) => {
                  const pct = sub.percentage !== undefined ? sub.percentage : 100;
                  const isSubLow = sub.isLowAttendance;
                  const isBacklogSub = sub.isBacklog || (sub.attemptNumber && sub.attemptNumber > 1);

                  return (
                    <div key={sub.enrollmentId || sub.subjectId} className="py-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-surface-50 border border-border text-ink-900 uppercase">
                              {sub.subjectCode}
                            </span>
                            <h4 className="text-xs sm:text-sm font-semibold text-text-900 leading-snug" title={sub.subjectName}>
                              {sub.subjectName}
                            </h4>
                            
                            {/* Course Type / Backlog Badges */}
                            {isBacklogSub ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-mono">
                                Backlog (Att. #{sub.attemptNumber || 2})
                              </span>
                            ) : sub.subjectType === 'ELECTIVE' ? (
                              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                Elective
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-surface-100 text-text-600 border border-border">
                                Regular
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] sm:text-xs text-text-500 mt-1 flex flex-wrap items-center gap-2 font-mono">
                            <span>{sub.attendedSessions || 0} Attended / {sub.totalSessions || 0} Conducted</span>
                            <span>•</span>
                            <span>{sub.credits || 0} Credits</span>
                            {sub.className && (
                              <>
                                <span>•</span>
                                <span className="text-text-400 font-sans">{sub.className}</span>
                              </>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isBacklogSub && (
                            <Link
                              to="/student/hall-tickets"
                              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors"
                              title="View makeup exam admit card"
                            >
                              <FileText size={11} />
                              <span>Admit Card</span>
                            </Link>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSubLow 
                              ? 'bg-danger/10 text-danger border border-danger/20' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {isSubLow ? 'DEFICIT' : 'HEALTHY'}
                          </span>
                        </div>
                      </div>

                      {/* Visual progress bar visible and prominent on mobile & desktop */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden border border-border/50">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${isSubLow ? 'bg-danger' : isBacklogSub ? 'bg-amber-600' : 'bg-emerald-600'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className={`font-mono text-xs font-bold w-12 text-right shrink-0 ${isSubLow ? 'text-danger' : 'text-text-900'}`}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Academic Hub Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <Link
              to="/student/electives"
              className="bg-surface-0 border border-border hover:border-ink-700 p-4 rounded-xl shadow-xs transition-all group flex items-start gap-3"
            >
              <div className="p-2.5 rounded-lg bg-purple-50 text-purple-700 shrink-0">
                <Layers size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-900 group-hover:text-ink-700 transition-colors">
                  Elective Choices
                </h4>
                <p className="text-[11px] text-text-500 mt-0.5 leading-snug">
                  Select program electives and view departmental quotas.
                </p>
              </div>
            </Link>

            <Link
              to="/student/marks"
              className="bg-surface-0 border border-border hover:border-ink-700 p-4 rounded-xl shadow-xs transition-all group flex items-start gap-3"
            >
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
                <Award size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-900 group-hover:text-ink-700 transition-colors">
                  Marks & Grades
                </h4>
                <p className="text-[11px] text-text-500 mt-0.5 leading-snug">
                  Continuous evaluations, internals, and term marks.
                </p>
              </div>
            </Link>

            <Link
              to="/student/library"
              className="bg-surface-0 border border-border hover:border-ink-700 p-4 rounded-xl shadow-xs transition-all group flex items-start gap-3"
            >
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-800 shrink-0">
                <BookOpen size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-900 group-hover:text-ink-700 transition-colors">
                  Digital Library
                </h4>
                <p className="text-[11px] text-text-500 mt-0.5 leading-snug">
                  Central syllabi copies, reference texts, and handbooks.
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Right Column: Pending Tasks & Recent Study Material (1 Col) */}
        <div className="space-y-6">
          
          {/* Actionable Assignments Card */}
          <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck size={18} className="text-ink-900" />
                <h3 className="text-sm font-bold text-text-900">Pending Assignments</h3>
              </div>
              <Link 
                to="/student/assignments" 
                className="text-xs text-ink-900 hover:underline font-medium"
              >
                View all ({assignments.length})
              </Link>
            </div>

            {pendingAssignments.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-500 border border-dashed border-border rounded-lg bg-surface-50">
                <CheckCircle2 size={24} className="mx-auto mb-1 text-emerald-600" />
                <p className="font-semibold text-text-900">All assignments submitted!</p>
                <p className="text-text-400 mt-0.5">No pending homework or course submissions.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingAssignments.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    to="/student/assignments"
                    className="block p-3 rounded-lg border border-border hover:border-ink-700 bg-surface-50/50 hover:bg-surface-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-text-900 line-clamp-1">
                        {item.title}
                      </h4>
                      <span className="font-mono text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 uppercase shrink-0">
                        Pending
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-text-500 mt-1.5 font-mono">
                      <span>{item.subject?.code || 'SUB'}</span>
                      {item.dueDate && (
                        <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Notes Card */}
          <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-brass-600" />
                <h3 className="text-sm font-bold text-text-900">Recent Study Notes</h3>
              </div>
              <Link 
                to="/student/notes" 
                className="text-xs text-ink-900 hover:underline font-medium"
              >
                View all ({notes.length})
              </Link>
            </div>

            {recentNotes.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-500 border border-dashed border-border rounded-lg bg-surface-50">
                No study materials uploaded for your enrolled subjects yet.
              </div>
            ) : (
              <div className="space-y-2">
                {recentNotes.map((note) => (
                  <div 
                    key={note.id}
                    className="p-2.5 rounded-lg border border-border bg-surface-0 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-text-900 truncate" title={note.topic}>
                        {note.topic}
                      </p>
                      <p className="text-[11px] text-text-500 font-mono mt-0.5">
                        {note.subject?.code} • {note.teacher?.name || 'Faculty'}
                      </p>
                    </div>

                    {note.fileUrl && (
                      <a
                        href={note.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md text-text-500 hover:text-ink-700 hover:bg-surface-50 transition-colors shrink-0"
                        title="Download Note File"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
