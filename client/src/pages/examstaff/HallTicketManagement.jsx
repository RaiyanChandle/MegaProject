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
import { 
  FileText, 
  Plus, 
  Trash2, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles, 
  Layers, 
  GraduationCap, 
  Users, 
  Send, 
  RefreshCw,
  Clock,
  RotateCw
} from 'lucide-react';

const EXAM_TYPE_OPTIONS = [
  { value: 'MIDTERM', label: 'Mid-Semester Examination (MSE)' },
  { value: 'FINAL', label: 'End-Semester Examination (ESE)' },
  { value: 'MAKEUP', label: 'Backlog / Re-attempt Examination' },
  { value: 'INTERNAL', label: 'Internal Assessment' },
];

export default function HallTicketManagement() {
  const [tickets, setTickets] = useState([]);
  const [exams, setExams] = useState([]);
  const [formOptions, setFormOptions] = useState({ academicTerms: [], departments: [] });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedTermFilter, setSelectedTermFilter] = useState('');

  // Generation Modal & Action State
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState(null); // 'MIDTERM' | 'FINAL' | 'MAKEUP' | null
  const [generateForm, setGenerateForm] = useState({
    academicTermId: '',
    examType: 'MIDTERM',
    classId: '',
    examCenter: 'Main Campus Examination Block',
    seatPrefix: 'MSE-'
  });

  // Revoke Batch State
  const [batchToRevoke, setBatchToRevoke] = useState(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [optionsRes, ticketsRes, examsRes] = await Promise.all([
        apiClient.get('/exams/form-options'),
        apiClient.get('/hall-tickets'),
        apiClient.get('/exams')
      ]);

      setFormOptions(optionsRes);
      setTickets(ticketsRes);
      setExams(examsRes);

      // Default to current academic term if available
      const currentTerm = optionsRes.academicTerms?.find(t => t.isCurrent);
      if (currentTerm && !selectedTermFilter) {
        setSelectedTermFilter(currentTerm.id);
        setGenerateForm(prev => ({ ...prev, academicTermId: currentTerm.id }));
      } else if (optionsRes.academicTerms?.length > 0 && !generateForm.academicTermId) {
        setGenerateForm(prev => ({ ...prev, academicTermId: optionsRes.academicTerms[0].id }));
      }
    } catch (error) {
      toast.error('Failed to load hall tickets data');
    } finally {
      setLoading(false);
    }
  };

  // Open Generate Modal for a specific type or general
  const handleOpenGenerateModal = (examType = 'MIDTERM') => {
    const currentTerm = formOptions.academicTerms?.find(t => t.isCurrent) || formOptions.academicTerms?.[0];
    let prefix = 'MSE-';
    if (examType === 'FINAL') prefix = 'ESE-';
    else if (examType === 'MAKEUP') prefix = 'MK-';

    setGenerateForm({
      academicTermId: selectedTermFilter || currentTerm?.id || '',
      examType: examType,
      classId: '',
      examCenter: 'Main Campus Examination Block',
      seatPrefix: prefix
    });
    setIsGenerateModalOpen(true);
  };

  // Change exam type in generate form
  const handleExamTypeChange = (type) => {
    let prefix = 'MSE-';
    if (type === 'FINAL') prefix = 'ESE-';
    else if (type === 'MAKEUP') prefix = 'MK-';
    else if (type === 'INTERNAL') prefix = 'IA-';

    setGenerateForm(prev => ({
      ...prev,
      examType: type,
      seatPrefix: prefix
    }));
  };

  // Submit Generation
  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    if (!generateForm.academicTermId) {
      toast.error('Please select an Academic Term');
      return;
    }

    setIsGenerating(true);
    setGeneratingType(generateForm.examType);
    try {
      const res = await apiClient.post('/hall-tickets/generate', generateForm);
      toast.success(res.message || 'Hall tickets generated and published to students!');
      setIsGenerateModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to generate hall tickets');
    } finally {
      setIsGenerating(false);
      setGeneratingType(null);
    }
  };

  // Quick Direct Generation Trigger from Card
  const handleQuickGenerate = async (examType) => {
    const currentTermId = selectedTermFilter || formOptions.academicTerms?.find(t => t.isCurrent)?.id;
    if (!currentTermId) {
      toast.error('Please select an Academic Term first');
      return;
    }

    let prefix = 'MSE-';
    if (examType === 'FINAL') prefix = 'ESE-';
    else if (examType === 'MAKEUP') prefix = 'MK-';

    setIsGenerating(true);
    setGeneratingType(examType);
    try {
      const res = await apiClient.post('/hall-tickets/generate', {
        academicTermId: currentTermId,
        examType,
        seatPrefix: prefix,
        examCenter: 'Main Campus Examination Block'
      });
      toast.success(res.message || `${examType} hall tickets generated and published!`);
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to generate hall tickets');
    } finally {
      setIsGenerating(false);
      setGeneratingType(null);
    }
  };

  // Revoke Batch Confirm
  const handleRevokeConfirm = async () => {
    if (!batchToRevoke) return;
    setIsRevoking(true);
    try {
      await apiClient.post('/hall-tickets/bulk-delete', {
        academicTermId: batchToRevoke.academicTermId,
        examType: batchToRevoke.examType
      });
      toast.success(`Revoked hall tickets for ${batchToRevoke.examTypeLabel}`);
      setBatchToRevoke(null);
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to revoke hall tickets');
    } finally {
      setIsRevoking(false);
    }
  };

  // Aggregate stats
  const stats = useMemo(() => {
    const total = tickets.length;
    const mseCount = tickets.filter(t => t.exam?.examType === 'MIDTERM').length;
    const eseCount = tickets.filter(t => t.exam?.examType === 'FINAL').length;
    const makeupCount = tickets.filter(t => t.exam?.examType === 'MAKEUP').length;
    return { total, mseCount, eseCount, makeupCount };
  }, [tickets]);

  // Scheduled exams in the selected term
  const activeTermId = selectedTermFilter || formOptions.academicTerms?.find(t => t.isCurrent)?.id;
  const termExams = useMemo(() => {
    return exams.filter(e => !activeTermId || e.academicTermId === activeTermId);
  }, [exams, activeTermId]);

  const termExamCounts = useMemo(() => {
    return {
      mse: termExams.filter(e => e.examType === 'MIDTERM').length,
      ese: termExams.filter(e => e.examType === 'FINAL').length,
      makeup: termExams.filter(e => e.examType === 'MAKEUP').length
    };
  }, [termExams]);

  // Aggregate into published batches per (termId, examType)
  const publishedBatches = useMemo(() => {
    const map = {};

    tickets.forEach(ticket => {
      if (!ticket.exam) return;
      const termId = ticket.exam.academicTermId;
      const termName = ticket.exam.academicTerm?.name || 'Academic Term';
      const isCurrent = ticket.exam.academicTerm?.isCurrent;
      const type = ticket.exam.examType;
      const key = `${termId}_${type}`;

      if (!map[key]) {
        let label = 'Mid-Semester Examination (MSE)';
        if (type === 'FINAL') label = 'End-Semester Examination (ESE)';
        else if (type === 'MAKEUP') label = 'Backlog / Re-attempt Exam';
        else if (type === 'INTERNAL') label = 'Internal Assessment';

        map[key] = {
          id: key,
          academicTermId: termId,
          academicTermName: termName,
          isCurrentTerm: isCurrent,
          examType: type,
          examTypeLabel: label,
          examCenter: ticket.examCenter || 'Main Campus',
          studentIds: new Set(),
          ticketCount: 0,
          lastGeneratedAt: ticket.generatedAt,
          generatedBy: ticket.generatedBy?.name || 'Exam Controller'
        };
      }

      map[key].studentIds.add(ticket.studentId);
      map[key].ticketCount += 1;
      if (new Date(ticket.generatedAt) > new Date(map[key].lastGeneratedAt)) {
        map[key].lastGeneratedAt = ticket.generatedAt;
      }
    });

    return Object.values(map).map(b => ({
      ...b,
      uniqueStudentsCount: b.studentIds.size
    }));
  }, [tickets]);

  // Filtered batches
  const filteredBatches = useMemo(() => {
    if (!selectedTermFilter) return publishedBatches;
    return publishedBatches.filter(b => b.academicTermId === selectedTermFilter);
  }, [publishedBatches, selectedTermFilter]);

  // Classes for the generate modal dropdown
  const allClasses = useMemo(() => {
    const list = [];
    formOptions.departments?.forEach(dept => {
      dept.classes?.forEach(cls => {
        list.push({
          id: cls.id,
          name: `${cls.name} (${dept.code || dept.name} • Sem ${cls.semesterNumber})`
        });
      });
    });
    return list;
  }, [formOptions.departments]);

  // Check if session in modal is already generated
  const isSelectedSessionAlreadyGenerated = useMemo(() => {
    return tickets.some(t => 
      t.exam?.academicTermId === generateForm.academicTermId && 
      t.exam?.examType === generateForm.examType
    );
  }, [tickets, generateForm.academicTermId, generateForm.examType]);

  // Batch Table columns
  const batchColumns = [
    {
      title: 'Academic Term',
      key: 'term',
      render: (_, b) => (
        <div className="flex flex-col">
          <span className="font-semibold text-text-900">{b.academicTermName}</span>
          {b.isCurrentTerm && (
            <span className="text-[10px] text-ink-700 font-medium">Current Active Term</span>
          )}
        </div>
      )
    },
    {
      title: 'Examination Session',
      key: 'examType',
      render: (_, b) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={b.examType} />
          <span className="text-xs font-medium text-text-700">{b.examTypeLabel}</span>
        </div>
      )
    },
    {
      title: 'Students Covered',
      key: 'students',
      render: (_, b) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-ink-900 bg-surface-100 px-2 py-0.5 rounded border border-border">
            {b.uniqueStudentsCount} Students
          </span>
          <span className="text-xs text-text-500">
            ({b.ticketCount} course exams)
          </span>
        </div>
      )
    },
    {
      title: 'Assigned Center',
      key: 'center',
      render: (_, b) => (
        <div className="flex items-center gap-1.5 text-xs text-text-700">
          <MapPin className="w-3.5 h-3.5 text-text-400" />
          <span>{b.examCenter}</span>
        </div>
      )
    },
    {
      title: 'Student Access Status',
      key: 'status',
      render: () => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-success">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <span>Published to Students</span>
        </div>
      )
    },
    {
      title: 'Release Details',
      key: 'released',
      render: (_, b) => (
        <div className="flex flex-col text-xs text-text-500">
          <span className="font-mono">{new Date(b.lastGeneratedAt).toLocaleDateString()}</span>
          <span>By {b.generatedBy}</span>
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, b) => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenGenerateModal(b.examType)}
            className="h-7 px-2.5 text-xs flex items-center gap-1 font-medium"
            title="Re-generate or update seat assignments"
          >
            <RefreshCw className="w-3.5 h-3.5 text-ink-600" />
            <span>Re-generate</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBatchToRevoke(b)}
            className="p-1.5 text-text-400 hover:text-danger"
            title="Revoke session hall tickets"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  // Stateful Card Computation: MSE
  const isMseGenerated = stats.mseCount > 0;
  const mseExamsCount = termExamCounts.mse;
  const isMseReady = mseExamsCount > 0 && !isMseGenerated;
  const isMseEmpty = mseExamsCount === 0;

  // Stateful Card Computation: ESE
  const isEseGenerated = stats.eseCount > 0;
  const eseExamsCount = termExamCounts.ese;
  const isEseReady = eseExamsCount > 0 && !isEseGenerated;
  const isEseEmpty = eseExamsCount === 0;

  // Stateful Card Computation: Makeup
  const isMakeupGenerated = stats.makeupCount > 0;
  const makeupExamsCount = termExamCounts.makeup;
  const isMakeupReady = makeupExamsCount > 0 && !isMakeupGenerated;
  const isMakeupEmpty = makeupExamsCount === 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar with Stateful Main Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-3xl font-semibold text-text-900 tracking-tight">Hall Ticket Issuance Desk</h1>
          <p className="text-sm text-text-500 mt-1">
            Generate and release official examination hall tickets for Mid-Semester (MSE) and End-Semester (ESE) sessions. Once generated, hall tickets are published directly to students for access and printing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant={stats.total > 0 ? "secondary" : "accent"} 
            onClick={() => handleOpenGenerateModal('MIDTERM')}
            loading={isGenerating && !generatingType}
            className="flex items-center gap-2 shadow-xs font-semibold"
          >
            {stats.total > 0 ? (
              <>
                <RefreshCw className="w-4 h-4 text-ink-700" />
                <span>Re-issue / Generate Tickets</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Generate Hall Tickets</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Notice Banner: Student Direct Access */}
      <div className="bg-surface-50 border border-ink-200 rounded-lg p-4 flex items-start gap-3.5">
        <div className="p-2 bg-ink-900 text-white rounded-md shrink-0 mt-0.5">
          <Send className="w-4 h-4" />
        </div>
        <div className="text-xs space-y-1">
          <h4 className="font-bold text-ink-900 text-sm">Direct Student Distribution Workflow</h4>
          <p className="text-text-600 leading-relaxed">
            The Exam Cell issues hall tickets in batches. Once generated, students can immediately access, view, and print their official admit cards (with candidate instructions, seat allocations, and timetables) under their <strong>Student Portal → Hall Tickets</strong> desk.
          </p>
        </div>
      </div>

      {/* Stateful Session Quick-Generation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* MSE Card */}
        <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-info/10 text-info border border-info/20">
                MIDTERM
              </span>
              
              {/* Dynamic State Badge */}
              {isMseGenerated ? (
                <span className="text-[11px] font-bold text-success bg-success/10 border border-success/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  <span>{stats.mseCount} Active</span>
                </span>
              ) : isMseReady ? (
                <span className="text-[11px] font-bold text-warning bg-warning/10 border border-warning/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-warning" />
                  <span>Ready ({mseExamsCount} Exams)</span>
                </span>
              ) : (
                <span className="text-[11px] font-medium text-text-400 bg-surface-100 border border-border px-2 py-0.5 rounded-full">
                  0 Exams Scheduled
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-text-900">Mid-Semester Exam (MSE)</h3>
            <p className="text-xs text-text-500 leading-relaxed">
              {isMseGenerated
                ? `${stats.mseCount} student admit cards active with prefix MSE-001. All enrolled candidates have allocated seats.`
                : isMseReady
                ? `${mseExamsCount} scheduled MSE exams detected. Ready to generate student hall tickets and assign exam halls.`
                : 'No scheduled MSE examinations found for this term. Schedule exams under the Exams tab first.'}
            </p>
          </div>

          {/* Stateful Action Button Row */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/60">
            <Button
              variant={isMseGenerated ? "secondary" : isMseReady ? "accent" : "ghost"}
              onClick={() => handleOpenGenerateModal('MIDTERM')}
              disabled={isMseEmpty || (isGenerating && generatingType === 'MIDTERM')}
              loading={isGenerating && generatingType === 'MIDTERM'}
              className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold"
            >
              {isMseGenerated ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-ink-700" />
                  <span>Re-generate / Update MSE</span>
                </>
              ) : isMseReady ? (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Generate MSE Hall Tickets</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-text-400" />
                  <span>No Exams to Generate</span>
                </>
              )}
            </Button>

            {isMseGenerated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const b = publishedBatches.find(batch => batch.examType === 'MIDTERM');
                  if (b) setBatchToRevoke(b);
                }}
                className="p-2 text-text-400 hover:text-danger hover:bg-danger/10"
                title="Revoke all active MSE hall tickets"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* ESE Card */}
        <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-ink-100 text-ink-900 border border-ink-200">
                FINAL
              </span>

              {/* Dynamic State Badge */}
              {isEseGenerated ? (
                <span className="text-[11px] font-bold text-success bg-success/10 border border-success/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  <span>{stats.eseCount} Active</span>
                </span>
              ) : isEseReady ? (
                <span className="text-[11px] font-bold text-warning bg-warning/10 border border-warning/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-warning" />
                  <span>Ready ({eseExamsCount} Exams)</span>
                </span>
              ) : (
                <span className="text-[11px] font-medium text-text-400 bg-surface-100 border border-border px-2 py-0.5 rounded-full">
                  0 Exams Scheduled
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-text-900">End-Semester Exam (ESE)</h3>
            <p className="text-xs text-text-500 leading-relaxed">
              {isEseGenerated
                ? `${stats.eseCount} student admit cards active with prefix ESE-001. All enrolled candidates have allocated seats.`
                : isEseReady
                ? `${eseExamsCount} scheduled ESE exams detected. Ready to generate student hall tickets and assign exam halls.`
                : 'No scheduled ESE examinations found for this term. Schedule exams under the Exams tab first.'}
            </p>
          </div>

          {/* Stateful Action Button Row */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/60">
            <Button
              variant={isEseGenerated ? "secondary" : isEseReady ? "accent" : "ghost"}
              onClick={() => handleOpenGenerateModal('FINAL')}
              disabled={isEseEmpty || (isGenerating && generatingType === 'FINAL')}
              loading={isGenerating && generatingType === 'FINAL'}
              className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold"
            >
              {isEseGenerated ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-ink-700" />
                  <span>Re-generate / Update ESE</span>
                </>
              ) : isEseReady ? (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Generate ESE Hall Tickets</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-text-400" />
                  <span>No Exams to Generate</span>
                </>
              )}
            </Button>

            {isEseGenerated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const b = publishedBatches.find(batch => batch.examType === 'FINAL');
                  if (b) setBatchToRevoke(b);
                }}
                className="p-2 text-text-400 hover:text-danger hover:bg-danger/10"
                title="Revoke all active ESE hall tickets"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Backlog / Makeup Card */}
        <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">
                MAKEUP
              </span>

              {/* Dynamic State Badge */}
              {isMakeupGenerated ? (
                <span className="text-[11px] font-bold text-success bg-success/10 border border-success/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  <span>{stats.makeupCount} Active</span>
                </span>
              ) : isMakeupReady ? (
                <span className="text-[11px] font-bold text-warning bg-warning/10 border border-warning/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-warning" />
                  <span>Ready ({makeupExamsCount} Exams)</span>
                </span>
              ) : (
                <span className="text-[11px] font-medium text-text-400 bg-surface-100 border border-border px-2 py-0.5 rounded-full">
                  0 Exams Scheduled
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-text-900">Backlog Re-attempts</h3>
            <p className="text-xs text-text-500 leading-relaxed">
              {isMakeupGenerated
                ? `${stats.makeupCount} backlog admit cards active with prefix MK-001 (Rule 18).`
                : isMakeupReady
                ? `${makeupExamsCount} scheduled Makeup exams detected for re-attempts.`
                : 'Issues separate hall tickets for re-attempts (Rule 18) under separate enrollment IDs with prefix MK-001.'}
            </p>
          </div>

          {/* Stateful Action Button Row */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/60">
            <Button
              variant={isMakeupGenerated ? "secondary" : isMakeupReady ? "accent" : "secondary"}
              onClick={() => handleOpenGenerateModal('MAKEUP')}
              disabled={isGenerating && generatingType === 'MAKEUP'}
              loading={isGenerating && generatingType === 'MAKEUP'}
              className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold"
            >
              {isMakeupGenerated ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-warning" />
                  <span>Re-generate Backlogs</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Generate Backlog Tickets</span>
                </>
              )}
            </Button>

            {isMakeupGenerated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const b = publishedBatches.find(batch => batch.examType === 'MAKEUP');
                  if (b) setBatchToRevoke(b);
                }}
                className="p-2 text-text-400 hover:text-danger hover:bg-danger/10"
                title="Revoke all active Backlog hall tickets"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface-0 border border-border rounded-md p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-500">
            Filter by Term:
          </span>
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
        </div>

        <div className="text-xs text-text-500 font-mono">
          Total Admit Cards Active: <strong className="text-text-900">{stats.total}</strong>
        </div>
      </div>

      {/* Published Batches Table */}
      <div className="space-y-2">
        <h3 className="text-base font-bold text-text-900">Issued Examination Sessions</h3>
        <DataTable
          columns={batchColumns}
          data={filteredBatches}
          loading={loading}
          keyField="id"
          emptyMessage="No hall ticket batches generated yet. Click 'Generate Hall Tickets' to issue MSE or ESE admit cards to enrolled students."
        />
      </div>

      {/* Generate Modal */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        title={isSelectedSessionAlreadyGenerated ? "Re-generate & Update Hall Tickets" : "Generate & Publish Hall Tickets"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleGenerateSubmit} className="space-y-4">
          {/* Active Session Status Callout */}
          {isSelectedSessionAlreadyGenerated ? (
            <div className="bg-info/10 border border-info/20 rounded p-3 text-xs text-info flex items-start gap-2.5">
              <RefreshCw className="w-4 h-4 shrink-0 mt-0.5 text-info" />
              <div className="space-y-1">
                <strong>Active Hall Tickets Detected for this Session:</strong>
                <p className="text-text-700 leading-relaxed">
                  Hall tickets already exist for this term and exam session. Generating again will update seat number allocations and include any newly enrolled students.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-surface-50 border border-border rounded p-3 text-xs text-text-600 space-y-1">
              <div className="font-semibold text-text-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-ink-900" />
                <span>Bulk Issuance & Publication Rules</span>
              </div>
              <p>
                Hall tickets will be created for all eligible students enrolled in scheduled examinations for the selected term and session. Once generated, students can immediately access them on their student portal.
              </p>
            </div>
          )}

          <Field label="Academic Term" required>
            <select
              value={generateForm.academicTermId}
              onChange={(e) => setGenerateForm({ ...generateForm, academicTermId: e.target.value })}
              className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm text-text-900 focus:border-ink-700"
              required
            >
              <option value="">Select Academic Term</option>
              {formOptions.academicTerms?.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name} {term.isCurrent ? '(Current Active Term)' : ''}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Examination Session (Separate MSE & ESE)" required>
            <select
              value={generateForm.examType}
              onChange={(e) => handleExamTypeChange(e.target.value)}
              className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm text-text-900 font-semibold focus:border-ink-700"
              required
            >
              {EXAM_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Class / Section Filter (Optional)">
            <select
              value={generateForm.classId}
              onChange={(e) => setGenerateForm({ ...generateForm, classId: e.target.value })}
              className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm text-text-900 focus:border-ink-700"
            >
              <option value="">All Classes in Academic Term</option>
              {allClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Seat Number Prefix" required>
            <input
              type="text"
              value={generateForm.seatPrefix}
              onChange={(e) => setGenerateForm({ ...generateForm, seatPrefix: e.target.value })}
              placeholder="e.g. MSE- or ESE-"
              className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm font-mono text-text-900 focus:border-ink-700"
              required
            />
          </Field>

          <Field label="Examination Center" required>
            <input
              type="text"
              value={generateForm.examCenter}
              onChange={(e) => setGenerateForm({ ...generateForm, examCenter: e.target.value })}
              placeholder="Main Examination Hall"
              className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm text-text-900 focus:border-ink-700"
              required
            />
          </Field>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsGenerateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              loading={isGenerating}
              className="flex items-center gap-1.5 font-semibold"
            >
              {isSelectedSessionAlreadyGenerated ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>{isGenerating ? 'Updating & Re-issuing...' : 'Update & Re-publish Hall Tickets'}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{isGenerating ? 'Generating & Publishing...' : 'Generate & Publish to Students'}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Revoke Batch Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!batchToRevoke}
        onClose={() => setBatchToRevoke(null)}
        onConfirm={handleRevokeConfirm}
        title={`Revoke ${batchToRevoke?.examTypeLabel} Hall Tickets?`}
        message={`Are you sure you want to revoke all hall tickets for ${batchToRevoke?.academicTermName} (${batchToRevoke?.examTypeLabel})? Students will no longer see this admit card in their portal until regenerated.`}
        confirmText="Revoke Batch"
        cancelText="Keep"
        variant="danger"
        loading={isRevoking}
      />
    </div>
  );
}
