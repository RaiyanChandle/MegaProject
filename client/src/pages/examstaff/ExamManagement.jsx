import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { useSearch } from '../../context/SearchContext';
import { 
  Calendar, 
  Plus, 
  Edit2, 
  Trash2, 
  Clock, 
  BookOpen, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  UserCheck,
  Search,
  Filter,
  Eye,
  CalendarDays,
  Upload,
  ExternalLink,
  FileCheck,
  RotateCcw
} from 'lucide-react';

const EXAM_TYPES = [
  { value: 'FINAL', label: 'End Semester / Final' },
  { value: 'MIDTERM', label: 'Mid Semester / Midterm' },
  { value: 'INTERNAL', label: 'Internal Assessment' },
  { value: 'MAKEUP', label: 'Makeup / Backlog Re-attempt' },
];

export default function ExamManagement() {
  const { searchQuery } = useSearch();
  const [exams, setExams] = useState([]);
  const [formOptions, setFormOptions] = useState({ academicTerms: [], departments: [] });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedTermFilter, setSelectedTermFilter] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isQpModalOpen, setIsQpModalOpen] = useState(false);

  const [activeExam, setActiveExam] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Question Paper Verification State
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [isQpLoading, setIsQpLoading] = useState(false);

  // Form State for Create / Edit
  const [formData, setFormData] = useState({
    academicTermId: '',
    departmentId: '',
    classId: '',
    subjectId: '',
    assessmentComponentId: '',
    examType: 'FINAL',
    examDate: '',
    examTime: '10:00',
    maxMarks: '100',
    passingMarks: '40',
  });

  // Fetch form metadata and scheduled exams
  const fetchData = async () => {
    setLoading(true);
    try {
      const [optionsRes, examsRes] = await Promise.all([
        apiClient.get('/exams/form-options'),
        apiClient.get('/exams')
      ]);

      setFormOptions(optionsRes);
      setExams(examsRes);

      // Pre-select current academic term if not already selected
      if (!selectedTermFilter && optionsRes.academicTerms) {
        const currentTerm = optionsRes.academicTerms.find(t => t.isCurrent);
        if (currentTerm) {
          setSelectedTermFilter(currentTerm.id);
        }
      }
    } catch (error) {
      console.error('Failed to load exams data:', error);
      toast.error(error.message || 'Failed to load exams data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Cascading options derived from formData
  const selectedDepartment = useMemo(() => {
    return formOptions.departments?.find(d => d.id === formData.departmentId) || null;
  }, [formOptions.departments, formData.departmentId]);

  const availableClasses = useMemo(() => {
    return selectedDepartment?.classes || [];
  }, [selectedDepartment]);

  const selectedClass = useMemo(() => {
    return availableClasses.find(c => c.id === formData.classId) || null;
  }, [availableClasses, formData.classId]);

  const availableSubjects = useMemo(() => {
    return selectedClass?.subjects || [];
  }, [selectedClass]);

  const selectedSubject = useMemo(() => {
    return availableSubjects.find(s => s.id === formData.subjectId) || null;
  }, [availableSubjects, formData.subjectId]);

  const availableComponents = useMemo(() => {
    return selectedSubject?.assessmentComponents || [];
  }, [selectedSubject]);

  // Handle department change in form
  const handleDepartmentChange = (deptId) => {
    setFormData(prev => ({
      ...prev,
      departmentId: deptId,
      classId: '',
      subjectId: '',
      assessmentComponentId: ''
    }));
  };

  // Handle class change in form
  const handleClassChange = (classId) => {
    setFormData(prev => ({
      ...prev,
      classId,
      subjectId: '',
      assessmentComponentId: ''
    }));
  };

  // Handle subject change in form
  const handleSubjectChange = (subjectId) => {
    const sub = availableSubjects.find(s => s.id === subjectId);
    setFormData(prev => ({
      ...prev,
      subjectId,
      assessmentComponentId: '',
      // default suggested max marks if component exists or standard 100
      maxMarks: prev.maxMarks || '100',
      passingMarks: prev.passingMarks || '40'
    }));
  };

  // Handle component selection - optionally prepopulate max marks
  const handleComponentChange = (componentId) => {
    const comp = availableComponents.find(c => c.id === componentId);
    setFormData(prev => ({
      ...prev,
      assessmentComponentId: componentId,
      maxMarks: comp ? String(comp.maxMarks) : prev.maxMarks,
      passingMarks: comp ? String(Math.round(comp.maxMarks * 0.4)) : prev.passingMarks
    }));
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const currentTerm = formOptions.academicTerms?.find(t => t.isCurrent);
    const defaultTermId = currentTerm ? currentTerm.id : (formOptions.academicTerms?.[0]?.id || '');
    const firstDept = formOptions.departments?.[0];

    setFormData({
      academicTermId: selectedTermFilter || defaultTermId,
      departmentId: firstDept?.id || '',
      classId: firstDept?.classes?.[0]?.id || '',
      subjectId: firstDept?.classes?.[0]?.subjects?.[0]?.id || '',
      assessmentComponentId: '',
      examType: 'FINAL',
      examDate: '',
      examTime: '10:00',
      maxMarks: '100',
      passingMarks: '40',
    });

    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (exam) => {
    setActiveExam(exam);
    let dateStr = '';
    let timeStr = '10:00';

    if (exam.examDate) {
      const d = new Date(exam.examDate);
      dateStr = d.toISOString().split('T')[0];
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      timeStr = `${hours}:${minutes}`;
    }

    setFormData({
      academicTermId: exam.academicTermId,
      departmentId: exam.class?.departmentId || '',
      classId: exam.classId,
      subjectId: exam.subjectId,
      assessmentComponentId: exam.assessmentComponentId || '',
      examType: exam.examType,
      examDate: dateStr,
      examTime: timeStr,
      maxMarks: String(exam.maxMarks),
      passingMarks: String(exam.passingMarks),
    });

    setIsEditModalOpen(true);
  };

  // Open Detail Modal
  const handleOpenDetailModal = (exam) => {
    setActiveExam(exam);
    setIsDetailModalOpen(true);
  };

  // Open Delete Confirm
  const handleOpenDeleteConfirm = (exam) => {
    setActiveExam(exam);
    setIsDeleteConfirmOpen(true);
  };

  // Open Question Paper Verification Modal
  const handleOpenQuestionPaperModal = async (exam) => {
    setActiveExam(exam);
    setRejectionRemarks('');
    setIsQpModalOpen(true);
    try {
      const detailed = await apiClient.get(`/exams/${exam.id}`);
      setActiveExam({
        ...detailed,
        latestQuestionPaper: detailed.latestQuestionPaper || detailed.questionPapers?.[0] || exam.latestQuestionPaper || null
      });
    } catch (err) {
      console.error('Failed to reload exam question papers:', err);
    }
  };

  // Upload Question Paper
  const handleUploadQuestionPaper = async (e) => {
    e.preventDefault();
    if (!qpFile && !qpFileUrl.trim()) {
      toast.error('Please select a file or enter a valid file URL.');
      return;
    }
    setIsQpLoading(true);
    try {
      if (qpFile) {
        const data = new FormData();
        data.append('examId', activeExam.id);
        data.append('file', qpFile);
        data.append('status', qpInitialStatus);
        await apiClient.post('/question-papers', data);
      } else {
        await apiClient.post('/question-papers', {
          examId: activeExam.id,
          fileUrl: qpFileUrl.trim(),
          status: qpInitialStatus
        });
      }
      toast.success('Question paper uploaded successfully');
      setQpFile(null);
      setQpFileUrl('');
      const updatedExam = await apiClient.get(`/exams/${activeExam.id}`);
      setActiveExam(updatedExam);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to upload question paper');
    } finally {
      setIsQpLoading(false);
    }
  };

  // Transition Question Paper Workflow: APPROVED or REJECTED (Cannot Verify)
  const handleUpdatePaperStatus = async (paperId, newStatus, remarks = '') => {
    setIsQpLoading(true);
    try {
      await apiClient.patch(`/question-papers/${paperId}/status`, { 
        status: newStatus,
        verificationRemarks: remarks || undefined
      });
      if (newStatus === 'APPROVED') {
        toast.success('Question paper formally verified and approved!');
      } else if (newStatus === 'REJECTED') {
        toast.error('Marked as Cannot Be Verified. Feedback sent to faculty.');
      } else {
        toast.success(`Question paper moved to ${newStatus}`);
      }
      const updatedExam = await apiClient.get(`/exams/${activeExam.id}`);
      setActiveExam({
        ...updatedExam,
        latestQuestionPaper: updatedExam.latestQuestionPaper || updatedExam.questionPapers?.[0] || null
      });
      setRejectionRemarks('');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to update question paper status');
    } finally {
      setIsQpLoading(false);
    }
  };

  // Delete Question Paper
  const handleDeletePaper = async (paperId) => {
    if (!window.confirm('Are you sure you want to delete this question paper?')) return;
    setIsQpLoading(true);
    try {
      await apiClient.delete(`/question-papers/${paperId}`);
      toast.success('Question paper removed');
      const updatedExam = await apiClient.get(`/exams/${activeExam.id}`);
      setActiveExam(updatedExam);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete question paper');
    } finally {
      setIsQpLoading(false);
    }
  };

  // Submit Create
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subjectId || !formData.classId || !formData.academicTermId) {
      toast.error('Please select academic term, class, and subject.');
      return;
    }

    const max = Number(formData.maxMarks);
    const pass = Number(formData.passingMarks);

    if (isNaN(max) || max <= 0) {
      toast.error('Maximum marks must be greater than 0.');
      return;
    }

    if (isNaN(pass) || pass < 0 || pass > max) {
      toast.error('Passing marks must be between 0 and maximum marks.');
      return;
    }

    let combinedDateTime = null;
    if (formData.examDate) {
      combinedDateTime = new Date(`${formData.examDate}T${formData.examTime || '10:00'}:00`);
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/exams', {
        academicTermId: formData.academicTermId,
        classId: formData.classId,
        subjectId: formData.subjectId,
        assessmentComponentId: formData.assessmentComponentId || null,
        examType: formData.examType,
        examDate: combinedDateTime,
        maxMarks: max,
        passingMarks: pass,
      });

      toast.success('Exam scheduled successfully');
      setIsCreateModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to schedule exam');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!activeExam) return;

    const max = Number(formData.maxMarks);
    const pass = Number(formData.passingMarks);

    if (isNaN(max) || max <= 0) {
      toast.error('Maximum marks must be greater than 0.');
      return;
    }

    if (isNaN(pass) || pass < 0 || pass > max) {
      toast.error('Passing marks must be between 0 and maximum marks.');
      return;
    }

    let combinedDateTime = null;
    if (formData.examDate) {
      combinedDateTime = new Date(`${formData.examDate}T${formData.examTime || '10:00'}:00`);
    }

    setIsSubmitting(true);
    try {
      await apiClient.put(`/exams/${activeExam.id}`, {
        examType: formData.examType,
        examDate: combinedDateTime,
        maxMarks: max,
        passingMarks: pass,
        assessmentComponentId: formData.assessmentComponentId || null,
      });

      toast.success('Exam schedule updated successfully');
      setIsEditModalOpen(false);
      setActiveExam(null);
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to update exam');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Delete
  const handleDeleteConfirm = async () => {
    if (!activeExam) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/exams/${activeExam.id}`);
      toast.success('Exam schedule removed successfully');
      setIsDeleteConfirmOpen(false);
      setActiveExam(null);
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to delete exam');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered exams list
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      // Academic term filter
      if (selectedTermFilter && exam.academicTermId !== selectedTermFilter) {
        return false;
      }

      // Department filter
      if (selectedDeptFilter && exam.class?.departmentId !== selectedDeptFilter) {
        return false;
      }

      // Exam type filter
      if (selectedTypeFilter && exam.examType !== selectedTypeFilter) {
        return false;
      }

      // Global Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const subName = exam.subject?.name?.toLowerCase() || '';
        const subCode = exam.subject?.code?.toLowerCase() || '';
        const className = exam.class?.name?.toLowerCase() || '';
        const type = exam.examType?.toLowerCase() || '';
        const term = exam.academicTerm?.name?.toLowerCase() || '';
        return (
          subName.includes(query) ||
          subCode.includes(query) ||
          className.includes(query) ||
          type.includes(query) ||
          term.includes(query)
        );
      }

      return true;
    });
  }, [exams, selectedTermFilter, selectedDeptFilter, selectedTypeFilter, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = exams.length;
    const finalCount = exams.filter(e => e.examType === 'FINAL').length;
    const midtermCount = exams.filter(e => e.examType === 'MIDTERM').length;
    const makeupCount = exams.filter(e => e.examType === 'MAKEUP').length;
    const totalCandidates = exams.reduce((acc, cur) => acc + (cur.candidateCount || 0), 0);
    return { total, finalCount, midtermCount, makeupCount, totalCandidates };
  }, [exams]);

  // Table columns definition
  const columns = [
    {
      title: 'Subject',
      key: 'subject',
      render: (_, exam) => (
        <div className="flex flex-col">
          <span className="font-semibold text-text-900">{exam.subject?.name}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-xs font-medium text-text-500 bg-surface-50 px-1.5 py-0.5 rounded border border-border">
              {exam.subject?.code}
            </span>
            <span className="text-xs text-text-500">
              {exam.subject?.credits} Credits
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Class / Department',
      key: 'class',
      render: (_, exam) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-text-900">{exam.class?.name}</span>
          <span className="text-xs text-text-500">
            {exam.class?.department?.code || exam.class?.department?.name} • Sem {exam.class?.semesterNumber}
          </span>
        </div>
      ),
    },
    {
      title: 'Exam Type',
      key: 'examType',
      render: (_, exam) => <StatusBadge status={exam.examType} />,
    },
    {
      title: 'Date & Time',
      key: 'examDate',
      render: (_, exam) => {
        if (!exam.examDate) {
          return <span className="text-xs text-text-500 italic">Not scheduled</span>;
        }
        const d = new Date(exam.examDate);
        return (
          <div className="flex flex-col">
            <span className="font-mono text-sm text-text-900 font-medium">
              {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="text-xs text-text-500 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3 text-text-500" />
              {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        );
      },
    },
    {
      title: 'Marks Scheme',
      key: 'maxMarks',
      render: (_, exam) => (
        <div className="flex flex-col">
          <div className="font-mono text-sm font-medium text-text-900">
            {exam.passingMarks} / {exam.maxMarks}
          </div>
          <span className="text-[11px] text-text-500">
            Pass / Max
          </span>
        </div>
      ),
    },
    {
      title: 'Linked Component',
      key: 'assessmentComponent',
      render: (_, exam) => (
        exam.assessmentComponent ? (
          <div className="flex flex-col">
            <span className="text-xs font-medium text-text-900">
              {exam.assessmentComponent.name}
            </span>
            <span className="text-[11px] text-text-500">
              {exam.assessmentComponent.category} ({exam.assessmentComponent.maxMarks}M)
            </span>
          </div>
        ) : (
          <span className="text-xs text-text-500 italic">None (Stand-alone)</span>
        )
      ),
    },
    {
      title: 'Candidates',
      key: 'candidateCount',
      render: (_, exam) => (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-50 border border-border text-text-900">
            {exam.candidateCount ?? 0}
          </span>
          <span className="text-[11px] text-text-500">enrolled</span>
        </div>
      ),
    },
    {
      title: 'Question Paper',
      key: 'questionPaper',
      render: (_, exam) => {
        const paper = exam.latestQuestionPaper;
        if (!paper) {
          return (
            <span className="text-[11px] text-text-500 font-medium px-2 py-0.5 rounded bg-surface-50 border border-border">
              Awaiting Faculty
            </span>
          );
        }

        if (paper.status === 'DRAFT') {
          return (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-surface-100 text-text-700 border border-border">
              Faculty Draft
            </span>
          );
        }

        if (paper.status === 'SUBMITTED') {
          return (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-info/10 text-info border border-info/20 flex items-center gap-1">
                <Clock className="w-3 h-3 animate-pulse" /> Submitted
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleOpenQuestionPaperModal(exam)}
                className="h-7 px-2.5 text-xs flex items-center gap-1 font-semibold text-info-700 border-info/30 hover:bg-info/10 shadow-none cursor-pointer"
                title="Verify and Approve Submitted Paper"
              >
                <FileCheck className="w-3.5 h-3.5 text-info" />
                <span>Verify</span>
              </Button>
            </div>
          );
        }

        if (paper.status === 'REJECTED') {
          return (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-danger/10 text-danger border border-danger/20 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Cannot Verify
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleOpenQuestionPaperModal(exam)}
                className="h-6 px-1.5 text-[11px] text-danger hover:underline font-medium"
                title="View feedback / status"
              >
                Feedback
              </Button>
            </div>
          );
        }

        // APPROVED
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-success/10 text-success border border-success/20 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Approved
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleOpenQuestionPaperModal(exam)}
              className="h-7 px-2 text-xs flex items-center gap-1 font-medium shadow-none hover:border-ink-400"
              title="View approved question paper"
            >
              <FileText className="w-3.5 h-3.5 text-ink-600" />
              <span>View</span>
            </Button>
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, exam) => (
        <div className="flex items-center gap-1.5 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenDetailModal(exam)}
            title="View Details"
            className="p-1.5 text-text-500 hover:text-text-900"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEditModal(exam)}
            title="Edit Schedule"
            className="p-1.5 text-text-500 hover:text-ink-700"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenDeleteConfirm(exam)}
            title="Delete Schedule"
            className="p-1.5 text-text-500 hover:text-danger"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-3xl font-semibold text-text-900 tracking-tight">Exam Scheduling</h1>
          <p className="text-sm text-text-500 mt-1">
            Schedule formal examinations, map assessment components, and manage exam timetables.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="accent" 
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Exam</span>
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-0 rounded-md border border-border p-4 flex flex-col">
          <span className="text-xs font-medium text-text-500 uppercase tracking-wider">Total Exams</span>
          <span className="font-mono text-2xl font-bold text-text-900 mt-1">{stats.total}</span>
          <span className="text-xs text-text-500 mt-1">Across all academic terms</span>
        </div>

        <div className="bg-surface-0 rounded-md border border-border p-4 flex flex-col">
          <span className="text-xs font-medium text-text-500 uppercase tracking-wider">Final / End-Sem</span>
          <span className="font-mono text-2xl font-bold text-ink-900 mt-1">{stats.finalCount}</span>
          <span className="text-xs text-text-500 mt-1">Degree level assessments</span>
        </div>

        <div className="bg-surface-0 rounded-md border border-border p-4 flex flex-col">
          <span className="text-xs font-medium text-text-500 uppercase tracking-wider">Midterm / In-Sem</span>
          <span className="font-mono text-2xl font-bold text-info mt-1">{stats.midtermCount}</span>
          <span className="text-xs text-text-500 mt-1">Periodic evaluations</span>
        </div>

        <div className="bg-surface-0 rounded-md border border-border p-4 flex flex-col">
          <span className="text-xs font-medium text-text-500 uppercase tracking-wider">Makeup / Backlog</span>
          <span className="font-mono text-2xl font-bold text-warning mt-1">{stats.makeupCount}</span>
          <span className="text-xs text-text-500 mt-1">Re-attempt examinations</span>
        </div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="bg-surface-0 border border-border rounded-md p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          {/* Term Selector */}
          <select
            value={selectedTermFilter}
            onChange={(e) => setSelectedTermFilter(e.target.value)}
            className="rounded-md border border-border bg-surface-0 px-3 py-1.5 text-xs font-medium text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
          >
            <option value="">All Academic Terms</option>
            {formOptions.academicTerms?.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name} {term.isCurrent ? '(Current)' : ''}
              </option>
            ))}
          </select>

          {/* Department Selector */}
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="rounded-md border border-border bg-surface-0 px-3 py-1.5 text-xs font-medium text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
          >
            <option value="">All Departments</option>
            {formOptions.departments?.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name} ({dept.code})
              </option>
            ))}
          </select>

          {/* Exam Type Selector */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="rounded-md border border-border bg-surface-0 px-3 py-1.5 text-xs font-medium text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
          >
            <option value="">All Exam Types</option>
            {EXAM_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-text-500 font-mono">
          Showing <span className="font-semibold text-text-900">{filteredExams.length}</span> of {exams.length} exams
        </div>
      </div>

      {/* Main Exams DataTable */}
      <div className="bg-surface-0 border border-border rounded-md overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-text-500 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-ink-700 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading exam schedules...</span>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No examinations found"
              description="No exams match your current filters. Click 'Schedule Exam' to create a new timetable entry."
              actionLabel="Schedule Exam"
              onAction={handleOpenCreateModal}
            />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredExams}
            keyField="id"
          />
        )}
      </div>

      {/* ================================================================= */}
      {/* MODAL: CREATE EXAM SCHEDULE                                      */}
      {/* ================================================================= */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Schedule New Examination"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Field label="Academic Term" required>
            <select
              value={formData.academicTermId}
              onChange={(e) => setFormData({ ...formData, academicTermId: e.target.value })}
              required
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
            >
              <option value="" disabled>Select an academic term</option>
              {formOptions.academicTerms?.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name} {term.isCurrent ? '★ Current Term' : ''}
                </option>
              ))}
            </select>
          </Field>

          {/* Department & Class Cascading Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Department" required>
              <select
                value={formData.departmentId}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                required
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
              >
                <option value="" disabled>Select Department</option>
                {formOptions.departments?.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Class / Batch" required>
              <select
                value={formData.classId}
                onChange={(e) => handleClassChange(e.target.value)}
                required
                disabled={!availableClasses.length}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 disabled:bg-surface-50"
              >
                <option value="" disabled>
                  {availableClasses.length ? 'Select Class' : 'No classes found'}
                </option>
                {availableClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} (Sem {cls.semesterNumber}, {cls.batchYear})
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Subject & Component Linkage Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Subject" required>
              <select
                value={formData.subjectId}
                onChange={(e) => handleSubjectChange(e.target.value)}
                required
                disabled={!availableSubjects.length}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 disabled:bg-surface-50"
              >
                <option value="" disabled>
                  {availableSubjects.length ? 'Select Subject' : 'Select class first'}
                </option>
                {availableSubjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    [{sub.code}] {sub.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field 
              label="Linked Assessment Component" 
              helperText="Syncs verified exam marks to this component (Decision 3 & 5)"
            >
              <select
                value={formData.assessmentComponentId}
                onChange={(e) => handleComponentChange(e.target.value)}
                disabled={!availableComponents.length}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 disabled:bg-surface-50"
              >
                <option value="">None (Independent Exam)</option>
                {availableComponents.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} — Max {comp.maxMarks}M ({comp.category})
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Exam Type & Date/Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Exam Type" required>
              <select
                value={formData.examType}
                onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                required
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
              >
                {EXAM_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Exam Date">
              <input
                type="date"
                value={formData.examDate}
                onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm font-mono focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
              />
            </Field>

            <Field label="Start Time">
              <input
                type="time"
                value={formData.examTime}
                onChange={(e) => setFormData({ ...formData, examTime: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm font-mono focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
              />
            </Field>
          </div>

          {/* Max & Passing Marks Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Maximum Marks" required>
              <input
                type="number"
                min="1"
                step="0.5"
                value={formData.maxMarks}
                onChange={(e) => setFormData({ ...formData, maxMarks: e.target.value })}
                required
                className="w-full rounded-md border border-border px-3 py-2 text-sm font-mono focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
              />
            </Field>

            <Field label="Passing Marks" required helperText="Used to derive is_pass at marks entry">
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.passingMarks}
                onChange={(e) => setFormData({ ...formData, passingMarks: e.target.value })}
                required
                className="w-full rounded-md border border-border px-3 py-2 text-sm font-mono focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
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
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Scheduling...' : 'Save Schedule'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL: EDIT EXAM SCHEDULE                                        */}
      {/* ================================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Exam: ${activeExam?.subject?.name || ''}`}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="p-3 bg-surface-50 border border-border rounded-md text-xs text-text-500 space-y-1">
            <div><strong>Subject:</strong> {activeExam?.subject?.name} ({activeExam?.subject?.code})</div>
            <div><strong>Class:</strong> {activeExam?.class?.name}</div>
            <div><strong>Term:</strong> {activeExam?.academicTerm?.name}</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Exam Type" required>
              <select
                value={formData.examType}
                onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                required
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
              >
                {EXAM_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Exam Date">
              <input
                type="date"
                value={formData.examDate}
                onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm font-mono focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
              />
            </Field>

            <Field label="Start Time">
              <input
                type="time"
                value={formData.examTime}
                onChange={(e) => setFormData({ ...formData, examTime: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm font-mono focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
              />
            </Field>
          </div>

          <Field 
            label="Linked Assessment Component" 
            helperText="Syncs verified marks into this component on approval"
          >
            <select
              value={formData.assessmentComponentId}
              onChange={(e) => setFormData({ ...formData, assessmentComponentId: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
            >
              <option value="">None (Independent Exam)</option>
              {availableComponents.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name} — Max {comp.maxMarks}M ({comp.category})
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Maximum Marks" required>
              <input
                type="number"
                min="1"
                step="0.5"
                value={formData.maxMarks}
                onChange={(e) => setFormData({ ...formData, maxMarks: e.target.value })}
                required
                className="w-full rounded-md border border-border px-3 py-2 text-sm font-mono focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
              />
            </Field>

            <Field label="Passing Marks" required>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.passingMarks}
                onChange={(e) => setFormData({ ...formData, passingMarks: e.target.value })}
                required
                className="w-full rounded-md border border-border px-3 py-2 text-sm font-mono focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL: VIEW EXAM DETAILS                                         */}
      {/* ================================================================= */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Examination Details"
        maxWidth="max-w-2xl"
      >
        {activeExam && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-50 border border-border rounded-md space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-text-900">{activeExam.subject?.name}</h3>
                  <span className="font-mono text-xs text-text-500">{activeExam.subject?.code}</span>
                </div>
                <StatusBadge status={activeExam.examType} />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60 text-xs">
                <div>
                  <span className="text-text-500">Department:</span>
                  <div className="font-medium text-text-900 mt-0.5">
                    {activeExam.class?.department?.name || 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="text-text-500">Class & Semester:</span>
                  <div className="font-medium text-text-900 mt-0.5">
                    {activeExam.class?.name} (Sem {activeExam.class?.semesterNumber})
                  </div>
                </div>
                <div>
                  <span className="text-text-500">Academic Term:</span>
                  <div className="font-medium text-text-900 mt-0.5">
                    {activeExam.academicTerm?.name}
                  </div>
                </div>
                <div>
                  <span className="text-text-500">Scheduled Date:</span>
                  <div className="font-medium font-mono text-text-900 mt-0.5">
                    {activeExam.examDate ? new Date(activeExam.examDate).toLocaleString() : 'Not Set'}
                  </div>
                </div>
              </div>
            </div>

            {/* Assessment Component Card */}
            <div className="p-3 border border-border rounded-md bg-surface-0 space-y-1 text-xs">
              <span className="font-semibold text-text-900">Curriculum Component Link</span>
              {activeExam.assessmentComponent ? (
                <div className="text-text-500 pt-1">
                  Linked to <strong>{activeExam.assessmentComponent.name}</strong> ({activeExam.assessmentComponent.category}) 
                  with max {activeExam.assessmentComponent.maxMarks} marks. Upon verification, marks will automatically sync into component records.
                </div>
              ) : (
                <div className="text-text-500 italic pt-1">
                  This exam is stand-alone and not tied to an internal assessment component.
                </div>
              )}
            </div>

            {/* Audit & Candidate Numbers */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-md border border-border bg-surface-50">
                <span className="text-[11px] text-text-500 uppercase tracking-wider block">Eligible</span>
                <span className="font-mono text-lg font-bold text-text-900 mt-1 block">
                  {activeExam.candidateCount ?? 0}
                </span>
                <span className="text-[10px] text-text-500">Candidates</span>
              </div>
              <div className="p-3 rounded-md border border-border bg-surface-50">
                <span className="text-[11px] text-text-500 uppercase tracking-wider block">Submitted</span>
                <span className="font-mono text-lg font-bold text-info mt-1 block">
                  {activeExam.resultCount ?? 0}
                </span>
                <span className="text-[10px] text-text-500">Marks entered</span>
              </div>
              <div className="p-3 rounded-md border border-border bg-surface-50">
                <span className="text-[11px] text-text-500 uppercase tracking-wider block">Verified</span>
                <span className="font-mono text-lg font-bold text-success mt-1 block">
                  {activeExam.verifiedResultCount ?? 0}
                </span>
                <span className="text-[10px] text-text-500">Published</span>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-border mt-4">
              <Button 
                variant="secondary"
                onClick={() => {
                  const examToManage = activeExam;
                  setIsDetailModalOpen(false);
                  handleOpenQuestionPaperModal(examToManage);
                }}
                className="flex items-center gap-1.5 text-xs font-medium"
              >
                <FileText className="w-3.5 h-3.5 text-ink-600" />
                <span>Question Paper Workflow</span>
              </Button>
              <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================= */}
      {/* DIALOG: CONFIRM DELETE                                            */}
      {/* ================================================================= */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Examination Schedule"
        message={`Are you sure you want to remove the ${activeExam?.examType} exam schedule for ${activeExam?.subject?.name}? This action cannot be undone.`}
        confirmText={isSubmitting ? 'Deleting...' : 'Delete Schedule'}
        variant="danger"
      />

      {/* ================================================================= */}
      {/* MODAL: QUESTION PAPER VERIFICATION BY EXAM STAFF                  */}
      {/* ================================================================= */}
      <Modal
        isOpen={isQpModalOpen}
        onClose={() => {
          setIsQpModalOpen(false);
          setRejectionRemarks('');
        }}
        title="Question Paper Verification"
        maxWidth="max-w-3xl"
      >
        {activeExam && (
          <div className="space-y-5">
            {/* Exam Header Summary */}
            <div className="p-3.5 bg-surface-50 border border-border rounded-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-text-900 text-base">{activeExam.subject?.name}</h4>
                  <div className="text-xs text-text-500 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                    <span className="bg-surface-0 px-1.5 py-0.5 rounded border border-border">{activeExam.subject?.code}</span>
                    <span>•</span>
                    <span>{activeExam.class?.name}</span>
                    <span>•</span>
                    <span>Max Marks: {activeExam.maxMarks}M (Pass: {activeExam.passingMarks}M)</span>
                  </div>
                </div>
                <StatusBadge status={activeExam.examType} />
              </div>

              {activeExam.examDate && (
                <div className="mt-2 pt-2 border-t border-border flex items-center gap-2 text-xs text-text-500 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-text-400" />
                  <span>Scheduled Date: {new Date(activeExam.examDate).toLocaleDateString()} at {new Date(activeExam.examDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
            </div>

            {/* Active Paper Inspection & Verification Controls */}
            {activeExam.latestQuestionPaper ? (
              <div className="space-y-4">
                {/* Submitted Paper Card */}
                <div className="border border-border rounded-md p-4 bg-surface-0 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded bg-ink-50 border border-ink-100 text-ink-700">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-text-900">Submitted Question Paper</div>
                        <div className="text-xs text-text-500 mt-0.5">
                          {activeExam.latestQuestionPaper.teacherCreatedBy?.name ? (
                            <>
                              Uploaded by Faculty: <strong className="text-text-700">{activeExam.latestQuestionPaper.teacherCreatedBy.name}</strong> ({activeExam.latestQuestionPaper.teacherCreatedBy.email})
                            </>
                          ) : (
                            <>Uploaded by: {activeExam.latestQuestionPaper.createdBy?.name || 'Staff'}</>
                          )}
                          <span className="mx-1.5">•</span>
                          {new Date(activeExam.latestQuestionPaper.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={activeExam.latestQuestionPaper.status} />
                  </div>

                  {/* Document View / Open Link */}
                  <div className="p-3 bg-surface-50 rounded-md border border-border flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-text-700 truncate">
                      <ExternalLink className="w-4 h-4 text-ink-600 shrink-0" />
                      <span className="truncate font-mono">{activeExam.latestQuestionPaper.fileUrl}</span>
                    </div>
                    <a
                      href={activeExam.latestQuestionPaper.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-ink-700 text-white hover:bg-ink-800 transition-colors shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Paper</span>
                    </a>
                  </div>

                  {/* Previous Feedback / Remarks if rejected or verified */}
                  {activeExam.latestQuestionPaper.verificationRemarks && (
                    <div className={`p-3 rounded-md border text-xs ${
                      activeExam.latestQuestionPaper.status === 'REJECTED'
                        ? 'bg-danger/10 border-danger/20 text-danger'
                        : 'bg-success/10 border-success/20 text-success'
                    }`}>
                      <div className="font-semibold flex items-center gap-1.5">
                        {activeExam.latestQuestionPaper.status === 'REJECTED' ? (
                          <AlertCircle className="w-4 h-4" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        <span>{activeExam.latestQuestionPaper.status === 'REJECTED' ? 'Verification Feedback (Cannot Verify):' : 'Verification Note:'}</span>
                      </div>
                      <p className="mt-1">{activeExam.latestQuestionPaper.verificationRemarks}</p>
                    </div>
                  )}
                </div>

                {/* Verification Decision Panel (When SUBMITTED) */}
                {activeExam.latestQuestionPaper.status === 'SUBMITTED' && (
                  <div className="border border-border rounded-md p-4 bg-surface-0 space-y-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-text-500">
                      Exam Staff Verification Decision
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Option 1: Verify & Approve */}
                      <div className="p-3.5 rounded-md border border-success/30 bg-success/5 flex flex-col justify-between space-y-3">
                        <div className="space-y-1">
                          <div className="font-semibold text-xs text-success flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Verify & Approve Paper</span>
                          </div>
                          <p className="text-[11px] text-text-600">
                            Confirm that syllabus coverage, formatting, and max marks ({activeExam.maxMarks}M) are verified and approved for exam conduction.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="accent"
                          disabled={isQpLoading}
                          onClick={() => handleUpdatePaperStatus(activeExam.latestQuestionPaper.id, 'APPROVED')}
                          className="w-full text-xs font-semibold flex items-center justify-center gap-1.5 shadow-none"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verify & Approve</span>
                        </Button>
                      </div>

                      {/* Option 2: Cannot Verify / Has Bugs */}
                      <div className="p-3.5 rounded-md border border-danger/30 bg-danger/5 flex flex-col justify-between space-y-3">
                        <div className="space-y-1.5">
                          <div className="font-semibold text-xs text-danger flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4" />
                            <span>Cannot Verify / Has Bugs</span>
                          </div>
                          <p className="text-[11px] text-text-600">
                            If there are errors, formatting bugs, or marks mismatch, explain below so the faculty member can correct and re-upload.
                          </p>
                          <textarea
                            value={rejectionRemarks}
                            onChange={(e) => setRejectionRemarks(e.target.value)}
                            placeholder="e.g. Cannot be verified: Total marks mismatch (found 80M, syllabus requires 100M). Please re-upload revised paper."
                            rows={2}
                            className="w-full text-xs p-2 rounded border border-border bg-surface-0 text-text-900 focus:border-danger focus:ring-1 focus:ring-danger"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={isQpLoading || !rejectionRemarks.trim()}
                          onClick={() => handleUpdatePaperStatus(activeExam.latestQuestionPaper.id, 'REJECTED', rejectionRemarks)}
                          className="w-full text-xs font-semibold text-danger border-danger/30 hover:bg-danger/10 flex items-center justify-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reject & Request Re-upload</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status: APPROVED */}
                {activeExam.latestQuestionPaper.status === 'APPROVED' && (
                  <div className="p-3.5 bg-success/10 border border-success/20 rounded-md text-xs text-success flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span>This question paper is verified and approved. It is now cleared for examinations.</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUpdatePaperStatus(activeExam.latestQuestionPaper.id, 'SUBMITTED')}
                      className="text-xs text-text-500 hover:text-text-900"
                    >
                      Re-open Review
                    </Button>
                  </div>
                )}

                {/* Status: REJECTED */}
                {activeExam.latestQuestionPaper.status === 'REJECTED' && (
                  <div className="p-3.5 bg-danger/10 border border-danger/20 rounded-md text-xs text-danger flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-danger" />
                      <span>This paper was rejected with feedback. Awaiting revised paper upload from faculty.</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUpdatePaperStatus(activeExam.latestQuestionPaper.id, 'SUBMITTED')}
                      className="text-xs text-text-500 hover:text-text-900"
                    >
                      Reset to Submitted
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-8 border border-dashed border-border rounded-md bg-surface-50 space-y-2">
                <FileText className="w-8 h-8 text-text-400 mx-auto" />
                <h5 className="font-semibold text-text-900 text-sm">No Question Paper Uploaded Yet</h5>
                <p className="text-xs text-text-500 max-w-sm mx-auto">
                  The assigned faculty member has not uploaded a question paper for this exam schedule yet. Once submitted, it will appear here for verification.
                </p>
              </div>
            )}

            <div className="pt-2 text-right border-t border-border">
              <Button variant="secondary" onClick={() => setIsQpModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
