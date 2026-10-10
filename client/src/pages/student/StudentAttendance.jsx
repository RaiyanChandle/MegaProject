import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  Calendar,
  Info
} from 'lucide-react';

export default function StudentAttendance() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSubject, setExpandedSubject] = useState(null);

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

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-text-500">
        Loading attendance records...
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

  const { overallStats, student, term, subjects } = data;
  const isOverallLow = overallStats.isLowAttendance;
  const atRiskSubjects = subjects.filter(s => s.isLowAttendance);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-semibold text-text-900">My Attendance</h2>
        <p className="text-sm text-text-500 mt-1">
          Real-time attendance tracking for {term?.name || 'Current Academic Term'}.
        </p>
      </div>

      {/* Critical Alert if any subject has low attendance */}
      {atRiskSubjects.length > 0 && (
        <div className="bg-danger/10 border border-danger/30 rounded-md p-4 flex items-start gap-3">
          <AlertTriangle className="text-danger shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-sm font-semibold text-danger">
              Attendance Below Institutional Requirement (75%)
            </h4>
            <p className="text-xs text-text-900 mt-1">
              You currently have {atRiskSubjects.length} subject(s) below the 75% threshold:{' '}
              <span className="font-medium">
                {atRiskSubjects.map(s => `${s.subjectName} (${s.percentage}%)`).join(', ')}
              </span>.
              Please consult your subject faculty or academic advisor.
            </p>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Overall Percentage */}
        <div className="bg-surface-0 border border-border rounded-md p-5 flex items-center gap-4">
          <div className={`p-3 rounded-md ${
            isOverallLow ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
          }`}>
            <Clock size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-text-500 uppercase tracking-wide">
              Overall Attendance
            </div>
            <div className={`text-2xl font-bold font-mono mt-0.5 ${
              isOverallLow ? 'text-danger' : 'text-text-900'
            }`}>
              {overallStats.percentage}%
            </div>
            <div className="text-xs text-text-500 font-mono mt-0.5">
              {overallStats.attendedSessions} / {overallStats.totalSessions} Sessions
            </div>
          </div>
        </div>

        {/* Total Conducted */}
        <div className="bg-surface-0 border border-border rounded-md p-5 flex items-center gap-4">
          <div className="p-3 rounded-md bg-info/10 text-info">
            <Calendar size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-text-500 uppercase tracking-wide">
              Total Sessions Conducted
            </div>
            <div className="text-2xl font-bold font-mono text-text-900 mt-0.5">
              {overallStats.totalSessions}
            </div>
            <div className="text-xs text-text-500 mt-0.5">
              Across {subjects.length} enrolled subjects
            </div>
          </div>
        </div>

        {/* Subjects at Risk */}
        <div className="bg-surface-0 border border-border rounded-md p-5 flex items-center gap-4">
          <div className={`p-3 rounded-md ${
            atRiskSubjects.length > 0 ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
          }`}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-text-500 uppercase tracking-wide">
              Subjects at Risk (&lt;75%)
            </div>
            <div className={`text-2xl font-bold font-mono mt-0.5 ${
              atRiskSubjects.length > 0 ? 'text-danger' : 'text-success'
            }`}>
              {atRiskSubjects.length}
            </div>
            <div className="text-xs text-text-500 mt-0.5">
              {atRiskSubjects.length === 0 ? 'All subjects meet criteria' : 'Requires immediate attention'}
            </div>
          </div>
        </div>
      </div>

      {/* Subject-Wise Cards List (Mobile-Optimized) */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-text-900">Subject Breakdown</h3>

        <div className="grid grid-cols-1 gap-4">
          {subjects.map((sub) => {
            const isExpanded = expandedSubject === sub.enrollmentId;
            const isLow = sub.isLowAttendance;

            return (
              <div 
                key={sub.enrollmentId}
                className="bg-surface-0 border border-border rounded-md overflow-hidden transition-all"
              >
                {/* Subject Header Card */}
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base text-text-900">
                          {sub.subjectName}
                        </span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-50 border border-border text-text-500">
                          {sub.subjectCode}
                        </span>
                        {sub.isBacklog && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-warning/10 text-warning">
                            Backlog (Attempt {sub.attemptNumber})
                          </span>
                        )}
                        <StatusBadge status={sub.subjectType} />
                      </div>
                      <div className="text-xs text-text-500 mt-1">
                        Class: {sub.className} • Credits: {sub.credits}
                      </div>
                    </div>

                    {/* Percentage & Progress indicator */}
                    <div className="flex items-center gap-4 sm:text-right">
                      <div>
                        <div className={`text-xl font-bold font-mono ${
                          isLow ? 'text-danger' : 'text-text-900'
                        }`}>
                          {sub.percentage}%
                        </div>
                        <div className="text-xs text-text-500 font-mono">
                          {sub.attendedSessions} / {sub.totalSessions} Sessions
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedSubject(isExpanded ? null : sub.enrollmentId)}
                        className="p-2 rounded-md hover:bg-surface-50 text-text-500 transition-colors border border-border"
                        title={isExpanded ? 'Hide history' : 'View session history'}
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden border border-border/50">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isLow ? 'bg-danger' : 'bg-success'
                        }`}
                        style={{ width: `${Math.min(sub.percentage, 100)}%` }}
                      />
                    </div>
                    {isLow && (
                      <div className="text-xs text-danger font-medium mt-1.5 flex items-center gap-1">
                        <AlertTriangle size={13} />
                        Low attendance warning: below 75% threshold
                      </div>
                    )}
                  </div>
                </div>

                {/* Collapsible Session History Drawer */}
                {isExpanded && (
                  <div className="bg-surface-50 border-t border-border p-4">
                    <div className="text-xs font-semibold text-text-500 uppercase tracking-wide mb-3">
                      Lecture & Lab History ({sub.sessions.length} sessions recorded)
                    </div>

                    {sub.sessions.length === 0 ? (
                      <div className="text-xs text-text-500 italic py-3 text-center">
                        No class sessions recorded for this subject yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-surface-0 border-b border-border text-text-500 uppercase tracking-wide font-medium">
                            <tr>
                              <th className="py-2 px-3">Date</th>
                              <th className="py-2 px-3">Time Slot</th>
                              <th className="py-2 px-3">Topic</th>
                              <th className="py-2 px-3">Faculty</th>
                              <th className="py-2 px-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border bg-surface-0">
                            {sub.sessions.map((sess) => (
                              <tr key={sess.recordId} className="hover:bg-surface-50/80">
                                <td className="py-2 px-3 font-mono font-medium text-text-900">
                                  {sess.date}
                                </td>
                                <td className="py-2 px-3 font-mono text-text-500">
                                  {sess.startTime} - {sess.endTime}
                                </td>
                                <td className="py-2 px-3 font-medium text-text-900">
                                  {sess.topic}
                                </td>
                                <td className="py-2 px-3 text-text-500">
                                  {sess.teacherName || '--'}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {sess.present ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success border border-success/30">
                                      <CheckCircle2 size={12} /> Present
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger/15 text-danger border border-danger/30">
                                      <XCircle size={12} /> Absent
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
