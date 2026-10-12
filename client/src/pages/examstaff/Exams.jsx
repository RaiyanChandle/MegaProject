import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { 
  Calendar, 
  Plus, 
  Edit2, 
  Trash2, 
  Filter, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Layers,
  Link as LinkIcon,
  BookOpen
} from 'lucide-react';
import { useSearch } from '../../context/SearchContext';

const EXAM_TYPES = ['FINAL', 'MIDTERM', 'INTERNAL', 'MAKEUP'];

export default function Exams() {
  const { searchQuery, setSearchQuery } = useSearch();

  // Data states
  const [exams, setExams] = useState([]);
  const [terms, setTerms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedTermId, setSelectedTermId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('ALL');

  // Modal states
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Schedule form state
  const [formData, setFormData] = useState({
    academicTermId: '',
    departmentId: '',
    classId: '',
    subjectId: '',
    componentId: '',
    examType: 'FINAL',
    examDate: '',
    maxMarks: '100',
    passingMarks: '40'
  });

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    componentId: '',
    examType: 'FINAL',
    examDate: '',
    maxMarks: '',
    passingMarks: ''
  });

  // Load initial reference data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [termsData, deptsData, examsData] = await Promise.all([
        apiClient.get('/academic-terms'),
        apiClient.get('/departments'),
        apiClient.get('/exams')
      ]);

      setTerms(termsData || []);
      setDepartments(deptsData || []);
      setExams(examsData || []);

      // Auto-select current term for filters & form if available
      const current = (termsData || []).find(t => t.isCurrent);
      if (current) {
        setSelectedTermId(current.id);
        setFormData(prev => ({ ...prev, academicTermId: current.id }));
      }
    } catch (err) {
      console.error('Error loading exam metadata:', err);
      toast.error('Failed to load exam data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When selected department changes in Schedule Modal, load classes
  useEffect(() => {
    const loadClasses = async () => {
      if (!formData.departmentId) {
        setClasses([]);
        setFormData(prev => ({ ...prev, classId: '', subjectId: '', componentId: '' }));
        return;
      }
      try {
        const cls = await apiClient.get(`/classes?departmentId=${formData.departmentId}`);
        setClasses(cls || []);
      } catch (err) {
        console.error('Error fetching classes:', err);
      }
    };

    if (isScheduleModalOpen) {
      loadClasses();
    }
  }, [formData.departmentId, isScheduleModalOpen]);

  // When selected class changes in Schedule Modal, load subjects
  useEffect(() => {
    const loadSubjects = async () => {
      if (!formData.classId) {
        setSubjects([]);
        setFormData(prev => ({ ...prev, subjectId: '', componentId: '' }));
        return;
      }
      try {
        const subs = await apiClient.get(`/subjects?classId=${formData.classId}`);
        setSubjects(subs || []);
      } catch (err) {
        console.error('Error fetching subjects:', err);
      }
    };

    if (isScheduleModalOpen) {
      loadSubjects();
    }
  }, [formData.classId, isScheduleModalOpen]);

  // When selected subject changes in Schedule Modal, load assessment components (PRD Decision 3)
  useEffect(() => {
    const loadComponents = async () => {
      if (!formData.subjectId) {
        setComponents([]);
        setFormData(prev => ({ ...prev, componentId: '' }));
        return;
      }
      try {
        const comps = await apiClient.get(`/assessment-components?subjectId=${formData.subjectId}`);
        setComponents(comps || []);
      } catch (err) {
        console.error('Error fetching components:', err);
        setComponents([]);
      }
    };

    if (isScheduleModalOpen) {
      loadComponents();
    }
  }, [formData.subjectId, isScheduleModalOpen]);

  // When editing an exam, load components for that exam's subject
  useEffect(() => {
    const loadEditComponents = async () => {
      if (!selectedExam?.subjectId) return;
      try {
        const comps = await apiClient.get(`/assessment-components?subjectId=${selectedExam.subjectId}`);
        setComponents(comps || []);
      } catch (err) {
        console.error('Error fetching edit components:', err);
      }
    };

    if (isEditModalOpen && selectedExam) {
      loadEditComponents();
    }
  }, [selectedExam, isEditModalOpen]);

  // Open Schedule Modal
  const openScheduleModal = () => {
    const current = terms.find(t => t.isCurrent);
    setFormData({
      academicTermId: current ? current.id : (terms[0]?.id || ''),
      departmentId: departments[0]?.id || '',
      classId: '',
      subjectId: '',
      componentId: '',
      examType: 'FINAL',
      examDate: '',
      maxMarks: '100',
      passingMarks: '40'
    });
    setIsScheduleModalOpen(true);
  };

  // Handle Assessment Component Selection in Schedule Modal: auto-fill Max Marks
  const handleComponentChange = (compId) => {
    const comp = components.find(c => c.id === compId);
    if (comp) {
      const max = comp.maxMarks || 100;
      const pass = Math.round(max * 0.4);
      setFormData(prev => ({
        ...prev,
        componentId: compId,
        maxMarks: String(max),
        passingMarks: String(pass)
      }));
    } else {
      setFormData(prev => ({ ...prev, componentId: compId }));
    }
  };

  // Submit Schedule Exam
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.academicTermId || !formData.classId || !formData.subjectId) {
      toast.error('Please select Academic Term, Class, and Subject');
      return;
    }

    const max = Number(formData.maxMarks);
    const pass = Number(formData.passingMarks);

    if (isNaN(max) || max <= 0) {
      toast.error('Maximum marks must be greater than 0');
      return;
    }

    if (isNaN(pass) || pass < 0) {
      toast.error('Passing marks must be non-negative');
      return;
    }

    if (pass > max) {
      toast.error('Passing marks cannot be greater than maximum marks (total marks)');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        academicTermId: formData.academicTermId,
        classId: formData.classId,
        subjectId: formData.subjectId,
        componentId: formData.componentId || null,
        examType: formData.examType,
        examDate: formData.examDate ? new Date(formData.examDate).toISOString() : null,
        maxMarks: max,
        passingMarks: pass
      };

      await apiClient.post('/exams', payload);
      toast.success('Exam scheduled successfully');
      setIsScheduleModalOpen(false);
      
      // Reload exams
      const updated = await apiClient.get('/exams');
      setExams(updated || []);
    } catch (err) {
      toast.error(err.message || 'Failed to schedule exam');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (exam) => {
    setSelectedExam(exam);
    let dateStr = '';
    if (exam.examDate) {
      const d = new Date(exam.examDate);
      // format YYYY-MM-DDTHH:MM for input datetime-local
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
      dateStr = localISOTime;
    }

    setEditFormData({
      componentId: exam.componentId || '',
      examType: exam.examType || 'FINAL',
      examDate: dateStr,
      maxMarks: String(exam.maxMarks),
      passingMarks: String(exam.passingMarks)
    });
    setIsEditModalOpen(true);
  };

  // Submit Edit Exam
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedExam) return;

    const max = Number(editFormData.maxMarks);
    const pass = Number(editFormData.passingMarks);

    if (isNaN(max) || max <= 0) {
      toast.error('Maximum marks must be greater than 0');
      return;
    }

    if (pass > max) {
      toast.error('Passing marks cannot be greater than maximum marks (total marks)');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        componentId: editFormData.componentId || null,
        examType: editFormData.examType,
        examDate: editFormData.examDate ? new Date(editFormData.examDate).toISOString() : null,
        maxMarks: max,
        passingMarks: pass
      };

      await apiClient.put(`/exams/${selectedExam.id}`, payload);
      toast.success('Exam schedule updated');
      setIsEditModalOpen(false);

      const updated = await apiClient.get('/exams');
      setExams(updated || []);
    } catch (err) {
      toast.error(err.message || 'Failed to update exam');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete Dialog
  const openDeleteModal = (exam) => {
    setSelectedExam(exam);
    setIsDeleteOpen(true);
  };

  // Confirm Delete
  const handleDeleteConfirm = async () => {
    if (!selectedExam) return;
    try {
      await apiClient.delete(`/exams/${selectedExam.id}`);
      toast.success('Exam schedule deleted successfully');
      setIsDeleteOpen(false);
      setExams(prev => prev.filter(e => e.id !== selectedExam.id));
    } catch (err) {
      toast.error(err.message || 'Failed to delete exam');
    }
  };

  // Filtered exams
  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      // Term filter
      if (selectedTermId && exam.academicTermId !== selectedTermId) return false;
      // Department filter
      if (selectedDeptId && exam.class?.departmentId !== selectedDeptId) return false;
      // Class filter
      if (selectedClassId && exam.classId !== selectedClassId) return false;
      // Exam Type filter
      if (selectedExamType !== 'ALL' && exam.examType !== selectedExamType) return false;
      // Search query
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const subName = exam.subject?.name?.toLowerCase() || '';
        const subCode = exam.subject?.code?.toLowerCase() || '';
        const deptCode = exam.class?.department?.code?.toLowerCase() || '';
        if (!subName.includes(q) && !subCode.includes(q) && !deptCode.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [exams, selectedTermId, selectedDeptId, selectedClassId, selectedExamType, searchQuery]);

  // Table columns
  const columns = [
    {
      title: 'Subject',
      render: (_, exam) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text-900">{exam?.subject?.name || 'Unknown'}</span>
            {exam?.subject?.code && (
              <span className="px-1.5 py-0.5 rounded bg-surface-100 text-text-600 font-mono text-xs border border-border">
                {exam.subject.code}
              </span>
            )}
          </div>
          <span className="text-[11px] text-text-400 mt-0.5">
            {exam?.subject?.subjectType || 'CORE'}
          </span>
        </div>
      )
    },
    {
      title: 'Department & Class',
      render: (_, exam) => (
        <div className="flex flex-col text-xs">
          <span className="font-medium text-text-800">
            {exam?.class?.department?.name || exam?.class?.department?.code || 'Department'}
          </span>
          <span className="text-text-500 mt-0.5">
            Batch {exam?.class?.batchYear || '—'} • Semester {exam?.class?.semesterNumber || '—'}
          </span>
        </div>
      )
    },
    {
      title: 'Term & Type',
      render: (_, exam) => (
        <div className="flex flex-col gap-1 items-start">
          <span className="text-xs font-medium text-text-700 flex items-center gap-1">
            {exam?.academicTerm?.name || '—'}
            {exam?.academicTerm?.isCurrent && (
              <span className="w-1.5 h-1.5 rounded-full bg-success" title="Current active term" />
            )}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              exam?.examType === 'FINAL' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
              exam?.examType === 'MIDTERM' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
              exam?.examType === 'MAKEUP' ? 'bg-amber-100 text-amber-800 border border-amber-200 font-mono' :
              'bg-slate-100 text-slate-800 border border-slate-200'
            }`}>
              {exam?.examType || 'FINAL'}
            </span>
            {exam?.examType === 'MAKEUP' && exam?.backlogCandidateCount !== undefined && (
              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded font-medium">
                {exam.backlogCandidateCount} candidate{exam.backlogCandidateCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'Component Mapping',
      render: (_, exam) => (
        exam?.assessmentComponent ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brass-50 border border-brass-200/60 text-brass-800 text-xs font-medium">
            <LinkIcon size={12} className="text-brass-600" />
            <span>{exam.assessmentComponent.name}</span>
            <span className="text-[10px] text-brass-600/80">({exam.assessmentComponent.maxMarks}m)</span>
          </div>
        ) : (
          <span className="text-xs text-text-400 italic">Not mapped</span>
        )
      )
    },
    {
      title: 'Exam Date & Time',
      render: (_, exam) => (
        exam?.examDate ? (
          <div className="text-xs">
            <span className="font-medium text-text-900 block">
              {new Date(exam.examDate).toLocaleDateString(undefined, { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
            <span className="text-text-400 text-[11px] flex items-center gap-1 mt-0.5">
              <Clock size={11} />
              {new Date(exam.examDate).toLocaleTimeString(undefined, { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        ) : (
          <span className="text-xs text-text-400 italic">Date TBD</span>
        )
      )
    },
    {
      title: 'Marks & Passing',
      render: (_, exam) => (
        <div className="text-xs font-mono">
          <span className="text-text-900 font-semibold">{exam?.passingMarks ?? 0}</span>
          <span className="text-text-400"> / </span>
          <span className="text-text-700 font-semibold">{exam?.maxMarks ?? 100}</span>
          <span className="text-[10px] text-text-400 block font-sans">
            Min {exam?.maxMarks ? Math.round(((exam.passingMarks || 0) / exam.maxMarks) * 100) : 0}% to pass
          </span>
        </div>
      )
    },
    {
      title: 'Scheduled By',
      render: (_, exam) => (
        <div className="text-xs text-text-600">
          <span className="font-medium text-text-800 block">{exam?.scheduledBy?.name || 'Staff'}</span>
          <span className="text-[10px] font-mono text-text-400">{exam?.scheduledBy?.instituteId}</span>
        </div>
      )
    },
    {
      title: 'Actions',
      headerClassName: 'text-right',
      render: (_, exam) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => openEditModal(exam)}
            className="p-1.5 rounded-md text-text-400 hover:text-brass-600 hover:bg-surface-100 transition-colors"
            title="Edit Schedule"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => openDeleteModal(exam)}
            className="p-1.5 rounded-md text-text-400 hover:text-danger hover:bg-danger/10 transition-colors"
            title="Delete Schedule"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text-900 tracking-tight">
              Examination Schedules
            </h1>
          </div>
          <p className="text-sm text-text-500 mt-1">
            Configure examination timetables, mark passing thresholds, and link papers to curriculum assessment components.
          </p>
        </div>

        <Button 
          variant="primary" 
          onClick={openScheduleModal}
          className="bg-brass-500 hover:bg-brass-600 text-ink-950 font-semibold shadow-sm flex items-center gap-2 shrink-0"
        >
          <Plus size={16} />
          Schedule Exam
        </Button>
      </div>

      {/* Metric Counters Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-0 border border-border rounded-lg p-3 shadow-2xs">
          <span className="text-[11px] font-medium text-text-500 uppercase">Filtered Total</span>
          <p className="text-xl font-bold text-text-900 mt-0.5">{filteredExams.length}</p>
        </div>
        <div className="bg-surface-0 border border-border rounded-lg p-3 shadow-2xs">
          <span className="text-[11px] font-medium text-purple-700 uppercase">Final Exams</span>
          <p className="text-xl font-bold text-purple-900 mt-0.5">
            {filteredExams.filter(e => e.examType === 'FINAL').length}
          </p>
        </div>
        <div className="bg-surface-0 border border-border rounded-lg p-3 shadow-2xs">
          <span className="text-[11px] font-medium text-blue-700 uppercase">Midterms</span>
          <p className="text-xl font-bold text-blue-900 mt-0.5">
            {filteredExams.filter(e => e.examType === 'MIDTERM').length}
          </p>
        </div>
        <div className="bg-surface-0 border border-border rounded-lg p-3 shadow-2xs">
          <span className="text-[11px] font-medium text-amber-700 uppercase">Makeup / Backlog</span>
          <p className="text-xl font-bold text-amber-900 mt-0.5">
            {filteredExams.filter(e => e.examType === 'MAKEUP').length}
          </p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-surface-0 border border-border rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Term Filter */}
          <div>
            <label className="block text-xs font-medium text-text-600 mb-1">Academic Term</label>
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-1.5 text-xs bg-surface-0 text-text-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
            >
              <option value="">All Academic Terms</option>
              {terms.map(term => (
                <option key={term.id} value={term.id}>
                  {term.name} {term.isCurrent ? '(Current)' : ''}
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
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Exam Type Tabs */}
          <div>
            <label className="block text-xs font-medium text-text-600 mb-1">Exam Type</label>
            <select
              value={selectedExamType}
              onChange={(e) => setSelectedExamType(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-1.5 text-xs bg-surface-0 text-text-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
            >
              <option value="ALL">All Types</option>
              {EXAM_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-xs font-medium text-text-600 mb-1">Search Subject</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Subject name or code..."
                className="w-full rounded-md border border-border pl-8 pr-3 py-1.5 text-xs bg-surface-0 text-text-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-text-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-surface-0 border border-border rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-text-400">
            <div className="animate-spin w-6 h-6 border-2 border-brass-500 border-t-transparent rounded-full mx-auto mb-3" />
            Loading examinations...
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar size={42} className="mx-auto text-text-300 mb-3" />
            <h3 className="text-base font-semibold text-text-800">No scheduled exams found</h3>
            <p className="text-xs text-text-400 mt-1 max-w-sm mx-auto">
              No exams match your current filters. Adjust your filters or schedule a new exam.
            </p>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={openScheduleModal}
              className="mt-4 bg-brass-500 hover:bg-brass-600 text-ink-950 font-semibold"
            >
              Schedule New Exam
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredExams}
            keyField="id"
          />
        )}
      </div>

      {/* Schedule Exam Modal */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title="Schedule New Examination"
        description="Create an official exam schedule with marks threshold and optional AssessmentComponent sync."
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-4">
          {/* Term Selection */}
          <Field label="Academic Term" required>
            <select
              value={formData.academicTermId}
              onChange={(e) => setFormData(prev => ({ ...prev, academicTermId: e.target.value }))}
              className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface-0 text-text-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
              required
            >
              <option value="">Select Academic Term</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.isCurrent ? '(Current Term)' : ''}
                </option>
              ))}
            </select>
          </Field>

          {/* Department Selection */}
          <Field label="Department" required>
            <select
              value={formData.departmentId}
              onChange={(e) => setFormData(prev => ({ ...prev, departmentId: e.target.value }))}
              className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface-0 text-text-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
              required
            >
              <option value="">Select Department</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </Field>

          {/* Class Selection */}
          <Field label="Class / Batch" required>
            <select
              value={formData.classId}
              onChange={(e) => setFormData(prev => ({ ...prev, classId: e.target.value }))}
              disabled={!formData.departmentId || classes.length === 0}
              className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface-0 text-text-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500 disabled:opacity-50"
              required
            >
              <option value="">
                {!formData.departmentId 
                  ? 'First select a department' 
                  : classes.length === 0 
                  ? 'No classes found in department' 
                  : 'Select Class'}
              </option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} • Batch {c.batchYear} (Semester {c.semesterNumber})
                </option>
              ))}
            </select>
          </Field>

          {/* Subject Selection */}
          <Field label="Subject" required>
            <select
              value={formData.subjectId}
              onChange={(e) => setFormData(prev => ({ ...prev, subjectId: e.target.value }))}
              disabled={!formData.classId || subjects.length === 0}
              className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface-0 text-text-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500 disabled:opacity-50"
              required
            >
              <option value="">
                {!formData.classId 
                  ? 'First select a class' 
                  : subjects.length === 0 
                  ? 'No subjects found for this class' 
                  : 'Select Subject'}
              </option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) - {s.subjectType}
                </option>
              ))}
            </select>
          </Field>

          {/* Assessment Component Mapping (PRD Decision 3) */}
          <Field 
            label="Assessment Component Mapping (PRD Decision 3)" 
            hint="Optional link to sync ExamResult marks directly into the subject's End Sem or Mid Sem component mark."
          >
            <select
              value={formData.componentId}
              onChange={(e) => handleComponentChange(e.target.value)}
              disabled={!formData.subjectId}
              className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface-0 text-text-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500 disabled:opacity-50"
            >
              <option value="">-- No Component Mapping (Standalone Exam) --</option>
              {components.map(comp => (
                <option key={comp.id} value={comp.id}>
                  🎯 {comp.name} ({comp.category} • Max: {comp.maxMarks} marks)
                </option>
              ))}
            </select>
          </Field>

          {/* Exam Type & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Exam Type" required>
              <select
                value={formData.examType}
                onChange={(e) => setFormData(prev => ({ ...prev, examType: e.target.value }))}
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface-0 text-text-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
                required
              >
                {EXAM_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type} {type === 'MAKEUP' ? '(Backlog re-attempts)' : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Exam Date & Time">
              <input
                type="datetime-local"
                value={formData.examDate}
                onChange={(e) => setFormData(prev => ({ ...prev, examDate: e.target.value }))}
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface-0 text-text-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
              />
            </Field>
          </div>

          {/* MAKEUP Re-Exam Notice (Rules 17 & 18) */}
          {formData.examType === 'MAKEUP' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <span>🔄 Backlog Re-Attempt Examination (Rule 17)</span>
              </div>
              <p className="text-[11px] text-amber-800">
                This MAKEUP examination specifically caters to students with active re-attempt enrollments (Attempt &gt; 1) for this course. Separate hall tickets will be generated per Rule 18 without mixing with regular semester examinations.
              </p>
            </div>
          )}

          {/* Max Marks & Passing Marks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Maximum Marks" required>
              <input
                type="number"
                min="1"
                step="0.5"
                value={formData.maxMarks}
                onChange={(e) => setFormData(prev => ({ ...prev, maxMarks: e.target.value }))}
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface-0 text-text-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
                required
              />
            </Field>

            <Field 
              label="Passing Marks" 
              required
              hint={`Passing percentage: ${
                formData.maxMarks && Number(formData.maxMarks) > 0 
                  ? Math.round((Number(formData.passingMarks || 0) / Number(formData.maxMarks)) * 100) 
                  : 0
              }%`}
            >
              <input
                type="number"
                min="0"
                max={formData.maxMarks}
                step="0.5"
                value={formData.passingMarks}
                onChange={(e) => setFormData(prev => ({ ...prev, passingMarks: e.target.value }))}
                className={`w-full rounded-md border px-3 py-2 text-sm bg-surface-0 text-text-900 focus:ring-1 ${
                  Number(formData.passingMarks || 0) > Number(formData.maxMarks || 0)
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-border focus:border-brass-500 focus:ring-brass-500'
                }`}
                required
              />
              {Number(formData.passingMarks || 0) > Number(formData.maxMarks || 0) && (
                <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
                  <span>⚠️ Passing marks cannot be greater than max marks ({formData.maxMarks || 0})</span>
                </p>
              )}
            </Field>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsScheduleModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || Number(formData.passingMarks || 0) > Number(formData.maxMarks || 0)}
              className="bg-brass-500 hover:bg-brass-600 text-ink-950 font-semibold disabled:opacity-50"
            >
              {submitting ? 'Scheduling...' : 'Schedule Exam'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Exam Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Exam Schedule"
        description={`Update schedule details for ${selectedExam?.subject?.name || 'Exam'}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Field label="Assessment Component Mapping">
            <select
              value={editFormData.componentId}
              onChange={(e) => setEditFormData(prev => ({ ...prev, componentId: e.target.value }))}
              className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface-0 text-text-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
            >
              <option value="">-- No Component Mapping --</option>
              {components.map(comp => (
                <option key={comp.id} value={comp.id}>
                  🎯 {comp.name} ({comp.category} • Max: {comp.maxMarks} marks)
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Exam Type" required>
              <select
                value={editFormData.examType}
                onChange={(e) => setEditFormData(prev => ({ ...prev, examType: e.target.value }))}
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface-0 text-text-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
                required
              >
                {EXAM_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </Field>

            <Field label="Exam Date & Time">
              <input
                type="datetime-local"
                value={editFormData.examDate}
                onChange={(e) => setEditFormData(prev => ({ ...prev, examDate: e.target.value }))}
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface-0 text-text-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Maximum Marks" required>
              <input
                type="number"
                min="1"
                step="0.5"
                value={editFormData.maxMarks}
                onChange={(e) => setEditFormData(prev => ({ ...prev, maxMarks: e.target.value }))}
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface-0 text-text-900 focus:border-brass-500 focus:ring-1 focus:ring-brass-500"
                required
              />
            </Field>

            <Field label="Passing Marks" required>
              <input
                type="number"
                min="0"
                max={editFormData.maxMarks}
                step="0.5"
                value={editFormData.passingMarks}
                onChange={(e) => setEditFormData(prev => ({ ...prev, passingMarks: e.target.value }))}
                className={`w-full rounded-md border px-3 py-2 text-sm bg-surface-0 text-text-900 focus:ring-1 ${
                  Number(editFormData.passingMarks || 0) > Number(editFormData.maxMarks || 0)
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-border focus:border-brass-500 focus:ring-brass-500'
                }`}
                required
              />
              {Number(editFormData.passingMarks || 0) > Number(editFormData.maxMarks || 0) && (
                <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
                  <span>⚠️ Passing marks cannot be greater than max marks ({editFormData.maxMarks || 0})</span>
                </p>
              )}
            </Field>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || Number(editFormData.passingMarks || 0) > Number(editFormData.maxMarks || 0)}
              className="bg-brass-500 hover:bg-brass-600 text-ink-950 font-semibold disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Exam Schedule"
        message={`Are you sure you want to delete the scheduled exam for "${selectedExam?.subject?.name}" (${selectedExam?.examType})? This action cannot be undone.`}
        confirmText="Delete Exam"
        variant="danger"
      />
    </div>
  );
}
