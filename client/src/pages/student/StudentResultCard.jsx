import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import { toast } from '../../components/ui/Toast';
import {
  Award,
  GraduationCap,
  BarChart2,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  Printer,
  Download,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Info,
  Star,
  TrendingUp,
  Calendar,
  FileCheck,
  Building,
  ShieldCheck,
  Eye,
  LayoutDashboard,
  Layers,
  AlertTriangle
} from 'lucide-react';

// Helper to ensure percentage never exceeds 100% on real or displayed data
const clampPercentage = (val) => {
  if (val === null || val === undefined || isNaN(val)) return null;
  return Number(Math.min(100, Math.max(0, Number(val))).toFixed(2));
};

const getGradeColor = (grade) => {
  if (!grade) return 'text-text-400';
  if (['O', 'A+', 'A'].includes(grade)) return 'text-emerald-400';
  if (['B+', 'B'].includes(grade)) return 'text-sky-400';
  if (grade === 'C') return 'text-amber-400';
  return 'text-red-400';
};

const getGradeBg = (grade) => {
  if (!grade) return 'bg-white/5';
  if (['O', 'A+', 'A'].includes(grade)) return 'bg-emerald-500/10 border-emerald-500/20';
  if (['B+', 'B'].includes(grade)) return 'bg-sky-500/10 border-sky-500/20';
  if (grade === 'C') return 'bg-amber-500/10 border-amber-500/20';
  return 'bg-red-500/10 border-red-500/20';
};

const getPercentageColor = (pct) => {
  if (pct == null) return '#6b7280';
  if (pct >= 75) return '#10b981';
  if (pct >= 60) return '#38bdf8';
  if (pct >= 40) return '#f59e0b';
  return '#ef4444';
};

// College Seal Logo SVG
export const CollegeSealLogo = ({ size = 68, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" stroke="#1e293b" strokeWidth="2.5" fill="#ffffff" />
    <circle cx="50" cy="50" r="44" stroke="#b45309" strokeWidth="1" strokeDasharray="2 2" />
    <path d="M50 18 L73 28 V48 C73 63 50 78 50 78 C50 78 27 63 27 48 V28 Z" fill="#1e3a8a" stroke="#d97706" strokeWidth="1.5" />
    <path d="M37 50 C41 47 47 47 50 49 C53 47 59 47 63 50 V61 C59 58 53 58 50 60 C47 58 41 58 37 61 Z" fill="#ffffff" />
    <line x1="50" y1="49" x2="50" y2="60" stroke="#1e3a8a" strokeWidth="1" />
    <polygon points="50,31 63,37 50,43 37,37" fill="#f59e0b" />
    <polygon points="50,43 50,47 57,45 57,39" fill="#d97706" />
    <path d="M25 48 C23 60 31 70 41 74" stroke="#d97706" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <path d="M75 48 C77 60 69 70 59 74" stroke="#d97706" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <text x="50" y="88" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#1e293b" fontFamily="serif">ESTD. 1983</text>
  </svg>
);

// Exam Controller Seal SVG
export const ExamControllerSeal = ({ size = 72 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="46" stroke="#1e3a8a" strokeWidth="2" strokeDasharray="3 2" />
    <circle cx="50" cy="50" r="40" stroke="#1e3a8a" strokeWidth="1.5" />
    <circle cx="50" cy="50" r="28" stroke="#1e3a8a" strokeWidth="1" strokeDasharray="2 1" />
    <polygon points="50,36 53,43 60,44 55,49 56,56 50,53 44,56 45,49 40,44 47,43" fill="#1e3a8a" opacity="0.8" />
    <text x="50" y="65" textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="#1e3a8a" fontFamily="sans-serif">AUTONOMOUS</text>
    <text x="50" y="72" textAnchor="middle" fontSize="5" fill="#1e3a8a" fontFamily="sans-serif">EXAM CELL</text>
  </svg>
);

const CircularProgress = ({ value, max = 100, size = 80, strokeWidth = 7, label, sublabel, color }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedVal = Math.min(Math.max(Number(value || 0), 0), max);
  const pct = max > 0 ? (clampedVal / max) * 100 : 0;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={color || '#818cf8'}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-text-100" style={{ lineHeight: 1 }}>{label}</span>
          {sublabel && <span className="text-xs text-text-400 mt-0.5">{sublabel}</span>}
        </div>
      </div>
    </div>
  );
};

export default function StudentResultCard() {
  const { user } = useAuth();

  const [terms, setTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('MIDTERM');
  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [viewMode, setViewMode] = useState('analytics'); // 'analytics' | 'document'

  // Load terms initially
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const termsData = await apiClient.get('/academic-terms');
        setTerms(termsData || []);
        const current = (termsData || []).find(t => t.isCurrent);
        const termId = current ? current.id : (termsData?.[0]?.id || '');
        setSelectedTermId(termId);
      } catch (err) {
        toast.error('Failed to load academic terms');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Fetch result card when term or examType changes
  useEffect(() => {
    if (!selectedTermId) return;
    fetchResult(selectedTermId, selectedExamType);
  }, [selectedTermId, selectedExamType]);

  const fetchResult = async (termId, examType) => {
    try {
      setFetching(true);
      setErrorMsg(null);
      setResultData(null);
      const params = new URLSearchParams();
      if (termId) params.append('academicTermId', termId);
      if (examType) params.append('examType', examType);

      const data = await apiClient.get(`/results/my-result?${params.toString()}`);
      setResultData(data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Result not available for this semester and exam series.';
      setErrorMsg(msg);
    } finally {
      setFetching(false);
    }
  };

  const computed = resultData?.computed;
  const student = resultData?.student;
  const term = resultData?.academicTerm;
  const persisted = resultData?.persistedCard;
  const currentExamType = resultData?.examType || selectedExamType;
  const institute = resultData?.institute || {
    name: "KOLHAPUR INSTITUTE OF TECHNOLOGY'S COLLEGE OF ENGINEERING (AUTONOMOUS)",
    affiliation: "An Autonomous Institute Permanently Affiliated to Shivaji University, Kolhapur",
    accreditation: "Approved by AICTE New Delhi • Recognized by Govt. of Maharashtra • Accredited by NAAC with 'A+' Grade",
    address: "Gokul Shirgaon, Kolhapur - 416234, Maharashtra, India",
    examOffice: "OFFICE OF THE CONTROLLER OF EXAMINATIONS",
    documentTitle: `${currentExamType} STATEMENT OF GRADES & MARKS / ${currentExamType} GRADE REPORT`
  };

  // Safe percentage calculation capped at 100%
  const safePercentage = clampPercentage(computed?.percentage);
  const safeGrandTotalMarks = computed?.totalMarks != null ? Math.min(computed.totalMarks, computed.maxMarks || computed.totalMarks) : null;

  // Total Credit Points: sum of (credits * gradePoint)
  const totalCreditPoints = computed?.subjectBreakdown
    ? computed.subjectBreakdown.reduce((sum, s) => sum + (s.creditPoints || (s.credits * (s.gradePoint || 0))), 0)
    : 0;

  // Reliable Iframe Print handler with official College Header
  const handlePrint = () => {
    const printEl = document.getElementById('official-marksheet-printable');
    if (!printEl) {
      toast.error('Printable marksheet is not ready');
      return;
    }

    try {
      const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(el => el.outerHTML)
        .join('\n');

      let iframe = document.getElementById('student-result-print-frame');
      if (iframe) iframe.remove();

      iframe = document.createElement('iframe');
      iframe.id = 'student-result-print-frame';
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
            <title>${currentExamType}_Result_${student?.rollNumber || student?.instituteId || 'Student'}_${term?.name || 'Term'}</title>
            ${styleLinks}
            <style>
              @page {
                size: A4 portrait;
                margin: 7mm 8mm;
              }
              *, *::before, *::after {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              html, body {
                width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #FFFFFF !important;
                color: #000000 !important;
                font-family: "IBM Plex Serif", Georgia, serif;
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
            <div class="printable-document bg-white text-black font-serif">
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

  // Standalone HTML Download with complete College Header
  const handleDownloadHtml = () => {
    const printEl = document.getElementById('official-marksheet-printable');
    if (!printEl) return;

    const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => el.outerHTML)
      .join('\n');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${currentExamType}_Grade_Card_${student?.rollNumber || student?.instituteId || 'Student'}.html</title>
    ${styleLinks}
    <style>
      @page { size: A4 portrait; margin: 7mm 8mm; }
      body { margin: 0; padding: 20px; font-family: "IBM Plex Serif", Georgia, serif; background: #f8fafc; color: #000; }
      .container { max-width: 840px; margin: 0 auto; background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }
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
    link.download = `${currentExamType}_Result_Card_${student?.rollNumber || student?.instituteId || 'Student'}_${term?.name || 'Term'}.html`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${currentExamType} Result Card downloaded successfully`);
  };

  const isLoading = loading || fetching;
  const hasPendingSubjects = computed?.pendingSubjects && computed.pendingSubjects.length > 0;

  return (
    <div className="space-y-6">
      {/* 1. Page Header with Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-text-900 font-sans">
                {currentExamType} Result Card
              </h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-semibold">
                Autonomous CBCS • {currentExamType}
              </span>
            </div>
            <p className="text-sm text-text-500 mt-0.5">
              Official grade statement, marks breakdown, and SGPA report for {currentExamType} examination
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Exam Type Selector (Midterm, Final, Internal) */}
          <div className="flex items-center gap-1.5 bg-surface-50 border border-border rounded-lg px-2 py-1 shadow-xs">
            <span className="text-xs font-semibold text-text-500">Exam:</span>
            <select
              value={selectedExamType}
              onChange={e => setSelectedExamType(e.target.value)}
              className="bg-transparent text-text-900 text-sm font-bold focus:outline-none cursor-pointer"
            >
              <option value="MIDTERM">Midterm Exam</option>
              <option value="FINAL">Final Exam</option>
              <option value="INTERNAL">Internal Exam</option>
            </select>
          </div>

          {/* Term Selector */}
          <select
            value={selectedTermId}
            onChange={e => setSelectedTermId(e.target.value)}
            className="px-3.5 py-2 rounded-lg bg-surface-50 border border-border text-text-900 text-sm font-medium focus:outline-none focus:border-violet-500 cursor-pointer shadow-sm"
          >
            {terms.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} {t.isCurrent ? '(Current)' : ''}
              </option>
            ))}
          </select>

          {/* View mode toggle */}
          {computed && (
            <div className="flex items-center bg-surface-100 p-0.5 rounded-lg border border-border">
              <button
                onClick={() => setViewMode('analytics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'analytics'
                    ? 'bg-surface-0 text-text-900 shadow-sm'
                    : 'text-text-500 hover:text-text-700'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Analytics
              </button>
              <button
                onClick={() => setViewMode('document')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'document'
                    ? 'bg-surface-0 text-text-900 shadow-sm'
                    : 'text-text-500 hover:text-text-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Grade Card
              </button>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchResult(selectedTermId, selectedExamType)}
            disabled={isLoading}
            icon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          {computed && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrint}
                icon={<Printer className="w-4 h-4" />}
                className="shadow-sm"
              >
                Print / Save PDF
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownloadHtml}
                icon={<Download className="w-4 h-4" />}
                className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
              >
                Download Document
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-2 border-violet-500 border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-text-500 font-medium">Retrieving {selectedExamType} examination records...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {!isLoading && errorMsg && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-0 border border-border rounded-2xl p-8 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold text-text-900 mb-2">{selectedExamType} Result Not Available</h3>
          <p className="text-text-500 max-w-md text-sm">{errorMsg}</p>
          <p className="text-text-400 text-xs mt-3">
            {selectedExamType} results are published after the Examination Cell processes scores for all enrolled subjects.
          </p>
        </div>
      )}

      {/* 2. Main Result Content */}
      {!isLoading && !errorMsg && computed && computed.subjectBreakdown.length > 0 && (
        <div className="space-y-6">
          {/* CRITICAL ALERT: Tell which subjects are pending evaluation */}
          {hasPendingSubjects && (
            <div className="rounded-2xl border-2 border-amber-500/30 bg-amber-500/10 p-5 shadow-sm space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-700 dark:text-amber-300">
                    Result Incomplete: {computed.pendingSubjects.length} Subject Result(s) Pending for {currentExamType}
                  </h3>
                  <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                    As per examination regulations, official result cards cannot be declared until all enrolled course evaluations are completed.
                  </p>
                </div>
              </div>

              {/* Explicit List of Pending Subjects */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {computed.pendingSubjects.map((ps, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-0 border border-amber-500/30 shadow-xs text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-mono font-bold text-text-900 block truncate">{ps.subjectCode}</span>
                      <span className="font-medium text-text-700 block truncate">{ps.subjectName}</span>
                    </div>
                    <span className="shrink-0 text-[10px] px-2 py-0.5 rounded font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Pending Marks
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Official declared banner */}
          {persisted && !hasPendingSubjects && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                  Official {currentExamType} Result Declared
                </p>
                <p className="text-emerald-700/80 dark:text-emerald-300/80 text-xs mt-0.5">
                  Published by Examination Cell{persisted.processedBy ? ` (${persisted.processedBy})` : ''} on{' '}
                  {new Date(persisted.processedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.
                </p>
              </div>
            </div>
          )}

          {/* VIEW 1: Modern Analytics Dashboard */}
          {viewMode === 'analytics' && (
            <div className="space-y-6">
              {/* Institutional Banner Header with EXAM TYPE */}
              <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 shadow-md">
                <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  <div className="p-2.5 rounded-2xl bg-white shadow-md shrink-0">
                    <CollegeSealLogo size={58} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                        Autonomous Institute • NAAC 'A+' Grade
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950 uppercase">
                        {currentExamType} EXAM
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold font-serif tracking-tight leading-tight text-white">
                      KOLHAPUR INSTITUTE OF TECHNOLOGY'S COLLEGE OF ENGINEERING (AUTONOMOUS)
                    </h2>
                    <p className="text-xs text-slate-300 font-sans">
                      {student?.department} • {student?.class} {student?.semesterNumber ? `(Semester ${student.semesterNumber})` : ''}
                    </p>
                  </div>
                  <div className="sm:ml-auto shrink-0 flex flex-col items-center sm:items-end">
                    <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-white/10 text-slate-200 border border-white/20">
                      PRN: {student?.instituteId || '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">Roll No: {student?.rollNumber || '—'}</span>
                  </div>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* SGPA */}
                <div className="bg-surface-0 border border-border rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm hover:border-violet-500/40 transition-all">
                  <CircularProgress
                    value={computed.sgpa || 0}
                    max={10}
                    size={80}
                    strokeWidth={7}
                    label={computed.sgpa != null ? computed.sgpa.toFixed(2) : '—'}
                    sublabel="/ 10.00"
                    color={computed.sgpa >= 7.5 ? '#10b981' : computed.sgpa >= 6 ? '#38bdf8' : '#f59e0b'}
                  />
                  <div className="text-center">
                    <p className="text-xs text-text-400 font-semibold uppercase tracking-wider">{currentExamType} SGPA</p>
                    <p className="text-[11px] text-text-500">Grade Point Average</p>
                  </div>
                </div>

                {/* Percentage (Strictly Capped at 100%) */}
                <div className="bg-surface-0 border border-border rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm hover:border-violet-500/40 transition-all">
                  <CircularProgress
                    value={safePercentage || 0}
                    max={100}
                    size={80}
                    strokeWidth={7}
                    label={safePercentage != null ? `${safePercentage.toFixed(1)}%` : '—'}
                    sublabel="Aggregate"
                    color={getPercentageColor(safePercentage)}
                  />
                  <div className="text-center">
                    <p className="text-xs text-text-400 font-semibold uppercase tracking-wider">Percentage</p>
                    <p className="text-[11px] text-text-500">
                      {safeGrandTotalMarks != null ? `${safeGrandTotalMarks} / ${computed.maxMarks}` : 'Score'}
                    </p>
                  </div>
                </div>

                {/* Earned Credits */}
                <div className="bg-surface-0 border border-border rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm hover:border-violet-500/40 transition-all">
                  <div className="w-16 h-16 rounded-full bg-violet-500/10 border-2 border-violet-500/30 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold font-mono text-violet-500">{computed.earnedCredits}</span>
                    <span className="text-[9px] text-violet-400 font-medium">Earned</span>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-text-400 font-semibold uppercase tracking-wider">Credits Earned</p>
                    <p className="text-[11px] text-text-500">of {computed.totalCredits} registered</p>
                  </div>
                </div>

                {/* Classification / Status */}
                <div className="bg-surface-0 border border-border rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm hover:border-violet-500/40 transition-all">
                  {hasPendingSubjects ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center">
                        <Clock className="w-8 h-8 text-amber-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-amber-500 font-bold uppercase tracking-wider">PENDING</p>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                          {computed.pendingSubjects.length} Subject(s) Missing
                        </p>
                      </div>
                    </>
                  ) : computed.overallPass === true ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-emerald-500 font-bold uppercase tracking-wider">PASS</p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          {computed.classification || (safePercentage >= 75 ? 'Distinction' : 'First Class')}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
                        <XCircle className="w-8 h-8 text-red-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-red-500 font-bold uppercase tracking-wider">FAIL / ATKT</p>
                        <p className="text-[10px] text-red-400">Needs Clearance</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Subject Breakdown Table: ONLY FOR THIS EXAM TYPE */}
              <div className="bg-surface-0 border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-violet-500" />
                    <h3 className="font-semibold text-text-900 text-sm">
                      {currentExamType} Course Marks & Grade Matrix
                    </h3>
                  </div>
                  <span className="text-xs text-text-500 font-mono">
                    Showing {computed.subjectBreakdown.length} courses for {currentExamType} exam
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border bg-surface-50 text-[11px] font-semibold text-text-500 uppercase tracking-wider">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Course Code & Title</th>
                        <th className="px-3 py-3 text-center">Type</th>
                        <th className="px-3 py-3 text-center">Credits</th>
                        <th className="px-3 py-3 text-center">{currentExamType} Marks</th>
                        <th className="px-3 py-3 text-center">Percentage</th>
                        <th className="px-3 py-3 text-center">Grade</th>
                        <th className="px-3 py-3 text-center">GP</th>
                        <th className="px-3 py-3 text-center">Credit Pts</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-xs">
                      {computed.subjectBreakdown.map((s, idx) => {
                        const subjPct = clampPercentage(s.percentage);
                        const creditPts = s.creditPoints || (s.credits * (s.gradePoint || 0));
                        return (
                          <tr key={s.subjectId || idx} className={`hover:bg-surface-50 transition-colors ${s.isPending ? 'bg-amber-500/5' : ''}`}>
                            <td className="px-4 py-3 text-text-400 font-mono">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-text-900">{s.subjectName || '—'}</p>
                              <p className="text-[11px] font-mono text-text-400">{s.subjectCode || '—'}</p>
                              {s.isPending && (
                                <p className="text-[10px] text-amber-600 font-medium mt-0.5">
                                  ⚠️ {s.pendingReason || 'Marks not entered'}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-100 text-text-600 border border-border">
                                {s.subjectType || 'CORE'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center font-bold text-violet-600 dark:text-violet-400">
                              {s.credits}
                            </td>
                            <td className="px-3 py-3 text-center text-text-700">
                              {s.marksObtained != null ? (
                                <span>
                                  <strong className="text-text-900">{s.marksObtained}</strong> / {s.maxMarks}
                                </span>
                              ) : (
                                <span className="text-amber-500 font-medium italic">Pending</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center font-semibold">
                              {subjPct != null ? (
                                <span style={{ color: getPercentageColor(subjPct) }}>
                                  {subjPct}%
                                </span>
                              ) : (
                                <span className="text-text-400">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {s.grade ? (
                                <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold border ${getGradeBg(s.grade)} ${getGradeColor(s.grade)}`}>
                                  {s.grade}
                                </span>
                              ) : (
                                <span className="text-text-400">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center font-bold text-text-900">
                              {s.gradePoint != null ? s.gradePoint : '—'}
                            </td>
                            <td className="px-3 py-3 text-center font-mono font-semibold text-text-700">
                              {creditPts.toFixed(1)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {s.isPending ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500">
                                  <Clock className="w-3.5 h-3.5" /> PENDING
                                </span>
                              ) : s.isPass === true ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-500">
                                  <XCircle className="w-3.5 h-3.5" /> FAIL
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-surface-100 font-bold text-xs text-text-900">
                        <td className="px-4 py-3 text-left" colSpan="3">
                          {currentExamType} TOTAL / SGPA
                        </td>
                        <td className="px-3 py-3 text-center text-violet-600 dark:text-violet-400">
                          {computed.totalCredits}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {safeGrandTotalMarks != null ? `${safeGrandTotalMarks} / ${computed.maxMarks}` : '—'}
                        </td>
                        <td className="px-3 py-3 text-center font-bold" style={{ color: getPercentageColor(safePercentage) }}>
                          {safePercentage != null ? `${safePercentage}%` : '—'}
                        </td>
                        <td className="px-3 py-3 text-center font-bold">
                          {computed.overallGrade || '—'}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-violet-600 dark:text-violet-400">
                          {computed.sgpa != null ? computed.sgpa.toFixed(2) : '—'}
                        </td>
                        <td className="px-3 py-3 text-center font-mono">
                          {totalCreditPoints.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {hasPendingSubjects ? (
                            <span className="text-amber-500 font-bold">PENDING</span>
                          ) : computed.overallPass === true ? (
                            <span className="text-emerald-500 font-bold">PASS</span>
                          ) : (
                            <span className="text-red-500 font-bold">FAIL</span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* UGC/AICTE CBCS 10-Point Scale Legend */}
              <div className="bg-surface-0 border border-border rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-bold text-text-900 uppercase tracking-wider">
                    UGC / AICTE Autonomous Grading Scale Key ({currentExamType})
                  </h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                  {[
                    { grade: 'O', label: 'Outstanding', range: '90–100%', gp: 10, color: 'emerald' },
                    { grade: 'A+', label: 'Excellent', range: '80–89.9%', gp: 9, color: 'emerald' },
                    { grade: 'A', label: 'Very Good', range: '70–79.9%', gp: 8, color: 'sky' },
                    { grade: 'B+', label: 'Good', range: '60–69.9%', gp: 7, color: 'sky' },
                    { grade: 'B', label: 'Above Avg', range: '50–59.9%', gp: 6, color: 'amber' },
                    { grade: 'C', label: 'Average', range: '40–49.9%', gp: 5, color: 'amber' },
                    { grade: 'F', label: 'Fail', range: '<40%', gp: 0, color: 'red' },
                  ].map(item => (
                    <div
                      key={item.grade}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center ${
                        item.color === 'emerald'
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : item.color === 'sky'
                          ? 'bg-sky-500/5 border-sky-500/20 text-sky-600 dark:text-sky-400'
                          : item.color === 'amber'
                          ? 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400'
                          : 'bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400'
                      }`}
                    >
                      <span className="text-sm font-bold">{item.grade}</span>
                      <span className="text-[10px] opacity-80">{item.label}</span>
                      <span className="text-[10px] font-mono font-semibold mt-1">GP: {item.gp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: High-Fidelity Official Grade Card (Matching Print/Download) */}
          <div className={`${viewMode === 'analytics' ? 'hidden' : 'block'} space-y-4`}>
            <div className="flex items-center justify-between bg-surface-50 border border-border p-3 rounded-xl">
              <span className="text-xs text-text-600 font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                This is the exact high-fidelity transcript rendered for download and print for {currentExamType} exam.
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={handlePrint} icon={<Printer className="w-3.5 h-3.5" />}>
                  Print / Save PDF
                </Button>
                <Button size="sm" variant="primary" onClick={handleDownloadHtml} icon={<Download className="w-3.5 h-3.5" />}>
                  Download HTML
                </Button>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
               OFFICIAL PRINTABLE MARKSHEET / GRADE CARD
               Exact A4 layout with authentic College Header & EXAM TYPE
              ══════════════════════════════════════════════════════════ */}
          <div
            id="official-marksheet-printable"
            className={`${viewMode === 'document' ? 'block' : 'hidden'} printable-document max-w-[820px] mx-auto p-4 sm:p-6 bg-white text-black font-serif border-2 border-black rounded-lg shadow-md`}
          >
            <div className="border border-black p-3.5 sm:p-4 space-y-3">
              {/* 1. Official Institutional Header */}
              <div className="text-center border-b-2 border-black pb-3 space-y-1">
                <div className="flex items-center justify-center gap-3">
                  <CollegeSealLogo size={62} />
                  <div className="text-center">
                    <div className="text-[9px] uppercase tracking-wider font-mono text-gray-700 font-bold">
                      Autonomous Institute • Affiliated to Shivaji University, Kolhapur
                    </div>
                    <h1 className="text-base sm:text-lg font-bold uppercase tracking-tight text-black font-serif leading-tight">
                      KOLHAPUR INSTITUTE OF TECHNOLOGY'S COLLEGE OF ENGINEERING (AUTONOMOUS)
                    </h1>
                    <div className="text-[10px] text-gray-800 font-sans">
                      Approved by AICTE New Delhi • Recognized by Govt. of Maharashtra • Accredited by NAAC with 'A+' Grade
                    </div>
                    <div className="text-[9px] text-gray-600 font-sans">
                      Gokul Shirgaon, Kolhapur - 416234, Maharashtra | Web: www.kitcoek.in
                    </div>
                  </div>
                </div>

                <div className="pt-1.5">
                  <div className="text-[11px] font-bold tracking-wider text-black uppercase font-mono">
                    OFFICE OF THE CONTROLLER OF EXAMINATIONS
                  </div>
                  <div className="mt-1">
                    <span className="inline-block px-3 py-0.5 border border-black font-mono font-bold text-xs tracking-wider uppercase bg-gray-100">
                      {currentExamType} EXAMINATION STATEMENT OF GRADES & MARKS (PROVISIONAL)
                    </span>
                  </div>
                  <div className="text-[10px] font-mono font-semibold text-gray-800 pt-0.5">
                    ACADEMIC TERM: {term?.name?.toUpperCase() || 'CURRENT TERM'} • EXAM TYPE: {currentExamType}
                  </div>
                </div>
              </div>

              {/* 2. Candidate & Academic Profile Grid */}
              <div className="border border-black p-2.5 bg-gray-50/50 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="font-sans font-semibold text-gray-700 text-[11px] block">Candidate Name:</span>
                    <span className="font-serif font-bold text-xs sm:text-sm text-black uppercase">
                      {student?.name || 'STUDENT NAME'}
                    </span>
                  </div>
                  <div>
                    <span className="font-sans font-semibold text-gray-700 text-[11px] block">Permanent PRN / ID:</span>
                    <span className="font-mono font-bold text-xs text-black">
                      {student?.instituteId || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="font-sans font-semibold text-gray-700 text-[11px] block">Roll No & Division:</span>
                    <span className="font-mono text-xs text-black font-bold">
                      {student?.rollNumber || '—'} • Div: {student?.division || 'A'}
                    </span>
                  </div>
                  <div>
                    <span className="font-sans font-semibold text-gray-700 text-[11px] block">Department / Branch:</span>
                    <span className="font-serif text-[11px] text-black font-semibold">
                      {student?.department || 'Engineering'} {student?.departmentCode ? `(${student.departmentCode})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="font-sans font-semibold text-gray-700 text-[11px] block">Class & Semester:</span>
                    <span className="font-serif text-[11px] text-black font-semibold">
                      {student?.class || 'Engineering'} {student?.semesterNumber ? `(Semester ${student.semesterNumber})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="font-sans font-semibold text-gray-700 text-[11px] block">Exam Series:</span>
                    <span className="font-mono text-[10px] text-gray-800 font-bold">
                      {currentExamType} Exam (Autonomous CBCS)
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Course-wise Evaluation Table: ONLY THIS EXAM TYPE */}
              <div className="border border-black overflow-hidden">
                <table className="w-full border-collapse text-[10.5px]">
                  <thead>
                    <tr className="bg-gray-100 border-b border-black text-center font-bold font-sans text-[10px]">
                      <th className="border-r border-black p-1.5 w-7">Sr.</th>
                      <th className="border-r border-black p-1.5 text-left">Course Code & Title</th>
                      <th className="border-r border-black p-1.5 w-12">Credits</th>
                      <th className="border-r border-black p-1.5 w-14">{currentExamType} Max</th>
                      <th className="border-r border-black p-1.5 w-14">Min Pass</th>
                      <th className="border-r border-black p-1.5 w-14">Marks Scored</th>
                      <th className="border-r border-black p-1.5 w-14">Percentage</th>
                      <th className="border-r border-black p-1.5 w-12">Grade</th>
                      <th className="border-r border-black p-1.5 w-10">GP</th>
                      <th className="border-r border-black p-1.5 w-12">Credit Pts</th>
                      <th className="p-1.5 w-14">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computed.subjectBreakdown.map((s, idx) => {
                      const subjPct = clampPercentage(s.percentage);
                      const creditPts = s.creditPoints || (s.credits * (s.gradePoint || 0));
                      const minPass = s.minMarks != null ? s.minMarks : Math.round((s.maxMarks || 100) * 0.4);
                      return (
                        <tr key={s.subjectId || idx} className="border-b border-gray-300 text-center">
                          <td className="border-r border-black p-1 font-mono text-[10px]">{idx + 1}</td>
                          <td className="border-r border-black p-1 text-left">
                            <span className="font-mono font-bold text-[10px] mr-1.5">{s.subjectCode || ''}</span>
                            <span className="font-serif">{s.subjectName}</span>
                          </td>
                          <td className="border-r border-black p-1 font-bold">{s.credits}</td>
                          <td className="border-r border-black p-1">{s.maxMarks != null ? s.maxMarks : '—'}</td>
                          <td className="border-r border-black p-1">{minPass}</td>
                          <td className="border-r border-black p-1 font-bold">
                            {s.marksObtained != null ? s.marksObtained : '—'}
                          </td>
                          <td className="border-r border-black p-1 font-mono">{subjPct != null ? `${subjPct}%` : '—'}</td>
                          <td className="border-r border-black p-1 font-bold">{s.grade || '—'}</td>
                          <td className="border-r border-black p-1">{s.gradePoint != null ? s.gradePoint : '—'}</td>
                          <td className="border-r border-black p-1 font-mono">{creditPts.toFixed(1)}</td>
                          <td className="p-1 font-bold">
                            {s.isPending ? (
                              <span className="text-amber-700">PENDING</span>
                            ) : s.isPass === true ? (
                              <span className="text-green-800">PASS</span>
                            ) : (
                              <span className="text-red-800">FAIL</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Summary Row */}
                    <tr className="bg-gray-100 font-bold border-t-2 border-black text-center text-[11px]">
                      <td colSpan="2" className="border-r border-black p-1.5 text-left font-sans">
                        {currentExamType} TOTAL / SGPA
                      </td>
                      <td className="border-r border-black p-1.5">{computed.totalCredits}</td>
                      <td className="border-r border-black p-1.5">{computed.maxMarks != null ? computed.maxMarks : '—'}</td>
                      <td className="border-r border-black p-1.5">—</td>
                      <td className="border-r border-black p-1.5 font-bold">{safeGrandTotalMarks != null ? safeGrandTotalMarks : '—'}</td>
                      <td className="border-r border-black p-1.5 font-mono font-bold">{safePercentage != null ? `${safePercentage}%` : '—'}</td>
                      <td className="border-r border-black p-1.5">{computed.overallGrade || '—'}</td>
                      <td className="border-r border-black p-1.5 font-bold">{computed.sgpa != null ? computed.sgpa.toFixed(2) : '—'}</td>
                      <td className="border-r border-black p-1.5 font-mono">{totalCreditPoints.toFixed(1)}</td>
                      <td className="p-1.5 font-bold">
                        {hasPendingSubjects ? (
                          <span className="text-amber-700">PENDING</span>
                        ) : computed.overallPass === true ? (
                          <span className="text-green-800">PASS</span>
                        ) : (
                          <span className="text-red-800">FAIL</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 4. Ledger Box: Overall Performance for this exam */}
              <div className="border border-black p-2.5 bg-gray-50 flex items-center justify-between text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full text-center">
                  <div className="border-r border-gray-400 last:border-r-0 pr-2">
                    <span className="text-[10px] text-gray-700 block uppercase font-sans">Credits Registered</span>
                    <strong className="text-sm font-mono text-black">{computed.totalCredits}</strong>
                  </div>
                  <div className="border-r border-gray-400 last:border-r-0 pr-2">
                    <span className="text-[10px] text-gray-700 block uppercase font-sans">Credits Earned</span>
                    <strong className="text-sm font-mono text-black">{computed.earnedCredits}</strong>
                  </div>
                  <div className="border-r border-gray-400 last:border-r-0 pr-2">
                    <span className="text-[10px] text-gray-700 block uppercase font-sans">{currentExamType} SGPA</span>
                    <strong className="text-base font-mono text-black">{computed.sgpa != null ? computed.sgpa.toFixed(2) : '—'}</strong>
                  </div>
                  <div className="border-r border-gray-400 last:border-r-0 pr-2">
                    <span className="text-[10px] text-gray-700 block uppercase font-sans">Percentage</span>
                    <strong className="text-base font-mono text-black">{safePercentage != null ? `${safePercentage}%` : '—'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-700 block uppercase font-sans">Result Awarded</span>
                    <strong className="text-xs font-serif text-black uppercase">
                      {hasPendingSubjects ? 'PENDING' : (computed.classification || (computed.overallPass ? 'FIRST CLASS' : 'FAIL / ATKT'))}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 5. Grading Legend & Exam Note */}
              <div className="border border-black p-2 text-[9px] text-gray-800 space-y-1 bg-white">
                <div className="font-bold uppercase tracking-wider text-black font-sans text-[9.5px]">
                  Grading Scale: O (90-100%, GP 10) | A+ (80-89%, GP 9) | A (70-79%, GP 8) | B+ (60-69%, GP 7) | B (50-59%, GP 6) | C (40-49%, GP 5) | F (&lt;40%, GP 0)
                </div>
                <div className="text-gray-600 font-sans">
                  • <strong>Exam Scope:</strong> Reflects performance exclusively in the <strong>{currentExamType}</strong> examination series. Midterm and Final examinations are evaluated independently.
                </div>
              </div>

              {/* 6. Authentication Signatures & Verification */}
              <div className="pt-3 border-t border-black grid grid-cols-3 gap-2 items-end text-center text-xs">
                <div className="space-y-1">
                  <div className="h-10" />
                  <div className="border-t border-black pt-1">
                    <span className="font-sans font-semibold text-[10px] block">Prepared & Checked By</span>
                    <span className="text-[9px] text-gray-600 block">Class Coordinator / Tabulator</span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-1">
                  <ExamControllerSeal size={52} />
                  <div className="border-t border-black pt-1 w-full">
                    <span className="font-sans font-semibold text-[10px] block">Verified By</span>
                    <span className="text-[9px] text-gray-600 block">Examination Cell</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="h-10 flex items-center justify-center">
                    <span className="font-serif italic font-bold text-gray-800 text-xs">S. R. Patil</span>
                  </div>
                  <div className="border-t border-black pt-1">
                    <span className="font-sans font-semibold text-[10px] block uppercase">Controller of Examinations</span>
                    <span className="text-[9px] text-gray-600 block">KIT College of Engineering</span>
                  </div>
                </div>
              </div>

              {/* 7. Disclaimer */}
              <div className="text-[8.5px] text-gray-500 text-center font-sans pt-1">
                Note: This is a computer-generated provisional statement of grades for {currentExamType} examination. In case of any clarification, contact the Office of Controller of Examinations within 15 days.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
