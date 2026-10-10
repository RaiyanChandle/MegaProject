import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { 
  Users, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';

export default function ParentAttendance() {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [attendanceData, setAttendanceData] = useState(null);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [expandedSubject, setExpandedSubject] = useState(null);

  // 1. Fetch linked children
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const data = await apiClient.get('/parents/my-children');
        setChildren(data);
        if (data.length > 0) {
          setSelectedChildId(data[0].id);
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

  if (isLoadingChildren) {
    return (
      <div className="p-8 text-center text-sm text-text-500">
        Loading linked children...
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <EmptyState
        title="No Children Linked"
        description="No student accounts are currently linked to your parent portal. Please contact the department administrator."
      />
    );
  }

  const selectedChild = children.find(c => c.id === selectedChildId);
  const overall = attendanceData?.overallStats;
  const subjects = attendanceData?.subjects || [];
  const atRiskSubjects = subjects.filter(s => s.isLowAttendance);

  return (
    <div className="space-y-6">
      {/* Top Header & Child Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-text-900">Child Attendance Monitor</h2>
          <p className="text-sm text-text-500 mt-1">
            Track your ward's attendance records, class participation, and minimum criteria compliance.
          </p>
        </div>

        {/* Child Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-text-500 uppercase tracking-wide">
            Student:
          </label>
          <select
            value={selectedChildId}
            onChange={e => setSelectedChildId(e.target.value)}
            className="rounded-md border border-border bg-surface-0 px-3 py-2 text-sm font-medium text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
          >
            {children.map(child => (
              <option key={child.id} value={child.id}>
                {child.name} ({child.instituteId})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Child Summary Tag */}
      {selectedChild && (
        <div className="bg-surface-0 border border-border rounded-md p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-ink-900/10 text-ink-900">
              <Users size={16} />
            </div>
            <div>
              <span className="font-semibold text-sm text-text-900">{selectedChild.name}</span>
              <span className="text-text-500 ml-2 font-mono">Roll: {selectedChild.rollNumber}</span>
              <span className="text-text-500 ml-2 font-mono">({selectedChild.instituteId})</span>
            </div>
          </div>
          <div className="text-text-500">
            Batch: {selectedChild.batchYear} • Division: {selectedChild.division?.name || 'Unassigned'}
          </div>
        </div>
      )}

      {/* Warning banner if low attendance */}
      {atRiskSubjects.length > 0 && (
        <div className="bg-danger/10 border border-danger/30 rounded-md p-4 flex items-start gap-3">
          <AlertTriangle className="text-danger shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-sm font-semibold text-danger">
              Attendance Alert: Ward has subjects below 75%
            </h4>
            <p className="text-xs text-text-900 mt-1">
              Your child has low attendance in: {atRiskSubjects.map(s => `${s.subjectName} (${s.percentage}%)`).join(', ')}.
              Minimum 75% aggregate attendance is mandatory for semester exam eligibility.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {isLoadingAttendance ? (
        <div className="p-8 text-center text-sm text-text-500">
          Loading attendance metrics...
        </div>
      ) : overall ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-0 border border-border rounded-md p-5 flex items-center gap-4">
              <div className={`p-3 rounded-md ${
                overall.isLowAttendance ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
              }`}>
                <Clock size={24} />
              </div>
              <div>
                <div className="text-xs font-semibold text-text-500 uppercase tracking-wide">
                  Overall Attendance
                </div>
                <div className={`text-2xl font-bold font-mono mt-0.5 ${
                  overall.isLowAttendance ? 'text-danger' : 'text-text-900'
                }`}>
                  {overall.percentage}%
                </div>
                <div className="text-xs text-text-500 font-mono mt-0.5">
                  {overall.attendedSessions} / {overall.totalSessions} Sessions Attended
                </div>
              </div>
            </div>

            <div className="bg-surface-0 border border-border rounded-md p-5 flex items-center gap-4">
              <div className="p-3 rounded-md bg-info/10 text-info">
                <Calendar size={24} />
              </div>
              <div>
                <div className="text-xs font-semibold text-text-500 uppercase tracking-wide">
                  Total Sessions
                </div>
                <div className="text-2xl font-bold font-mono text-text-900 mt-0.5">
                  {overall.totalSessions}
                </div>
                <div className="text-xs text-text-500 mt-0.5">
                  Across {subjects.length} subjects
                </div>
              </div>
            </div>

            <div className="bg-surface-0 border border-border rounded-md p-5 flex items-center gap-4">
              <div className={`p-3 rounded-md ${
                atRiskSubjects.length > 0 ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
              }`}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <div className="text-xs font-semibold text-text-500 uppercase tracking-wide">
                  Subjects Below 75%
                </div>
                <div className={`text-2xl font-bold font-mono mt-0.5 ${
                  atRiskSubjects.length > 0 ? 'text-danger' : 'text-success'
                }`}>
                  {atRiskSubjects.length}
                </div>
                <div className="text-xs text-text-500 mt-0.5">
                  {atRiskSubjects.length === 0 ? 'Eligible for all exams' : 'Requires improvement'}
                </div>
              </div>
            </div>
          </div>

          {/* Subject Breakdown */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-text-900">Subject Breakdown</h3>

            <div className="grid grid-cols-1 gap-4">
              {subjects.map((sub) => {
                const isExpanded = expandedSubject === sub.enrollmentId;
                const isLow = sub.isLowAttendance;

                return (
                  <div 
                    key={sub.enrollmentId}
                    className="bg-surface-0 border border-border rounded-md overflow-hidden"
                  >
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
                            <StatusBadge status={sub.subjectType} />
                          </div>
                          <div className="text-xs text-text-500 mt-1">
                            Class: {sub.className} • Credits: {sub.credits}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
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
                            className="p-2 rounded-md hover:bg-surface-50 text-text-500 border border-border transition-colors"
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
                      </div>
                    </div>

                    {/* Collapsible Session History */}
                    {isExpanded && (
                      <div className="bg-surface-50 border-t border-border p-4">
                        <div className="text-xs font-semibold text-text-500 uppercase tracking-wide mb-3">
                          Attendance Log ({sub.sessions.length} sessions)
                        </div>

                        {sub.sessions.length === 0 ? (
                          <div className="text-xs text-text-500 italic py-3 text-center">
                            No sessions recorded yet.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-surface-0 border-b border-border text-text-500 uppercase tracking-wide font-medium">
                                <tr>
                                  <th className="py-2 px-3">Date</th>
                                  <th className="py-2 px-3">Time</th>
                                  <th className="py-2 px-3">Topic</th>
                                  <th className="py-2 px-3">Faculty</th>
                                  <th className="py-2 px-3 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border bg-surface-0">
                                {sub.sessions.map((sess) => (
                                  <tr key={sess.recordId} className="hover:bg-surface-50">
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
        </>
      ) : (
        <EmptyState
          title="No Attendance Records"
          description="No attendance data is available for this student in the current term."
        />
      )}
    </div>
  );
}
