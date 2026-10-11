import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiClient } from '../../api/client';
import { toast } from '../../components/ui/Toast';
import { useLanguage } from '../../context/LanguageContext';
import {
  Award,
  GraduationCap,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  Printer,
  Download,
  RefreshCw,
  AlertTriangle,
  Building,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { CollegeSealLogo, ExamControllerSeal } from '../student/StudentResultCard';

// Helper to format percentage safely
const clampPercentage = (val) => {
  if (val === null || val === undefined || isNaN(val)) return null;
  return Number(Math.min(100, Math.max(0, Number(val))).toFixed(2));
};

const getGradeColor = (grade) => {
  if (!grade) return 'text-text-400';
  if (['O', 'A+', 'A'].includes(grade)) return 'text-emerald-600';
  if (['B+', 'B'].includes(grade)) return 'text-sky-600';
  if (grade === 'C') return 'text-amber-600';
  return 'text-red-600';
};

const getGradeBg = (grade) => {
  if (!grade) return 'bg-surface-100 text-text-600 border-border';
  if (['O', 'A+', 'A'].includes(grade)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (['B+', 'B'].includes(grade)) return 'bg-sky-50 text-sky-700 border-sky-200';
  if (grade === 'C') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
};

export default function ParentResultCard() {
  const { t, currentLanguage, changeLanguage, languages } = useLanguage();
  const printRef = useRef(null);

  // Parent's linked children
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);

  // Result parameters
  const [selectedExamType, setSelectedExamType] = useState('MIDTERM');
  const [selectedTermId, setSelectedTermId] = useState('');
  const [resultData, setResultData] = useState(null);
  const [isLoadingResult, setIsLoadingResult] = useState(false);

  // 1. Fetch parent's children
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        setIsLoadingChildren(true);
        const data = await apiClient.get('/parents/my-children');
        const list = Array.isArray(data) ? data : [];
        setChildren(list);
        if (list.length > 0) {
          setSelectedChildId(list[0].id);
        }
      } catch (err) {
        toast.error('Failed to load linked students');
      } finally {
        setIsLoadingChildren(false);
      }
    };
    fetchChildren();
  }, []);

  // 2. Fetch Result Card when child, term, or exam series changes
  useEffect(() => {
    if (!selectedChildId) return;

    const fetchResult = async () => {
      setIsLoadingResult(true);
      try {
        const params = new URLSearchParams();
        if (selectedTermId) params.append('academicTermId', selectedTermId);
        if (selectedExamType) params.append('examType', selectedExamType);

        const data = await apiClient.get(`/results/student/${selectedChildId}?${params.toString()}`);
        setResultData(data);

        // Auto-select term if not set yet
        if (!selectedTermId && data.academicTerm?.id) {
          setSelectedTermId(data.academicTerm.id);
        }
      } catch (err) {
        console.error('Failed to load student result card:', err);
        setResultData(null);
      } finally {
        setIsLoadingResult(false);
      }
    };

    fetchResult();
  }, [selectedChildId, selectedTermId, selectedExamType]);

  const selectedChild = useMemo(() => {
    return children.find(c => c.id === selectedChildId) || children[0] || null;
  }, [children, selectedChildId]);

  const computed = resultData?.computed;
  const persistedCard = resultData?.persistedCard;
  const isGenerated = Boolean(persistedCard || (computed && computed.canGenerate));
  const isPending = Boolean(!computed || !computed.canGenerate || (computed.pendingSubjects && computed.pendingSubjects.length > 0));
  const pendingSubjects = computed?.pendingSubjects || [];

  const handlePrint = () => {
    window.print();
  };

  if (isLoadingChildren) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto pb-12">
        <div className="h-20 bg-surface-0 animate-pulse rounded-xl border border-border" />
        <div className="h-64 bg-surface-0 animate-pulse rounded-xl border border-border" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto pb-16">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & LANGUAGE SELECTOR (Mobile Optimized)
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-surface-0 border border-border rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-brass-500/10 text-brass-700">
              <Award size={20} />
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-text-900 tracking-tight">
              Examination Result Card
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-text-500 mt-1">
            Official semester performance and grade report for your ward
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Quick Language Dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-surface-50 text-xs">
            <span className="text-text-400 font-semibold hidden md:inline">{t('selectLanguage') || 'Lang'}:</span>
            <select
              value={currentLanguage}
              onChange={(e) => changeLanguage(e.target.value)}
              className="bg-transparent text-text-900 font-bold focus:outline-none cursor-pointer"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.native} ({l.name})
                </option>
              ))}
            </select>
          </div>

          {/* Print/Download Button (Hidden during print) */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            disabled={!isGenerated}
            className="text-xs font-semibold print:hidden flex items-center gap-1.5"
            title={!isGenerated ? "Official result card not generated yet" : "Print official A4 marksheet"}
          >
            <Printer size={14} />
            <span className="hidden sm:inline">Print Marksheet</span>
            <span className="sm:hidden">Print</span>
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. WARD / CHILD SWITCHER (For parents with multiple children)
         ───────────────────────────────────────────────────────────── */}
      {children.length > 1 && (
        <div className="bg-surface-0 border border-border rounded-xl p-3 shadow-xs">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-xs font-semibold text-text-500 uppercase tracking-wide mr-1 shrink-0 flex items-center gap-1">
              <GraduationCap size={14} /> Ward:
            </span>
            {children.map(child => {
              const isSelected = child.id === selectedChildId;
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setSelectedChildId(child.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-ink-900 text-white border-ink-900 shadow-xs'
                      : 'bg-surface-50 text-text-700 border-border hover:bg-surface-100'
                  }`}
                >
                  <span className="font-bold">{child.name}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-surface-200 text-text-600'
                  }`}>
                    Roll: {child.rollNumber || child.instituteId || '—'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. EXAM SERIES & TERM SELECTION TOOLBAR (Simple, Touch Friendly)
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-surface-0 border border-border rounded-xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Exam Series Tabs (MIDTERM vs FINAL vs INTERNAL) */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-100 rounded-lg border border-border/80 self-stretch sm:self-auto overflow-x-auto">
          {[
            { id: 'MIDTERM', label: 'Midterm Exam', short: 'Midterm' },
            { id: 'FINAL', label: 'Final Exam (End Sem)', short: 'Final' },
            { id: 'INTERNAL', label: 'Continuous Internal', short: 'Internal' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedExamType(tab.id)}
              className={`flex-1 sm:flex-none px-3 py-2 rounded-md text-xs font-bold transition-all text-center whitespace-nowrap ${
                selectedExamType === tab.id
                  ? 'bg-white text-ink-900 shadow-xs border border-border/60'
                  : 'text-text-500 hover:text-text-900'
              }`}
            >
              <span className="sm:hidden">{tab.short}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Academic Term Dropdown */}
        <div className="flex items-center gap-2 justify-end">
          <Calendar size={14} className="text-text-400 shrink-0" />
          <select
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            className="w-full sm:w-auto px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-border bg-surface-50 text-text-800 focus:outline-none focus:ring-1 focus:ring-brass-500"
          >
            {resultData?.allTerms?.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} {t.isCurrent ? '• Active' : ''}
              </option>
            )) || <option value="">Loading terms...</option>}
          </select>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. MAIN RESULT CONTENT AREA
         ───────────────────────────────────────────────────────────── */}
      {isLoadingResult ? (
        <div className="bg-surface-0 border border-border rounded-xl p-12 text-center shadow-xs">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-ink-700" />
          <p className="text-sm font-semibold text-text-800">Retrieving official examination records...</p>
          <p className="text-xs text-text-400 mt-1">Checking published statement of grades for {selectedChild?.name}</p>
        </div>
      ) : isPending ? (
        /* ── CASE A: RESULT IS PENDING — EXPLICIT NOTICE & SUBJECT REASONS ── */
        <div className="space-y-4">
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-start gap-3">
              <span className="p-2 rounded-full bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                <AlertTriangle size={20} />
              </span>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-amber-900">
                    Result Under Evaluation — Generation Pending
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-200/80 text-amber-900 uppercase tracking-wide">
                    {selectedExamType} SERIES
                  </span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  The official result card for <strong>{selectedChild?.name || 'your ward'}</strong> cannot be generated yet because marks evaluation is incomplete for <strong>{pendingSubjects.length} subject(s)</strong>.
                </p>
                <p className="text-xs text-amber-700/90 pt-1">
                  Once the subject faculty and the Controller of Examinations submit and verify all marks, the official statement of grades will be published automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Pending Subjects List Card */}
          <div className="bg-surface-0 border border-border rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border bg-surface-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-600" />
                <h4 className="text-sm font-bold text-text-900">
                  Subjects Awaiting Marks Entry ({pendingSubjects.length})
                </h4>
              </div>
              <span className="text-[11px] font-medium text-text-500">
                Action required by Department Faculty
              </span>
            </div>

            <div className="divide-y divide-border">
              {pendingSubjects.map((sub, idx) => (
                <div key={sub.subjectId || idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-0 hover:bg-surface-50/50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-surface-100 text-text-800 border border-border">
                        {sub.subjectCode}
                      </span>
                      <span className="font-bold text-sm text-text-900">
                        {sub.subjectName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-500">
                      <span className="text-amber-700 font-medium flex items-center gap-1">
                        <AlertCircle size={12} /> Reason: {sub.reason || 'Marks not yet submitted by faculty'}
                      </span>
                    </div>
                  </div>

                  <div className="self-start sm:self-auto shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      <Clock size={12} /> Pending Evaluation
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* What Has Been Graded So Far */}
          {computed?.subjectBreakdown && (
            <div className="bg-surface-0 border border-border rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-500 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  Evaluated Subjects for {selectedExamType}
                </h4>
                <span className="text-xs font-mono font-bold text-text-600">
                  {computed.subjectBreakdown.filter(s => !s.isPending).length} of {computed.subjectBreakdown.length} Ready
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {computed.subjectBreakdown.map((s, idx) => (
                  <div
                    key={s.subjectId || idx}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                      s.isPending
                        ? 'bg-surface-50 border-dashed border-amber-300 text-text-400'
                        : 'bg-surface-0 border-border text-text-800'
                    }`}
                  >
                    <div className="truncate mr-2">
                      <span className="font-mono font-semibold mr-1.5">{s.subjectCode}:</span>
                      <span className="font-medium">{s.subjectName}</span>
                    </div>
                    {s.isPending ? (
                      <span className="text-amber-600 font-bold shrink-0">Pending</span>
                    ) : (
                      <span className="font-mono font-bold text-emerald-700 shrink-0">
                        {s.marksObtained} / {s.maxMarks} ({s.grade})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── CASE B: RESULT IS GENERATED & PUBLISHED (Clean, Simple Mobile Hero) ── */
        <div className="space-y-4 sm:space-y-6">
          {/* Official Result Banner / Hero */}
          <div className={`rounded-xl border p-4 sm:p-6 shadow-xs ${
            computed?.overallPass !== false
              ? 'bg-gradient-to-br from-emerald-500/10 via-surface-0 to-surface-0 border-emerald-500/30'
              : 'bg-gradient-to-br from-red-500/10 via-surface-0 to-surface-0 border-red-500/30'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                    computed?.overallPass !== false
                      ? 'bg-emerald-600 text-white'
                      : 'bg-red-600 text-white'
                  }`}>
                    {computed?.overallPass !== false ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                    {computed?.classification || (computed?.overallPass ? 'PASSED' : 'NEEDS RETAKE')}
                  </span>
                  <span className="text-xs font-mono font-semibold text-text-500 px-2 py-0.5 rounded bg-surface-100">
                    {selectedExamType} EXAM
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-text-900 tracking-tight mt-2">
                  {selectedChild?.name}
                </h3>
                <p className="text-xs text-text-500 mt-0.5">
                  Roll: <strong className="text-text-700 font-mono">{resultData?.student?.rollNumber || selectedChild?.rollNumber || '—'}</strong> • Class: <strong className="text-text-700">{resultData?.student?.class || '—'}</strong> • {resultData?.academicTerm?.name}
                </p>
              </div>

              {persistedCard?.processedAt && (
                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[11px] font-semibold text-text-400 uppercase tracking-wider block">
                    Result Published On
                  </span>
                  <span className="text-xs font-mono font-bold text-text-700">
                    {new Date(persistedCard.processedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* 4 Simple Metrics (Mobile-Friendly Grid) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              {/* Metric 1: SGPA */}
              <div className="bg-surface-0 border border-border/80 rounded-xl p-3.5 shadow-2xs text-center">
                <span className="text-[11px] font-bold text-text-400 uppercase tracking-wider block">
                  Grade Point (SGPA)
                </span>
                <div className="mt-1 font-mono font-black text-2xl sm:text-3xl text-ink-900">
                  {computed?.sgpa != null ? Number(computed.sgpa).toFixed(2) : '—'}
                </div>
                <span className="text-[10px] text-text-400 font-mono">10-Point Scale</span>
              </div>

              {/* Metric 2: Percentage */}
              <div className="bg-surface-0 border border-border/80 rounded-xl p-3.5 shadow-2xs text-center">
                <span className="text-[11px] font-bold text-text-400 uppercase tracking-wider block">
                  Overall Score
                </span>
                <div className="mt-1 font-mono font-black text-2xl sm:text-3xl text-emerald-600">
                  {computed?.percentage != null ? `${clampPercentage(computed.percentage)}%` : '—'}
                </div>
                <span className="text-[10px] text-text-400 font-mono">Aggregated</span>
              </div>

              {/* Metric 3: Grade */}
              <div className="bg-surface-0 border border-border/80 rounded-xl p-3.5 shadow-2xs text-center">
                <span className="text-[11px] font-bold text-text-400 uppercase tracking-wider block">
                  Letter Grade
                </span>
                <div className={`mt-1 font-mono font-black text-2xl sm:text-3xl ${getGradeColor(computed?.overallGrade)}`}>
                  {computed?.overallGrade || '—'}
                </div>
                <span className="text-[10px] text-text-400 font-mono">Autonomous Scale</span>
              </div>

              {/* Metric 4: Total Marks */}
              <div className="bg-surface-0 border border-border/80 rounded-xl p-3.5 shadow-2xs text-center">
                <span className="text-[11px] font-bold text-text-400 uppercase tracking-wider block">
                  Marks Obtained
                </span>
                <div className="mt-1 font-mono font-black text-2xl sm:text-3xl text-text-900">
                  {computed?.totalMarks || 0}
                </div>
                <span className="text-[10px] text-text-400 font-mono">out of {computed?.maxMarks || 0}</span>
              </div>
            </div>
          </div>

          {/* Subject Breakdown Card (Mobile Card Stack + Desktop Table) */}
          <div className="bg-surface-0 border border-border rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-text-900">
                  Subject-wise Evaluation & Grades
                </h4>
                <p className="text-xs text-text-500 mt-0.5">
                  Detailed score for each registered subject in {selectedExamType} examination
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-text-500 hidden sm:inline">
                {computed?.subjectBreakdown?.length || 0} Courses
              </span>
            </div>

            {/* Mobile Card Layout (Visible on small screens) */}
            <div className="sm:hidden divide-y divide-border">
              {computed?.subjectBreakdown?.map((sub, i) => (
                <div key={sub.subjectId || i} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-1.5 py-0.5 rounded font-mono text-[11px] font-bold bg-surface-100 text-text-700 mr-2">
                        {sub.subjectCode}
                      </span>
                      <span className="font-bold text-sm text-text-900">
                        {sub.subjectName}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold shrink-0 border ${getGradeBg(sub.grade)}`}>
                      Grade: {sub.grade}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-text-500">
                      Credits: <strong className="text-text-700">{sub.credits}</strong>
                    </span>
                    <div className="text-right">
                      <span className="font-mono font-bold text-text-900">
                        {sub.marksObtained}
                      </span>
                      <span className="text-text-400 font-mono"> / {sub.maxMarks}</span>
                      <span className="ml-1.5 font-bold text-text-600">({sub.percentage}%)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/60 text-[11px]">
                    <span className="text-text-500">Grade Point: <strong>{sub.gradePoint} / 10</strong></span>
                    <span className={`font-bold ${sub.isPass ? 'text-emerald-700' : 'text-red-700'}`}>
                      {sub.isPass ? '✓ Cleared' : '✗ Needs Retake'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table Layout (Visible on tablet and above) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-surface-50 border-b border-border text-text-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Subject Title</th>
                    <th className="py-3 px-3 text-center">Credits</th>
                    <th className="py-3 px-4 text-center">Marks Obtained</th>
                    <th className="py-3 px-3 text-center">Score %</th>
                    <th className="py-3 px-3 text-center">Grade Point</th>
                    <th className="py-3 px-3 text-center">Grade</th>
                    <th className="py-3 px-4 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {computed?.subjectBreakdown?.map((sub, i) => (
                    <tr key={sub.subjectId || i} className="hover:bg-surface-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-text-700">
                        {sub.subjectCode}
                      </td>
                      <td className="py-3 px-4 font-semibold text-text-900">
                        {sub.subjectName}
                        {sub.subjectType && (
                          <span className="ml-2 text-[10px] text-text-400 font-normal">
                            ({sub.subjectType})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        {sub.credits}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        {sub.marksObtained} <span className="text-text-400 font-normal">/ {sub.maxMarks}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        {sub.percentage}%
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-ink-900">
                        {sub.gradePoint}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getGradeBg(sub.grade)}`}>
                          {sub.grade}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center gap-1 font-bold ${
                          sub.isPass ? 'text-emerald-700' : 'text-red-700'
                        }`}>
                          {sub.isPass ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                          {sub.isPass ? 'Passed' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Official Note Footer */}
            <div className="p-3 bg-surface-50 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-text-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                Autonomous Examination Cell verified statement
              </span>
              <span className="font-mono text-[11px]">
                Stmt Ref: {resultData?.statementNumber || 'KIT/AUT/OFFICIAL-STATEMENT'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. HIDDEN PRINTABLE A4 MARKSHEET (Rendered during window.print)
         ───────────────────────────────────────────────────────────── */}
      <div className="hidden print:block font-serif text-black p-4 bg-white" ref={printRef}>
        <style>{`
          @media print {
            body { background: white !important; color: black !important; font-family: 'Times New Roman', serif; }
            .print\\:hidden { display: none !important; }
            .print\\:block { display: block !important; }
            @page { size: A4 portrait; margin: 12mm 10mm; }
          }
        `}</style>

        {/* Autonomous College Header */}
        <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center">
          <div className="flex items-center justify-center gap-4 mb-1">
            <CollegeSealLogo size={64} />
            <div className="text-center">
              <h1 className="text-base font-black tracking-tight uppercase leading-snug">
                Kolhapur Institute of Technology's College of Engineering (Autonomous)
              </h1>
              <p className="text-[10px] italic">
                An Autonomous Institute Permanently Affiliated to Shivaji University, Kolhapur
              </p>
              <p className="text-[9px] font-sans font-medium text-slate-700">
                Approved by AICTE New Delhi • Recognized by Govt. of Maharashtra • Accredited by NAAC with 'A+' Grade
              </p>
              <p className="text-[9px] font-sans font-bold text-slate-800 tracking-wider uppercase mt-0.5">
                Office of the Controller of Examinations
              </p>
            </div>
            <ExamControllerSeal size={60} />
          </div>

          <div className="bg-slate-900 text-white font-sans font-bold text-xs py-1 px-3 uppercase tracking-wider inline-block rounded mt-1">
            {selectedExamType} Examination Statement of Grades & Marks
          </div>
        </div>

        {/* Student Details Grid */}
        <div className="border border-slate-800 p-2 text-[11px] font-sans mb-3 grid grid-cols-2 gap-x-4 gap-y-1 bg-slate-50/50">
          <div><strong>Candidate Name:</strong> {resultData?.student?.name}</div>
          <div><strong>Roll Number:</strong> {resultData?.student?.rollNumber || '—'}</div>
          <div><strong>Permanent Reg. No (PRN):</strong> {resultData?.student?.instituteId || '—'}</div>
          <div><strong>Class / Branch:</strong> {resultData?.student?.class} ({resultData?.student?.department})</div>
          <div><strong>Academic Term:</strong> {resultData?.academicTerm?.name}</div>
          <div><strong>Exam Series:</strong> {selectedExamType}</div>
          <div><strong>Statement No:</strong> {resultData?.statementNumber}</div>
          <div><strong>Date of Declaration:</strong> {new Date().toLocaleDateString('en-IN')}</div>
        </div>

        {/* Marks & Grades Table */}
        <table className="w-full border-collapse border border-slate-800 text-[10px] font-sans mb-3">
          <thead>
            <tr className="bg-slate-200 border-b border-slate-800 font-bold uppercase text-slate-900 text-center">
              <th className="border border-slate-700 p-1.5 text-left w-14">Course</th>
              <th className="border border-slate-700 p-1.5 text-left">Course Title</th>
              <th className="border border-slate-700 p-1.5 w-10">Credits</th>
              <th className="border border-slate-700 p-1.5 w-14">Max Marks</th>
              <th className="border border-slate-700 p-1.5 w-14">Marks Obt.</th>
              <th className="border border-slate-700 p-1.5 w-12">Score %</th>
              <th className="border border-slate-700 p-1.5 w-12">Grade Pt</th>
              <th className="border border-slate-700 p-1.5 w-10">Grade</th>
              <th className="border border-slate-700 p-1.5 w-14">Status</th>
            </tr>
          </thead>
          <tbody>
            {computed?.subjectBreakdown?.map((s, idx) => (
              <tr key={idx} className="border-b border-slate-700 text-center">
                <td className="border border-slate-700 p-1 text-left font-mono font-bold">{s.subjectCode}</td>
                <td className="border border-slate-700 p-1 text-left font-semibold">{s.subjectName}</td>
                <td className="border border-slate-700 p-1 font-mono">{s.credits}</td>
                <td className="border border-slate-700 p-1 font-mono">{s.maxMarks}</td>
                <td className="border border-slate-700 p-1 font-mono font-bold">{s.marksObtained}</td>
                <td className="border border-slate-700 p-1 font-mono">{s.percentage}%</td>
                <td className="border border-slate-700 p-1 font-mono font-bold">{s.gradePoint}</td>
                <td className="border border-slate-700 p-1 font-bold">{s.grade}</td>
                <td className="border border-slate-700 p-1 font-bold">{s.isPass ? 'PASS' : 'FAIL'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Aggregate Summary Box */}
        <div className="border border-slate-800 p-2 text-[11px] font-sans mb-6 grid grid-cols-4 gap-2 text-center bg-slate-50">
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Grand Total Marks</span>
            <strong className="text-sm font-mono">{computed?.totalMarks} / {computed?.maxMarks}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Aggregated Percentage</span>
            <strong className="text-sm font-mono">{computed?.percentage}%</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">SGPA (10 Pt Scale)</span>
            <strong className="text-base font-mono font-black">{computed?.sgpa}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Final Result</span>
            <strong className="text-xs uppercase text-emerald-800 font-bold block mt-0.5">
              {computed?.classification}
            </strong>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-8 pt-8 text-center text-[10px] font-sans font-bold uppercase tracking-wider">
          <div className="border-t border-slate-800 pt-1">
            Candidate Signature
          </div>
          <div className="border-t border-slate-800 pt-1">
            Prepared & Verified By
          </div>
          <div className="border-t border-slate-800 pt-1">
            Controller of Examinations
          </div>
        </div>
      </div>
    </div>
  );
}
