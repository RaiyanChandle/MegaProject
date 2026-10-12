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
  RefreshCw
} from 'lucide-react';

const EXAM_TYPE_OPTIONS = [
  { value: 'MIDTERM', label: 'Mid-Semester Examination (MSE)' },
  { value: 'FINAL', label: 'End-Semester Examination (ESE)' },
  { value: 'MAKEUP', label: 'Backlog / Re-attempt Examination' },
  { value: 'INTERNAL', label: 'Internal Assessment' },
];

export default function HallTicketManagement() {
  const [tickets, setTickets] = useState([]);
  const [formOptions, setFormOptions] = useState({ academicTerms: [], departments: [] });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedTermFilter, setSelectedTermFilter] = useState('');

  // Generation Modal State
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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
      const [optionsRes, ticketsRes] = await Promise.all([
        apiClient.get('/exams/form-options'),
        apiClient.get('/hall-tickets')
      ]);

      setFormOptions(optionsRes);
      setTickets(ticketsRes);

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
    try {
      const res = await apiClient.post('/hall-tickets/generate', generateForm);
      toast.success(res.message || 'Hall tickets generated and published to students!');
      setIsGenerateModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to generate hall tickets');
    } finally {
      setIsGenerating(false);
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-3xl font-semibold text-text-900 tracking-tight">Hall Ticket Issuance Desk</h1>
          <p className="text-sm text-text-500 mt-1">
            Generate and release official examination hall tickets for Mid-Semester (MSE) and End-Semester (ESE) sessions. Once generated, hall tickets are published directly to students for access and printing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="accent" 
            onClick={() => handleOpenGenerateModal('MIDTERM')}
            className="flex items-center gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Hall Tickets</span>
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

      {/* Session Quick-Generation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* MSE Card */}
        <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-info/10 text-info border border-info/20">
                MIDTERM
              </span>
              <span className="text-xs font-mono font-bold text-text-900">
                {stats.mseCount} Tickets Issued
              </span>
            </div>
            <h3 className="text-lg font-bold text-text-900">Mid-Semester Exam (MSE)</h3>
            <p className="text-xs text-text-500 leading-relaxed">
              Issues distinct Midterm admit cards with seat numbers prefix <code className="font-mono text-ink-900 font-semibold">MSE-001</code> for all enrolled courses.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => handleOpenGenerateModal('MIDTERM')}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5 text-info" />
            <span>{stats.mseCount > 0 ? 'Re-generate / Update MSE' : 'Generate MSE Hall Tickets'}</span>
          </Button>
        </div>

        {/* ESE Card */}
        <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-ink-100 text-ink-900 border border-ink-200">
                FINAL
              </span>
              <span className="text-xs font-mono font-bold text-text-900">
                {stats.eseCount} Tickets Issued
              </span>
            </div>
            <h3 className="text-lg font-bold text-text-900">End-Semester Exam (ESE)</h3>
            <p className="text-xs text-text-500 leading-relaxed">
              Issues distinct End-semester university admit cards with seat numbers prefix <code className="font-mono text-ink-900 font-semibold">ESE-001</code>.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => handleOpenGenerateModal('FINAL')}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5 text-ink-900" />
            <span>{stats.eseCount > 0 ? 'Re-generate / Update ESE' : 'Generate ESE Hall Tickets'}</span>
          </Button>
        </div>

        {/* Backlog / Makeup Card */}
        <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">
                MAKEUP
              </span>
              <span className="text-xs font-mono font-bold text-text-900">
                {stats.makeupCount} Tickets Issued
              </span>
            </div>
            <h3 className="text-lg font-bold text-text-900">Backlog Re-attempts</h3>
            <p className="text-xs text-text-500 leading-relaxed">
              Issues separate hall tickets for re-attempts (Rule 18) under separate enrollment IDs with prefix <code className="font-mono text-ink-900 font-semibold">MK-001</code>.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => handleOpenGenerateModal('MAKEUP')}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5 text-warning" />
            <span>{stats.makeupCount > 0 ? 'Re-generate Backlogs' : 'Generate Backlog Tickets'}</span>
          </Button>
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
        title="Generate & Publish Hall Tickets"
      >
        <form onSubmit={handleGenerateSubmit} className="space-y-4">
          <div className="bg-surface-50 border border-border rounded p-3 text-xs text-text-600 space-y-1">
            <div className="font-semibold text-text-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-ink-900" />
              <span>Bulk Issuance & Publication Rules</span>
            </div>
            <p>
              Hall tickets will be created for all eligible students enrolled in scheduled examinations for the selected term and session. Once generated, students can immediately access them on their student portal.
            </p>
          </div>

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
              className="flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>Generate & Publish to Students</span>
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
