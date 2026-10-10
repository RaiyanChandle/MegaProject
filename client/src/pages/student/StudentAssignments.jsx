import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { 
  FileText, 
  Search, 
  Calendar, 
  Clock, 
  Upload, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle,
  FileCheck,
  Paperclip,
  Check
} from 'lucide-react';

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PENDING, SUBMITTED

  // Submit Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch student assignments (strictly enrollment-scoped)
  const fetchAssignments = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get('/assignments/my-assignments');
      setAssignments(data);
    } catch (error) {
      toast.error('Failed to load assignments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  // Open submission modal
  const handleOpenSubmit = (assignment) => {
    setActiveAssignment(assignment);
    setSelectedFile(null);
    setIsSubmitModalOpen(true);
  };

  // Submit assignment solution
  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select your assignment file to submit');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      await apiClient.post(`/assignments/${activeAssignment.id}/submit`, formData);
      toast.success(
        activeAssignment.hasSubmitted 
          ? 'Assignment submission updated successfully!' 
          : 'Assignment submitted successfully!'
      );

      setIsSubmitModalOpen(false);
      setActiveAssignment(null);
      setSelectedFile(null);

      fetchAssignments();
    } catch (error) {
      toast.error(error.message || 'Failed to submit assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Unique subjects for filter
  const uniqueSubjects = Array.from(
    new Map(assignments.map(a => [a.subject?.id, a.subject])).values()
  ).filter(Boolean);

  // Filter assignments
  const filteredAssignments = assignments.filter((a) => {
    const matchesSubject = selectedSubject === 'ALL' || a.subject?.id === selectedSubject;
    
    let matchesStatus = true;
    if (statusFilter === 'SUBMITTED') matchesStatus = a.hasSubmitted;
    if (statusFilter === 'PENDING') matchesStatus = !a.hasSubmitted;

    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      !query ||
      a.title.toLowerCase().includes(query) ||
      a.subject?.name?.toLowerCase().includes(query) ||
      a.subject?.code?.toLowerCase().includes(query) ||
      a.teacher?.name?.toLowerCase().includes(query);

    return matchesSubject && matchesStatus && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-text-500">
        Loading your enrolled assignments...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-text-900">Course Assignments</h2>
        <p className="text-sm text-text-500 mt-1">
          Review assignments for your enrolled subjects and submit your work before the deadline.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface-0 border border-border rounded-md p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-text-500" size={16} />
            <input
              type="text"
              placeholder="Search by assignment title, subject, or faculty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border bg-surface-0 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
            />
          </div>

          {/* Subject Filter */}
          <div className="w-full sm:w-64">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
            >
              <option value="ALL">All Enrolled Subjects</option>
              {uniqueSubjects.map(sub => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          </div>

          {/* Submission Status Filter */}
          <div className="w-full sm:w-44">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Submission</option>
              <option value="SUBMITTED">Submitted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignments Listing */}
      {filteredAssignments.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Assignments Found"
          description={
            searchQuery || selectedSubject !== 'ALL' || statusFilter !== 'ALL'
              ? 'No assignments match the selected filters.'
              : 'There are no assignments published for your enrolled subjects right now.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssignments.map((assignment) => {
            const isPast = assignment.isPastDeadline;
            const hasSubmitted = assignment.hasSubmitted;
            const submission = assignment.submission;
            const isAccepted = submission?.status === 'ACCEPTED';
            const formattedDeadline = new Date(assignment.deadline).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={assignment.id}
                className="bg-surface-0 border border-border rounded-md p-5 flex flex-col justify-between space-y-4 hover:border-ink-700/40 transition-colors"
              >
                {/* Card Top: Subject & Status */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-medium px-2 py-0.5 rounded bg-surface-100 text-text-900 border border-border">
                      {assignment.subject?.code}
                    </span>
                    {hasSubmitted ? (
                      <StatusBadge status={submission.status} />
                    ) : isPast ? (
                      <span className="inline-flex items-center text-xs font-medium text-danger bg-danger/10 px-2 py-0.5 rounded-full">
                        Deadline Expired
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                        Pending
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-text-900 line-clamp-1">
                    {assignment.title}
                  </h3>

                  <div className="text-xs text-text-500 mt-1">
                    Faculty: <span className="text-text-900 font-medium">{assignment.teacher?.name}</span>
                  </div>

                  <p className="text-xs text-text-600 line-clamp-2 mt-2 leading-relaxed">
                    {assignment.description}
                  </p>
                </div>

                {/* Card Middle: Metadata & Brief */}
                <div className="pt-3 border-t border-border space-y-2 text-xs">
                  <div className="flex items-center justify-between text-text-500">
                    <span className="flex items-center gap-1.5 font-mono">
                      <Clock size={13} />
                      Due: {formattedDeadline}
                    </span>
                    <span className="font-mono font-medium text-text-900">
                      {assignment.marks} Marks
                    </span>
                  </div>

                  {assignment.pdfUrl && (
                    <div className="pt-1">
                      <a
                        href={assignment.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-ink-700 hover:text-ink-900 font-medium underline"
                      >
                        <Paperclip size={13} />
                        <span>Download Problem Brief</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  )}

                  {/* Submission details if already submitted */}
                  {hasSubmitted && (
                    <div className="p-2.5 rounded bg-surface-50 border border-border mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-text-500">Submitted file:</span>
                        <a
                          href={submission.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ink-700 hover:text-ink-900 font-medium underline inline-flex items-center gap-1"
                        >
                          <span>View Submission</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                      <div className="text-[10px] text-text-500 font-mono">
                        On: {new Date(submission.submittedAt).toLocaleString()}
                      </div>
                      {submission.marksAwarded !== null && submission.marksAwarded !== undefined && (
                        <div className="text-xs font-mono font-semibold text-success pt-1 border-t border-border mt-1">
                          Score: {submission.marksAwarded} / {assignment.marks}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Action Button */}
                <div className="pt-2">
                  {hasSubmitted ? (
                    isAccepted ? (
                      <div className="w-full py-2 text-center text-xs font-medium text-success bg-success/10 rounded border border-success/20 flex items-center justify-center gap-1.5">
                        <CheckCircle size={14} />
                        <span>Submission Accepted & Graded</span>
                      </div>
                    ) : isPast ? (
                      <div className="w-full py-2 text-center text-xs font-medium text-text-500 bg-surface-100 rounded border border-border">
                        Submission Closed
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => handleOpenSubmit(assignment)}
                        className="w-full text-xs justify-center"
                      >
                        Update Submission
                      </Button>
                    )
                  ) : isPast ? (
                    <div className="w-full py-2 text-center text-xs font-medium text-danger bg-danger/10 rounded border border-danger/20 flex items-center justify-center gap-1.5">
                      <AlertTriangle size={14} />
                      <span>Submissions Closed (Deadline passed)</span>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleOpenSubmit(assignment)}
                      className="w-full text-xs justify-center bg-ink-900 hover:bg-ink-800 text-white shadow-none"
                    >
                      <Upload size={14} className="mr-1.5" />
                      <span>Submit Solution</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Submit Assignment Solution */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => {
          setIsSubmitModalOpen(false);
          setActiveAssignment(null);
          setSelectedFile(null);
        }}
        title={activeAssignment?.hasSubmitted ? 'Update Submission' : 'Submit Assignment Solution'}
      >
        {activeAssignment && (
          <form onSubmit={handleSubmitAssignment} className="space-y-4">
            {/* Assignment Summary Box */}
            <div className="bg-surface-50 border border-border rounded-md p-3 space-y-1 text-xs">
              <div className="font-semibold text-text-900 text-sm">
                {activeAssignment.title}
              </div>
              <div className="text-text-500 font-mono">
                {activeAssignment.subject?.name} ({activeAssignment.subject?.code})
              </div>
              <div className="flex items-center justify-between pt-1 text-text-600 font-mono">
                <span>Total Marks: {activeAssignment.marks} pts</span>
                <span>Deadline: {new Date(activeAssignment.deadline).toLocaleString()}</span>
              </div>
            </div>

            <Field 
              label="Upload Solution File" 
              required
              helperText="Accepted formats: PDF, Word document, ZIP archive, or Text file (Max 20MB)."
            >
              <input
                type="file"
                required
                accept=".pdf,.doc,.docx,.zip,.txt,.png,.jpg"
                onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                className="w-full text-xs text-text-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-ink-900 file:text-white hover:file:bg-ink-800 cursor-pointer"
              />
            </Field>

            <div className="p-3 bg-info/10 text-info text-xs rounded-md">
              <strong>Note:</strong> In accordance with academic policy, each student may have one submission per course enrollment. You may update your file anytime before the deadline.
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsSubmitModalOpen(false);
                  setActiveAssignment(null);
                  setSelectedFile(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-ink-900 hover:bg-ink-800 text-white shadow-none"
              >
                {isSubmitting ? 'Uploading to Nexus...' : 'Confirm Submission'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
