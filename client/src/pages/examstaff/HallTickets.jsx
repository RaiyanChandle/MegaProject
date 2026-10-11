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
  Printer, 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  AlertCircle, 
  GraduationCap, 
  Clock, 
  Calendar,
  Building,
  User,
  Hash,
  Download,
  Info,
  Layers,
  Sparkles,
  QrCode,
  Users
} from 'lucide-react';
import { useSearch } from '../../context/SearchContext';

export default function HallTickets() {
  const { searchQuery, setSearchQuery } = useSearch();

  const [tickets, setTickets] = useState([]);
  const [exams, setExams] = useState([]);
  const [terms, setTerms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // View Mode: 'BY_STUDENT' (unified admit cards) or 'BY_EXAM'
  const [viewMode, setViewMode] = useState('BY_STUDENT');

  // Filters
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedAttemptType, setSelectedAttemptType] = useState('ALL'); // 'ALL', 'REGULAR', 'BACKLOG'

  // Modals
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Active / selected card data
  const [admitCardData, setAdmitCardData] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Generate Form state
  const [genForm, setGenForm] = useState({
    academicTermId: '',
    examId: 'ALL_IN_TERM',
    examCenter: 'Main Campus Examination Hall, Block A',
    seatPrefix: 'HALL-A-',
    startSequence: 1,
    attemptFilter: 'ALL'
  });

  // Edit Form state
  const [editForm, setEditForm] = useState({
    seatNumber: '',
    examCenter: '',
    applyToAllExams: true
  });

  // Fetch all required data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [ticketsData, examsData, termsData, deptsData] = await Promise.all([
        apiClient.get('/hall-tickets'),
        apiClient.get('/exams'),
        apiClient.get('/academic-terms'),
        apiClient.get('/departments')
      ]);

      setTickets(ticketsData || []);
      setExams(examsData || []);
      setTerms(termsData || []);
      setDepartments(deptsData || []);

      const current = (termsData || []).find(t => t.isCurrent);
      if (current && !selectedTermId) {
        setSelectedTermId(current.id);
        setGenForm(prev => ({ ...prev, academicTermId: current.id }));
      }
    } catch (err) {
      console.error('Error fetching hall tickets data:', err);
      toast.error('Failed to load hall tickets data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered raw tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Exam filter
      if (selectedExamId && ticket.examId !== selectedExamId) {
        return false;
      }

      // Academic term filter
      if (selectedTermId && ticket.exam?.academicTermId !== selectedTermId) {
        return false;
      }

      // Department filter
      if (selectedDeptId && ticket.student?.departmentId !== selectedDeptId) {
        return false;
      }

      // Attempt filter (Rule 18 / Flow 11)
      const attemptNum = ticket.enrollment?.attemptNumber || 1;
      if (selectedAttemptType === 'REGULAR' && attemptNum > 1) {
        return false;
      }
      if (selectedAttemptType === 'BACKLOG' && attemptNum <= 1) {
        return false;
      }

      // Search query filter
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const studentName = ticket.student?.name?.toLowerCase() || '';
        const rollNumber = ticket.student?.rollNumber?.toLowerCase() || '';
        const instId = ticket.student?.instituteId?.toLowerCase() || '';
        const seatNo = ticket.seatNumber?.toLowerCase() || '';
        const subjectName = ticket.exam?.subject?.name?.toLowerCase() || '';
        const subjectCode = ticket.exam?.subject?.code?.toLowerCase() || '';

        const match = 
          studentName.includes(q) ||
          rollNumber.includes(q) ||
          instId.includes(q) ||
          seatNo.includes(q) ||
          subjectName.includes(q) ||
          subjectCode.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [tickets, selectedExamId, selectedTermId, selectedDeptId, selectedAttemptType, searchQuery]);

  // Grouped by Student: One unified admit card per student across all exams in term
  const studentCards = useMemo(() => {
    const map = new Map();

    for (const ticket of filteredTickets) {
      const studentId = ticket.studentId;
      if (!map.has(studentId)) {
        map.set(studentId, {
          studentId,
          student: ticket.student,
          seatNumber: ticket.seatNumber,
          examCenter: ticket.examCenter,
          academicTerm: ticket.exam?.academicTerm,
          generatedAt: ticket.generatedAt || ticket.createdAt,
          primaryTicketId: ticket.id,
          exams: [],
          hasBacklog: false
        });
      }

      const card = map.get(studentId);
      const attempt = ticket.enrollment?.attemptNumber || 1;
      if (attempt > 1) card.hasBacklog = true;

      // Add exam to student's list if not duplicate
      if (!card.exams.some(e => e.examId === ticket.examId)) {
        card.exams.push({
          ticketId: ticket.id,
          examId: ticket.examId,
          subjectCode: ticket.exam?.subject?.code || 'SUB',
          subjectName: ticket.exam?.subject?.name || 'Subject',
          examType: ticket.exam?.examType || 'MIDTERM',
          examDate: ticket.exam?.examDate,
          startTime: ticket.exam?.startTime,
          durationMinutes: ticket.exam?.durationMinutes || 180,
          attemptNumber: attempt,
          seatNumber: ticket.seatNumber,
          examCenter: ticket.examCenter
        });
      }
    }

    return Array.from(map.values());
  }, [filteredTickets]);

  // Statistics
  const stats = useMemo(() => {
    const totalAllocations = tickets.length;
    const uniqueStudents = new Set(tickets.map(t => t.studentId)).size;
    const uniqueExams = new Set(tickets.map(t => t.examId)).size;
    const backlogCount = tickets.filter(t => (t.enrollment?.attemptNumber || 1) > 1).length;

    return { totalAllocations, uniqueStudents, uniqueExams, backlogCount };
  }, [tickets]);

  // Handle Generate Batch Submit
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!genForm.examId && !genForm.academicTermId) {
      toast.error('Please select an Academic Term or Examination');
      return;
    }

    try {
      setSubmitting(true);
      const payload = { ...genForm };
      if (payload.examId === 'ALL_IN_TERM') {
        delete payload.examId;
      }

      const res = await apiClient.post('/hall-tickets/generate', payload);
      toast.success(res.message || 'Hall tickets generated successfully');
      setIsGenerateModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error generating hall tickets:', err);
      toast.error(err.response?.data?.error || 'Failed to generate hall tickets');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (ticketOrCard) => {
    setSelectedTicket(ticketOrCard);
    setEditForm({
      seatNumber: ticketOrCard.seatNumber || '',
      examCenter: ticketOrCard.examCenter || '',
      applyToAllExams: true
    });
    setIsEditModalOpen(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      setSubmitting(true);
      const ticketId = selectedTicket.primaryTicketId || selectedTicket.id;
      await apiClient.put(`/hall-tickets/${ticketId}`, editForm);
      toast.success('Hall ticket details updated successfully');
      setIsEditModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error updating hall ticket:', err);
      toast.error(err.response?.data?.error || 'Failed to update hall ticket');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete / Revoke
  const openDeleteDialog = (ticketOrCard) => {
    setSelectedTicket(ticketOrCard);
    setIsDeleteOpen(true);
  };

  // Handle Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!selectedTicket) return;

    try {
      setSubmitting(true);
      const ticketId = selectedTicket.primaryTicketId || selectedTicket.id;
      const isCard = !!selectedTicket.studentId;
      await apiClient.delete(`/hall-tickets/${ticketId}${isCard ? '?revokeAllForStudent=true' : ''}`);
      toast.success('Hall ticket(s) revoked successfully');
      setIsDeleteOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error deleting hall ticket:', err);
      toast.error(err.response?.data?.error || 'Failed to revoke hall ticket');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Unified Print Admit Card Modal (with ALL exams for the student)
  const openPrintModal = async (ticketOrCard) => {
    try {
      setLoading(true);
      const studentId = ticketOrCard.studentId || ticketOrCard.student?.id;
      
      // Query full student admit card endpoint
      const termId = ticketOrCard.academicTerm?.id || ticketOrCard.exam?.academicTermId || selectedTermId;
      const res = await apiClient.get(`/hall-tickets/student/${studentId}${termId ? `?academicTermId=${termId}` : ''}`);
      setAdmitCardData(res);
      setIsPrintModalOpen(true);
    } catch (err) {
      console.error('Error loading admit card details:', err);
      // Fallback to local card object if API fails
      if (ticketOrCard.exams) {
        setAdmitCardData({
          student: ticketOrCard.student,
          seatNumber: ticketOrCard.seatNumber,
          examCenter: ticketOrCard.examCenter,
          academicTerm: ticketOrCard.academicTerm,
          generatedAt: ticketOrCard.generatedAt,
          allExams: ticketOrCard.exams
        });
        setIsPrintModalOpen(true);
      } else {
        toast.error('Failed to load complete admit card');
      }
    } finally {
      setLoading(false);
    }
  };

  // Trigger system print dialog targeting exclusively the Admit Card (never the dashboard)
  const handlePrint = () => {
    const printEl = document.getElementById('printable-admit-card');
    if (!printEl) {
      window.print();
      return;
    }

    try {
      // Gather all stylesheets and fonts from main document
      const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(el => el.outerHTML)
        .join('\n');

      let iframe = document.getElementById('hall-ticket-print-frame');
      if (iframe) iframe.remove();

      iframe = document.createElement('iframe');
      iframe.id = 'hall-ticket-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Admit Card - ${admitCardData?.student?.name || 'Candidate'}</title>
            ${styleLinks}
            <style>
              @page {
                size: A4 portrait;
                margin: 6mm 8mm;
              }
              *, *::before, *::after {
                box-sizing: border-box;
              }
              html, body {
                width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #FFFFFF !important;
                color: #000000 !important;
                font-family: "IBM Plex Serif", serif;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .printable-document {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
              }
            </style>
          </head>
          <body>
            <div class="printable-document p-0 bg-white text-black font-serif">
              ${printEl.innerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          iframe.remove();
        }, 1500);
      }, 350);
    } catch (err) {
      console.warn('Iframe print fallback to window.print:', err);
      window.print();
    }
  };

  // Direct download of the Admit Card as a standalone HTML file
  const handleDownloadHtml = () => {
    const printEl = document.getElementById('printable-admit-card');
    if (!printEl) return;

    const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => el.outerHTML)
      .join('\n');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Hall_Ticket_${admitCardData?.student?.rollNumber || 'AdmitCard'}.html</title>
    ${styleLinks}
    <style>
      @page { size: A4 portrait; margin: 6mm 8mm; }
      body { margin: 0; padding: 24px; font-family: "IBM Plex Serif", serif; background: #fff; color: #000; }
      .container { max-width: 820px; margin: 0 auto; }
    </style>
  </head>
  <body>
    <div class="container">
      ${printEl.innerHTML}
    </div>
  </body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Hall_Ticket_${admitCardData?.student?.rollNumber || 'AdmitCard'}.html`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Admit card file downloaded');
  };

  // Columns for Student-centric table (Unified Admit Cards)
  const studentColumns = [
    {
      header: 'Assigned Seat',
      accessor: 'seatNumber',
      render: (_, row) => (
        <span className="font-mono font-bold text-xs bg-ink-900/5 text-ink-900 border border-ink-900/20 px-2.5 py-1 rounded shadow-2xs">
          {row.seatNumber}
        </span>
      )
    },
    {
      header: 'Candidate (Student)',
      accessor: 'student',
      render: (_, row) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-text-900 text-sm">
            {row.student?.name}
          </div>
          <div className="flex items-center gap-2 text-xs text-text-500 font-mono">
            <span>{row.student?.instituteId}</span>
            <span>•</span>
            <span>Roll: {row.student?.rollNumber}</span>
            {row.student?.division?.name && (
              <>
                <span>•</span>
                <span>Div {row.student?.division?.name}</span>
              </>
            )}
          </div>
          <div className="text-[11px] text-text-400">
            {row.student?.department?.name || 'Department'}
          </div>
        </div>
      )
    },
    {
      header: 'Enrolled Examinations in Term',
      render: (_, row) => (
        <div className="space-y-1.5 max-w-[320px]">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-text-800">
              {row.exams.length} Subject Exam{row.exams.length > 1 ? 's' : ''} Scheduled
            </span>
            {row.hasBacklog && (
              <span className="text-[10px] bg-warning/15 text-warning font-semibold px-1.5 py-0.2 rounded border border-warning/30">
                Backlog Enrolled
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {row.exams.map((ex, i) => (
              <span
                key={i}
                className="text-[11px] font-mono bg-surface-100 text-text-700 px-1.5 py-0.5 rounded border border-border flex items-center gap-1"
                title={`${ex.subjectName} (${ex.examType})`}
              >
                <span className="font-bold text-brass-700">{ex.subjectCode}</span>
                <span className="text-text-400">•</span>
                <span className="text-[10px] text-text-500 uppercase">{ex.examType}</span>
              </span>
            ))}
          </div>
        </div>
      )
    },
    {
      header: 'Examination Center',
      accessor: 'examCenter',
      render: (_, row) => (
        <div className="text-xs text-text-700 max-w-[180px] truncate" title={row.examCenter}>
          <div className="flex items-center gap-1">
            <Building size={12} className="text-text-400 shrink-0" />
            <span className="truncate">{row.examCenter || 'Main Exam Center'}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openPrintModal(row)}
            className="flex items-center gap-1.5 bg-surface-0 hover:bg-brass-50 border-brass-400 text-brass-700 font-semibold shadow-2xs"
            title="Download & Print Unified A4 Admit Card (Single Page)"
          >
            <Printer size={14} />
            <span>Print Admit Card</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(row)}
            className="p-1.5 text-text-500 hover:text-text-800"
            title="Edit Seat Number or Center"
          >
            <Edit3 size={15} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDeleteDialog(row)}
            className="p-1.5 text-danger/70 hover:text-danger hover:bg-danger/10"
            title="Revoke Student Tickets"
          >
            <Trash2 size={15} />
          </Button>
        </div>
      )
    }
  ];

  // Columns for Individual Exam allocations
  const examColumns = [
    {
      header: 'Seat Number',
      accessor: 'seatNumber',
      render: (_, row) => (
        <span className="font-mono font-bold text-xs bg-ink-900/5 text-ink-900 border border-ink-900/20 px-2 py-0.5 rounded">
          {row.seatNumber}
        </span>
      )
    },
    {
      header: 'Candidate',
      accessor: 'student',
      render: (_, row) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-text-900 text-sm">{row.student?.name}</div>
          <div className="text-xs text-text-500 font-mono">{row.student?.instituteId} • Roll: {row.student?.rollNumber}</div>
        </div>
      )
    },
    {
      header: 'Course & Exam',
      accessor: 'exam',
      render: (_, row) => (
        <div className="space-y-0.5">
          <div className="font-medium text-text-900 text-sm">{row.exam?.subject?.name}</div>
          <div className="text-xs text-text-500 font-mono">
            {row.exam?.subject?.code} • {row.exam?.examType}
          </div>
        </div>
      )
    },
    {
      header: 'Schedule',
      render: (_, row) => {
        const d = row.exam?.examDate ? new Date(row.exam.examDate).toLocaleDateString('en-GB') : 'TBD';
        return (
          <div className="text-xs">
            <div className="font-medium text-text-800">{d}</div>
            <div className="text-text-400 font-mono">{row.exam?.startTime || '10:00 AM'}</div>
          </div>
        );
      }
    },
    {
      header: 'Attempt',
      render: (_, row) => {
        const att = row.enrollment?.attemptNumber || 1;
        return (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${att > 1 ? 'bg-warning/15 text-warning border-warning/30' : 'bg-success/15 text-success border-success/30'}`}>
            {att > 1 ? `Backlog (#${att})` : 'Regular (#1)'}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openPrintModal(row)}
            className="flex items-center gap-1 text-brass-700 border-brass-300 hover:bg-brass-50"
            title="Print Admit Card"
          >
            <Printer size={14} />
            <span>Print</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(row)}
            className="p-1.5 text-text-500 hover:text-text-800"
          >
            <Edit3 size={15} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDeleteDialog(row)}
            className="p-1.5 text-danger/70 hover:text-danger hover:bg-danger/10"
          >
            <Trash2 size={15} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <>
      {/* 1. Main Dashboard View (Cleanly hidden from any print output) */}
      <div className="space-y-6 no-print">
        {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-900 font-sans">
              Hall Tickets & Admit Cards
            </h1>
          </div>
          <p className="text-sm text-text-500 mt-1">
            Official Examination Admit Cards. All exams per student unified into a single printable A4 hall ticket.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs"
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setGenForm({
                academicTermId: selectedTermId || (terms.find(t => t.isCurrent)?.id) || '',
                examId: 'ALL_IN_TERM',
                examCenter: 'Main Campus Examination Hall, Room 101',
                seatPrefix: 'HALL-A-',
                startSequence: (studentCards.length + 1) || 1,
                attemptFilter: 'ALL'
              });
              setIsGenerateModalOpen(true);
            }}
            className="flex items-center gap-2 text-xs font-semibold"
          >
            <Plus size={16} />
            Generate Batch Tickets
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-0 border border-border rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-500 uppercase tracking-wider">Candidate Admit Cards</p>
            <h3 className="text-2xl font-bold text-text-900 mt-1">{loading ? '...' : stats.uniqueStudents}</h3>
            <p className="text-xs text-text-400 mt-0.5">Students with admit cards</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-brass-500/10 text-brass-600 flex items-center justify-center">
            <Users size={22} />
          </div>
        </div>

        <div className="bg-surface-0 border border-border rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-500 uppercase tracking-wider">Total Exam Seats</p>
            <h3 className="text-2xl font-bold text-text-900 mt-1">{loading ? '...' : stats.totalAllocations}</h3>
            <p className="text-xs text-text-400 mt-0.5">Across all examinations</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-info/10 text-info flex items-center justify-center">
            <FileText size={22} />
          </div>
        </div>

        <div className="bg-surface-0 border border-border rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-500 uppercase tracking-wider">Scheduled Exams</p>
            <h3 className="text-2xl font-bold text-text-900 mt-1">{loading ? '...' : stats.uniqueExams}</h3>
            <p className="text-xs text-text-400 mt-0.5">Covered courses</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-success/10 text-success flex items-center justify-center">
            <Calendar size={22} />
          </div>
        </div>

        <div className="bg-surface-0 border border-border rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-500 uppercase tracking-wider">Backlog Re-attempts</p>
            <h3 className="text-2xl font-bold text-text-900 mt-1">{loading ? '...' : stats.backlogCount}</h3>
            <p className="text-xs text-text-400 mt-0.5">Attempt &gt; 1 (Rule 18)</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
            <GraduationCap size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-surface-0 border border-border rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-surface-50 p-1 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setViewMode('BY_STUDENT')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'BY_STUDENT'
                  ? 'bg-surface-0 text-text-900 shadow-2xs border border-border'
                  : 'text-text-500 hover:text-text-800'
              }`}
            >
              <Users size={14} className={viewMode === 'BY_STUDENT' ? 'text-brass-600' : ''} />
              <span>Admit Cards by Student ({studentCards.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('BY_EXAM')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'BY_EXAM'
                  ? 'bg-surface-0 text-text-900 shadow-2xs border border-border'
                  : 'text-text-500 hover:text-text-800'
              }`}
            >
              <Layers size={14} className={viewMode === 'BY_EXAM' ? 'text-brass-600' : ''} />
              <span>All Exam Allocations ({filteredTickets.length})</span>
            </button>
          </div>

          {/* Quick Clear filters */}
          {(selectedExamId || selectedDeptId || selectedAttemptType !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedExamId('');
                setSelectedDeptId('');
                setSelectedAttemptType('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-brass-600 hover:text-brass-700 font-medium hover:underline"
            >
              Reset all filters
            </button>
          )}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-border/60">
          {/* Academic Term Filter */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-500 mb-1">
              Academic Term
            </label>
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="w-full text-xs rounded-lg border border-border bg-surface-50 px-3 py-2 text-text-800 focus:outline-none focus:border-brass-500"
            >
              <option value="">All Terms</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Filter */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-500 mb-1">
              Filter By Exam
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full text-xs rounded-lg border border-border bg-surface-50 px-3 py-2 text-text-800 focus:outline-none focus:border-brass-500"
            >
              <option value="">All Exams ({exams.length})</option>
              {exams.map(exam => (
                <option key={exam.id} value={exam.id}>
                  {exam.subject?.code} - {exam.subject?.name} ({exam.examType})
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-500 mb-1">
              Department
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full text-xs rounded-lg border border-border bg-surface-50 px-3 py-2 text-text-800 focus:outline-none focus:border-brass-500"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Attempt Filter */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-500 mb-1">
              Attempt Type
            </label>
            <select
              value={selectedAttemptType}
              onChange={(e) => setSelectedAttemptType(e.target.value)}
              className="w-full text-xs rounded-lg border border-border bg-surface-50 px-3 py-2 text-text-800 focus:outline-none focus:border-brass-500 font-medium"
            >
              <option value="ALL">All Enrolled</option>
              <option value="REGULAR">Regular (Attempt 1)</option>
              <option value="BACKLOG">Backlog (Attempt &gt; 1)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-surface-0 border border-border rounded-xl shadow-xs overflow-hidden">
        {viewMode === 'BY_STUDENT' ? (
          <DataTable
            columns={studentColumns}
            data={studentCards}
            loading={loading}
            emptyMessage="No candidate admit cards found. Use 'Generate Batch Tickets' to create hall tickets."
          />
        ) : (
          <DataTable
            columns={examColumns}
            data={filteredTickets}
            loading={loading}
            emptyMessage="No individual ticket allocations found."
          />
        )}
      </div>
    </div>

      {/* ============================================================== */}
      {/* MODAL 1: BATCH GENERATION MODAL                                */}
      {/* ============================================================== */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        title="Batch Generate Examination Hall Tickets"
      >
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="p-3 bg-brass-50/60 border border-brass-200 rounded-lg text-xs text-brass-900 flex items-start gap-2">
            <Info size={16} className="text-brass-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Unified Hall Ticket Model:</span> Each candidate receives one consistent seat number across all scheduled exams in the term. All scheduled subjects appear automatically on their single printable admit card.
            </div>
          </div>

          <Field label="Academic Term" required>
            <select
              value={genForm.academicTermId}
              onChange={(e) => setGenForm({ ...genForm, academicTermId: e.target.value })}
              className="w-full rounded-md border border-border bg-surface-50 px-3 py-2 text-sm text-text-900 focus:outline-none focus:border-brass-500"
              required
            >
              <option value="">-- Choose Academic Term --</option>
              {terms.map(term => (
                <option key={term.id} value={term.id}>
                  {term.name} {term.isCurrent ? '(Current Term)' : ''}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Target Examination Scope">
            <select
              value={genForm.examId}
              onChange={(e) => setGenForm({ ...genForm, examId: e.target.value })}
              className="w-full rounded-md border border-border bg-surface-50 px-3 py-2 text-sm text-text-900 focus:outline-none focus:border-brass-500"
            >
              <option value="ALL_IN_TERM">★ All Scheduled Exams in Term (Recommended)</option>
              {exams
                .filter(ex => !genForm.academicTermId || ex.academicTermId === genForm.academicTermId)
                .map(exam => (
                  <option key={exam.id} value={exam.id}>
                    {exam.subject?.code} - {exam.subject?.name} ({exam.examType})
                  </option>
                ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Seat Number Prefix" required>
              <input
                type="text"
                value={genForm.seatPrefix}
                onChange={(e) => setGenForm({ ...genForm, seatPrefix: e.target.value })}
                placeholder="HALL-A-"
                className="w-full rounded-md border border-border bg-surface-50 px-3 py-2 text-sm font-mono text-text-900 focus:outline-none focus:border-brass-500"
                required
              />
            </Field>

            <Field label="Starting Sequence Number" required>
              <input
                type="number"
                min="1"
                value={genForm.startSequence}
                onChange={(e) => setGenForm({ ...genForm, startSequence: parseInt(e.target.value) || 1 })}
                className="w-full rounded-md border border-border bg-surface-50 px-3 py-2 text-sm font-mono text-text-900 focus:outline-none focus:border-brass-500"
                required
              />
            </Field>
          </div>

          <Field label="Examination Center / Venue" required>
            <input
              type="text"
              value={genForm.examCenter}
              onChange={(e) => setGenForm({ ...genForm, examCenter: e.target.value })}
              placeholder="Main Examination Hall, Room 101"
              className="w-full rounded-md border border-border bg-surface-50 px-3 py-2 text-sm text-text-900 focus:outline-none focus:border-brass-500"
              required
            />
          </Field>

          <Field label="Attempt Scope Filter">
            <div className="grid grid-cols-3 gap-2 mt-1">
              <label className={`p-2 rounded-lg border text-xs cursor-pointer flex flex-col items-center justify-center text-center transition-all ${genForm.attemptFilter === 'ALL' ? 'border-brass-500 bg-brass-50/50 font-bold text-brass-900' : 'border-border bg-surface-50 text-text-700'}`}>
                <input
                  type="radio"
                  name="attemptFilter"
                  value="ALL"
                  checked={genForm.attemptFilter === 'ALL'}
                  onChange={() => setGenForm({ ...genForm, attemptFilter: 'ALL' })}
                  className="sr-only"
                />
                <span>All Enrolled</span>
              </label>

              <label className={`p-2 rounded-lg border text-xs cursor-pointer flex flex-col items-center justify-center text-center transition-all ${genForm.attemptFilter === 'REGULAR' ? 'border-brass-500 bg-brass-50/50 font-bold text-brass-900' : 'border-border bg-surface-50 text-text-700'}`}>
                <input
                  type="radio"
                  name="attemptFilter"
                  value="REGULAR"
                  checked={genForm.attemptFilter === 'REGULAR'}
                  onChange={() => setGenForm({ ...genForm, attemptFilter: 'REGULAR' })}
                  className="sr-only"
                />
                <span>Regular (Att. 1)</span>
              </label>

              <label className={`p-2 rounded-lg border text-xs cursor-pointer flex flex-col items-center justify-center text-center transition-all ${genForm.attemptFilter === 'BACKLOG' ? 'border-brass-500 bg-brass-50/50 font-bold text-brass-900' : 'border-border bg-surface-50 text-text-700'}`}>
                <input
                  type="radio"
                  name="attemptFilter"
                  value="BACKLOG"
                  checked={genForm.attemptFilter === 'BACKLOG'}
                  onChange={() => setGenForm({ ...genForm, attemptFilter: 'BACKLOG' })}
                  className="sr-only"
                />
                <span>Backlog (Att. &gt; 1)</span>
              </label>
            </div>
          </Field>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsGenerateModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
            >
              {submitting ? 'Generating...' : 'Generate Hall Tickets'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: EDIT SEAT / VENUE MODAL                               */}
      {/* ============================================================== */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Hall Ticket Allocation"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="p-3 bg-surface-50 border border-border rounded-lg text-xs space-y-1">
            <div className="font-semibold text-text-900">{selectedTicket?.student?.name} ({selectedTicket?.student?.instituteId})</div>
            <div className="text-text-500">Seat allocation will apply to candidate's admit card.</div>
          </div>

          <Field label="Assigned Seat Number" required>
            <input
              type="text"
              value={editForm.seatNumber}
              onChange={(e) => setEditForm({ ...editForm, seatNumber: e.target.value })}
              className="w-full rounded-md border border-border bg-surface-50 px-3 py-2 text-sm font-mono text-text-900 focus:outline-none focus:border-brass-500"
              required
            />
          </Field>

          <Field label="Exam Venue / Center" required>
            <input
              type="text"
              value={editForm.examCenter}
              onChange={(e) => setEditForm({ ...editForm, examCenter: e.target.value })}
              className="w-full rounded-md border border-border bg-surface-50 px-3 py-2 text-sm text-text-900 focus:outline-none focus:border-brass-500"
              required
            />
          </Field>

          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs text-text-700 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.applyToAllExams}
                onChange={(e) => setEditForm({ ...editForm, applyToAllExams: e.target.checked })}
                className="rounded border-border text-brass-600 focus:ring-brass-500"
              />
              <span>Apply this seat number to all exams for this candidate in the term</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: OFFICIAL PRINTABLE ADMIT CARD (A4 SINGLE-PAGE FIT)    */}
      {/* ============================================================== */}
      {isPrintModalOpen && admitCardData && (
        <div className="print-modal-overlay fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="print-modal-wrapper relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden">
            
            {/* Modal Controls Bar (Hidden during print) */}
            <div className="no-print bg-ink-900 text-white px-5 py-3 flex items-center justify-between border-b border-ink-700">
              <div className="flex items-center gap-2.5">
                <Printer size={18} className="text-brass-500" />
                <div>
                  <h3 className="font-semibold text-sm">Official Institutional Admit Card</h3>
                  <p className="text-[11px] text-white/70 font-mono">
                    {admitCardData.seatNumber} • {admitCardData.student?.instituteId} • {admitCardData.allExams?.length || 1} Exam(s)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 font-semibold text-xs shadow-sm bg-brass-500 hover:bg-brass-600"
                >
                  <Printer size={14} />
                  Print / Save as PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadHtml}
                  className="flex items-center gap-1.5 text-xs border-white/30 text-white hover:bg-white/10"
                  title="Download standalone offline admit card file"
                >
                  <Download size={13} />
                  Download HTML
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="text-xs border-white/20 text-white hover:bg-white/10"
                >
                  Close
                </Button>
              </div>
            </div>

            {/* Printable Document: Compact, Single-Page A4 Proportion with No Clipping */}
            <div id="printable-admit-card" className="printable-document p-5 sm:p-6 bg-white text-black font-serif">
              <div className="border-2 border-black p-3.5 sm:p-4 space-y-3.5">
                
                {/* 1. Institutional Header */}
                <div className="text-center border-b border-black pb-2.5 space-y-0.5">
                  <div className="text-[9px] uppercase tracking-wider font-mono text-gray-700 font-bold">
                    Autonomous Institute • Affiliated to Shivaji University
                  </div>
                  <h1 className="text-base sm:text-lg font-bold uppercase tracking-tight text-black font-serif leading-tight">
                    KOLHAPUR INSTITUTE OF TECHNOLOGY'S COLLEGE OF ENGINEERING (AUTONOMOUS)
                  </h1>
                  <h2 className="text-[11px] font-semibold tracking-wide text-black uppercase">
                    OFFICE OF THE CONTROLLER OF EXAMINATIONS
                  </h2>
                  <div className="pt-1">
                    <span className="inline-block px-3 py-0.5 border border-black font-mono font-bold text-xs tracking-wider uppercase bg-gray-100">
                      EXAMINATION HALL TICKET / ADMIT CARD
                    </span>
                  </div>
                  <div className="text-[10px] font-mono font-medium text-gray-800 pt-0.5">
                    ACADEMIC TERM: {admitCardData.academicTerm?.name?.toUpperCase() || 'CURRENT TERM'}
                  </div>
                </div>

                {/* 2. Candidate & Seat Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 border border-black p-2.5 bg-gray-50/50">
                  <div className="md:col-span-2 space-y-1 text-xs">
                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-sans font-semibold text-gray-700 text-[11px]">Candidate Name:</span>
                      <span className="col-span-2 font-serif font-bold text-xs sm:text-sm text-black uppercase">
                        {admitCardData.student?.name}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-sans font-semibold text-gray-700 text-[11px]">Permanent PRN / ID:</span>
                      <span className="col-span-2 font-mono font-bold text-xs text-black">
                        {admitCardData.student?.instituteId}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-sans font-semibold text-gray-700 text-[11px]">Roll No & Division:</span>
                      <span className="col-span-2 font-mono text-xs text-black">
                        {admitCardData.student?.rollNumber} • Div: {admitCardData.student?.division?.name || 'A'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-sans font-semibold text-gray-700 text-[11px]">Department / Program:</span>
                      <span className="col-span-2 font-serif text-[11px] text-black">
                        {admitCardData.student?.department?.name || 'Engineering'} ({admitCardData.student?.department?.code})
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-sans font-semibold text-gray-700 text-[11px]">Attempt Scope:</span>
                      <span className="col-span-2 font-mono font-bold text-[11px] text-black uppercase">
                        {admitCardData.allExams?.some(e => e.attemptNumber > 1) 
                          ? 'REGULAR & BACKLOG RE-ATTEMPT (RULE 18)' 
                          : 'REGULAR ENROLLED (ATTEMPT #1)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-sans font-semibold text-gray-700 text-[11px]">Examination Center:</span>
                      <span className="col-span-2 font-serif text-[11px] text-black font-medium">
                        {admitCardData.examCenter || 'Main Campus Examination Hall'}
                      </span>
                    </div>
                  </div>

                  {/* Seat Box & QR Code */}
                  <div className="flex flex-col items-center justify-between border-t md:border-t-0 md:border-l border-black pt-2 md:pt-0 md:pl-2.5 space-y-1.5">
                    <div className="w-full text-center p-1.5 border border-black bg-white">
                      <div className="text-[9px] font-sans font-semibold uppercase text-gray-600">Assigned Seat Number</div>
                      <div className="text-xl sm:text-2xl font-mono font-bold tracking-wider text-black">
                        {admitCardData.seatNumber}
                      </div>
                    </div>

                    <div className="w-16 h-16 border border-dashed border-black flex flex-col items-center justify-center text-center p-1 bg-white">
                      <QrCode size={28} className="text-black" />
                      <span className="text-[7px] font-mono leading-none mt-0.5">VERIFIED</span>
                    </div>
                  </div>
                </div>

                {/* 3. Examination Timetable Table (Lists ALL scheduled exams) */}
                <div className="space-y-1">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-black flex items-center justify-between">
                    <span>Scheduled Course Examinations ({admitCardData.allExams?.length || 1} Subject{admitCardData.allExams?.length > 1 ? 's' : ''})</span>
                    <span className="text-[9px] font-sans font-normal text-gray-600">All exams valid on single admit card</span>
                  </div>
                  <table className="w-full border-collapse border border-black text-[11px]">
                    <thead>
                      <tr className="bg-gray-100 border-b border-black font-sans">
                        <th className="border border-black px-2 py-1 text-center font-semibold w-20">Course Code</th>
                        <th className="border border-black px-2 py-1 text-left font-semibold">Course Title</th>
                        <th className="border border-black px-2 py-1 text-center font-semibold w-24">Exam Type</th>
                        <th className="border border-black px-2 py-1 text-center font-semibold w-24">Date</th>
                        <th className="border border-black px-2 py-1 text-center font-semibold w-36">Session / Time</th>
                        <th className="border border-black px-2 py-1 text-center font-semibold w-28">Invigilator Sign</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admitCardData.allExams && admitCardData.allExams.length > 0 ? (
                        admitCardData.allExams.map((ex, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="border border-black px-2 py-1 font-mono font-bold text-center">
                              {ex.subjectCode || ex.subject?.code}
                            </td>
                            <td className="border border-black px-2 py-1 font-serif">
                              {ex.subjectName || ex.subject?.name}
                              {ex.attemptNumber > 1 && (
                                <span className="ml-1.5 text-[9px] font-mono font-bold text-gray-700 uppercase bg-gray-200 px-1 py-0.2 rounded">
                                  Backlog (Att. #{ex.attemptNumber})
                                </span>
                              )}
                            </td>
                            <td className="border border-black px-2 py-1 font-mono text-center uppercase text-[10px]">
                              {ex.examType?.replace('_', ' ')}
                            </td>
                            <td className="border border-black px-2 py-1 font-mono text-center font-medium">
                              {ex.examDate 
                                ? new Date(ex.examDate).toLocaleDateString('en-GB') 
                                : 'DD/MM/YYYY'}
                            </td>
                            <td className="border border-black px-2 py-1 font-mono text-center text-[10px]">
                              {ex.startTime || (ex.examDate ? new Date(ex.examDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM')} ({ex.durationMinutes || 180} min)
                            </td>
                            <td className="border border-black px-2 py-1 text-center text-gray-400 font-serif italic text-xs">
                              ___________
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="border border-black px-2 py-2 text-center text-gray-500 italic">
                            No scheduled examinations found for this admit card.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 4. Compact Instructions */}
                <div className="border border-black p-2 bg-gray-50/30 text-[10px] space-y-0.5 leading-tight">
                  <div className="font-sans font-bold uppercase tracking-wide text-black text-[10px]">
                    Instructions for Candidate:
                  </div>
                  <ol className="list-decimal pl-4 space-y-0.5 font-serif text-gray-800 text-[9.5px]">
                    <li>Candidate must occupy their assigned seat at least 20 minutes before the scheduled exam start time.</li>
                    <li>College Photo ID Card and this printed Hall Ticket are mandatory for entry into the examination hall.</li>
                    <li>Electronic devices including smartwatches, mobile phones, and programmable calculators are strictly prohibited.</li>
                    <li>This hall ticket is valid for all enrolled subjects listed in the timetable above during this academic term.</li>
                  </ol>
                </div>

                {/* 5. Triple Signature Row */}
                <div className="pt-4 grid grid-cols-3 gap-6 text-center text-[11px]">
                  <div className="space-y-0.5">
                    <div className="border-t border-black pt-1 font-serif">
                      Candidate's Signature
                    </div>
                    <div className="text-[9px] font-sans text-gray-600">(Sign in supervisor's presence)</div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="border-t border-black pt-1 font-serif">
                      Junior Supervisor's Signature
                    </div>
                    <div className="text-[9px] font-sans text-gray-600">(Verified candidate identity)</div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="border-t border-black pt-1 font-serif font-bold">
                      Controller of Examinations
                    </div>
                    <div className="text-[9px] font-mono text-gray-600">KIT Autonomous Kolhapur</div>
                  </div>
                </div>

                {/* 6. Footer verification line */}
                <div className="border-t border-black/30 pt-1.5 flex items-center justify-between text-[8.5px] font-mono text-gray-600">
                  <span>REF: NEXUS-HT-{admitCardData.student?.instituteId}-{admitCardData.seatNumber}</span>
                  <span>ISSUED: {new Date(admitCardData.generatedAt || Date.now()).toLocaleString()}</span>
                  <span>PAGE 1 OF 1 (A4)</span>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Delete / Revoke Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Revoke Hall Ticket"
        message={`Are you sure you want to revoke the hall ticket allocation for candidate "${selectedTicket?.student?.name}"? The candidate will no longer be permitted to take examinations until re-issued.`}
        confirmText="Revoke Allocation"
        variant="danger"
      />
    </>
  );
}
