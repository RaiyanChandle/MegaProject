import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { 
  FileCheck, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Clock, 
  Calendar, 
  Users, 
  Search, 
  Filter, 
  ChevronRight, 
  ShieldCheck, 
  Award,
  Sparkles,
  TrendingUp,
  RotateCcw
} from 'lucide-react';

export default function ExamResultsVerification() {
  const [submissions, setSubmissions] = useState([]);
  const [formOptions, setFormOptions] = useState({ academicTerms: [], departments: [] });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedTermFilter, setSelectedTermFilter] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Review Modal State
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [marksheetData, setMarksheetData] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isLoadingMarksheet, setIsLoadingMarksheet] = useState(false);

  // Approval / Rejection Action States
  const [isApproving, setIsApproving] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [optionsRes, submissionsRes] = await Promise.all([
        apiClient.get('/exams/form-options'),
        apiClient.get('/exam-results/exam-staff/submissions')
      ]);

      setFormOptions(optionsRes);
      setSubmissions(submissionsRes);

      const currentTerm = optionsRes.academicTerms?.find(t => t.isCurrent);
      if (currentTerm && !selectedTermFilter) {
        setSelectedTermFilter(currentTerm.id);
      }
    } catch (error) {
      toast.error('Failed to load examination submissions');
    } finally {
      setLoading(false);
    }
  };

  // Open review marksheet modal
  const handleOpenReview = async (examId) => {
    setSelectedExamId(examId);
    setIsReviewModalOpen(true);
    setIsLoadingMarksheet(true);
    try {
      const data = await apiClient.get(`/exam-results/marksheet/${examId}`);
      setMarksheetData(data);
    } catch (error) {
      toast.error('Failed to load exam marksheet');
      setIsReviewModalOpen(false);
    } finally {
      setIsLoadingMarksheet(false);
    }
  };

  // Approve & Verify Results
  const handleApprove = async () => {
    if (!selectedExamId) return;
    setIsApproving(true);
    try {
      const res = await apiClient.post(`/exam-results/verify/${selectedExamId}`);
      toast.success(res.message || 'Exam results verified and published successfully!');
      setIsReviewModalOpen(false);
      fetchInitialData();
    } catch (error) {
      toast.error(error.message || 'Failed to verify exam results');
    } finally {
      setIsApproving(false);
    }
  };

  // Submit Rejection
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      toast.error('Please enter a rejection reason for the teacher');
      return;
    }

    setIsRejecting(true);
    try {
      const res = await apiClient.post(`/exam-results/reject/${selectedExamId}`, {
        rejectionReason: rejectionReason.trim()
      });
      toast.success(res.message || 'Marksheet returned to teacher for revision');
      setIsRejectModalOpen(false);
      setRejectionReason('');
      setIsReviewModalOpen(false);
      fetchInitialData();
    } catch (error) {
      toast.error(error.message || 'Failed to reject marksheet');
    } finally {
      setIsRejecting(false);
    }
  };

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      if (selectedTermFilter && sub.academicTerm?.id !== selectedTermFilter) {
        return false;
      }
      if (selectedTypeFilter && sub.examType !== selectedTypeFilter) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const subName = sub.subject?.name?.toLowerCase() || '';
        const subCode = sub.subject?.code?.toLowerCase() || '';
        const clsName = sub.class?.name?.toLowerCase() || '';
        const teacherName = sub.enteredBy?.toLowerCase() || '';
        return subName.includes(q) || subCode.includes(q) || clsName.includes(q) || teacherName.includes(q);
      }
      return true;
    });
  }, [submissions, selectedTermFilter, selectedTypeFilter, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = submissions.length;
    const pendingVerification = submissions.filter(s => s.status === 'SUBMITTED').length;
    const verified = submissions.filter(s => s.status === 'VERIFIED').length;
    const rejected = submissions.filter(s => s.status === 'REJECTED').length;
    return { total, pendingVerification, verified, rejected };
  }, [submissions]);

  // Table columns
  const columns = [
    {
      title: 'Subject & Examination',
      key: 'subject',
      render: (_, s) => (
        <div className="flex flex-col">
          <span className="font-semibold text-text-900">{s.subject?.name}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-surface-100 border border-border text-ink-900">
              {s.subject?.code}
            </span>
            <span className="text-xs text-text-500">
              {s.class?.name}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Session & Marks Scheme',
      key: 'examType',
      render: (_, s) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={s.examType} />
          <span className="font-mono text-[11px] text-text-600">
            Max: <strong className="text-text-900">{s.maxMarks}M</strong> • Pass: <strong className="text-text-900">{s.passingMarks}M</strong>
          </span>
        </div>
      ),
    },
    {
      title: 'Teacher Submission',
      key: 'submission',
      render: (_, s) => {
        if (!s.enteredBy) {
          return (
            <span className="text-xs text-text-400 italic">
              Awaiting teacher evaluation
            </span>
          );
        }
        return (
          <div className="flex flex-col text-xs">
            <span className="font-semibold text-text-900">{s.enteredBy}</span>
            <span className="text-text-500 text-[11px]">
              {s.enteredAt ? new Date(s.enteredAt).toLocaleDateString() : ''}
            </span>
          </div>
        );
      },
    },
    {
      title: 'Evaluation Progress',
      key: 'progress',
      render: (_, s) => {
        if (s.totalEntries === 0) {
          return <span className="text-xs text-text-400">0 records</span>;
        }
        return (
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs font-bold text-text-900">
              {s.totalEntries} Candidates
            </span>
            {s.totalEntries > 0 && (
              <span className="text-[11px] text-text-500">
                <span className="text-success font-semibold">{s.passedCount} Passed</span> • <span className="text-danger font-semibold">{s.failedCount} Failed</span>
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: 'Workflow Status',
      key: 'status',
      render: (_, s) => {
        if (s.status === 'VERIFIED') {
          return (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-success">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Verified & Published</span>
            </div>
          );
        }
        if (s.status === 'SUBMITTED') {
          return (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-warning">
              <Clock className="w-4 h-4 text-warning" />
              <span>Pending Verification</span>
            </div>
          );
        }
        if (s.status === 'REJECTED') {
          return (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-danger">
              <XCircle className="w-4 h-4 text-danger" />
              <span>Revision Requested</span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-1.5 text-xs text-text-400">
            <span className="w-2 h-2 rounded-full bg-text-300" />
            <span>Marks Entry Pending</span>
          </div>
        );
      },
    },
    {
      title: 'Action',
      key: 'actions',
      render: (_, s) => (
        <div className="flex items-center justify-end">
          <Button
            variant={s.status === 'SUBMITTED' ? 'accent' : 'secondary'}
            size="sm"
            onClick={() => handleOpenReview(s.id)}
            className="flex items-center gap-1 text-xs font-semibold h-7 px-3 shadow-none"
          >
            <span>{s.status === 'SUBMITTED' ? 'Review & Verify' : 'View Marksheet'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-3xl font-semibold text-text-900 tracking-tight">Exam Results Verification Desk</h1>
          <p className="text-sm text-text-500 mt-1">
            Formal verification and approval of faculty-submitted examination marksheets (Rule 20). Approving results automatically synchronizes component marks and recomputes subject results.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-0 rounded-md border border-border p-4 flex flex-col">
          <span className="text-xs font-medium text-text-500 uppercase tracking-wider">Total Scheduled Exams</span>
          <span className="font-mono text-2xl font-bold text-text-900 mt-1">{stats.total}</span>
          <span className="text-xs text-text-500 mt-1">Across all active courses</span>
        </div>

        <div className="bg-surface-0 rounded-md border border-border p-4 flex flex-col">
          <span className="text-xs font-medium text-text-500 uppercase tracking-wider">Awaiting Verification</span>
          <span className="font-mono text-2xl font-bold text-warning mt-1">{stats.pendingVerification}</span>
          <span className="text-xs text-text-500 mt-1">Submitted by subject teachers</span>
        </div>

        <div className="bg-surface-0 rounded-md border border-border p-4 flex flex-col">
          <span className="text-xs font-medium text-text-500 uppercase tracking-wider">Verified & Published</span>
          <span className="font-mono text-2xl font-bold text-success mt-1">{stats.verified}</span>
          <span className="text-xs text-text-500 mt-1">Official scores synchronized</span>
        </div>

        <div className="bg-surface-0 rounded-md border border-border p-4 flex flex-col">
          <span className="text-xs font-medium text-text-500 uppercase tracking-wider">Revisions Requested</span>
          <span className="font-mono text-2xl font-bold text-danger mt-1">{stats.rejected}</span>
          <span className="text-xs text-text-500 mt-1">Returned to faculty</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-surface-0 border border-border rounded-md p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={selectedTermFilter}
            onChange={(e) => setSelectedTermFilter(e.target.value)}
            className="rounded-md border border-border bg-surface-0 px-3 py-1.5 text-xs font-medium text-text-900 focus:border-ink-700"
          >
            <option value="">All Academic Terms</option>
            {formOptions.academicTerms?.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name} {term.isCurrent ? '(Current)' : ''}
              </option>
            ))}
          </select>

          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="rounded-md border border-border bg-surface-0 px-3 py-1.5 text-xs font-semibold text-text-900 focus:border-ink-700"
          >
            <option value="">All Exam Sessions</option>
            <option value="MIDTERM">Mid-Semester (MSE)</option>
            <option value="FINAL">End-Semester (ESE)</option>
            <option value="MAKEUP">Backlog Re-attempts</option>
          </select>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-text-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by subject, code, teacher..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-md border border-border bg-surface-0 text-text-900 placeholder:text-text-400 focus:border-ink-700"
          />
        </div>
      </div>

      {/* Main Submissions Table */}
      <DataTable
        columns={columns}
        data={filteredSubmissions}
        loading={loading}
        keyField="id"
        emptyMessage="No examination result submissions found matching your filters."
      />

      {/* Review & Verification Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="Review & Verify Examination Marksheet"
        maxWidth="max-w-4xl"
      >
        {isLoadingMarksheet ? (
          <div className="p-12 text-center text-text-500 text-sm">
            Loading candidate marksheet details...
          </div>
        ) : marksheetData ? (
          <div className="space-y-5">
            {/* Exam Information Header */}
            <div className="bg-surface-50 border border-border rounded-lg p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <h3 className="text-lg font-bold text-text-900">
                    {marksheetData.exam?.subject?.name} ({marksheetData.exam?.subject?.code})
                  </h3>
                  <p className="text-xs text-text-500 mt-0.5">
                    {marksheetData.exam?.class?.name} • {marksheetData.exam?.academicTerm?.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={marksheetData.exam?.examType} />
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded border ${
                    marksheetData.marksheetStatus === 'VERIFIED'
                      ? 'bg-success/10 text-success border-success/20'
                      : marksheetData.marksheetStatus === 'SUBMITTED'
                      ? 'bg-warning/10 text-warning border-warning/20'
                      : marksheetData.marksheetStatus === 'REJECTED'
                      ? 'bg-danger/10 text-danger border-danger/20'
                      : 'bg-surface-100 text-text-600 border-border'
                  }`}>
                    {marksheetData.marksheetStatus === 'VERIFIED' ? 'Verified & Official' : marksheetData.marksheetStatus}
                  </span>
                </div>
              </div>

              {/* Evaluation Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-text-500 block">Evaluated By:</span>
                  <strong className="text-text-900">{marksheetData.submittedBy || 'Subject Teacher'}</strong>
                </div>
                <div>
                  <span className="text-text-500 block">Evaluation Scheme:</span>
                  <span className="font-mono">Max: <strong className="text-text-900">{marksheetData.exam?.maxMarks}M</strong> | Pass: <strong className="text-text-900">{marksheetData.exam?.passingMarks}M</strong></span>
                </div>
                <div>
                  <span className="text-text-500 block">Candidates Graded:</span>
                  <strong className="font-mono text-text-900">{marksheetData.gradedCount} / {marksheetData.totalStudents}</strong>
                </div>
                <div>
                  <span className="text-text-500 block">Linked Component:</span>
                  <span className="text-ink-700 font-semibold">{marksheetData.exam?.assessmentComponent?.name || 'Independent Exam'}</span>
                </div>
              </div>

              {/* Rejection notice if previously rejected */}
              {marksheetData.rejectionReason && (
                <div className="bg-danger/10 border border-danger/20 rounded p-2.5 text-xs text-danger flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>Previous Revision Request:</strong> {marksheetData.rejectionReason}
                  </div>
                </div>
              )}
            </div>

            {/* Candidate Marksheet Table */}
            <div className="border border-border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface-100 border-b border-border sticky top-0 z-10 text-text-700 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Roll No</th>
                    <th className="p-2.5">Candidate Name</th>
                    <th className="p-2.5">PRN / ID</th>
                    <th className="p-2.5">Seat No</th>
                    <th className="p-2.5 text-center">Marks Obtained</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface-0">
                  {marksheetData.studentsRoster?.map((s) => (
                    <tr key={s.enrollmentId} className="hover:bg-surface-50">
                      <td className="p-2.5 font-mono font-bold text-text-900">{s.rollNumber || '--'}</td>
                      <td className="p-2.5 font-medium text-text-900">{s.studentName}</td>
                      <td className="p-2.5 font-mono text-text-600">{s.instituteId}</td>
                      <td className="p-2.5 font-mono text-ink-900 font-semibold">{s.seatNumber}</td>
                      <td className="p-2.5 font-mono text-center font-bold text-text-900">
                        {s.marksObtained !== null ? `${s.marksObtained} / ${marksheetData.exam?.maxMarks}` : <span className="text-text-400 italic">Unmarked</span>}
                      </td>
                      <td className="p-2.5 text-center">
                        {s.marksObtained !== null ? (
                          s.isPass ? (
                            <span className="font-semibold text-success text-[11px] px-2 py-0.5 rounded bg-success/10 border border-success/20">
                              PASS
                            </span>
                          ) : (
                            <span className="font-semibold text-danger text-[11px] px-2 py-0.5 rounded bg-danger/10 border border-danger/20">
                              FAIL
                            </span>
                          )
                        ) : (
                          <span className="text-text-400">--</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 flex items-center justify-between border-t border-border">
              <Button
                variant="secondary"
                onClick={() => setIsReviewModalOpen(false)}
              >
                Close
              </Button>

              <div className="flex items-center gap-3">
                {marksheetData.marksheetStatus !== 'VERIFIED' && (
                  <Button
                    variant="danger"
                    onClick={() => setIsRejectModalOpen(true)}
                    className="flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Request Revision</span>
                  </Button>
                )}

                {marksheetData.marksheetStatus !== 'VERIFIED' ? (
                  <Button
                    variant="accent"
                    onClick={handleApprove}
                    loading={isApproving}
                    className="flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Verify Results</span>
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-success bg-success/10 px-3 py-1.5 rounded border border-success/20">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span>Officially Verified on {new Date(marksheetData.verifiedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Reject / Request Revision Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Request Marksheet Revision"
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <div className="bg-surface-50 border border-border rounded p-3 text-xs text-text-600">
            Explain the reason for returning this marksheet to the evaluating teacher (e.g. discrepancy in marks calculation, missing candidate scores, etc.).
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-700 mb-1">
              Revision Reason / Feedback <span className="text-danger">*</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter detailed instructions for the evaluating teacher..."
              rows={4}
              required
              className="w-full rounded-md border border-border bg-surface-0 p-3 text-sm text-text-900 focus:border-ink-700"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsRejectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={isRejecting}
              className="flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              <span>Return to Teacher</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
