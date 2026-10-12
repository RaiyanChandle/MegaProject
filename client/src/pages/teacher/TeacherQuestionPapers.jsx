import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { 
  FileText, 
  Upload, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Send, 
  Trash2, 
  Edit3, 
  FileCheck,
  Search,
  Filter,
  Layers,
  Calendar
} from 'lucide-react';

export default function TeacherQuestionPapers() {
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Upload / Manage Modal State
  const [activeExam, setActiveExam] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'url'
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileUrl, setFileUrl] = useState('');
  const [submitImmediately, setSubmitImmediately] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch teacher's assigned exams
  useEffect(() => {
    fetchAssignedExams();
  }, []);

  const fetchAssignedExams = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get('/question-papers/my-assigned-exams');
      setExams(data);
    } catch (error) {
      toast.error('Failed to load assigned examinations');
    } finally {
      setIsLoading(false);
    }
  };

  // Open upload modal
  const handleOpenUploadModal = (exam) => {
    setActiveExam(exam);
    setSelectedFile(null);
    setFileUrl('');
    setSubmitImmediately(true);
    setUploadMode('file');
    setIsModalOpen(true);
  };

  // Handle Paper Upload
  const handleUploadPaper = async (e) => {
    e.preventDefault();
    if (uploadMode === 'file' && !selectedFile) {
      toast.error('Please choose a question paper document (PDF or DOCX).');
      return;
    }
    if (uploadMode === 'url' && !fileUrl.trim()) {
      toast.error('Please enter a valid document storage URL.');
      return;
    }

    setIsSubmitting(true);
    try {
      const desiredStatus = submitImmediately ? 'SUBMITTED' : 'DRAFT';

      if (uploadMode === 'file' && selectedFile) {
        const formData = new FormData();
        formData.append('examId', activeExam.id);
        formData.append('file', selectedFile);
        formData.append('status', desiredStatus);
        await apiClient.post('/question-papers', formData);
      } else {
        await apiClient.post('/question-papers', {
          examId: activeExam.id,
          fileUrl: fileUrl.trim(),
          status: desiredStatus
        });
      }

      toast.success(
        submitImmediately 
          ? 'Question paper uploaded and submitted for Exam Staff verification!' 
          : 'Question paper saved as Draft.'
      );
      setIsModalOpen(false);
      setActiveExam(null);
      fetchAssignedExams();
    } catch (error) {
      toast.error(error.message || 'Failed to upload question paper');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit existing Draft to Exam Staff
  const handleSubmitDraft = async (paperId) => {
    setIsSubmitting(true);
    try {
      await apiClient.patch(`/question-papers/${paperId}/status`, { status: 'SUBMITTED' });
      toast.success('Question paper submitted to Exam Staff for verification!');
      fetchAssignedExams();
      if (activeExam) {
        setIsModalOpen(false);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to submit draft to Exam Staff');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Draft
  const handleDeleteDraft = async (paperId) => {
    if (!window.confirm('Are you sure you want to delete this draft question paper?')) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/question-papers/${paperId}`);
      toast.success('Draft question paper removed');
      fetchAssignedExams();
      if (activeExam) {
        setIsModalOpen(false);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to delete question paper');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered exams
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const paper = exam.latestQuestionPaper;
      const paperStatus = paper ? paper.status : 'NOT_UPLOADED';

      if (statusFilter && paperStatus !== statusFilter) {
        return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const subName = exam.subject?.name?.toLowerCase() || '';
        const subCode = exam.subject?.code?.toLowerCase() || '';
        const className = exam.class?.name?.toLowerCase() || '';
        const type = exam.examType?.toLowerCase() || '';
        return subName.includes(query) || subCode.includes(query) || className.includes(query) || type.includes(query);
      }

      return true;
    });
  }, [exams, searchQuery, statusFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = exams.length;
    const notUploaded = exams.filter(e => !e.latestQuestionPaper).length;
    const submitted = exams.filter(e => e.latestQuestionPaper?.status === 'SUBMITTED').length;
    const approved = exams.filter(e => e.latestQuestionPaper?.status === 'APPROVED').length;
    const draft = exams.filter(e => e.latestQuestionPaper?.status === 'DRAFT').length;
    const rejected = exams.filter(e => e.latestQuestionPaper?.status === 'REJECTED').length;
    return { total, notUploaded, submitted, approved, draft, rejected };
  }, [exams]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-3xl font-semibold text-text-900 tracking-tight">Question Paper Submission</h1>
          <p className="text-sm text-text-500 mt-1">
            Upload and submit examination question papers for your assigned courses. Exam Staff will review and verify them.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-0 rounded-md border border-border p-4 flex flex-col">
          <span className="text-xs font-medium text-text-500 uppercase tracking-wider">Assigned Exams</span>
          <span className="font-mono text-2xl font-bold text-text-900 mt-1">{stats.total}</span>
          <span className="text-xs text-text-500 mt-1">Across your teaching subjects</span>
        </div>

        <div className="bg-surface-0 rounded-md border border-border p-4 flex flex-col">
          <span className="text-xs font-medium text-text-500 uppercase tracking-wider">Pending / Revision</span>
          <span className="font-mono text-2xl font-bold text-warning mt-1">{stats.notUploaded + stats.draft + stats.rejected}</span>
          <span className="text-xs text-text-500 mt-1">
            {stats.rejected > 0 ? `${stats.rejected} revision required` : `${stats.draft} in draft stage`}
          </span>
        </div>

        <div className="bg-surface-0 rounded-md border border-border p-4 flex flex-col">
          <span className="text-xs font-medium text-text-500 uppercase tracking-wider">Under Verification</span>
          <span className="font-mono text-2xl font-bold text-info mt-1">{stats.submitted}</span>
          <span className="text-xs text-text-500 mt-1">Submitted to Exam Staff</span>
        </div>

        <div className="bg-surface-0 rounded-md border border-border p-4 flex flex-col">
          <span className="text-xs font-medium text-text-500 uppercase tracking-wider">Approved Papers</span>
          <span className="font-mono text-2xl font-bold text-success mt-1">{stats.approved}</span>
          <span className="text-xs text-text-500 mt-1">Verified by Exam Cell</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface-0 border border-border rounded-md p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-border bg-surface-0 px-3 py-1.5 text-xs font-medium text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
          >
            <option value="">All Statuses</option>
            <option value="NOT_UPLOADED">Not Uploaded</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Under Verification (Submitted)</option>
            <option value="APPROVED">Verified & Approved</option>
            <option value="REJECTED">Cannot Be Verified (Revision Required)</option>
          </select>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-text-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by subject, code, class..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-md border border-border bg-surface-0 text-text-900 placeholder:text-text-400 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
          />
        </div>
      </div>

      {/* Exam Papers Table / List */}
      <div className="bg-surface-0 rounded-md border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-text-500 text-sm">
            Loading your assigned examinations...
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={FileText}
              title="No examinations found"
              description="No scheduled examinations match your current filter or you have not been allocated to any subjects with upcoming exams."
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredExams.map((exam) => {
              const paper = exam.latestQuestionPaper;
              const d = exam.examDate ? new Date(exam.examDate) : null;

              return (
                <div key={exam.id} className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-surface-50/50 transition-colors">
                  {/* Left: Exam Details */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-text-900 text-base">
                        {exam.subject?.name}
                      </span>
                      <span className="font-mono text-xs font-medium px-2 py-0.5 rounded bg-surface-50 border border-border text-text-600">
                        {exam.subject?.code}
                      </span>
                      <StatusBadge status={exam.examType} />
                    </div>

                    <div className="flex items-center gap-4 text-xs text-text-500 flex-wrap">
                      <span>
                        <strong className="text-text-700">Class:</strong> {exam.class?.name} ({exam.class?.department?.code || exam.class?.department?.name})
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-text-400" />
                        {d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD'}
                        {d && ` at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-text-700">Marks:</strong> Pass: {exam.passingMarks} / Max: {exam.maxMarks}
                      </span>
                    </div>

                    {exam.assessmentComponent && (
                      <div className="text-[11px] text-text-500">
                        Mapped to Component: <span className="font-medium text-text-700">{exam.assessmentComponent.name}</span> ({exam.assessmentComponent.category})
                      </div>
                    )}

                    {/* Cannot Verify / Rejected Alert Banner */}
                    {paper?.status === 'REJECTED' && (
                      <div className="mt-2.5 p-3 rounded-md bg-danger/10 border border-danger/20 text-xs text-danger space-y-1">
                        <div className="font-semibold flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>Cannot Be Verified by Exam Staff — Revision Required</span>
                        </div>
                        <p className="text-text-700 ml-5 font-medium">
                          {paper.verificationRemarks || 'Please review guidelines and upload a revised question paper.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right: Paper Status & Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                    {/* Status Badge */}
                    <div>
                      {!paper ? (
                        <span className="text-xs font-medium px-2.5 py-1 rounded bg-warning/10 text-warning border border-warning/20">
                          Not Uploaded
                        </span>
                      ) : paper.status === 'DRAFT' ? (
                        <div className="flex flex-col items-start">
                          <span className="text-xs font-medium px-2.5 py-1 rounded bg-surface-100 text-text-700 border border-border">
                            Draft
                          </span>
                          <span className="text-[10px] text-text-500 mt-0.5">Not yet submitted</span>
                        </div>
                      ) : paper.status === 'SUBMITTED' ? (
                        <div className="flex flex-col items-start">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-info/10 text-info border border-info/20 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Under Verification
                          </span>
                          <span className="text-[10px] text-text-500 mt-0.5">Awaiting Exam Staff approval</span>
                        </div>
                      ) : paper.status === 'REJECTED' ? (
                        <div className="flex flex-col items-start">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-danger/10 text-danger border border-danger/20 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Cannot Verify
                          </span>
                          <span className="text-[10px] text-danger font-medium mt-0.5">Revision required</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-success/10 text-success border border-success/20 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Verified & Approved
                          </span>
                          <span className="text-[10px] text-text-500 mt-0.5">Approved by Exam Staff</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {!paper ? (
                        <Button
                          variant="accent"
                          size="sm"
                          onClick={() => handleOpenUploadModal(exam)}
                          className="flex items-center gap-1.5 text-xs shadow-none"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Paper</span>
                        </Button>
                      ) : paper.status === 'DRAFT' ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenUploadModal(exam)}
                            className="flex items-center gap-1 text-xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Replace Draft</span>
                          </Button>
                          <Button
                            variant="accent"
                            size="sm"
                            disabled={isSubmitting}
                            onClick={() => handleSubmitDraft(paper.id)}
                            className="flex items-center gap-1 text-xs shadow-none"
                            title="Submit to Exam Staff for formal verification"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Submit to Exam Staff</span>
                          </Button>
                        </>
                      ) : paper.status === 'REJECTED' ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={paper.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-border bg-surface-50 hover:bg-surface-100 text-text-700 transition-colors"
                            title="View previous paper"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-ink-600" />
                            <span>Previous</span>
                          </a>
                          <Button
                            variant="accent"
                            size="sm"
                            onClick={() => handleOpenUploadModal(exam)}
                            className="flex items-center gap-1.5 text-xs shadow-none"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Revised Paper</span>
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <a
                            href={paper.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-surface-50 hover:bg-surface-100 text-text-900 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-ink-600" />
                            <span>View Paper</span>
                          </a>

                          {paper.status === 'SUBMITTED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenUploadModal(exam)}
                              className="text-xs text-text-500 hover:text-ink-700"
                              title="Re-upload or update submission"
                            >
                              <span>Update</span>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* MODAL: UPLOAD / SUBMIT QUESTION PAPER                             */}
      {/* ================================================================= */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Upload Examination Question Paper"
        maxWidth="max-w-2xl"
      >
        {activeExam && (
          <form onSubmit={handleUploadPaper} className="space-y-4">
            {/* Exam Header */}
            <div className="p-3 bg-surface-50 border border-border rounded-md">
              <h4 className="font-semibold text-text-900 text-sm">{activeExam.subject?.name}</h4>
              <div className="text-xs text-text-500 font-mono mt-0.5">
                {activeExam.subject?.code} • {activeExam.class?.name} • Max: {activeExam.maxMarks}M
              </div>
            </div>

            {/* Workflow Banner */}
            <div className="p-3 bg-ink-50/50 border border-ink-100 rounded-md text-xs text-ink-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-ink-700" />
                <span>Verification Workflow</span>
              </div>
              <p className="text-text-600">
                You are uploading the question paper as the assigned Faculty Member. Once submitted, the Exam Staff will inspect and verify it before official approval.
              </p>
            </div>

            {/* Upload Mode Selector */}
            <div className="flex border border-border rounded-md overflow-hidden p-0.5 bg-surface-50">
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded ${
                  uploadMode === 'file' ? 'bg-surface-0 shadow-xs text-text-900' : 'text-text-500 hover:text-text-900'
                }`}
              >
                Upload File (PDF / DOCX)
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('url')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded ${
                  uploadMode === 'url' ? 'bg-surface-0 shadow-xs text-text-900' : 'text-text-500 hover:text-text-900'
                }`}
              >
                External Document URL
              </button>
            </div>

            {/* Mode: File Upload */}
            {uploadMode === 'file' ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text-700">
                  Select Question Paper Document
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                  className="block w-full text-xs text-text-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-surface-100 file:text-text-700 hover:file:bg-surface-200 border border-border rounded-md p-1.5 bg-surface-0"
                />
                <span className="text-[11px] text-text-500">
                  Accepted formats: PDF, DOC, DOCX (Max 15MB)
                </span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text-700">
                  Question Paper Storage / Drive URL
                </label>
                <input
                  type="url"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/... or secure storage URL"
                  className="w-full text-xs rounded-md border border-border p-2 bg-surface-0 text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700 font-mono"
                />
              </div>
            )}

            {/* Immediate Submission Checkbox */}
            <div className="pt-2 border-t border-border">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={submitImmediately}
                  onChange={(e) => setSubmitImmediately(e.target.checked)}
                  className="mt-0.5 rounded border-border text-ink-700 focus:ring-ink-700"
                />
                <div className="text-xs">
                  <span className="font-semibold text-text-900 block">
                    Submit immediately to Exam Staff for Verification
                  </span>
                  <span className="text-text-500 block mt-0.5">
                    If unchecked, this paper will be saved as a private Draft for you to review before submitting.
                  </span>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="accent"
                disabled={isSubmitting}
                className="flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Uploading...' : submitImmediately ? 'Upload & Submit for Verification' : 'Save Draft'}</span>
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
