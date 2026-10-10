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
  Paperclip
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
        }}
        title={`Submissions: ${selectedAssignmentForView?.title || ''}`}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Assignment Overview Bar */}
          <div className="bg-surface-50 border border-border rounded-md p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-text-500 block">Subject:</span>
              <span className="font-semibold text-text-900 font-mono">
                {selectedAssignmentForView?.subject?.code}
              </span>
            </div>
            <div>
              <span className="text-text-500 block">Max Marks:</span>
              <span className="font-semibold text-text-900 font-mono">
                {selectedAssignmentForView?.marks} pts
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-text-500 block">Deadline:</span>
              <span className="font-semibold text-text-900 font-mono">
                {selectedAssignmentForView?.deadline ? new Date(selectedAssignmentForView.deadline).toLocaleString() : ''}
              </span>
            </div>
          </div>

          {isLoadingDetails ? (
            <div className="p-8 text-center text-sm text-text-500">
              Loading student submissions...
            </div>
          ) : !assignmentDetails?.submissions || assignmentDetails.submissions.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="mx-auto text-text-400 mb-2" size={32} />
              <p className="text-sm font-medium text-text-900">No submissions received yet</p>
              <p className="text-xs text-text-500 mt-1">
                Submissions from enrolled students will appear here as they are uploaded.
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-md overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-100 text-text-500 font-medium border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Roll No</th>
                    <th className="py-2.5 px-3">Submitted At</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Document</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {assignmentDetails.submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-surface-50">
                      <td className="py-2.5 px-3 font-medium text-text-900">
                        {sub.student?.name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-text-500">
                        {sub.student?.rollNumber || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-text-500">
                        {new Date(sub.submittedAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={sub.status} />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <a
                          href={sub.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-ink-700 hover:text-ink-900 font-medium underline"
                        >
                          <span>View File</span>
                          <ExternalLink size={12} />
                        </a>
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
              }}
            >
              Close
            </Button>
          </div>
        </div>
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
