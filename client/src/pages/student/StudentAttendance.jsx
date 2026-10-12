import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { useSearch } from '../../context/SearchContext';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  BookOpen, 
  Calendar,
  Layers,
  GraduationCap,
  ChevronRight,
  Eye,
  X,
  Filter,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import Button from '../../components/ui/Button';

export default function StudentAttendance() {
  const { searchQuery } = useSearch();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal state for viewing subject attendance sessions in list form
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [sessionFilter, setSessionFilter] = useState('ALL'); // ALL, PRESENT, ABSENT

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await apiClient.get('/attendance/my-summary');
        setData(res);
      } catch (error) {
        toast.error('Failed to load your attendance summary');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  const { overallStats, student, term, subjects = [] } = data || {};
  const isOverallLow = overallStats?.isLowAttendance;
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

  if (isLoading) {
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

  if (!data || !data.subjects || data.subjects.length === 0) {
    return (
      <EmptyState
        title="No Enrolled Subjects"
        description="You do not have any active subject enrollments for the current term."
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl pb-12">
      {/* Top Banner */}
      <div className="bg-surface-0 border border-border rounded-xl p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-ink-900 text-white flex items-center justify-center shrink-0 shadow-xs border border-ink-700">
            <Clock size={22} className="text-brass-500" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-2xl font-bold text-text-900 tracking-tight">
                Course Attendance Register
              </h2>
              {term && (
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-50 border border-border text-ink-900 font-semibold">
                  {term.name}
                </span>
              )}
            </div>
            <p className="text-xs text-text-500 mt-0.5">
              Live session logs, university 75% eligibility compliance, and lecture attendance
            </p>
          </div>
        </div>

        {/* Academic Profile Info */}
        {student && (
          <div className="flex items-center gap-2 text-xs font-mono text-text-600 bg-surface-50 px-3 py-1.5 rounded-lg border border-border self-start sm:self-auto">
            <span>ID: <strong className="text-text-900">{student.instituteId}</strong></span>
            <span>•</span>
            <span>Roll: <strong className="text-text-900">{student.rollNumber || '--'}</strong></span>
          </div>
        )}
      </div>

      {/* Critical Deficit Alert */}
      {atRiskSubjects.length > 0 && (
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-danger shrink-0 mt-0.5 sm:mt-0" size={20} />
            <div>
              <h4 className="text-sm font-bold text-danger">
                Attendance Below Institutional Requirement (75%)
              </h4>
              <p className="text-xs text-danger/90 mt-0.5 leading-relaxed">
                You have {atRiskSubjects.length} subject(s) below the 75% threshold:{' '}
                <span className="font-semibold underline">
                  {atRiskSubjects.map(s => `${s.subjectName} (${s.percentage}%)`).join(', ')}
                </span>.
                Minimum 75% attendance is strictly enforced for exam eligibility.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards: 3 Column Layout (Mobile 2x1 and 3x1) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
        {/* Overall Percentage */}
        <div className="bg-surface-0 border border-border rounded-xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-text-500 font-medium uppercase tracking-wide">
              Overall Attendance
            </span>
            <div className={`p-1.5 sm:p-2 rounded-lg ${isOverallLow ? 'bg-danger/10 text-danger' : 'bg-emerald-50 text-emerald-700'}`}>
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className={`text-xl sm:text-2xl font-bold font-mono ${isOverallLow ? 'text-danger' : 'text-text-900'}`}>
              {overallStats?.percentage}%
            </div>
            <span className="text-[10px] sm:text-[11px] text-text-500 block truncate">
              {overallStats?.attendedSessions} of {overallStats?.totalSessions} sessions logged
            </span>
          </div>
        </div>

        {/* Total Conducted */}
        <div className="bg-surface-0 border border-border rounded-xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-text-500 font-medium uppercase tracking-wide">
              Total Conducted
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-ink-900/10 text-ink-900">
              <Calendar size={16} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-text-900">
              {overallStats?.totalSessions}
            </div>
            <span className="text-[10px] sm:text-[11px] text-text-500 block truncate">
              Across {subjects.length} enrolled subjects
            </span>
          </div>
        </div>

        {/* Subjects at Risk */}
        <div className="bg-surface-0 border border-border rounded-xl p-3.5 sm:p-5 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-text-500 font-medium uppercase tracking-wide">
              Threshold Health
            </span>
            <div className={`p-1.5 sm:p-2 rounded-lg ${atRiskSubjects.length > 0 ? 'bg-danger/10 text-danger' : 'bg-surface-100 text-emerald-700'}`}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className={`text-xl sm:text-2xl font-bold font-mono ${atRiskSubjects.length > 0 ? 'text-danger' : 'text-emerald-700'}`}>
              {atRiskSubjects.length === 0 ? 'All Healthy' : `${atRiskSubjects.length} At Risk`}
            </div>
            <span className="text-[10px] sm:text-[11px] text-text-500 block truncate">
              {atRiskSubjects.length === 0 ? 'All courses satisfy >75% rule' : 'Requires faculty consultation'}
            </span>
          </div>
        </div>
      </div>

      {/* Subject Attendance Table Structure */}
      <div className="bg-surface-0 border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-text-900">Enrolled Subjects Attendance Table</h3>
            <p className="text-xs text-text-500 mt-0.5">
              Click on any subject row to inspect detailed session history in list view.
            </p>
          </div>
          <span className="font-mono text-xs text-text-500 hidden sm:inline">
            {filteredSubjects.length} Courses
          </span>
        </div>

        {/* Table View (Desktop & Tablet) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-50 border-b border-border text-text-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Credits</th>
                <th className="py-3 px-4">Attended / Total</th>
                <th className="py-3 px-4 min-w-[180px]">Attendance %</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSubjects.map((sub) => {
                const isLow = sub.isLowAttendance;
                return (
                  <tr 
                    key={sub.enrollmentId}
                    onClick={() => {
                      setSelectedSubject(sub);
                      setSessionFilter('ALL');
                    }}
                    className="hover:bg-surface-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-surface-50 border border-border text-ink-900">
                          {sub.subjectCode}
                        </span>
                        <span className="font-semibold text-text-900 group-hover:text-ink-700 transition-colors">
                          {sub.subjectName}
                        </span>
                      </div>
                      <div className="text-[11px] text-text-400 font-mono mt-0.5">
                        Class: {sub.className}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-surface-100 text-text-700">
                        {sub.subjectType || 'CORE'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-text-700">
                      {sub.credits}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-text-700">
                      <strong>{sub.attendedSessions}</strong> / {sub.totalSessions}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 bg-surface-100 rounded-full h-2 overflow-hidden border border-border/40">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${isLow ? 'bg-danger' : 'bg-emerald-600'}`}
                            style={{ width: `${Math.min(sub.percentage, 100)}%` }}
                          />
                        </div>
                        <span className={`font-mono font-bold w-12 text-right ${isLow ? 'text-danger' : 'text-text-900'}`}>
                          {sub.percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isLow 
                          ? 'bg-danger/10 text-danger border border-danger/20' 
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {isLow ? 'DEFICIT (<75%)' : 'HEALTHY'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSubject(sub);
                          setSessionFilter('ALL');
                        }}
                        className="px-2.5 py-1.5 rounded-md border border-border bg-surface-0 hover:bg-surface-100 text-text-900 font-semibold text-xs transition-colors inline-flex items-center gap-1 shadow-xs"
                      >
                        <Eye size={12} className="text-ink-900" />
                        <span>View Sessions</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile-Friendly Table / Card Rows (<md) */}
        <div className="md:hidden divide-y divide-border">
          {filteredSubjects.map((sub) => {
            const isLow = sub.isLowAttendance;
            return (
              <div 
                key={sub.enrollmentId}
                onClick={() => {
                  setSelectedSubject(sub);
                  setSessionFilter('ALL');
                }}
                className="p-4 space-y-3 cursor-pointer hover:bg-surface-50/60 active:bg-surface-100/60 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-ink-900 text-white">
                        {sub.subjectCode}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-surface-100 text-text-600">
                        {sub.subjectType || 'CORE'}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-text-900 mt-1 leading-snug">
                      {sub.subjectName}
                    </h4>
                    <p className="text-[11px] text-text-500 font-mono mt-0.5">
                      Class: {sub.className} • {sub.credits} Credits
                    </p>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    isLow 
                      ? 'bg-danger/10 text-danger border border-danger/20' 
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {isLow ? 'DEFICIT' : 'HEALTHY'}
                  </span>
                </div>

                {/* Mobile Full-width Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-text-500 text-[11px]">
                      {sub.attendedSessions} of {sub.totalSessions} sessions
                    </span>
                    <span className={`font-bold text-sm ${isLow ? 'text-danger' : 'text-text-900'}`}>
                      {sub.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden border border-border/40">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${isLow ? 'bg-danger' : 'bg-emerald-600'}`}
                      style={{ width: `${Math.min(sub.percentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Touch Tap Trigger */}
                <div className="pt-1 flex items-center justify-between text-xs font-semibold text-ink-900 border-t border-border/60">
                  <span className="text-[11px] text-text-500 font-normal">
                    {sub.sessions?.length || 0} Lecture sessions logged
                  </span>
                  <span className="inline-flex items-center gap-1 hover:underline">
                    View Session List <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Attendance Sessions List Modal */}
      {selectedSubject && (
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
                    {selectedSubject.subjectCode}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface-100 text-text-700">
                    {selectedSubject.subjectType || 'CORE'}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    selectedSubject.isLowAttendance 
                      ? 'bg-danger/10 text-danger border border-danger/20' 
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {selectedSubject.percentage}% Attendance
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-text-900 leading-snug">
                  {selectedSubject.subjectName}
                </h3>
                <p className="text-xs text-text-500 font-mono">
                  {selectedSubject.attendedSessions} Attended / {selectedSubject.totalSessions} Total Sessions Conducted
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSubject(null)}
                className="p-1.5 rounded-lg text-text-400 hover:text-text-900 hover:bg-surface-100 transition-colors shrink-0"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter Pills inside Modal */}
            <div className="px-4 py-2.5 border-b border-border bg-surface-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { key: 'ALL', label: `All Sessions (${selectedSubject.sessions?.length || 0})` },
                { key: 'PRESENT', label: `Present (${selectedSubject.sessions?.filter(s => s.present).length || 0})` },
                { key: 'ABSENT', label: `Absent (${selectedSubject.sessions?.filter(s => !s.present).length || 0})` }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setSessionFilter(tab.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                    sessionFilter === tab.key
                      ? 'bg-ink-900 text-white shadow-xs'
                      : 'bg-surface-50 text-text-600 hover:text-text-900 hover:bg-surface-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Session History in List Form */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 custom-scrollbar">
              {filteredSessions.length === 0 ? (
                <div className="py-12 text-center text-xs text-text-500 italic bg-surface-50 rounded-lg border border-border border-dashed">
                  No sessions match the selected filter.
                </div>
              ) : (
                filteredSessions.map((sess) => (
                  <div
                    key={sess.recordId}
                    className="p-3 sm:p-3.5 rounded-xl border border-border bg-surface-0 hover:bg-surface-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-text-900 flex items-center gap-1">
                          <Calendar size={13} className="text-ink-900" />
                          {sess.date}
                        </span>
                        <span className="text-text-400 font-mono text-[11px]">•</span>
                        <span className="font-mono text-xs text-text-500">
                          {sess.startTime} - {sess.endTime}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm font-semibold text-text-900 leading-snug">
                        {sess.topic || 'Regular Lecture Session'}
                      </p>

                      {sess.teacherName && (
                        <p className="text-[11px] text-text-500 flex items-center gap-1">
                          <UserCheck size={12} className="text-text-400" />
                          Faculty: <span className="font-medium text-text-700">{sess.teacherName}</span>
                        </p>
                      )}
                    </div>

                    {/* Status Pill */}
                    <div className="self-end sm:self-center shrink-0">
                      {sess.present ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={13} />
                          Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-danger/10 text-danger border border-danger/20">
                          <XCircle size={13} />
                          Absent
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-border bg-surface-50/60 flex items-center justify-between">
              <span className="text-xs font-mono text-text-500">
                {selectedSubject.subjectCode} • {selectedSubject.percentage}% Attendance
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedSubject(null)}
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
