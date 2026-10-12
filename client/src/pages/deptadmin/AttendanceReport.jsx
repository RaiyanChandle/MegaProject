import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  FileSpreadsheet, 
  BookOpen, 
  GraduationCap 
} from 'lucide-react';

export default function AttendanceReport() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [divisions, setDivisions] = useState([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState('');

  const [reportData, setReportData] = useState(null);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // 1. Fetch department's classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const data = await apiClient.get('/classes');
        setClasses(data);
        if (data.length > 0) {
          setSelectedClassId(data[0].id);
        }
      } catch (error) {
        toast.error('Failed to load department classes');
      } finally {
        setIsLoadingClasses(false);
      }
    };
    fetchClasses();
  }, []);

  // 2. Fetch subjects and divisions when class changes
  useEffect(() => {
    if (!selectedClassId) return;

    const fetchClassDetails = async () => {
      try {
        const [subs, divs] = await Promise.all([
          apiClient.get(`/subjects?classId=${selectedClassId}`),
          apiClient.get(`/divisions?classId=${selectedClassId}`)
        ]);

        setSubjects(subs);
        setDivisions(divs);

        if (subs.length > 0) {
          setSelectedSubjectId(subs[0].id);
        } else {
          setSelectedSubjectId('');
          setReportData(null);
        }
        setSelectedDivisionId('');
      } catch (error) {
        toast.error('Failed to load class curriculum details');
      }
    };

    fetchClassDetails();
  }, [selectedClassId]);

  // 3. Fetch attendance report when subject or division changes
  useEffect(() => {
    if (!selectedSubjectId) {
      setReportData(null);
      return;
    }

    const fetchReport = async () => {
      setIsLoadingReport(true);
      try {
        const queryParams = new URLSearchParams({
          subjectId: selectedSubjectId,
          classId: selectedClassId,
        });
        if (selectedDivisionId) {
          queryParams.append('divisionId', selectedDivisionId);
        }

        const data = await apiClient.get(`/attendance/report?${queryParams.toString()}`);
        setReportData(data);
      } catch (error) {
        toast.error('Failed to generate attendance report');
        setReportData(null);
      } finally {
        setIsLoadingReport(false);
      }
    };

    fetchReport();
  }, [selectedSubjectId, selectedDivisionId]);

  const columns = [
    {
      title: 'Roll No',
      key: 'rollNumber',
      render: (_, row) => (
        <span className="font-mono text-xs font-semibold text-text-900">
          {row.rollNumber || '--'}
        </span>
      )
    },
    {
      title: 'Institute ID',
      key: 'instituteId',
      render: (_, row) => (
        <span className="font-mono text-xs text-text-500">
          {row.instituteId}
        </span>
      )
    },
    {
      title: 'Student Name',
      key: 'name',
      render: (_, row) => (
        <div>
          <span className="font-medium text-text-900">{row.name}</span>
          {row.isBacklog && (
            <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] font-medium bg-warning/10 text-warning">
              Backlog (Att. {row.attemptNumber})
            </span>
          )}
        </div>
      )
    },
    {
      title: 'Division',
      key: 'division',
      render: (_, row) => (
        <span className="text-xs text-text-500">{row.division}</span>
      )
    },
    {
      title: 'Sessions Attended',
      key: 'sessions',
      render: (_, row) => (
        <span className="font-mono text-xs text-text-900">
          {row.attended} / {row.totalSessions}
        </span>
      )
    },
    {
      title: 'Attendance %',
      key: 'percentage',
      render: (_, row) => {
        const isRisk = row.isAtRisk;
        return (
          <span className={`font-mono text-xs font-semibold ${
            isRisk ? 'text-danger' : 'text-success'
          }`}>
            {row.percentage}%
          </span>
        );
      }
    },
    {
      title: 'Status',
      key: 'isAtRisk',
      render: (_, row) => {
        return row.isAtRisk ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger/10 text-danger border border-danger/20">
            <AlertTriangle size={12} /> At Risk (&lt;75%)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
            <CheckCircle2 size={12} /> Satisfactory
          </span>
        );
      }
    }
  ];

  if (isLoadingClasses) {
    return (
      <div className="p-8 text-center text-sm text-text-500">
        Loading classes...
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <EmptyState
        title="No Classes Configured"
        description="Please set up classes and subjects in the curriculum module before viewing attendance reports."
      />
    );
  }

  const stats = reportData?.stats;
  const students = reportData?.students || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-text-900">Department Attendance Report</h2>
        <p className="text-sm text-text-500 mt-1">
          Monitor class attendance performance, review lecture counts, and identify students below institutional criteria.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-surface-0 border border-border rounded-md p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Class Select */}
          <div>
            <label className="text-xs font-semibold text-text-500 uppercase tracking-wide block mb-1.5">
              Class
            </label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.batchYear} • Sem {c.semesterNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Subject Select */}
          <div>
            <label className="text-xs font-semibold text-text-500 uppercase tracking-wide block mb-1.5">
              Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              disabled={subjects.length === 0}
              className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700 disabled:opacity-50"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Division Select */}
          <div>
            <label className="text-xs font-semibold text-text-500 uppercase tracking-wide block mb-1.5">
              Division
            </label>
            <select
              value={selectedDivisionId}
              onChange={e => setSelectedDivisionId(e.target.value)}
              className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
            >
              <option value="">All Divisions</option>
              {divisions.map(d => (
                <option key={d.id} value={d.id}>
                  Division {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Overview KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-surface-0 border border-border rounded-md p-5">
            <div className="text-xs font-semibold text-text-500 uppercase tracking-wide">
              Total Enrolled
            </div>
            <div className="text-2xl font-bold font-mono text-text-900 mt-1">
              {stats.totalStudentsEnrolled}
            </div>
            <div className="text-xs text-text-500 mt-0.5">Students in roster</div>
          </div>

          <div className="bg-surface-0 border border-border rounded-md p-5">
            <div className="text-xs font-semibold text-text-500 uppercase tracking-wide">
              Sessions Conducted
            </div>
            <div className="text-2xl font-bold font-mono text-text-900 mt-1">
              {stats.totalSessionsConducted}
            </div>
            <div className="text-xs text-text-500 mt-0.5">Lectures & labs</div>
          </div>

          <div className="bg-surface-0 border border-border rounded-md p-5">
            <div className="text-xs font-semibold text-text-500 uppercase tracking-wide">
              Average Attendance
            </div>
            <div className="text-2xl font-bold font-mono text-text-900 mt-1">
              {stats.averagePercentage}%
            </div>
            <div className="text-xs text-text-500 mt-0.5">Subject aggregate</div>
          </div>

          <div className="bg-surface-0 border border-border rounded-md p-5">
            <div className="text-xs font-semibold text-text-500 uppercase tracking-wide">
              Students at Risk (&lt;75%)
            </div>
            <div className={`text-2xl font-bold font-mono mt-1 ${
              stats.atRiskCount > 0 ? 'text-danger' : 'text-success'
            }`}>
              {stats.atRiskCount}
            </div>
            <div className="text-xs text-text-500 mt-0.5">
              {stats.atRiskCount > 0 ? 'Need attendance notices' : 'Zero defaulters'}
            </div>
          </div>
        </div>
      )}

      {/* Roster & Attendance Table */}
      <div className="bg-surface-0 border border-border rounded-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-text-900">
              Student Attendance Register
            </h3>
            <p className="text-xs text-text-500 font-mono mt-0.5">
              Subject: {reportData?.subject?.name} ({reportData?.subject?.code})
            </p>
          </div>
        </div>

        {isLoadingReport ? (
          <div className="py-12 text-center text-sm text-text-500">
            Generating report data...
          </div>
        ) : students.length > 0 ? (
          <DataTable columns={columns} data={students} />
        ) : (
          <EmptyState
            title="No Attendance Data Available"
            description="No student records or sessions found for this subject selection."
          />
        )}
      </div>
    </div>
  );
}
