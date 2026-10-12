import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { 
  Clock, 
  Calendar, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  CheckCheck, 
  UserCheck, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

export default function TeacherAttendance() {
  const [allocations, setAllocations] = useState([]);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isLoadingAllocations, setIsLoadingAllocations] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Modal: Create Session
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00 AM',
    endTime: '10:00 AM',
    topic: '',
  });
  const [isSubmittingSession, setIsSubmittingSession] = useState(false);

  // Modal: Attendance Sheet
  const [activeSession, setActiveSession] = useState(null);
  const [roster, setRoster] = useState([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  // Load teacher's allocations on mount
  useEffect(() => {
    const fetchAllocations = async () => {
      try {
        const data = await apiClient.get('/teachers/my-allocations');
        setAllocations(data);
        if (data.length > 0) {
          setSelectedAllocation(data[0]);
        }
      } catch (error) {
        toast.error('Failed to load your allocated subjects');
      } finally {
        setIsLoadingAllocations(false);
      }
    };
    fetchAllocations();
  }, []);

  // Fetch sessions whenever selected allocation changes
  useEffect(() => {
    if (!selectedAllocation) return;

    const fetchSessions = async () => {
      setIsLoadingSessions(true);
      try {
        const queryParams = new URLSearchParams({
          subjectId: selectedAllocation.subjectId,
          classId: selectedAllocation.classId,
        });
        if (selectedAllocation.divisionId) {
          queryParams.append('divisionId', selectedAllocation.divisionId);
        }

        const data = await apiClient.get(`/attendance/sessions?${queryParams.toString()}`);
        setSessions(data);
      } catch (error) {
        toast.error('Failed to load attendance sessions');
      } finally {
        setIsLoadingSessions(false);
      }
    };

    fetchSessions();
  }, [selectedAllocation]);

  // Helper to parse time string into minutes from midnight
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const cleaned = timeStr.trim().toUpperCase();
    const ampmMatch = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/);
    if (ampmMatch) {
      let hours = parseInt(ampmMatch[1], 10);
      const minutes = parseInt(ampmMatch[2], 10);
      const period = ampmMatch[3];
      if (hours === 12) hours = period === 'AM' ? 0 : 12;
      else if (period === 'PM') hours += 12;
      return hours * 60 + minutes;
    }
    const militaryMatch = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (militaryMatch) {
      const hours = parseInt(militaryMatch[1], 10);
      const minutes = parseInt(militaryMatch[2], 10);
      return hours * 60 + minutes;
    }
    return null;
  };

  // Handle session creation
  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!sessionForm.topic.trim()) {
      toast.error('Please enter a session topic');
      return;
    }

    const startMins = parseTimeToMinutes(sessionForm.startTime);
    const endMins = parseTimeToMinutes(sessionForm.endTime);

    if (startMins === null || endMins === null) {
      toast.error('Please enter time in valid format (e.g. 09:00 AM or 14:00)');
      return;
    }

    if (startMins >= endMins) {
      toast.error('Start time must be earlier than end time');
      return;
    }

    setIsSubmittingSession(true);
    try {
      const payload = {
        subjectId: selectedAllocation.subjectId,
        classId: selectedAllocation.classId,
        divisionId: selectedAllocation.divisionId || null,
        date: sessionForm.date,
        startTime: sessionForm.startTime,
        endTime: sessionForm.endTime,
        topic: sessionForm.topic.trim()
      };

      const newSession = await apiClient.post('/attendance/sessions', payload);
      toast.success('Attendance session created');
      setIsCreateModalOpen(false);
      setSessionForm({
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00 AM',
        endTime: '10:00 AM',
        topic: ''
      });

      // Refresh sessions and automatically open attendance sheet
      setSessions(prev => [newSession, ...prev]);
      handleOpenAttendanceSheet(newSession);
    } catch (error) {
      toast.error(error.message || 'Failed to create session');
    } finally {
      setIsSubmittingSession(false);
    }
  };

  // Open Attendance Sheet
  const handleOpenAttendanceSheet = async (session) => {
    setActiveSession(session);
    setIsLoadingRoster(true);

    try {
      const queryParams = new URLSearchParams({
        subjectId: session.subjectId,
        classId: session.classId,
        sessionId: session.id
      });
      if (session.divisionId) {
        queryParams.append('divisionId', session.divisionId);
      }

      const res = await apiClient.get(`/attendance/roster?${queryParams.toString()}`);
      setRoster(res.roster || []);
    } catch (error) {
      toast.error('Failed to load class roster');
    } finally {
      setIsLoadingRoster(false);
    }
  };

  // Toggle present status for a single student in roster
  const toggleStudentStatus = (enrollmentId) => {
    setRoster(prev => prev.map(student => {
      if (student.enrollmentId === enrollmentId) {
        return { ...student, present: !student.present };
      }
      return student;
    }));
  };

  // Quick actions: Mark all present / absent
  const setAllStatus = (present) => {
    setRoster(prev => prev.map(student => ({ ...student, present })));
  };

  // Save attendance to backend
  const handleSaveAttendance = async () => {
    if (!activeSession) return;
    setIsSavingAttendance(true);

    try {
      const payload = {
        records: roster.map(student => ({
          enrollmentId: student.enrollmentId,
          present: student.present
        }))
      };

      const res = await apiClient.post(`/attendance/sessions/${activeSession.id}/records`, payload);
      toast.success(res.message || 'Attendance saved successfully');

      // Update session stats locally
      const presentCount = roster.filter(s => s.present).length;
      const totalCount = roster.length;
      const pct = totalCount > 0 ? Number(((presentCount / totalCount) * 100).toFixed(1)) : 0;

      setSessions(prev => prev.map(s => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            stats: {
              total: totalCount,
              present: presentCount,
              absent: totalCount - presentCount,
              percentage: pct
            }
          };
        }
        return s;
      }));

      setActiveSession(null);
    } catch (error) {
      toast.error(error.message || 'Failed to save attendance');
    } finally {
      setIsSavingAttendance(false);
    }
  };

  // Session table columns
  const sessionColumns = [
    {
      title: 'Date & Time',
      key: 'dateTime',
      render: (_, row) => (
        <div>
          <div className="font-mono text-xs font-semibold text-text-900">{row.date}</div>
          <div className="text-xs text-text-500 font-mono">{row.startTime} - {row.endTime}</div>
        </div>
      )
    },
    {
      title: 'Topic',
      key: 'topic',
      render: (_, row) => (
        <div>
          <div className="font-medium text-text-900">{row.topic}</div>
          <div className="text-xs text-text-500">
            {row.division?.name ? `Division ${row.division.name}` : 'All Divisions'}
          </div>
        </div>
      )
    },
    {
      title: 'Attendance Status',
      key: 'stats',
      render: (_, row) => {
        const stats = row.stats;
        if (!stats || stats.total === 0) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral/10 text-neutral">
              Unmarked
            </span>
          );
        }

        const isGood = stats.percentage >= 75;
        return (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-mono ${
              isGood ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
            }`}>
              {stats.present} / {stats.total} Present ({stats.percentage}%)
            </span>
          </div>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleOpenAttendanceSheet(row)}
        >
          {row.stats && row.stats.total > 0 ? 'Edit Attendance' : 'Mark Attendance'}
        </Button>
      )
    }
  ];

  if (isLoadingAllocations) {
    return (
      <div className="p-8 text-center text-sm text-text-500">
        Loading allocated subjects...
      </div>
    );
  }

  if (allocations.length === 0) {
    return (
      <EmptyState
        title="No Subjects Allocated"
        description="You have not been assigned any subjects for teaching yet. Please contact your Department Administrator."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-text-900">Attendance Management</h2>
          <p className="text-sm text-text-500 mt-1">
            Conduct sessions, record student attendance, and maintain verified logs.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus size={16} /> New Session
        </Button>
      </div>

      {/* Allocation Selector Tabs */}
      <div className="bg-surface-0 border border-border rounded-md p-4">
        <label className="text-xs font-semibold text-text-500 uppercase tracking-wide block mb-2">
          Select Subject & Class
        </label>
        <div className="flex flex-wrap gap-2">
          {allocations.map((alloc) => {
            const isSelected = selectedAllocation?.id === alloc.id;
            return (
              <button
                key={alloc.id}
                onClick={() => setSelectedAllocation(alloc)}
                className={`px-3.5 py-2 rounded-md text-sm font-medium transition-colors text-left border ${
                  isSelected
                    ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
                    : 'bg-surface-50 text-text-900 border-border hover:bg-surface-100'
                }`}
              >
                <div className="font-semibold">{alloc.subject?.name}</div>
                <div className={`text-xs ${isSelected ? 'text-surface-200' : 'text-text-500'}`}>
                  {alloc.class?.name} {alloc.division?.name && `• Div ${alloc.division.name}`} ({alloc.subject?.code})
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sessions Card */}
      <div className="bg-surface-0 border border-border rounded-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-text-900">
              Sessions for {selectedAllocation?.subject?.name}
            </h3>
            <p className="text-xs text-text-500 font-mono mt-0.5">
              Class: {selectedAllocation?.class?.name} | Batch: {selectedAllocation?.class?.batchYear}
              {selectedAllocation?.division?.name && ` | Div: ${selectedAllocation.division.name}`}
            </p>
          </div>
          <div className="text-xs font-mono text-text-500">
            Total Sessions: {sessions.length}
          </div>
        </div>

        {isLoadingSessions ? (
          <div className="py-8 text-center text-sm text-text-500">
            Loading sessions...
          </div>
        ) : sessions.length > 0 ? (
          <DataTable columns={sessionColumns} data={sessions} />
        ) : (
          <EmptyState
            title="No Attendance Sessions Yet"
            description="Create your first class session to start marking student attendance."
            action={
              <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
                <Plus size={14} className="mr-1" /> Create First Session
              </Button>
            }
          />
        )}
      </div>

      {/* Modal: Create Session */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Schedule / Create Class Session"
      >
        <form onSubmit={handleCreateSession} className="space-y-4">
          <Field label="Subject & Class">
            <input
              type="text"
              disabled
              value={`${selectedAllocation?.subject?.name} (${selectedAllocation?.subject?.code}) - ${selectedAllocation?.class?.name}`}
              className="w-full rounded-md border border-border bg-surface-50 px-3 py-2 text-sm text-text-500"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Date" required>
              <input
                type="date"
                required
                value={sessionForm.date}
                onChange={e => setSessionForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 font-mono"
              />
            </Field>

            <Field label="Start Time" required>
              <input
                type="text"
                required
                placeholder="09:00 AM"
                value={sessionForm.startTime}
                onChange={e => setSessionForm(prev => ({ ...prev, startTime: e.target.value }))}
                className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 font-mono"
              />
            </Field>

            <Field label="End Time" required>
              <input
                type="text"
                required
                placeholder="10:00 AM"
                value={sessionForm.endTime}
                onChange={e => setSessionForm(prev => ({ ...prev, endTime: e.target.value }))}
                className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 font-mono"
              />
            </Field>
          </div>

          <Field label="Lecture / Lab Topic" required>
            <input
              type="text"
              required
              placeholder="e.g. Binary Search Trees & AVL Rotations"
              value={sessionForm.topic}
              onChange={e => setSessionForm(prev => ({ ...prev, topic: e.target.value }))}
              className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmittingSession}
            >
              {isSubmittingSession ? 'Creating...' : 'Create Session'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Full Attendance Sheet */}
      <Modal
        isOpen={!!activeSession}
        onClose={() => setActiveSession(null)}
        title={activeSession ? `Attendance: ${activeSession.topic}` : 'Mark Attendance'}
        maxWidth="max-w-4xl"
      >
        {activeSession && (
          <div className="space-y-4">
            {/* Session Info Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface-50 border border-border rounded-md text-xs">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-text-500">Date: </span>
                  <span className="font-mono font-semibold text-text-900">{activeSession.date}</span>
                </div>
                <div>
                  <span className="text-text-500">Slot: </span>
                  <span className="font-mono font-semibold text-text-900">
                    {activeSession.startTime} - {activeSession.endTime}
                  </span>
                </div>
                <div>
                  <span className="text-text-500">Division: </span>
                  <span className="font-semibold text-text-900">
                    {activeSession.division?.name ? `Division ${activeSession.division.name}` : 'All Divisions'}
                  </span>
                </div>
              </div>

              {/* Quick marking shortcuts */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAllStatus(true)}
                  className="px-2.5 py-1 text-xs font-medium rounded border border-success/30 text-success bg-success/10 hover:bg-success/20 transition-colors"
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  onClick={() => setAllStatus(false)}
                  className="px-2.5 py-1 text-xs font-medium rounded border border-danger/30 text-danger bg-danger/10 hover:bg-danger/20 transition-colors"
                >
                  Mark All Absent
                </button>
              </div>
            </div>

            {/* Roster Table */}
            {isLoadingRoster ? (
              <div className="py-12 text-center text-sm text-text-500">
                Loading student roster...
              </div>
            ) : roster.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-500 italic">
                No enrolled students found for this subject and term.
              </div>
            ) : (
              <div className="max-h-[55vh] overflow-y-auto border border-border rounded-md">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-50 border-b border-border sticky top-0 text-text-500 text-xs font-medium uppercase tracking-wide">
                    <tr>
                      <th className="py-2.5 px-3">Roll No</th>
                      <th className="py-2.5 px-3">Institute ID</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Div</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {roster.map((student) => {
                      const isPresent = student.present;
                      return (
                        <tr 
                          key={student.enrollmentId}
                          className="hover:bg-surface-50 transition-colors"
                        >
                          <td className="py-2.5 px-3 font-mono text-xs font-semibold text-text-900">
                            {student.rollNumber || '--'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-xs text-text-500">
                            {student.instituteId}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-text-900">
                            {student.name}
                            {student.editedAt && (
                              <span className="ml-2 text-[10px] text-text-500 font-normal italic">
                                (Edited)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-text-500">
                            {student.division}
                          </td>
                          <td className="py-2.5 px-3 text-xs">
                            {student.isBacklog ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-warning/10 text-warning">
                                Backlog (Att. {student.attemptNumber})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-info/10 text-info">
                                Regular
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleStudentStatus(student.enrollmentId)}
                              className={`w-28 py-1 px-3 rounded-full text-xs font-medium transition-all inline-flex items-center justify-center gap-1.5 ${
                                isPresent
                                  ? 'bg-success/15 text-success hover:bg-success/25 border border-success/30'
                                  : 'bg-danger/15 text-danger hover:bg-danger/25 border border-danger/30'
                              }`}
                            >
                              {isPresent ? (
                                <>
                                  <CheckCircle2 size={13} /> Present
                                </>
                              ) : (
                                <>
                                  <XCircle size={13} /> Absent
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="text-xs font-mono text-text-500">
                Present: {roster.filter(s => s.present).length} / {roster.length} (
                {roster.length > 0 
                  ? ((roster.filter(s => s.present).length / roster.length) * 100).toFixed(1) 
                  : 0}%)
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setActiveSession(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveAttendance}
                  disabled={isSavingAttendance || roster.length === 0}
                >
                  {isSavingAttendance ? 'Saving Attendance...' : 'Save Attendance'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
