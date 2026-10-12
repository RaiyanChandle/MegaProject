import { useState, useEffect, useMemo, useRef } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Trash2, 
  ExternalLink, 
  Send, 
  RotateCcw, 
  Plus, 
  Filter, 
  Search, 
  Eye, 
  Calendar,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';
import { useSearch } from '../../context/SearchContext';

export default function QuestionPapers() {
  const { searchQuery, setSearchQuery } = useSearch();

  const [papers, setPapers] = useState([]);
  const [exams, setExams] = useState([]);
  const [terms, setTerms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedTermId, setSelectedTermId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'url'
  const [selectedExamId, setSelectedExamId] = useState('');
  const [fileUrlInput, setFileUrlInput] = useState('');
  const [fileToUpload, setFileToUpload] = useState(null);
  const [initialStatus, setInitialStatus] = useState('DRAFT');
  const fileInputRef = useRef(null);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [papersData, examsData, termsData, deptsData] = await Promise.all([
        apiClient.get('/question-papers'),
        apiClient.get('/exams'),
        apiClient.get('/academic-terms'),
        apiClient.get('/departments')
      ]);

      setPapers(papersData || []);
      setExams(examsData || []);
      setTerms(termsData || []);
      setDepartments(deptsData || []);

      const current = (termsData || []).find(t => t.isCurrent);
      if (current) {
        setSelectedTermId(current.id);
      }
    } catch (err) {
      console.error('Error fetching question papers:', err);
      toast.error('Failed to load question papers data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle open upload modal
  const openUploadModal = (defaultExamId = '') => {
    setSelectedExamId(defaultExamId || (exams[0]?.id || ''));
    setUploadMode('file');
    setFileUrlInput('');
    setFileToUpload(null);
    setInitialStatus('DRAFT');
    setIsUploadModalOpen(true);
  };

  // Submit Upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();

    if (!selectedExamId) {
      toast.error('Please select an examination');
      return;
    }

    if (uploadMode === 'file' && !fileToUpload) {
      toast.error('Please select a document file to upload');
      return;
    }

    if (uploadMode === 'url' && !fileUrlInput.trim()) {
      toast.error('Please enter a valid document URL or cloud link');
      return;
    }

    try {
      setSubmitting(true);

      if (uploadMode === 'file') {
        const formData = new FormData();
        formData.append('examId', selectedExamId);
        formData.append('file', fileToUpload);
        formData.append('status', initialStatus);

        await apiClient.post('/question-papers', formData);
      } else {
        await apiClient.post('/question-papers', {
          examId: selectedExamId,
          fileUrl: fileUrlInput.trim(),
          status: initialStatus
        });
      }

      toast.success(`Question paper ${initialStatus === 'SUBMITTED' ? 'submitted' : 'saved as draft'}`);
      setIsUploadModalOpen(false);

      // Refresh list
      const updated = await apiClient.get('/question-papers');
      setPapers(updated || []);
    } catch (err) {
      toast.error(err.message || 'Failed to upload question paper');
    } finally {
      setSubmitting(false);
    }
  };

  // Update Status Workflow: DRAFT -> SUBMITTED -> APPROVED -> etc.
  const handleStatusChange = async (paperId, newStatus) => {
    try {
      await apiClient.patch(`/question-papers/${paperId}/status`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      setPapers(prev => prev.map(p => p.id === paperId ? { ...p, status: newStatus } : p));
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  // Open Delete Confirm
  const openDeleteModal = (paper) => {
    setSelectedPaper(paper);
    setIsDeleteOpen(true);
  };

  // Confirm Delete
  const handleDeleteConfirm = async () => {
    if (!selectedPaper) return;
    try {
      await apiClient.delete(`/question-papers/${selectedPaper.id}`);
      toast.success('Question paper deleted');
      setIsDeleteOpen(false);
      setPapers(prev => prev.filter(p => p.id !== selectedPaper.id));
    } catch (err) {
      toast.error(err.message || 'Failed to delete question paper');
    }
  };

  // Filtered papers
  const filteredPapers = useMemo(() => {
    return papers.filter(paper => {
      // Status filter
      if (selectedStatus !== 'ALL' && paper.status !== selectedStatus) return false;
      // Term filter
      if (selectedTermId && paper.exam?.academicTermId !== selectedTermId) return false;
      // Department filter
      if (selectedDeptId && paper.exam?.class?.departmentId !== selectedDeptId) return false;
      // Search
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const subName = paper.exam?.subject?.name?.toLowerCase() || '';
        const subCode = paper.exam?.subject?.code?.toLowerCase() || '';
        const author = paper.createdBy?.name?.toLowerCase() || '';
        if (!subName.includes(q) && !subCode.includes(q) && !author.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [papers, selectedStatus, selectedTermId, selectedDeptId, searchQuery]);

  // Metric counts
  const draftCount = papers.filter(p => p.status === 'DRAFT').length;
  const submittedCount = papers.filter(p => p.status === 'SUBMITTED').length;
  const approvedCount = papers.filter(p => p.status === 'APPROVED').length;

  // Table columns (using safe (_, paper) signature)
  const columns = [
    {
      title: 'Exam & Subject',
      render: (_, paper) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text-900">
              {paper?.exam?.subject?.name || 'Subject'}
            </span>
            {paper?.exam?.subject?.code && (
              <span className="px-1.5 py-0.5 rounded bg-surface-100 text-text-600 font-mono text-xs border border-border">
                {paper.exam.subject.code}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-text-500 mt-0.5">
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
              paper?.exam?.examType === 'FINAL' ? 'bg-purple-100 text-purple-800' :
              paper?.exam?.examType === 'MIDTERM' ? 'bg-blue-100 text-blue-800' :
              paper?.exam?.examType === 'MAKEUP' ? 'bg-amber-100 text-amber-800' :
              'bg-slate-100 text-slate-800'
            }`}>
              {paper?.exam?.examType || 'FINAL'}
            </span>
            <span>•</span>
            <span>Max: {paper?.exam?.maxMarks || 100}</span>
          </div>
        </div>
      )
    },
    {
      title: 'Class & Term',
      render: (_, paper) => (
        <div className="flex flex-col text-xs">
          <span className="font-medium text-text-800">
            {paper?.exam?.class?.department?.name || paper?.exam?.class?.department?.code || 'Department'}
          </span>
          <span className="text-text-500 mt-0.5">
            Sem {paper?.exam?.class?.semesterNumber || '—'} • Term {paper?.exam?.academicTerm?.name || '—'}
          </span>
        </div>
      )
    },
    {
      title: 'Document Link',
      render: (_, paper) => (
        <div className="flex items-center gap-2">
          {paper?.fileUrl ? (
            <a
              href={paper.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-brass-700 bg-brass-50 hover:bg-brass-100 border border-brass-200 transition-colors"
            >
              <FileText size={13} className="text-brass-600" />
              <span>View Document</span>
              <ExternalLink size={11} className="text-brass-500" />
            </a>
          ) : (
            <span className="text-xs text-text-400 italic">No URL</span>
          )}
        </div>
      )
    },
    {
      title: 'Workflow Status',
      render: (_, paper) => {
        const s = paper?.status || 'DRAFT';
        return (
          <div className="inline-flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              s === 'APPROVED' ? 'bg-success/15 text-success border border-success/30' :
              s === 'SUBMITTED' ? 'bg-info/15 text-info border border-info/30' :
              'bg-warning/15 text-warning border border-warning/30'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                s === 'APPROVED' ? 'bg-success' :
                s === 'SUBMITTED' ? 'bg-info animate-pulse' :
                'bg-warning'
              }`} />
              {s}
            </span>
          </div>
        );
      }
    },
    {
      title: 'Uploaded By',
      render: (_, paper) => (
        <div className="text-xs text-text-600">
          <span className="font-medium text-text-800 block">{paper?.createdBy?.name || 'Staff'}</span>
          <span className="text-[10px] text-text-400 font-mono">
            {paper?.createdAt ? new Date(paper.createdAt).toLocaleDateString() : ''}
          </span>
        </div>
      )
    },
    {
      title: 'Workflow Actions',
      headerClassName: 'text-right',
      render: (_, paper) => {
        const s = paper?.status || 'DRAFT';
        return (
          <div className="flex items-center justify-end gap-1.5">
            {/* If DRAFT -> Can Submit for review */}
            {s === 'DRAFT' && (
              <button
                onClick={() => handleStatusChange(paper.id, 'SUBMITTED')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-info/10 text-info hover:bg-info/20 border border-info/30 transition-colors"
                title="Submit paper for review"
              >
                <Send size={12} />
                Submit
              </button>
            )}

            {/* If SUBMITTED -> Can Approve or Request Changes (revert to DRAFT) */}
            {s === 'SUBMITTED' && (
              <>
                <button
                  onClick={() => handleStatusChange(paper.id, 'APPROVED')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-success text-white hover:bg-success/90 shadow-2xs transition-colors"
                  title="Approve paper"
                >
                  <CheckCircle size={12} />
                  Approve
                </button>
                <button
                  onClick={() => handleStatusChange(paper.id, 'DRAFT')}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md text-text-600 hover:text-warning hover:bg-warning/10 border border-border transition-colors"
                  title="Return to draft for revisions"
                >
                  <RotateCcw size={12} />
                  Revise
                </button>
              </>
            )}

            {/* If APPROVED -> Can Reopen if needed */}
            {s === 'APPROVED' && (
              <button
                onClick={() => handleStatusChange(paper.id, 'SUBMITTED')}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md text-text-500 hover:text-text-800 hover:bg-surface-100 transition-colors"
                title="Reopen review"
              >
                <RotateCcw size={11} />
                Reopen
              </button>
            )}

            {/* Delete button (available if not approved) */}
            {s !== 'APPROVED' && (
              <button
                onClick={() => openDeleteModal(paper)}
                className="p-1 rounded-md text-text-400 hover:text-danger hover:bg-danger/10 transition-colors ml-1"
                title="Delete draft"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text-900 tracking-tight">
              Question Paper Management
            </h1>
          </div>
          <p className="text-sm text-text-500 mt-1">
            Upload question papers and guide them through review: <strong className="text-text-700">DRAFT → SUBMITTED → APPROVED</strong>.
          </p>
        </div>

        <Button 
          variant="primary"
          onClick={() => openUploadModal()}
          className="bg-brass-500 hover:bg-brass-600 text-ink-950 font-semibold shadow-sm flex items-center gap-2 shrink-0"
        >
          <Upload size={16} />
          Upload Question Paper
        </Button>
      </div>

      {/* Workflow Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => setSelectedStatus('ALL')}
          className={`cursor-pointer border rounded-lg p-3 transition-all ${
            selectedStatus === 'ALL' ? 'bg-surface-0 border-brass-500 shadow-xs ring-1 ring-brass-500/30' : 'bg-surface-0 border-border hover:bg-surface-50'
          }`}
        >
          <span className="text-[11px] font-medium text-text-500 uppercase">Total Papers</span>
          <p className="text-xl font-bold text-text-900 mt-0.5">{papers.length}</p>
        </div>

        <div 
          onClick={() => setSelectedStatus('DRAFT')}
          className={`cursor-pointer border rounded-lg p-3 transition-all ${
            selectedStatus === 'DRAFT' ? 'bg-surface-0 border-warning shadow-xs ring-1 ring-warning/30' : 'bg-surface-0 border-border hover:bg-surface-50'
          }`}
        >
          <span className="text-[11px] font-medium text-warning uppercase">Draft</span>
          <p className="text-xl font-bold text-warning mt-0.5">{draftCount}</p>
        </div>

        <div 
          onClick={() => setSelectedStatus('SUBMITTED')}
          className={`cursor-pointer border rounded-lg p-3 transition-all ${
            selectedStatus === 'SUBMITTED' ? 'bg-surface-0 border-info shadow-xs ring-1 ring-info/30' : 'bg-surface-0 border-border hover:bg-surface-50'
          }`}
        >
          <span className="text-[11px] font-medium text-info uppercase">Under Review</span>
          <p className="text-xl font-bold text-info mt-0.5">{submittedCount}</p>
        </div>

        <div 
          onClick={() => setSelectedStatus('APPROVED')}
          className={`cursor-pointer border rounded-lg p-3 transition-all ${
            selectedStatus === 'APPROVED' ? 'bg-surface-0 border-success shadow-xs ring-1 ring-success/30' : 'bg-surface-0 border-border hover:bg-surface-50'
          }`}
        >
          <span className="text-[11px] font-medium text-success uppercase">Approved</span>
          <p className="text-xl font-bold text-success mt-0.5">{approvedCount}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-surface-0 border border-border rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-text-600 mb-1">Workflow Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-1.5 text-xs bg-surface-0 text-text-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft Only</option>
              <option value="SUBMITTED">Under Review (Submitted)</option>
              <option value="APPROVED">Approved Only</option>
            </select>
          </div>

          {/* Academic Term Filter */}
          <div>
            <label className="block text-xs font-medium text-text-600 mb-1">Academic Term</label>
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-1.5 text-xs bg-surface-0 text-text-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
            >
              <option value="">All Terms</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-xs font-medium text-text-600 mb-1">Department</label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-1.5 text-xs bg-surface-0 text-text-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-xs font-medium text-text-600 mb-1">Search Subject / Staff</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-md border border-border pl-8 pr-3 py-1.5 text-xs bg-surface-0 text-text-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-text-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-surface-0 border border-border rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-text-400">
            <div className="animate-spin w-6 h-6 border-2 border-brass-500 border-t-transparent rounded-full mx-auto mb-3" />
            Loading question papers...
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={42} className="mx-auto text-text-300 mb-3" />
            <h3 className="text-base font-semibold text-text-800">No question papers found</h3>
            <p className="text-xs text-text-400 mt-1 max-w-sm mx-auto">
              Upload a paper for one of your scheduled exams to initiate the review cycle.
            </p>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => openUploadModal()}
              className="mt-4 bg-brass-500 hover:bg-brass-600 text-ink-950 font-semibold"
            >
              Upload First Paper
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredPapers}
            keyField="id"
          />
        )}
      </div>

      {/* Upload Question Paper Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Question Paper"
        description="Select a scheduled exam and upload the examination document."
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {/* Exam Selection */}
          <Field label="Target Examination" required>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface-0 text-text-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
              required
            >
              <option value="">Select an examination schedule</option>
              {exams.map(ex => (
                <option key={ex.id} value={ex.id}>
                  {ex.subject?.name} ({ex.subject?.code}) • {ex.examType} • {ex.class?.department?.code} Sem {ex.class?.semesterNumber}
                </option>
              ))}
            </select>
          </Field>

          {/* Mode Switch: File Upload vs Document URL */}
          <div className="flex items-center gap-2 p-1 bg-surface-100 rounded-lg w-fit border border-border">
            <button
              type="button"
              onClick={() => setUploadMode('file')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                uploadMode === 'file' ? 'bg-surface-0 text-text-900 shadow-2xs' : 'text-text-500 hover:text-text-800'
              }`}
            >
              Upload PDF / Document
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('url')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                uploadMode === 'url' ? 'bg-surface-0 text-text-900 shadow-2xs' : 'text-text-500 hover:text-text-800'
              }`}
            >
              Paste Document URL
            </button>
          </div>

          {uploadMode === 'file' ? (
            <Field label="Document File (PDF, DOCX)" required>
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.doc,.docx"
                onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                className="w-full text-xs text-text-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-brass-500 file:text-ink-950 hover:file:bg-brass-600 file:cursor-pointer"
                required
              />
              <p className="text-[11px] text-text-400 mt-1">
                Supported formats: PDF, DOCX (Max 20MB)
              </p>
            </Field>
          ) : (
            <Field label="Document File URL" required hint="e.g. Cloudinary, Google Drive, or campus storage link">
              <input
                type="url"
                value={fileUrlInput}
                onChange={(e) => setFileUrlInput(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface-0 text-text-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
                required
              />
            </Field>
          )}

          {/* Initial Status */}
          <Field label="Initial Workflow Status">
            <div className="flex items-center gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-700">
                <input
                  type="radio"
                  name="initialStatus"
                  value="DRAFT"
                  checked={initialStatus === 'DRAFT'}
                  onChange={() => setInitialStatus('DRAFT')}
                  className="text-brass-500 focus:ring-brass-500"
                />
                Save as Draft (Working version)
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-700">
                <input
                  type="radio"
                  name="initialStatus"
                  value="SUBMITTED"
                  checked={initialStatus === 'SUBMITTED'}
                  onChange={() => setInitialStatus('SUBMITTED')}
                  className="text-brass-500 focus:ring-brass-500"
                />
                Submit for Review immediately
              </label>
            </div>
          </Field>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsUploadModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="bg-brass-500 hover:bg-brass-600 text-ink-950 font-semibold"
            >
              {submitting ? 'Uploading...' : 'Save Question Paper'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Question Paper"
        message="Are you sure you want to delete this question paper? This will remove the uploaded file from the review cycle."
        confirmText="Delete Paper"
        variant="danger"
      />
    </div>
  );
}
