import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { 
  FileText, 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  ExternalLink, 
  Trash2, 
  Eye, 
  AlertCircle,
  CheckCircle2,
  Paperclip,
  Search,
  Award
} from 'lucide-react';

export default function TeacherAssignments() {
  const [allocations, setAllocations] = useState([]);
  const [selectedAllocationId, setSelectedAllocationId] = useState('ALL');
  const [assignments, setAssignments] = useState([]);
  const [isLoadingAllocations, setIsLoadingAllocations] = useState(true);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

  // Create Assignment Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    subjectId: '',
    divisionId: '',
    title: '',
    description: '',
    marks: '20',
    deadline: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Submissions Modal
  const [selectedAssignmentForView, setSelectedAssignmentForView] = useState(null);
  const [assignmentDetails, setAssignmentDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [submissionFilterText, setSubmissionFilterText] = useState('');

  // Grading Modal (T8.5)
  const [submissionToGrade, setSubmissionToGrade] = useState(null);
  const [gradeForm, setGradeForm] = useState({ marksAwarded: '', feedback: '' });
  const [isGrading, setIsGrading] = useState(false);

  // Delete Confirm
  const [assignmentToDelete, setAssignmentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Fetch teacher allocations on mount
  useEffect(() => {
    const fetchAllocations = async () => {
      try {
        const data = await apiClient.get('/teachers/my-allocations');
        setAllocations(data);
        if (data.length > 0) {
          // Pre-populate subjectId for creation form
          setAssignmentForm(prev => ({ ...prev, subjectId: data[0].subjectId }));
        }
      } catch (error) {
        toast.error('Failed to load your allocated subjects');
      } finally {
        setIsLoadingAllocations(false);
      }
    };
    fetchAllocations();
  }, []);

  // 2. Fetch assignments
  const fetchAssignments = async () => {
    setIsLoadingAssignments(true);
    try {
      let query = '';
      if (selectedAllocationId !== 'ALL') {
        const alloc = allocations.find(a => a.id === selectedAllocationId);
        if (alloc) {
          const params = new URLSearchParams({ subjectId: alloc.subjectId });
          if (alloc.divisionId) params.append('divisionId', alloc.divisionId);
          query = `?${params.toString()}`;
        }
      }
      const data = await apiClient.get(`/assignments${query}`);
      setAssignments(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to load assignments');
      setAssignments([]);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [selectedAllocationId]);

  // Handle Create Assignment
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!assignmentForm.subjectId) {
      toast.error('Please select a subject');
      return;
    }
    if (!assignmentForm.title.trim()) {
      toast.error('Please enter assignment title');
      return;
    }
    if (!assignmentForm.description.trim()) {
      toast.error('Please enter assignment instructions');
      return;
    }
    if (!assignmentForm.marks || parseInt(assignmentForm.marks, 10) <= 0) {
      toast.error('Please enter valid total marks');
      return;
    }
    if (!assignmentForm.deadline) {
      toast.error('Please set an assignment deadline');
      return;
    }

    const deadlineDate = new Date(assignmentForm.deadline);
    if (deadlineDate <= new Date()) {
      toast.error('Assignment deadline must be a future date and time');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('subjectId', assignmentForm.subjectId);
      if (assignmentForm.divisionId) {
        formData.append('divisionId', assignmentForm.divisionId);
      }
      formData.append('title', assignmentForm.title.trim());
      formData.append('description', assignmentForm.description.trim());
      formData.append('marks', assignmentForm.marks);
      formData.append('deadline', deadlineDate.toISOString());

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      await apiClient.post('/assignments', formData);
      toast.success('Assignment created successfully');

      // Reset form
      setAssignmentForm({
        subjectId: allocations[0]?.subjectId || '',
        divisionId: '',
        title: '',
        description: '',
        marks: '20',
        deadline: ''
      });
      setSelectedFile(null);
      setIsCreateModalOpen(false);

      fetchAssignments();
    } catch (error) {
      toast.error(error.message || 'Failed to create assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Submissions View
  const handleOpenSubmissions = async (assignment) => {
    setSelectedAssignmentForView(assignment);
    setIsLoadingDetails(true);
    try {
      const details = await apiClient.get(`/assignments/${assignment.id}`);
      setAssignmentDetails(details);
    } catch (error) {
      toast.error('Failed to load assignment submissions');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Handle Delete Assignment
  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/assignments/${assignmentToDelete.id}`);
      toast.success('Assignment deleted successfully');
      setAssignmentToDelete(null);
      fetchAssignments();
    } catch (error) {
      toast.error(error.message || 'Failed to delete assignment');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Grading Modal (T8.5)
  const handleOpenGradeModal = (submission) => {
    setSubmissionToGrade(submission);
    setGradeForm({
      marksAwarded: submission.marksAwarded !== null && submission.marksAwarded !== undefined 
        ? String(submission.marksAwarded) 
        : '',
      feedback: submission.feedback || ''
    });
  };

  // Submit Grade (T8.5: marks + feedback -> ACCEPTED)
  const handleSubmitGrade = async (e) => {
    e.preventDefault();
    if (!submissionToGrade || !selectedAssignmentForView) return;

    const marksNum = parseInt(gradeForm.marksAwarded, 10);
    if (isNaN(marksNum) || marksNum < 0) {
      toast.error('Please enter a valid marks value (0 or greater).');
      return;
    }

    if (marksNum > selectedAssignmentForView.marks) {
      toast.error(`Marks cannot exceed total assignment marks (${selectedAssignmentForView.marks}).`);
      return;
    }

    setIsGrading(true);
    try {
      const response = await apiClient.put(
        `/assignments/${selectedAssignmentForView.id}/submissions/${submissionToGrade.id}/grade`,
        {
          marksAwarded: marksNum,
          feedback: gradeForm.feedback
        }
      );

      toast.success('Submission evaluated and accepted successfully!');

      const updated = response.submission;
      setAssignmentDetails(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          submissions: prev.submissions.map(s => 
            s.id === updated.id ? { ...s, ...updated } : s
          )
        };
      });

      setSubmissionToGrade(null);
      fetchAssignments();
    } catch (error) {
      toast.error(error.message || 'Failed to submit grade');
    } finally {
      setIsGrading(false);
    }
  };

  // Selected subject's available divisions from allocations
  const activeSubjectAllocations = allocations.filter(
    a => a.subjectId === assignmentForm.subjectId
  );
  const availableDivisions = activeSubjectAllocations
    .map(a => a.division)
    .filter(Boolean);

  const columns = [
    {
      title: 'Assignment & Subject',
      key: 'title',
      render: (_, row) => (
        <div>
          <div className="font-semibold text-text-900">{row.title}</div>
          <div className="text-xs text-text-500 font-mono mt-0.5">
            {row.subject?.name} ({row.subject?.code})
          </div>
          <div className="text-xs text-text-500 line-clamp-1 mt-1 max-w-md">
            {row.description}
          </div>
        </div>
      )
    },
    {
      title: 'Target Scope',
      key: 'divisionId',
      render: (_, row) => (
        <div>
          {row.division ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-neutral/10 text-neutral">
              Div {row.division.name}
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-info/10 text-info">
              Entire Class
            </span>
          )}
        </div>
      )
    },
    {
      title: 'Deadline',
      key: 'deadline',
      render: (_, row) => {
        const isPast = new Date() > new Date(row.deadline);
        const deadlineDate = new Date(row.deadline).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        return (
          <div className="space-y-1">
            <div className="text-xs font-mono text-text-900">{deadlineDate}</div>
            {isPast ? (
              <span className="inline-flex items-center text-[10px] font-medium text-danger bg-danger/10 px-2 py-0.5 rounded-full">
                Closed
              </span>
            ) : (
              <span className="inline-flex items-center text-[10px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </div>
        );
      }
    },
    {
      title: 'Marks',
      key: 'marks',
      render: (_, row) => (
        <span className="font-mono text-sm font-medium text-text-900">
          {row.marks} pts
        </span>
      )
    },
    {
      title: 'Submissions',
      key: 'stats',
      render: (_, row) => {
        const count = row.stats?.totalSubmissions || 0;
        return (
          <button
            onClick={() => handleOpenSubmissions(row)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded border border-border bg-surface-0 hover:bg-surface-50 text-text-900 transition-colors"
          >
            <Users size={13} className="text-text-500" />
            <span>{count} Submitted</span>
          </button>
        );
      }
    },
    {
      title: 'Actions',
      key: 'id',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {row.pdfUrl && (
            <a
              href={row.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-text-500 hover:text-ink-900 rounded hover:bg-surface-100 transition-colors"
              title="View Assignment Brief"
            >
              <Paperclip size={16} />
            </a>
          )}
          <button
            onClick={() => handleOpenSubmissions(row)}
            className="p-1.5 text-text-500 hover:text-ink-900 rounded hover:bg-surface-100 transition-colors"
            title="View Submissions"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => setAssignmentToDelete(row)}
            className="p-1.5 text-danger/70 hover:text-danger rounded hover:bg-danger/10 transition-colors"
            title="Delete Assignment"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  if (isLoadingAllocations) {
    return (
      <div className="p-8 text-center text-sm text-text-500">
        Loading teacher assignments module...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-text-900">Assignments</h2>
          <p className="text-sm text-text-500 mt-1">
            Create and manage course assignments with strict deadline controls and submission tracking.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          disabled={allocations.length === 0}
          className="inline-flex items-center gap-2 bg-ink-900 hover:bg-ink-800 text-white shadow-none"
        >
          <Plus size={16} />
          <span>New Assignment</span>
        </Button>
      </div>

      {/* Filter / Scope Toolbar */}
      {allocations.length > 0 && (
        <div className="bg-surface-0 border border-border rounded-md p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-medium text-text-500 uppercase tracking-wider">
              Filter by Subject:
            </span>
            <select
              value={selectedAllocationId}
              onChange={(e) => setSelectedAllocationId(e.target.value)}
              className="rounded-md border border-border bg-surface-0 px-3 py-1.5 text-sm text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
            >
              <option value="ALL">All Allocated Subjects</option>
              {allocations.map((alloc) => (
                <option key={alloc.id} value={alloc.id}>
                  {alloc.subject?.name} ({alloc.subject?.code})
                  {alloc.division ? ` - Div ${alloc.division.name}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-text-500 font-mono">
            Showing {assignments.length} assignment{assignments.length === 1 ? '' : 's'}
          </div>
        </div>
      )}

      {/* Assignments Table or Empty State */}
      {allocations.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          title="No Subject Allocations"
          description="You are not currently allocated to any subjects. Assignments can only be created for allocated subjects."
        />
      ) : assignments.length === 0 && !isLoadingAssignments ? (
        <EmptyState
          icon={FileText}
          title="No Assignments Found"
          description="Create your first assignment for students to solve and submit before the deadline."
          actionLabel="Create Assignment"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="bg-surface-0 border border-border rounded-md overflow-hidden">
          <DataTable
            data={assignments}
            columns={columns}
            loading={isLoadingAssignments}
          />
        </div>
      )}

      {/* Modal: Create Assignment */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Course Assignment"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4">
          <Field label="Subject" required>
            <select
              value={assignmentForm.subjectId}
              onChange={(e) => {
                setAssignmentForm(prev => ({
                  ...prev,
                  subjectId: e.target.value,
                  divisionId: '' // reset division on subject change
                }));
              }}
              required
              className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
            >
              {Array.from(new Map(allocations.map(a => [a.subjectId, a.subject])).values()).filter(Boolean).map(sub => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          </Field>

          <Field 
            label="Target Division" 
            helperText="Leave as 'Entire Class' to make this assignment visible to all students enrolled in the subject."
          >
            <select
              value={assignmentForm.divisionId}
              onChange={(e) => setAssignmentForm(prev => ({ ...prev, divisionId: e.target.value }))}
              className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
            >
              <option value="">Entire Class (All Divisions)</option>
              {availableDivisions.map(div => (
                <option key={div.id} value={div.id}>
                  Division {div.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Assignment Title" required>
            <input
              type="text"
              placeholder="e.g. Unit 2: Sorting Algorithms Analysis"
              value={assignmentForm.title}
              onChange={(e) => setAssignmentForm(prev => ({ ...prev, title: e.target.value }))}
              required
              className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
            />
          </Field>

          <Field label="Instructions & Description" required>
            <textarea
              rows={3}
              placeholder="Provide assignment questions, problem statement, or submission guidelines..."
              value={assignmentForm.description}
              onChange={(e) => setAssignmentForm(prev => ({ ...prev, description: e.target.value }))}
              required
              className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Total Marks" required>
              <input
                type="number"
                min="1"
                max="100"
                value={assignmentForm.marks}
                onChange={(e) => setAssignmentForm(prev => ({ ...prev, marks: e.target.value }))}
                required
                className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm text-text-900 font-mono focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
              />
            </Field>

            <Field label="Submission Deadline" required helperText="Students cannot submit after this time.">
              <input
                type="datetime-local"
                value={assignmentForm.deadline}
                onChange={(e) => setAssignmentForm(prev => ({ ...prev, deadline: e.target.value }))}
                required
                className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm text-text-900 font-mono focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
              />
            </Field>
          </div>

          <Field 
            label="Attach Brief / Problem Sheet (Optional)" 
            helperText="PDF, DOCX, ZIP up to 15MB"
          >
            <input
              type="file"
              accept=".pdf,.doc,.docx,.zip,.txt"
              onChange={(e) => setSelectedFile(e.target.files[0] || null)}
              className="w-full text-xs text-text-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-surface-100 file:text-text-900 hover:file:bg-surface-200 cursor-pointer"
            />
          </Field>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-ink-900 hover:bg-ink-800 text-white shadow-none"
            >
              {isSubmitting ? 'Creating Assignment...' : 'Publish Assignment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Submissions Drawer/Modal */}
      <Modal
        isOpen={!!selectedAssignmentForView}
        onClose={() => {
          setSelectedAssignmentForView(null);
          setAssignmentDetails(null);
          setSubmissionFilterText('');
        }}
        title={`Student Submissions: ${selectedAssignmentForView?.title || ''}`}
        maxWidth="max-w-6xl"
      >
        <div className="space-y-4">
          {/* Assignment Overview Bar */}
          <div className="bg-surface-50 border border-border rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-text-500 block mb-1">Subject & Code:</span>
              <span className="font-semibold text-text-900 font-mono text-sm block">
                {selectedAssignmentForView?.subject?.code}
              </span>
              <span className="text-text-500 text-[11px] truncate block">
                {selectedAssignmentForView?.subject?.name}
              </span>
            </div>
            <div>
              <span className="text-text-500 block mb-1">Total Marks:</span>
              <span className="font-semibold text-text-900 font-mono text-sm block">
                {selectedAssignmentForView?.marks} pts
              </span>
            </div>
            <div>
              <span className="text-text-500 block mb-1">Deadline:</span>
              <span className="font-semibold text-text-900 font-mono text-xs block">
                {selectedAssignmentForView?.deadline ? new Date(selectedAssignmentForView.deadline).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : '-'}
              </span>
            </div>
            <div>
              <span className="text-text-500 block mb-1">Submissions Count:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-success font-mono text-sm">
                <CheckCircle2 size={15} />
                {assignmentDetails?.submissions?.length || 0} Submitted
              </span>
            </div>
          </div>

          {/* Submissions Search Toolbar */}
          {assignmentDetails?.submissions?.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 text-text-400" size={15} />
                <input
                  type="text"
                  placeholder="Filter by student name, roll number, or division..."
                  value={submissionFilterText}
                  onChange={(e) => setSubmissionFilterText(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-border bg-surface-0 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
                />
              </div>
              <div className="text-xs text-text-500 font-mono">
                Showing {assignmentDetails.submissions.filter(sub => {
                  if (!submissionFilterText.trim()) return true;
                  const q = submissionFilterText.toLowerCase();
                  return (
                    sub.student?.name?.toLowerCase().includes(q) ||
                    sub.student?.rollNumber?.toLowerCase().includes(q) ||
                    sub.student?.division?.name?.toLowerCase().includes(q)
                  );
                }).length} of {assignmentDetails.submissions.length} submission{assignmentDetails.submissions.length === 1 ? '' : 's'}
              </div>
            </div>
          )}

          {isLoadingDetails ? (
            <div className="py-16 text-center text-sm text-text-500">
              Loading student submissions...
            </div>
          ) : !assignmentDetails?.submissions || assignmentDetails.submissions.length === 0 ? (
            <div className="py-16 text-center">
              <Clock className="mx-auto text-text-400 mb-2" size={38} />
              <p className="text-sm font-medium text-text-900">No submissions received yet</p>
              <p className="text-xs text-text-500 mt-1">
                Submissions from enrolled students will appear here as they are uploaded.
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden max-h-[52vh] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-surface-100 text-text-600 font-medium border-b border-border text-xs uppercase tracking-wider z-10 shadow-sm">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Roll No</th>
                    <th className="py-3 px-4">Division</th>
                    <th className="py-3 px-4">Submitted At</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Score & Feedback</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {assignmentDetails.submissions
                    .filter(sub => {
                      if (!submissionFilterText.trim()) return true;
                      const q = submissionFilterText.toLowerCase();
                      return (
                        sub.student?.name?.toLowerCase().includes(q) ||
                        sub.student?.rollNumber?.toLowerCase().includes(q) ||
                        sub.student?.division?.name?.toLowerCase().includes(q)
                      );
                    })
                    .map((sub) => (
                      <tr key={sub.id} className="hover:bg-surface-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-text-900">
                          {sub.student?.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-text-500 text-xs">
                          {sub.student?.rollNumber || '-'}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {sub.student?.division?.name ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-medium bg-neutral/10 text-neutral">
                              Div {sub.student.division.name}
                            </span>
                          ) : (
                            <span className="text-text-400 font-mono">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-text-600 text-xs">
                          {new Date(sub.submittedAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={sub.status} />
                        </td>
                        <td className="py-3 px-4">
                          {sub.status === 'ACCEPTED' && sub.marksAwarded !== null && sub.marksAwarded !== undefined ? (
                            <div>
                              <span className="font-mono font-bold text-success text-xs">
                                {sub.marksAwarded} / {selectedAssignmentForView?.marks} pts
                              </span>
                              {sub.feedback && (
                                <div className="text-[11px] text-text-600 line-clamp-1 italic mt-0.5 max-w-xs" title={sub.feedback}>
                                  "{sub.feedback}"
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-text-400 font-mono italic">Pending evaluation</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={sub.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-surface-0 hover:bg-surface-100 text-ink-900 transition-colors"
                              title="View Document"
                            >
                              <span>File</span>
                              <ExternalLink size={12} />
                            </a>
                            <Button
                              variant="outline"
                              onClick={() => handleOpenGradeModal(sub)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border-border hover:bg-surface-100 h-auto"
                            >
                              <Award size={13} className="text-brass-500" />
                              <span>{sub.status === 'ACCEPTED' ? 'Edit Grade' : 'Grade'}</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedAssignmentForView(null);
                setAssignmentDetails(null);
                setSubmissionFilterText('');
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Grade Submission (T8.5) */}
      <Modal
        isOpen={!!submissionToGrade}
        onClose={() => setSubmissionToGrade(null)}
        title={`Evaluate: ${submissionToGrade?.student?.name || 'Student'}`}
        maxWidth="max-w-md"
      >
        {submissionToGrade && (
          <form onSubmit={handleSubmitGrade} className="space-y-4">
            <div className="bg-surface-50 border border-border rounded-lg p-3 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-text-500">Student:</span>
                <span className="font-semibold text-text-900">{submissionToGrade.student?.name}</span>
              </div>
              <div className="flex justify-between items-center font-mono">
                <span className="text-text-500">Roll Number:</span>
                <span className="text-text-900">{submissionToGrade.student?.rollNumber || '-'}</span>
              </div>
              <div className="flex justify-between items-center font-mono">
                <span className="text-text-500">Assignment Max Marks:</span>
                <span className="font-bold text-text-900">{selectedAssignmentForView?.marks} pts</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-border">
                <span className="text-text-500">Submitted File:</span>
                <a
                  href={submissionToGrade.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink-700 hover:text-ink-900 font-medium underline inline-flex items-center gap-1"
                >
                  <span>Open Student Solution</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>

            <Field label={`Marks Awarded (out of ${selectedAssignmentForView?.marks})`} required>
              <input
                type="number"
                min="0"
                max={selectedAssignmentForView?.marks || 100}
                required
                placeholder={`0 - ${selectedAssignmentForView?.marks}`}
                value={gradeForm.marksAwarded}
                onChange={(e) => setGradeForm(prev => ({ ...prev, marksAwarded: e.target.value }))}
                className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm text-text-900 font-mono focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
              />
            </Field>

            <Field 
              label="Feedback & Comments (Optional)"
              helperText="Constructive feedback visible to the student upon evaluation."
            >
              <textarea
                rows={3}
                placeholder="e.g. Excellent methodology and clear explanations. Pay closer attention to boundary edge conditions."
                value={gradeForm.feedback}
                onChange={(e) => setGradeForm(prev => ({ ...prev, feedback: e.target.value }))}
                className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
              />
            </Field>

            <div className="p-2.5 rounded bg-success/10 text-success text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>Saving marks will set submission status to <strong>ACCEPTED</strong> and notify the student.</span>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSubmissionToGrade(null)}
                disabled={isGrading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isGrading}
                className="bg-ink-900 hover:bg-ink-800 text-white shadow-none"
              >
                {isGrading ? 'Saving Grade...' : 'Save & Accept'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!assignmentToDelete}
        onClose={() => setAssignmentToDelete(null)}
        onConfirm={handleDeleteAssignment}
        isLoading={isDeleting}
        title="Delete Assignment"
        message={`Are you sure you want to delete assignment "${assignmentToDelete?.title}"? All student submissions associated with this assignment will also be permanently removed.`}
        confirmText="Delete Assignment"
        variant="danger"
      />
    </div>
  );
}
