import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Sparkles, 
  TrendingUp, 
  Play, 
  Search, 
  Filter, 
  ChevronRight, 
  FileText, 
  Printer, 
  Building2, 
  GraduationCap, 
  RefreshCw,
  Layers,
  BookOpen,
  CalendarCheck
} from 'lucide-react';

export default function ResultProcessingDesk() {
  const [academicTerms, setAcademicTerms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 3 RESULT OPTIONS: 'COMBINED', 'MSE', 'ESE'
  // SGPA is generated ONLY on 'COMBINED'
  const [activeResultType, setActiveResultType] = useState('COMBINED');

  // Cohort results state
  const [cohortData, setCohortData] = useState({
    resultType: 'COMBINED',
    totalStudents: 0,
    passedCount: 0,
    failedCount: 0,
    passPercentage: 0,
    averageSgpa: null,
    highestSgpa: null,
    gradeDistribution: {},
    resultCards: []
  });
  const [isLoadingCohort, setIsLoadingCohort] = useState(false);

  // Batch process modal
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [processClassId, setProcessClassId] = useState('');
  const [processResultType, setProcessResultType] = useState('COMBINED');
  const [isProcessing, setIsProcessing] = useState(false);

  // Student detailed result card modal
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentCardData, setStudentCardData] = useState(null);
  const [isLoadingStudentCard, setIsLoadingStudentCard] = useState(false);
  const [isStudentCardModalOpen, setIsStudentCardModalOpen] = useState(false);

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      let terms = [];
      let cls = [];

      try {
        const [termsRes, classesRes] = await Promise.all([
          apiClient.get('/academic-terms'),
          apiClient.get('/classes')
        ]);
        terms = Array.isArray(termsRes) ? termsRes : [];
        cls = Array.isArray(classesRes) ? classesRes : [];
      } catch (err) {
        console.warn('Direct options fetch failed, attempting fallback to /exams/form-options');
      }

      // If empty, fallback to /exams/form-options
      if (terms.length === 0 || cls.length === 0) {
        const formOptions = await apiClient.get('/exams/form-options').catch(() => null);
        if (formOptions?.academicTerms?.length) {
          terms = formOptions.academicTerms;
        }
        if (formOptions?.classes?.length) {
          cls = formOptions.classes;
        }
      }

      setAcademicTerms(terms);
      setClasses(cls);

      const currentTerm = terms.find(t => t.isCurrent) || terms[0];
      if (currentTerm) {
        setSelectedTerm(currentTerm.id);
      }
    } catch (error) {
      console.error('Failed to load filter options:', error);
      toast.error('Failed to load filter options');
    }
  };

  useEffect(() => {
    if (selectedTerm) {
      fetchCohortResults();
    }
  }, [selectedTerm, selectedClass, activeResultType]);

  const fetchCohortResults = async () => {
    setIsLoadingCohort(true);
    try {
      let query = `?academicTermId=${selectedTerm}&resultType=${activeResultType}`;
      if (selectedClass) {
        query += `&classId=${selectedClass}`;
      }
      const data = await apiClient.get(`/result-cards/cohort${query}`);
      setCohortData(data || {
        resultType: activeResultType,
        totalStudents: 0,
        passedCount: 0,
        failedCount: 0,
        passPercentage: 0,
        averageSgpa: null,
        highestSgpa: null,
        gradeDistribution: {},
        resultCards: []
      });
    } catch (error) {
      toast.error(error.message || 'Failed to load cohort results');
    } finally {
      setIsLoadingCohort(false);
    }
  };

  // Trigger batch processing
  const handleProcessSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTerm) {
      toast.error('Please select an academic term');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await apiClient.post('/result-cards/process', {
        academicTermId: selectedTerm,
        classId: processClassId || null,
        resultType: processResultType
      });

      toast.success(res.message || `${processResultType} results processed successfully!`);
      setIsProcessModalOpen(false);
      // Switch active tab to the processed result type
      setActiveResultType(processResultType);
      fetchCohortResults();
    } catch (error) {
      toast.error(error.message || 'Failed to process results');
    } finally {
      setIsProcessing(false);
    }
  };

  // Open individual student detailed ResultCard
  const handleViewStudentCard = async (studentId) => {
    setSelectedStudentId(studentId);
    setIsStudentCardModalOpen(true);
    setIsLoadingStudentCard(true);
    try {
      const data = await apiClient.get(`/result-cards/student/${studentId}?academicTermId=${selectedTerm}&resultType=${activeResultType}`);
      setStudentCardData(data);
    } catch (error) {
      toast.error('Failed to load student result card');
      setIsStudentCardModalOpen(false);
    } finally {
      setIsLoadingStudentCard(false);
    }
  };

  // Filtered rows for DataTable
  const filteredRows = useMemo(() => {
    if (!cohortData.resultCards) return [];
    if (!searchQuery.trim()) return cohortData.resultCards;
    const q = searchQuery.toLowerCase();
    return cohortData.resultCards.filter(r => 
      r.studentName?.toLowerCase().includes(q) ||
      r.rollNumber?.toLowerCase().includes(q) ||
      r.instituteId?.toLowerCase().includes(q) ||
      r.className?.toLowerCase().includes(q)
    );
  }, [cohortData.resultCards, searchQuery]);

  // Dynamic table columns based on activeResultType
  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: 'Roll No',
        key: 'rollNumber',
        render: (_, r) => (
          <span className="font-mono text-xs font-bold text-text-900">{r.rollNumber}</span>
        )
      },
      {
        title: 'Candidate Name',
        key: 'studentName',
        render: (_, r) => (
          <div className="flex flex-col">
            <span className="font-medium text-xs text-text-900">{r.studentName}</span>
            <span className="font-mono text-[11px] text-text-400">{r.instituteId}</span>
          </div>
        )
      },
      {
        title: 'Class / Div',
        key: 'className',
        render: (_, r) => (
          <span className="text-xs text-text-600">{r.className} {r.divisionName ? `(${r.divisionName})` : ''}</span>
        )
      },
      {
        title: activeResultType === 'MSE' ? 'MSE Marks' : activeResultType === 'ESE' ? 'ESE Marks' : 'Total Marks',
        key: 'totalMarks',
        render: (_, r) => (
          <span className="font-mono text-xs font-semibold text-text-800">
            {r.totalMarks !== null ? (
              r.totalMaxMarks ? `${r.totalMarks} / ${r.totalMaxMarks}` : r.totalMarks
            ) : '—'}
          </span>
        )
      },
      {
        title: 'Percentage',
        key: 'percentage',
        render: (_, r) => (
          <span className="font-mono text-xs text-text-700">
            {r.percentage !== null ? `${r.percentage}%` : '—'}
          </span>
        )
      }
    ];

    // SGPA COLUMN: Rendered ONLY on COMBINED Result!
    if (activeResultType === 'COMBINED') {
      baseColumns.push({
        title: 'SGPA (10-Pt)',
        key: 'sgpa',
        render: (_, r) => {
          const val = Number(r.sgpa || 0);
          const color = val >= 8.5 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        val >= 7.0 ? 'bg-blue-50 text-blue-800 border-blue-200' :
                        val >= 5.5 ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        'bg-rose-50 text-rose-800 border-rose-200';
          return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-bold border ${color}`}>
              {val.toFixed(2)}
            </span>
          );
        }
      });
    } else {
      // MSE / ESE evaluation note column
      baseColumns.push({
        title: 'SGPA Standing',
        key: 'sgpaNote',
        render: () => (
          <span className="text-2xs font-mono text-text-400 italic">
            Combined Only
          </span>
        )
      });
    }

    baseColumns.push(
      {
        title: 'Result Standing',
        key: 'standing',
        render: (_, r) => (
          r.standing === 'PASS' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 size={11} /> PASS
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <AlertCircle size={11} /> {activeResultType === 'COMBINED' ? 'ATKT' : 'FAIL'}
            </span>
          )
        )
      },
      {
        title: 'Action',
        key: 'actions',
        render: (_, r) => (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleViewStudentCard(r.studentId)}
            className="flex items-center gap-1 text-xs font-medium h-7 px-2.5 shadow-none"
          >
            <FileText size={13} />
            <span>Result Card</span>
          </Button>
        )
      }
    );

    return baseColumns;
  }, [activeResultType]);

  return (
    <div className="space-y-6">
      {/* Top Action & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text-900 tracking-tight flex items-center gap-2">
            <Award className="text-ink-700" size={22} />
            Examination Result Generation & Statement Desk
          </h2>
          <p className="text-xs text-text-500 mt-1">
            Choose evaluation mode: Mid Semester (MSE), End Semester (ESE), or Combined Result. SGPA is generated exclusively on Combined Result.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={fetchCohortResults}
            disabled={isLoadingCohort}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw size={14} className={isLoadingCohort ? 'animate-spin' : ''} />
            Refresh
          </Button>

          <Button
            variant="accent"
            onClick={() => {
              setProcessClassId(selectedClass);
              setProcessResultType(activeResultType);
              setIsProcessModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs"
          >
            <Play size={14} />
            <span>Generate / Process Results</span>
          </Button>
        </div>
      </div>

      {/* 3 RESULT OPTIONS: SEGMENTED CONTROL / TABS */}
      <div className="bg-surface-0 border border-border rounded-xl p-1.5 flex flex-wrap items-center gap-2 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveResultType('COMBINED')}
          className={`flex-1 min-w-[200px] px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
            activeResultType === 'COMBINED'
              ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
              : 'bg-surface-50 text-text-600 hover:text-text-900 hover:bg-surface-100 border-border/60'
          }`}
        >
          <Award size={15} className={activeResultType === 'COMBINED' ? 'text-amber-400' : 'text-text-400'} />
          <span>Combined Result (Final SGPA)</span>
          <span className={`px-1.5 py-0.2 rounded text-3xs font-mono font-semibold ${
            activeResultType === 'COMBINED' ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-200 text-slate-700'
          }`}>
            Includes SGPA
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveResultType('MSE')}
          className={`flex-1 min-w-[180px] px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
            activeResultType === 'MSE'
              ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
              : 'bg-surface-50 text-text-600 hover:text-text-900 hover:bg-surface-100 border-border/60'
          }`}
        >
          <CalendarCheck size={15} className={activeResultType === 'MSE' ? 'text-blue-400' : 'text-text-400'} />
          <span>Mid-Semester (MSE Result)</span>
          <span className="text-3xs font-normal opacity-70">Internal</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveResultType('ESE')}
          className={`flex-1 min-w-[180px] px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
            activeResultType === 'ESE'
              ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
              : 'bg-surface-50 text-text-600 hover:text-text-900 hover:bg-surface-100 border-border/60'
          }`}
        >
          <BookOpen size={15} className={activeResultType === 'ESE' ? 'text-purple-400' : 'text-text-400'} />
          <span>End-Semester (ESE Result)</span>
          <span className="text-3xs font-normal opacity-70">External</span>
        </button>
      </div>

      {/* POLICY CLARIFICATION NOTICE */}
      <div className={`p-3.5 rounded-lg text-xs border flex items-start gap-3 ${
        activeResultType === 'COMBINED'
          ? 'bg-purple-50/70 border-purple-200 text-purple-950'
          : 'bg-blue-50/70 border-blue-200 text-blue-950'
      }`}>
        <Sparkles size={17} className={`shrink-0 mt-0.5 ${activeResultType === 'COMBINED' ? 'text-purple-600' : 'text-blue-600'}`} />
        <div className="space-y-0.5">
          <span className="font-semibold block">
            {activeResultType === 'COMBINED' 
              ? 'Combined Result & SGPA Processing Mode' 
              : `${activeResultType} Examination Evaluation Mode`}
          </span>
          <p className="leading-relaxed opacity-90">
            {activeResultType === 'COMBINED' 
              ? 'All assessment components (internal continuous assessment, MSE, and ESE) are aggregated to compute subject results, letter grades (O to F), credit points, and the official Semester Grade Point Average (SGPA).'
              : `Evaluates candidates based strictly on their ${activeResultType} examination performance. SGPA is not applicable for individual ${activeResultType} components and is calculated exclusively upon final Combined Result processing.`}
          </p>
        </div>
      </div>

      {/* Cohort KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-surface-0 rounded-lg border border-border p-3.5">
          <span className="text-2xs font-medium text-text-500 uppercase tracking-wider">Processed Students</span>
          <div className="font-mono text-2xl font-bold text-text-900 mt-1">
            {cohortData.totalStudents}
          </div>
          <span className="text-3xs text-text-400 mt-0.5 block">{activeResultType} Cards</span>
        </div>

        <div className="bg-surface-0 rounded-lg border border-border p-3.5">
          <span className="text-2xs font-medium text-text-500 uppercase tracking-wider">Pass Percentage</span>
          <div className="font-mono text-2xl font-bold text-emerald-600 mt-1">
            {cohortData.passPercentage}%
          </div>
          <span className="text-3xs text-emerald-700 font-semibold mt-0.5 block">
            {cohortData.passedCount} Passed
          </span>
        </div>

        {activeResultType === 'COMBINED' ? (
          <>
            <div className="bg-surface-0 rounded-lg border border-border p-3.5">
              <span className="text-2xs font-medium text-text-500 uppercase tracking-wider">Average SGPA</span>
              <div className="font-mono text-2xl font-bold text-ink-700 mt-1">
                {cohortData.averageSgpa !== null ? cohortData.averageSgpa.toFixed(2) : '—'}
              </div>
              <span className="text-3xs text-text-400 mt-0.5 block">Across all courses</span>
            </div>

            <div className="bg-surface-0 rounded-lg border border-border p-3.5">
              <span className="text-2xs font-medium text-text-500 uppercase tracking-wider">Highest SGPA</span>
              <div className="font-mono text-2xl font-bold text-purple-700 mt-1">
                {cohortData.highestSgpa !== null ? cohortData.highestSgpa.toFixed(2) : '—'}
              </div>
              <span className="text-3xs text-purple-700 font-semibold mt-0.5 block">Top performer</span>
            </div>
          </>
        ) : (
          <>
            <div className="bg-surface-0 rounded-lg border border-border p-3.5">
              <span className="text-2xs font-medium text-text-500 uppercase tracking-wider">Evaluation Scope</span>
              <div className="font-mono text-lg font-bold text-ink-700 mt-1">
                {activeResultType} Exam
              </div>
              <span className="text-3xs text-text-400 mt-0.5 block">SGPA: Combined Only</span>
            </div>

            <div className="bg-surface-0 rounded-lg border border-border p-3.5">
              <span className="text-2xs font-medium text-text-500 uppercase tracking-wider">Academic Term</span>
              <div className="font-mono text-base font-bold text-text-900 mt-1 truncate">
                {academicTerms.find(t => t.id === selectedTerm)?.name || 'Term'}
              </div>
              <span className="text-3xs text-text-400 mt-0.5 block">Autonomous Cell</span>
            </div>
          </>
        )}

        <div className="bg-surface-0 rounded-lg border border-border p-3.5">
          <span className="text-2xs font-medium text-text-500 uppercase tracking-wider">
            {activeResultType === 'COMBINED' ? 'ATKT / Backlogs' : 'Needs Improvement'}
          </span>
          <div className="font-mono text-2xl font-bold text-rose-600 mt-1">
            {cohortData.failedCount}
          </div>
          <span className="text-3xs text-rose-700 font-semibold mt-0.5 block">
            {activeResultType === 'COMBINED' ? 'Eligible for makeup exams' : 'Score < 40% threshold'}
          </span>
        </div>
      </div>

      {/* Grade Distribution Bar (Shown only on Combined Result where SGPA exists) */}
      {activeResultType === 'COMBINED' && cohortData.gradeDistribution && Object.keys(cohortData.gradeDistribution).length > 0 && (
        <div className="bg-surface-0 border border-border rounded-lg p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-800 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-ink-600" />
              Cohort SGPA Distribution (KITCoEK 10-Point Scale)
            </span>
            <span className="text-2xs text-text-400">Higher is better</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {Object.entries(cohortData.gradeDistribution).map(([grade, count]) => (
              <div key={grade} className="bg-surface-50 border border-border/80 rounded p-2 text-center">
                <span className="font-mono font-bold text-xs text-text-900 block">{grade}</span>
                <span className="text-xs font-mono font-bold text-ink-700 mt-0.5 block">{count}</span>
                <span className="text-3xs text-text-400">students</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-surface-0 border border-border rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-500">
            <Filter size={13} />
            <span>Filter:</span>
          </div>

          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="rounded-md border border-border bg-surface-50 px-3 py-1.5 text-xs font-medium text-text-900 focus:border-ink-700"
          >
            {academicTerms.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} {t.isCurrent ? '(Current Term)' : ''}
              </option>
            ))}
          </select>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="rounded-md border border-border bg-surface-50 px-3 py-1.5 text-xs font-medium text-text-900 focus:border-ink-700"
          >
            <option value="">All Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} (Sem {c.semesterNumber})
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate name or roll no..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-50 border border-border rounded-md text-text-900 focus:ring-ink-500"
          />
        </div>
      </div>

      {/* Cohort Results Table */}
      <div className="bg-surface-0 border border-border rounded-lg shadow-2xs overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredRows}
          isLoading={isLoadingCohort}
          emptyMessage={`No processed ${activeResultType} result cards found. Click 'Generate / Process Results' to compute.`}
        />
      </div>

      {/* MODAL 1: BATCH PROCESS MODAL WITH 3 RESULT OPTIONS */}
      <Modal
        isOpen={isProcessModalOpen}
        onClose={() => setIsProcessModalOpen(false)}
        title="Generate Examination Results"
        size="md"
      >
        <form onSubmit={handleProcessSubmit} className="space-y-4">
          {/* Result Type Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-900 uppercase tracking-wider block">
              Result Type to Generate <span className="text-danger">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className={`cursor-pointer rounded-lg border p-3 flex flex-col items-center text-center transition-all ${
                processResultType === 'MSE' 
                  ? 'border-ink-900 bg-ink-50/70 text-ink-900 font-bold' 
                  : 'border-border bg-surface-0 text-text-700 hover:bg-surface-50'
              }`}>
                <input
                  type="radio"
                  name="processResultType"
                  value="MSE"
                  checked={processResultType === 'MSE'}
                  onChange={() => setProcessResultType('MSE')}
                  className="sr-only"
                />
                <CalendarCheck size={18} className="mb-1 text-ink-700" />
                <span className="text-xs">MSE Result</span>
                <span className="text-3xs text-text-400 mt-0.5">Mid-Semester</span>
              </label>

              <label className={`cursor-pointer rounded-lg border p-3 flex flex-col items-center text-center transition-all ${
                processResultType === 'ESE' 
                  ? 'border-ink-900 bg-ink-50/70 text-ink-900 font-bold' 
                  : 'border-border bg-surface-0 text-text-700 hover:bg-surface-50'
              }`}>
                <input
                  type="radio"
                  name="processResultType"
                  value="ESE"
                  checked={processResultType === 'ESE'}
                  onChange={() => setProcessResultType('ESE')}
                  className="sr-only"
                />
                <BookOpen size={18} className="mb-1 text-ink-700" />
                <span className="text-xs">ESE Result</span>
                <span className="text-3xs text-text-400 mt-0.5">End-Semester</span>
              </label>

              <label className={`cursor-pointer rounded-lg border p-3 flex flex-col items-center text-center transition-all ${
                processResultType === 'COMBINED' 
                  ? 'border-ink-900 bg-ink-50/70 text-ink-900 font-bold' 
                  : 'border-border bg-surface-0 text-text-700 hover:bg-surface-50'
              }`}>
                <input
                  type="radio"
                  name="processResultType"
                  value="COMBINED"
                  checked={processResultType === 'COMBINED'}
                  onChange={() => setProcessResultType('COMBINED')}
                  className="sr-only"
                />
                <Award size={18} className="mb-1 text-amber-600" />
                <span className="text-xs">Combined</span>
                <span className="text-3xs text-amber-700 font-semibold mt-0.5">With SGPA</span>
              </label>
            </div>
          </div>

          {/* SGPA & Regulation Information Note */}
          <div className="bg-ink-50/60 border border-ink-200/80 rounded-lg p-3 text-xs text-text-700 leading-relaxed">
            <span className="font-bold text-ink-900 block mb-1">
              {processResultType === 'COMBINED' ? 'Combined Result Calculation (SGPA Enabled):' : `${processResultType} Result Evaluation (No SGPA):`}
            </span>
            {processResultType === 'COMBINED' ? (
              <>
                Aggregates all components, calculates course credit points, and generates the official semester SGPA using:
                <div className="font-mono text-center my-1.5 text-ink-800 font-bold bg-surface-0 py-1 rounded border border-ink-100">
                  SGPA = ∑(Course Credits × Grade Point) / ∑(Credits)
                </div>
              </>
            ) : (
              <>
                Computes evaluation scores and pass percentage exclusively for <strong>{processResultType}</strong> papers.
                <div className="font-sans text-xs my-1 text-text-600 italic">
                  Note: SGPA is generated strictly on Combined Result after all academic components are completed.
                </div>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-700">
              Target Academic Term <span className="text-danger">*</span>
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full text-xs rounded-md border border-border bg-surface-0 px-3 py-2 text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700 font-medium"
              required
            >
              {academicTerms.length === 0 ? (
                <option value="" disabled>Loading academic terms...</option>
              ) : (
                academicTerms.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.isCurrent ? '(Current Term)' : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-700">Class Scope (Optional)</label>
            <select
              value={processClassId}
              onChange={(e) => setProcessClassId(e.target.value)}
              className="w-full text-xs rounded-md border-border bg-surface-50 px-3 py-2 text-text-900"
            >
              <option value="">Process Entire Academic Term Cohort</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} (Semester {c.semesterNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsProcessModalOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              disabled={isProcessing}
              className="flex items-center gap-1.5"
            >
              <Play size={14} />
              <span>{isProcessing ? `Processing ${processResultType}...` : `Generate ${processResultType} Result`}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: OFFICIAL STUDENT RESULT CARD (Autonomous Format) */}
      <Modal
        isOpen={isStudentCardModalOpen}
        onClose={() => setIsStudentCardModalOpen(false)}
        title={`KITCoEK Autonomous ${activeResultType} Statement of Marks`}
        size="2xl"
      >
        {isLoadingStudentCard ? (
          <div className="py-20 text-center text-text-500">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2" />
            <div>Generating candidate statement...</div>
          </div>
        ) : studentCardData ? (
          <div className="space-y-5 text-text-900">
            {/* Autonomous Header Box */}
            <div className="text-center border-b border-border pb-4">
              <div className="flex items-center justify-center gap-2 text-ink-900 font-bold tracking-wide uppercase text-sm">
                <Building2 size={16} />
                <span>KIT's College of Engineering (Autonomous) Kolhapur</span>
              </div>
              <div className="text-xs font-semibold text-text-600 mt-0.5">
                {activeResultType === 'COMBINED' 
                  ? 'Autonomous Examination Cell · Statement of Grades (SGPA)'
                  : `Autonomous Examination Cell · ${activeResultType} Statement of Marks`}
              </div>
            </div>

            {/* Candidate Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-50 border border-border rounded-lg p-3 text-xs">
              <div>
                <span className="text-3xs font-semibold text-text-400 uppercase">Candidate Name</span>
                <div className="font-bold text-text-900 mt-0.5">{studentCardData.student?.name}</div>
              </div>
              <div>
                <span className="text-3xs font-semibold text-text-400 uppercase">Roll Number</span>
                <div className="font-mono font-bold text-text-900 mt-0.5">{studentCardData.student?.rollNumber}</div>
              </div>
              <div>
                <span className="text-3xs font-semibold text-text-400 uppercase">PRN / Institute ID</span>
                <div className="font-mono font-bold text-text-900 mt-0.5">{studentCardData.student?.instituteId}</div>
              </div>
              <div>
                <span className="text-3xs font-semibold text-text-400 uppercase">Class & Dept</span>
                <div className="font-bold text-text-900 mt-0.5">
                  {studentCardData.student?.className} ({studentCardData.student?.departmentName || 'Engg'})
                </div>
              </div>
            </div>

            {/* Course Breakdown Table */}
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-100/70 border-b border-border text-2xs uppercase text-text-600 font-bold">
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Course Title</th>
                    <th className="py-2.5 px-2 text-center w-14">Credits</th>
                    <th className="py-2.5 px-2 text-center w-24">
                      {activeResultType === 'MSE' ? 'MSE Marks' : activeResultType === 'ESE' ? 'ESE Marks' : 'Total Marks'}
                    </th>
                    <th className="py-2.5 px-2 text-center w-14">%</th>
                    {activeResultType === 'COMBINED' && (
                      <>
                        <th className="py-2.5 px-2 text-center w-14">Grade</th>
                        <th className="py-2.5 px-2 text-center w-14">GP</th>
                        <th className="py-2.5 px-2 text-center w-16">Credit Pts</th>
                      </>
                    )}
                    <th className="py-2.5 px-3 text-center w-18">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-sans">
                  {studentCardData.subjects?.map((s) => (
                    <tr key={s.enrollmentId} className="hover:bg-surface-50/50">
                      <td className="py-2 px-3 font-mono font-semibold text-text-800">{s.subjectCode}</td>
                      <td className="py-2 px-3 font-medium text-text-900">{s.subjectName}</td>
                      <td className="py-2 px-2 text-center font-mono font-semibold">{s.credits}</td>
                      <td className="py-2 px-2 text-center font-mono">
                        {s.marksObtained !== null ? `${s.marksObtained} / ${s.maxMarks}` : '—'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono">{s.percentage !== null ? `${s.percentage}%` : '—'}</td>
                      
                      {activeResultType === 'COMBINED' && (
                        <>
                          <td className="py-2 px-2 text-center font-mono font-bold text-ink-900">{s.grade}</td>
                          <td className="py-2 px-2 text-center font-mono">{s.gradePoint}</td>
                          <td className="py-2 px-2 text-center font-mono font-semibold">{s.creditPoints}</td>
                        </>
                      )}

                      <td className="py-2 px-3 text-center">
                        {s.isPass === true ? (
                          <span className="text-emerald-700 font-semibold text-3xs uppercase bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Pass
                          </span>
                        ) : s.isPass === false ? (
                          <span className="text-rose-700 font-semibold text-3xs uppercase bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            {activeResultType === 'COMBINED' ? 'ATKT' : 'Fail'}
                          </span>
                        ) : (
                          <span className="text-text-400 font-medium text-3xs uppercase bg-surface-100 px-1.5 py-0.5 rounded">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Performance Summary Banner */}
            <div className="bg-surface-50 border border-border rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-3xs font-semibold text-text-500 uppercase">
                    {activeResultType === 'COMBINED' ? 'Total Credits' : 'Courses Evaluated'}
                  </span>
                  <div className="font-mono text-sm font-bold text-text-900">
                    {activeResultType === 'COMBINED' 
                      ? `${studentCardData.earnedCredits} / ${studentCardData.totalCredits} Earned`
                      : `${studentCardData.subjects?.length || 0} Courses`}
                  </div>
                </div>
                <div>
                  <span className="text-3xs font-semibold text-text-500 uppercase">Aggregate {activeResultType} Marks</span>
                  <div className="font-mono text-sm font-bold text-text-900">
                    {studentCardData.totalMarksObtained} / {studentCardData.totalMaxMarks} ({studentCardData.percentage}%)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-3xs font-semibold text-text-500 uppercase">Evaluation Standing</span>
                  <div className="mt-0.5">
                    {studentCardData.standing === 'PASS' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        PASS
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        {activeResultType === 'COMBINED' ? 'ATKT / BACKLOG' : 'NEEDS IMPROVEMENT'}
                      </span>
                    )}
                  </div>
                </div>

                {/* SGPA Badge: ONLY SHOWN IF COMBINED RESULT */}
                {activeResultType === 'COMBINED' ? (
                  <div className="bg-surface-0 border-2 border-ink-600 rounded-lg px-4 py-2 text-center shadow-xs">
                    <span className="text-3xs font-bold uppercase tracking-wider text-ink-700 block">SGPA</span>
                    <span className="font-mono text-xl font-black text-text-900 block leading-tight">
                      {Number(studentCardData.sgpa || 0).toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <div className="bg-surface-0 border border-border rounded-lg px-3 py-1.5 text-center">
                    <span className="text-3xs font-medium text-text-400 uppercase tracking-wider block">SGPA</span>
                    <span className="text-2xs font-mono text-text-400 block italic">
                      Combined Only
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 text-xs"
              >
                <Printer size={13} />
                <span>Print Statement</span>
              </Button>
              <Button
                variant="primary"
                onClick={() => setIsStudentCardModalOpen(false)}
                className="text-xs"
              >
                Done
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
