import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import StatusBadge from '../../components/ui/StatusBadge';
import { toast } from '../../components/ui/Toast';
import { useSearch } from '../../context/SearchContext';
import { 
  FileCheck, 
  Award, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  BookOpen,
  Calendar,
  Layers,
  ChevronRight,
  Eye,
  X,
  GraduationCap,
  Sparkles,
  BarChart2,
  RefreshCw
} from 'lucide-react';
import Button from '../../components/ui/Button';

export default function StudentMarks() {
  const { searchQuery } = useSearch();
  const [marksData, setMarksData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state for viewing subject assessment breakdown in list form
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [componentFilter, setComponentFilter] = useState('ALL'); // ALL, EVALUATED, PENDING

  useEffect(() => {
    fetchMarks();
  }, []);

  const fetchMarks = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get('/marks/my-marks');
      setMarksData(data);
    } catch (error) {
      toast.error('Failed to load marks and subject results');
    } finally {
      setIsLoading(false);
    }
  };

  const subjects = marksData?.subjects || [];

  // Summary KPIs
  const passedCount = useMemo(() => {
    return subjects.filter(s => s.subjectResult?.isPass === true).length;
  }, [subjects]);

  const failedCount = useMemo(() => {
    return subjects.filter(s => s.subjectResult?.isPass === false).length;
  }, [subjects]);

  const inProgressCount = useMemo(() => {
    return subjects.filter(s => !s.subjectResult || s.subjectResult?.isPass === null).length;
  }, [subjects]);

  // Filter subjects based on universal search
  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjects;
    const q = searchQuery.toLowerCase();
    return subjects.filter(s => 
      s.subjectName?.toLowerCase().includes(q) ||
      s.subjectCode?.toLowerCase().includes(q)
    );
  }, [subjects, searchQuery]);

  // Filtered components list inside modal
  const filteredComponents = useMemo(() => {
    if (!selectedSubject) return [];
    const list = selectedSubject.components || [];
    if (componentFilter === 'EVALUATED') {
      return list.filter(c => c.marksObtained !== null && c.marksObtained !== undefined);
    }
    if (componentFilter === 'PENDING') {
      return list.filter(c => c.marksObtained === null || c.marksObtained === undefined);
    }
    return list;
  }, [selectedSubject, componentFilter]);

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 max-w-7xl pb-12">
        <div className="h-24 bg-surface-0 animate-pulse rounded-xl border border-border" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-surface-0 animate-pulse rounded-xl border border-border" />
          ))}
        </div>
        <div className="h-64 bg-surface-0 animate-pulse rounded-xl border border-border" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl pb-12">
      {/* Top Banner */}
      <div className="bg-surface-0 border border-border rounded-xl p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-ink-900 text-white flex items-center justify-center shrink-0 shadow-xs border border-ink-700">
            <Award size={22} className="text-brass-500" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-2xl font-bold text-text-900 tracking-tight">
                Marks & Subject Results
              </h2>
              {marksData?.academicTerm && (
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-50 border border-border text-ink-900 font-semibold">
                  {marksData.academicTerm}
                </span>
              )}
            </div>
            <p className="text-xs text-text-500 mt-0.5">
              Continuous assessment, internal evaluations, and university term marks
            </p>
          </div>
        </div>

        {/* Academic Status Badge */}
        <div className="flex items-center gap-2 text-xs font-mono text-text-600 bg-surface-50 px-3 py-1.5 rounded-lg border border-border self-start sm:self-auto">
          <BarChart2 size={13} className="text-ink-900" />
          <span>Curricular Assessment Record</span>
        </div>
      </div>

      {/* KPI Summary Cards: 2x2 on mobile, 4 in a row on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Courses */}
        <div className="bg-surface-0 border border-border rounded-xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-text-500 font-medium uppercase tracking-wide">
              Total Courses
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-ink-900/10 text-ink-900">
              <BookOpen size={15} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-text-900">
              {subjects.length}
            </div>
            <span className="text-[10px] sm:text-[11px] text-text-500 block truncate">
              Evaluated subjects
            </span>
          </div>
        </div>

        {/* Passed Courses */}
        <div className="bg-surface-0 border border-border rounded-xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-text-500 font-medium uppercase tracking-wide">
              Passed
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700">
              {passedCount}
            </div>
            <span className="text-[10px] sm:text-[11px] text-text-500 block truncate">
              Cleared courses
            </span>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-surface-0 border border-border rounded-xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-text-500 font-medium uppercase tracking-wide">
              In Progress
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-amber-50 text-amber-700">
              <Clock size={15} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-800">
              {inProgressCount}
            </div>
            <span className="text-[10px] sm:text-[11px] text-text-500 block truncate">
              Grading underway
            </span>
          </div>
        </div>

        {/* Backlogs / Failed */}
        <div className="bg-surface-0 border border-border rounded-xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-text-500 font-medium uppercase tracking-wide">
              Backlogs
            </span>
            <div className={`p-1.5 sm:p-2 rounded-lg ${failedCount > 0 ? 'bg-danger/10 text-danger' : 'bg-surface-100 text-emerald-700'}`}>
              <AlertCircle size={15} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className={`text-xl sm:text-2xl font-bold font-mono ${failedCount > 0 ? 'text-danger' : 'text-text-900'}`}>
              {failedCount}
            </div>
            <span className="text-[10px] sm:text-[11px] text-text-500 block truncate">
              {failedCount > 0 ? 'Needs re-examination' : 'Zero course deficits'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Subjects Table Structure */}
      <div className="bg-surface-0 border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-text-900">Enrolled Subjects Marks Table</h3>
            <p className="text-xs text-text-500 mt-0.5">
              Click any subject row to inspect the internal test & component breakdown in a modal.
            </p>
          </div>
          <span className="font-mono text-xs text-text-500 hidden sm:inline">
            {filteredSubjects.length} Courses
          </span>
        </div>

        {/* Table View (Desktop & Tablet) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-50 border-b border-border text-text-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Credits</th>
                <th className="py-3 px-4">Attempt</th>
                <th className="py-3 px-4">Evaluated Components</th>
                <th className="py-3 px-4 min-w-[170px]">Score / Progress</th>
                <th className="py-3 px-4">Result Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSubjects.map((sub) => {
                const res = sub.subjectResult;
                const evaluatedCount = (sub.components || []).filter(c => c.marksObtained !== null && c.marksObtained !== undefined).length;
                const totalComp = sub.components?.length || 0;
                const pct = res?.percentage !== undefined ? res.percentage : null;

                return (
                  <tr 
                    key={sub.enrollmentId}
                    onClick={() => {
                      setSelectedSubject(sub);
                      setComponentFilter('ALL');
                    }}
                    className="hover:bg-surface-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-surface-50 border border-border text-ink-900">
                          {sub.subjectCode}
                        </span>
                        <span className="font-semibold text-text-900 group-hover:text-ink-700 transition-colors">
                          {sub.subjectName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-surface-100 text-text-700">
                        {sub.subjectType || 'CORE'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-text-700">
                      {sub.credits}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-text-700">
                      #{sub.attemptNumber}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-text-600">
                      {evaluatedCount} of {totalComp} entered
                    </td>
                    <td className="py-3.5 px-4">
                      {res ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className="font-bold text-text-900">{res.totalMarksObtained} / {res.totalMaxMarks}</span>
                            <span className="text-text-500">{res.percentage}%</span>
                          </div>
                          <div className="w-full bg-surface-100 rounded-full h-1.5 overflow-hidden border border-border/40">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                res.isPass === true 
                                  ? 'bg-emerald-600' 
                                  : res.isPass === false 
                                    ? 'bg-danger' 
                                    : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(res.percentage || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-text-400 font-mono italic">Pending Grading</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {res?.isPass === true ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={12} /> PASSED
                        </span>
                      ) : res?.isPass === false ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-danger/10 text-danger border border-danger/20">
                          <AlertCircle size={12} /> FAILED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock size={12} /> IN PROGRESS
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSubject(sub);
                          setComponentFilter('ALL');
                        }}
                        className="px-2.5 py-1.5 rounded-md border border-border bg-surface-0 hover:bg-surface-100 text-text-900 font-semibold text-xs transition-colors inline-flex items-center gap-1 shadow-xs"
                      >
                        <Eye size={12} className="text-ink-900" />
                        <span>Breakdown</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Table List (<md) */}
        <div className="md:hidden divide-y divide-border">
          {filteredSubjects.map((sub) => {
            const res = sub.subjectResult;
            const evaluatedCount = (sub.components || []).filter(c => c.marksObtained !== null && c.marksObtained !== undefined).length;
            const totalComp = sub.components?.length || 0;

            return (
              <div 
                key={sub.enrollmentId}
                onClick={() => {
                  setSelectedSubject(sub);
                  setComponentFilter('ALL');
                }}
                className="p-4 space-y-3 cursor-pointer hover:bg-surface-50/60 active:bg-surface-100/60 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-ink-900 text-white">
                        {sub.subjectCode}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-surface-100 text-text-600">
                        {sub.subjectType || 'CORE'}
                      </span>
                      <span className="font-mono text-[10px] text-text-500">
                        {sub.credits} Credits
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-text-900 mt-1 leading-snug">
                      {sub.subjectName}
                    </h4>
                  </div>

                  {/* Result Status Badge */}
                  {res?.isPass === true ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      <CheckCircle2 size={12} /> PASSED
                    </span>
                  ) : res?.isPass === false ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-danger/10 text-danger border border-danger/20 shrink-0">
                      <AlertCircle size={12} /> FAILED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                      <Clock size={12} /> IN PROGRESS
                    </span>
                  )}
                </div>

                {/* Score Summary & Progress */}
                {res ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-text-500 text-[11px]">
                        Score: <strong className="text-text-900">{res.totalMarksObtained} / {res.totalMaxMarks}</strong>
                      </span>
                      <span className="font-bold text-sm text-text-900">
                        {res.percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden border border-border/40">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          res.isPass === true 
                            ? 'bg-emerald-600' 
                            : res.isPass === false 
                              ? 'bg-danger' 
                              : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(res.percentage || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-text-400 font-mono italic">
                    Grading currently pending for this course
                  </div>
                )}

                {/* Touch Tap Trigger */}
                <div className="pt-1 flex items-center justify-between text-xs font-semibold text-ink-900 border-t border-border/60">
                  <span className="text-[11px] text-text-500 font-mono font-normal">
                    {evaluatedCount} of {totalComp} components evaluated
                  </span>
                  <span className="inline-flex items-center gap-1 hover:underline">
                    View Breakdown <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Marks & Assessment Breakdown Modal (List Form) */}
      {selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="bg-surface-0 border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border bg-surface-50/70 flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-ink-900 text-white uppercase">
                    {selectedSubject.subjectCode}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface-100 text-text-700">
                    {selectedSubject.subjectType || 'CORE'}
                  </span>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-0 border border-border text-text-700">
                    {selectedSubject.credits} Credits
                  </span>
                  {selectedSubject.subjectResult && (
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      selectedSubject.subjectResult.isPass === true
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : selectedSubject.subjectResult.isPass === false
                          ? 'bg-danger/10 text-danger border border-danger/20'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {selectedSubject.subjectResult.isPass === true ? 'PASSED' : selectedSubject.subjectResult.isPass === false ? 'FAILED' : 'IN PROGRESS'}
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-bold text-text-900 leading-snug">
                  {selectedSubject.subjectName}
                </h3>

                {selectedSubject.subjectResult && (
                  <p className="text-xs text-text-600 font-mono pt-0.5">
                    Cumulative Score: <strong>{selectedSubject.subjectResult.totalMarksObtained} / {selectedSubject.subjectResult.totalMaxMarks}</strong> ({selectedSubject.subjectResult.percentage}%)
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedSubject(null)}
                className="p-1.5 rounded-lg text-text-400 hover:text-text-900 hover:bg-surface-100 transition-colors shrink-0"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter Pills inside Modal */}
            <div className="px-4 py-2.5 border-b border-border bg-surface-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { key: 'ALL', label: `All Components (${selectedSubject.components?.length || 0})` },
                { key: 'EVALUATED', label: `Evaluated (${selectedSubject.components?.filter(c => c.marksObtained !== null && c.marksObtained !== undefined).length || 0})` },
                { key: 'PENDING', label: `Pending (${selectedSubject.components?.filter(c => c.marksObtained === null || c.marksObtained === undefined).length || 0})` }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setComponentFilter(tab.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                    componentFilter === tab.key
                      ? 'bg-ink-900 text-white shadow-xs'
                      : 'bg-surface-50 text-text-600 hover:text-text-900 hover:bg-surface-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Assessment Breakdown in List Form */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar">
              {filteredComponents.length === 0 ? (
                <div className="py-12 text-center text-xs text-text-500 italic bg-surface-50 rounded-lg border border-border border-dashed">
                  No assessment components match the selected filter.
                </div>
              ) : (
                filteredComponents.map((comp) => {
                  const isScored = comp.marksObtained !== null && comp.marksObtained !== undefined;
                  const pct = isScored ? comp.percentage : null;
                  const isPassing = isScored ? (comp.marksObtained >= (comp.passingMarks || 0)) : null;

                  return (
                    <div
                      key={comp.id}
                      className="p-3.5 sm:p-4 rounded-xl border border-border bg-surface-0 hover:bg-surface-50 transition-colors space-y-2.5 shadow-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs sm:text-sm text-text-900">
                              {comp.name}
                            </h4>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-100 text-text-600 font-semibold uppercase">
                              {comp.category || 'EXAM'}
                            </span>
                          </div>
                          <div className="text-[11px] text-text-500 font-mono mt-0.5">
                            Maximum Marks: {comp.maxMarks} • Passing Threshold: {comp.passingMarks} pts
                          </div>
                        </div>

                        {/* Marks Obtained Pill */}
                        <div className="self-start sm:self-auto shrink-0">
                          {isScored ? (
                            <div className="text-right">
                              <span className={`font-mono text-sm sm:text-base font-bold ${
                                isPassing ? 'text-emerald-700' : 'text-danger'
                              }`}>
                                {comp.marksObtained} <span className="text-xs text-text-400 font-normal">/ {comp.maxMarks}</span>
                              </span>
                              <span className={`block font-mono text-[10px] font-bold ${
                                isPassing ? 'text-emerald-700' : 'text-danger'
                              }`}>
                                {pct}% {isPassing ? '• Passed' : '• Below Pass'}
                              </span>
                            </div>
                          ) : (
                            <span className="font-mono text-xs text-text-400 italic bg-surface-50 px-2 py-0.5 rounded border border-border">
                              Not Graded Yet
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Score Progress Bar */}
                      {isScored && (
                        <div className="w-full bg-surface-100 rounded-full h-1.5 overflow-hidden border border-border/40">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              isPassing ? 'bg-emerald-600' : 'bg-danger'
                            }`}
                            style={{ width: `${Math.min(pct || 0, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-border bg-surface-50/60 flex items-center justify-between">
              <span className="text-xs font-mono text-text-500">
                {selectedSubject.subjectCode} • {selectedSubject.components?.length || 0} Components
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedSubject(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
