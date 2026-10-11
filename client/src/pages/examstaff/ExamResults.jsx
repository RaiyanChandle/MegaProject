import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import { toast } from '../../components/ui/Toast';
import { 
  FileCheck, 
  Search, 
  Filter, 
  Save, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Layers, 
  Calendar,
  Building,
  GraduationCap,
  Sparkles,
  Link2,
  RefreshCw
} from 'lucide-react';
import { Download } from 'lucide-react';
import { useSearch } from '../../context/SearchContext';

export default function ExamResults() {
  const { searchQuery, setSearchQuery } = useSearch();

  const [exams, setExams] = useState([]);
  const [terms, setTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  
  // Data for active exam results
  const [examData, setExamData] = useState(null);
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [marksState, setMarksState] = useState({}); // { [enrollmentId]: marksValue }
  
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL', 'ENTERED', 'PENDING', 'PASS', 'FAIL'

  // Fetch exams and academic terms
  useEffect(() => {
    const fetchExamsAndTerms = async () => {
      try {
        setLoadingExams(true);
        const [examsData, termsData] = await Promise.all([
          apiClient.get('/exams'),
          apiClient.get('/academic-terms')
        ]);

        setExams(examsData || []);
        setTerms(termsData || []);

        const currentTerm = (termsData || []).find(t => t.isCurrent);
        if (currentTerm) {
          setSelectedTermId(currentTerm.id);
        }

        if (examsData && examsData.length > 0) {
          setSelectedExamId(examsData[0].id);
        }
      } catch (err) {
        console.error('Error fetching exams list:', err);
        toast.error('Failed to load examinations');
      } finally {
        setLoadingExams(false);
      }
    };

    fetchExamsAndTerms();
  }, []);

  // Fetch results sheet when selectedExamId changes
  const fetchResultsSheet = async (examId) => {
    if (!examId) return;
    try {
      setLoadingSheet(true);
      const res = await apiClient.get(`/exams/${examId}/results`);
      setExamData(res.exam);
      setSummary(res.summary);
      setStudents(res.students || []);

      // Populate input state
      const initialMarks = {};
      (res.students || []).forEach(s => {
        initialMarks[s.enrollmentId] = s.marksObtained !== null && s.marksObtained !== undefined ? String(s.marksObtained) : '';
      });
      setMarksState(initialMarks);
    } catch (err) {
      console.error('Error fetching exam results sheet:', err);
      toast.error('Failed to load candidate list for this exam');
    } finally {
      setLoadingSheet(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      fetchResultsSheet(selectedExamId);
    }
  }, [selectedExamId]);

  // Handle single candidate input change
  const handleMarkChange = (enrollmentId, val) => {
    setMarksState(prev => ({
      ...prev,
      [enrollmentId]: val
    }));
  };

  // Filter exams by selected academic term
  const filteredExams = useMemo(() => {
    if (!selectedTermId) return exams;
    return exams.filter(e => e.academicTermId === selectedTermId);
  }, [exams, selectedTermId]);

  // Compute live statistics based on current inputs
  const liveStats = useMemo(() => {
    if (!examData) return { total: 0, entered: 0, passed: 0, failed: 0, pending: 0 };
    const passingThreshold = Number(examData.passingMarks) || 0;
    
    let entered = 0;
    let passed = 0;
    let failed = 0;

    Object.values(marksState).forEach(val => {
      if (val !== '' && val !== null && val !== undefined) {
        const num = Number(val);
        if (!isNaN(num)) {
          entered++;
          if (num >= passingThreshold) passed++;
          else failed++;
        }
      }
    });

    const total = students.length;
    return {
      total,
      entered,
      passed,
      failed,
      pending: total - entered
    };
  }, [students, marksState, examData]);

  // Filter student rows
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const currentVal = marksState[s.enrollmentId];
      const hasMarks = currentVal !== '' && currentVal !== null && currentVal !== undefined;
      const numVal = hasMarks ? Number(currentVal) : null;
      const passing = examData ? Number(examData.passingMarks) : 0;
      const isPassing = hasMarks && !isNaN(numVal) && numVal >= passing;

      if (filterStatus === 'ENTERED' && !hasMarks) return false;
      if (filterStatus === 'PENDING' && hasMarks) return false;
      if (filterStatus === 'PASS' && (!hasMarks || !isPassing)) return false;
      if (filterStatus === 'FAIL' && (!hasMarks || isPassing)) return false;

      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = s.student?.name?.toLowerCase() || '';
        const roll = s.student?.rollNumber?.toLowerCase() || '';
        const instId = s.student?.instituteId?.toLowerCase() || '';
        const seat = s.seatNumber?.toLowerCase() || '';
        if (!name.includes(q) && !roll.includes(q) && !instId.includes(q) && !seat.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [students, marksState, filterStatus, searchQuery, examData]);

  // Save all results in bulk
  const handleSaveResults = async () => {
    if (!selectedExamId || !examData) return;

    // Validate marks values
    const max = Number(examData.maxMarks);
    const payload = [];

    for (const [enrollmentId, val] of Object.entries(marksState)) {
      if (val !== '' && val !== null && val !== undefined) {
        const num = Number(val);
        if (isNaN(num) || num < 0) {
          toast.error('Marks cannot be negative or invalid');
          return;
        }
        if (num > max) {
          toast.error(`Marks (${num}) exceed exam maximum marks (${max})`);
          return;
        }
        payload.push({ enrollmentId, marksObtained: num });
      } else {
        payload.push({ enrollmentId, marksObtained: null });
      }
    }

    if (payload.length === 0) {
      toast.error('No results to save');
      return;
    }

    try {
      setSaving(true);
      const res = await apiClient.post(`/exams/${selectedExamId}/results`, { results: payload });
      toast.success(res.message || 'Exam results saved successfully');
      fetchResultsSheet(selectedExamId);
    } catch (err) {
      console.error('Error saving exam results:', err);
      toast.error(err.response?.data?.error || 'Failed to save exam results');
    } finally {
      setSaving(false);
    }
  };

  // Quick fill helper
  const handleQuickFillPassing = () => {
    if (!examData) return;
    const passMarks = String(examData.passingMarks);
    const updated = { ...marksState };
    students.forEach(s => {
      if (updated[s.enrollmentId] === '' || updated[s.enrollmentId] === null) {
        updated[s.enrollmentId] = passMarks;
      }
    });
    setMarksState(updated);
    toast.info('Filled empty marks with passing threshold');
  };

  // Export official Marks Sheet with College Header
  const handleExportMarksSheet = () => {
    if (!examData || students.length === 0) {
      toast.error('No exam marks data to export');
      return;
    }
    const maxMarks = Number(examData.maxMarks || 100);
    const passMarks = Number(examData.passingMarks || 40);

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Marks_Sheet_${examData.subject?.code}_${examData.examType}.html</title>
    <style>
      @page { size: A4 portrait; margin: 8mm; }
      * { box-sizing: border-box; }
      body { font-family: "IBM Plex Serif", Georgia, serif; font-size: 11px; color: #000; background: #fff; margin: 0; padding: 15px; }
      .header-box { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
      .inst-sub { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #475569; }
      .inst-title { font-size: 16px; font-weight: bold; text-transform: uppercase; margin: 3px 0; }
      .inst-meta { font-size: 9px; color: #334155; }
      .exam-office { font-size: 11px; font-weight: bold; text-transform: uppercase; margin-top: 4px; }
      .doc-badge { display: inline-block; padding: 2px 12px; border: 1px solid #000; font-family: monospace; font-size: 11px; font-weight: bold; background: #f1f5f9; margin-top: 4px; }
      .info-bar { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; border: 1px solid #000; padding: 6px 10px; background: #f8fafc; font-size: 11px; margin-bottom: 12px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px; }
      th, td { border: 1px solid #000; padding: 5px 6px; text-align: center; }
      th { background: #f1f5f9; font-weight: bold; }
      td.left { text-align: left; }
      .pass { color: #15803d; font-weight: bold; }
      .fail { color: #b91c1c; font-weight: bold; }
      .pending { color: #b45309; font-weight: bold; }
      .stats-box { border: 1px solid #000; padding: 8px; background: #f8fafc; display: flex; justify-content: space-around; margin-bottom: 20px; font-size: 11px; }
      .sig-row { display: flex; justify-content: space-between; margin-top: 35px; text-align: center; }
      .sig-item { min-width: 140px; border-top: 1px solid #000; padding-top: 4px; font-size: 10px; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="header-box">
      <div class="inst-sub">Autonomous Institute • Affiliated to Shivaji University, Kolhapur</div>
      <div class="inst-title">KOLHAPUR INSTITUTE OF TECHNOLOGY'S COLLEGE OF ENGINEERING (AUTONOMOUS)</div>
      <div class="inst-meta">Approved by AICTE New Delhi • Recognized by Govt. of Maharashtra • Accredited by NAAC with 'A+' Grade</div>
      <div class="inst-meta">Gokul Shirgaon, Kolhapur - 416234, Maharashtra | Web: www.kitcoek.in</div>
      <div class="exam-office">OFFICE OF THE CONTROLLER OF EXAMINATIONS</div>
      <div class="doc-badge">${examData.examType} EXAMINATION MARKS ENTRY SHEET</div>
    </div>

    <div class="info-bar">
      <div><strong>Course:</strong> ${examData.subject?.code} - ${examData.subject?.name}</div>
      <div><strong>Examination:</strong> ${examData.examType} Exam (${examData.class?.name || 'Class'})</div>
      <div><strong>Max Marks:</strong> ${maxMarks} | <strong>Passing Threshold:</strong> ${passMarks}</div>
      <div><strong>Date of Export:</strong> ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 30px;">#</th>
          <th style="width: 70px;">Seat No</th>
          <th style="width: 80px;">Roll No</th>
          <th style="width: 100px;">PRN</th>
          <th>Candidate Name</th>
          <th style="width: 80px;">Marks (${maxMarks})</th>
          <th style="width: 80px;">Percentage</th>
          <th style="width: 70px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${students.map((s, idx) => {
          const val = marksState[s.enrollmentId];
          const hasMark = val !== '' && val !== null && val !== undefined;
          const markNum = hasMark ? Math.min(Number(val), maxMarks) : null;
          const rawPct = hasMark && maxMarks > 0 ? (markNum / maxMarks) * 100 : null;
          const pct = rawPct != null ? Math.min(100, Math.max(0, rawPct)).toFixed(1) : null;
          const isPass = hasMark ? markNum >= passMarks : null;
          return `
            <tr>
              <td>${idx + 1}</td>
              <td style="font-family: monospace; font-weight: bold;">${s.seatNumber || '—'}</td>
              <td style="font-family: monospace;">${s.student?.rollNumber || '—'}</td>
              <td style="font-family: monospace;">${s.student?.instituteId || '—'}</td>
              <td class="left"><strong>${s.student?.name || '—'}</strong></td>
              <td style="font-weight: bold;">${hasMark ? markNum : '—'}</td>
              <td style="font-family: monospace;">${pct != null ? `${pct}%` : '—'}</td>
              <td class="${isPass === true ? 'pass' : isPass === false ? 'fail' : 'pending'}">
                ${hasMark ? (isPass ? 'PASS' : 'FAIL') : 'PENDING'}
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <div class="stats-box">
      <div>Total Candidates: <strong>${students.length}</strong></div>
      <div>Marks Entered: <strong>${liveStats.entered} / ${liveStats.total}</strong></div>
      <div>Passed: <strong>${liveStats.passed}</strong></div>
      <div>Failed: <strong>${liveStats.failed}</strong></div>
      <div>Pass Rate: <strong>${liveStats.passRate}%</strong></div>
    </div>

    <div class="sig-row">
      <div class="sig-item">Examiner / Evaluator</div>
      <div class="sig-item">Scrutiny Officer</div>
      <div class="sig-item">Controller of Examinations<br><span style="font-weight: normal; font-size: 9px;">KITCoEK Autonomous</span></div>
    </div>
  </body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Exam_Marks_${examData.subject?.code}_${examData.examType}.html`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Official Exam Marks Sheet exported');
  };

  const columns = [
    {
      header: 'Assigned Seat',
      accessor: 'seatNumber',
      render: (_, row) => (
        <span className="font-mono font-bold text-xs bg-ink-900/5 text-ink-900 border border-ink-900/20 px-2 py-0.5 rounded">
          {row.seatNumber || '—'}
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
        </div>
      )
    },
    {
      header: 'Attempt Scope',
      render: (_, row) => {
        const att = row.attemptNumber || 1;
        return att > 1 ? (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded border bg-warning/15 text-warning border-warning/30">
            Backlog (Att. #{att})
          </span>
        ) : (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded border bg-surface-100 text-text-700 border-border">
            Regular (Att. #1)
          </span>
        );
      }
    },
    {
      header: `Marks Obtained (Max: ${examData?.maxMarks || 100})`,
      render: (_, row) => {
        const val = marksState[row.enrollmentId] ?? '';
        const num = val !== '' ? Number(val) : null;
        const max = Number(examData?.maxMarks) || 100;
        const isExceeded = num !== null && num > max;

        return (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max={max}
              step="0.5"
              value={val}
              onChange={(e) => handleMarkChange(row.enrollmentId, e.target.value)}
              placeholder="0"
              className={`w-24 text-center font-mono font-bold text-sm px-2.5 py-1.5 rounded-lg border focus:outline-none focus:ring-2 transition-all ${
                isExceeded
                  ? 'border-danger bg-danger/10 text-danger focus:ring-danger/30'
                  : 'border-border bg-surface-50 text-text-900 focus:border-brass-500 focus:ring-brass-500/20'
              }`}
            />
            <span className="text-xs text-text-400 font-mono">/ {max}</span>
          </div>
        );
      }
    },
    {
      header: `Status (Passing: ${examData?.passingMarks || 40})`,
      render: (_, row) => {
        const val = marksState[row.enrollmentId];
        if (val === '' || val === null || val === undefined) {
          return (
            <span className="inline-flex items-center gap-1 text-xs text-text-400 italic">
              <Clock size={13} />
              Pending
            </span>
          );
        }

        const num = Number(val);
        const passingThreshold = Number(examData?.passingMarks) || 0;
        const passed = !isNaN(num) && num >= passingThreshold;

        return passed ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success/15 text-success border border-success/30">
            <CheckCircle size={13} />
            PASS
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-danger/15 text-danger border border-danger/30">
            <XCircle size={13} />
            FAIL
          </span>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-900 font-sans">
            Examination Results & Mark Entry
          </h1>
          <p className="text-sm text-text-500 mt-1">
            Bulk record examination marks. System automatically computes Pass/Fail based on passing thresholds and syncs mapped assessment components.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchResultsSheet(selectedExamId)}
            disabled={loadingSheet}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw size={14} className={loadingSheet ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveResults}
            disabled={saving || loadingSheet || !examData}
            className="flex items-center gap-2 text-xs font-semibold shadow-sm"
          >
            <Save size={15} />
            {saving ? 'Saving Results...' : 'Save & Sync Results'}
          </Button>
        </div>
      </div>

      {/* Selector & Config Banner */}
      <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Term selector */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-500 mb-1">
              Academic Term
            </label>
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="w-full text-xs rounded-lg border border-border bg-surface-50 px-3 py-2 text-text-800 focus:outline-none focus:border-brass-500 font-medium"
            >
              <option value="">All Academic Terms</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.isCurrent ? '(Current Term)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Exam selector */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-500 mb-1">
              Select Examination
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full text-xs rounded-lg border border-border bg-surface-50 px-3 py-2 text-text-800 focus:outline-none focus:border-brass-500 font-semibold"
            >
              {filteredExams.map(ex => (
                <option key={ex.id} value={ex.id}>
                  {ex.subject?.code} - {ex.subject?.name} • {ex.examType} • Max: {ex.maxMarks} / Pass: {ex.passingMarks}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Exam Information Bar */}
        {examData && (
          <div className="pt-4 border-t border-border/70 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-text-400">Course:</span>
                <span className="font-semibold text-text-900 font-mono">{examData.subject?.code}</span>
                <span className="text-text-700 font-medium">{examData.subject?.name}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-text-400">Passing Threshold:</span>
                <span className="font-bold font-mono text-ink-900 bg-surface-100 px-2 py-0.5 rounded border border-border">
                  {examData.passingMarks} / {examData.maxMarks} Marks
                </span>
              </div>

              {examData.assessmentComponent ? (
                <div className="flex items-center gap-1.5 text-success bg-success/10 px-2.5 py-0.5 rounded-full border border-success/20">
                  <Link2 size={13} />
                  <span>Mapped to Component: <strong>{examData.assessmentComponent.name}</strong></span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-text-500 bg-surface-100 px-2.5 py-0.5 rounded-full border border-border">
                  <span>Standalone Exam</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleQuickFillPassing}
              className="text-brass-600 hover:text-brass-700 font-medium hover:underline text-xs flex items-center gap-1"
            >
              <Sparkles size={13} />
              Auto-fill remaining with Passing marks
            </button>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface-0 border border-border rounded-xl p-4 shadow-xs">
          <p className="text-xs font-medium text-text-500 uppercase tracking-wider">Total Enrolled</p>
          <h3 className="text-2xl font-bold text-text-900 mt-1">{liveStats.total}</h3>
          <p className="text-xs text-text-400 mt-0.5">Candidates</p>
        </div>

        <div className="bg-surface-0 border border-border rounded-xl p-4 shadow-xs">
          <p className="text-xs font-medium text-text-500 uppercase tracking-wider">Marks Entered</p>
          <h3 className="text-2xl font-bold text-info mt-1">
            {liveStats.entered} <span className="text-sm font-normal text-text-400">/ {liveStats.total}</span>
          </h3>
          <p className="text-xs text-text-400 mt-0.5">{liveStats.pending} remaining</p>
        </div>

        <div className="bg-surface-0 border border-border rounded-xl p-4 shadow-xs">
          <p className="text-xs font-medium text-text-500 uppercase tracking-wider">Passed</p>
          <h3 className="text-2xl font-bold text-success mt-1">{liveStats.passed}</h3>
          <p className="text-xs text-text-400 mt-0.5">
            {liveStats.entered > 0 ? `${Math.round((liveStats.passed / liveStats.entered) * 100)}% pass rate` : 'No entries yet'}
          </p>
        </div>

        <div className="bg-surface-0 border border-border rounded-xl p-4 shadow-xs">
          <p className="text-xs font-medium text-text-500 uppercase tracking-wider">Failed</p>
          <h3 className="text-2xl font-bold text-danger mt-1">{liveStats.failed}</h3>
          <p className="text-xs text-text-400 mt-0.5">Below passing threshold</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-surface-0 border border-border rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-surface-50 p-1 rounded-lg border border-border text-xs">
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1 rounded font-semibold transition-all ${
              filterStatus === 'ALL' ? 'bg-surface-0 text-text-900 shadow-2xs' : 'text-text-500 hover:text-text-800'
            }`}
          >
            All Candidates ({students.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('ENTERED')}
            className={`px-3 py-1 rounded font-semibold transition-all ${
              filterStatus === 'ENTERED' ? 'bg-surface-0 text-text-900 shadow-2xs' : 'text-text-500 hover:text-text-800'
            }`}
          >
            Entered ({liveStats.entered})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('PENDING')}
            className={`px-3 py-1 rounded font-semibold transition-all ${
              filterStatus === 'PENDING' ? 'bg-surface-0 text-text-900 shadow-2xs' : 'text-text-500 hover:text-text-800'
            }`}
          >
            Pending ({liveStats.pending})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('PASS')}
            className={`px-3 py-1 rounded font-semibold transition-all ${
              filterStatus === 'PASS' ? 'bg-surface-0 text-success shadow-2xs' : 'text-text-500 hover:text-text-800'
            }`}
          >
            Passing ({liveStats.passed})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('FAIL')}
            className={`px-3 py-1 rounded font-semibold transition-all ${
              filterStatus === 'FAIL' ? 'bg-surface-0 text-danger shadow-2xs' : 'text-text-500 hover:text-text-800'
            }`}
          >
            Failing ({liveStats.failed})
          </button>
        </div>

        <div className="text-xs text-text-500">
          Showing <span className="font-semibold text-text-900">{filteredStudents.length}</span> students
        </div>
      </div>

      {/* Main Entry Sheet Table */}
      <div className="bg-surface-0 border border-border rounded-xl shadow-xs overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredStudents}
          loading={loadingSheet}
          emptyMessage="No candidates found for this exam. Enroll students or adjust filters above."
        />
      </div>

      {/* Bottom Save Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-surface-0 border border-border rounded-xl shadow-xs">
        <div className="text-xs text-text-500 flex items-center gap-2">
          <Info size={14} className="text-brass-600" />
          <span>Clicking <strong>Save & Sync Results</strong> updates official result records and syncs component assessments.</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportMarksSheet}
            disabled={loadingSheet || !examData || students.length === 0}
            className="flex items-center gap-2 text-xs font-semibold"
          >
            <Download size={14} />
            Export Marks Sheet
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveResults}
            disabled={saving || loadingSheet || !examData}
            className="flex items-center gap-2 text-xs font-semibold"
          >
            <Save size={15} />
            {saving ? 'Saving...' : 'Save & Sync Results'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Info({ size, className }) {
  return <AlertCircle size={size} className={className} />;
}
