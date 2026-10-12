import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import StatusBadge from '../../components/ui/StatusBadge';
import { toast } from '../../components/ui/Toast';
import { useSearch } from '../../context/SearchContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Users, 
  Award, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  BookOpen,
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
import OfficialMarksheetView from '../../components/results/OfficialMarksheetView';

export default function ParentMarks() {
  const { searchQuery } = useSearch();
  const { t, currentLanguage, changeLanguage, languages } = useLanguage();
  const [activeMainTab, setActiveMainTab] = useState('marksheet');
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [marksData, setMarksData] = useState(null);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  const [isLoadingMarks, setIsLoadingMarks] = useState(false);

  // Modal state for viewing subject assessment breakdown in list form
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [componentFilter, setComponentFilter] = useState('ALL'); // ALL, EVALUATED, PENDING

  // 1. Fetch linked children
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const data = await apiClient.get('/parents/my-children');
        const list = Array.isArray(data) ? data : [];
        setChildren(list);
        if (list.length > 0) {
          setSelectedChildId(list[0].id);
        }
      } catch (error) {
        toast.error('Failed to load linked children');
      } finally {
        setIsLoadingChildren(false);
      }
    };
    fetchChildren();
  }, []);

  // 2. Fetch marks when selected child changes
  useEffect(() => {
    if (!selectedChildId) return;

    const fetchMarks = async () => {
      setIsLoadingMarks(true);
      try {
        const data = await apiClient.get(`/marks/my-marks?studentId=${selectedChildId}`);
        setMarksData(data);
      } catch (error) {
        toast.error('Failed to load child marks');
      } finally {
        setIsLoadingMarks(false);
      }
    };
    fetchMarks();
  }, [selectedChildId]);

  const selectedChild = useMemo(() => {
    return children.find(c => c.id === selectedChildId) || children[0] || null;
  }, [children, selectedChildId]);

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

  if (isLoadingChildren) {
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
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-surface-0 border border-border rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-900 tracking-tight">
            {t('academicPerformance')}
          </h2>
          <p className="text-xs sm:text-sm text-text-500 mt-1">
            {t('marksSubtitle')} {selectedChild?.name || t('student')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Quick Language Dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-surface-50 text-xs">
            <span className="text-text-400 font-semibold hidden md:inline">{t('selectLanguage')}:</span>
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

          {selectedChild && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-50 border border-border text-xs text-text-700 font-mono">
              <span className="font-semibold text-text-900">{selectedChild.name}</span>
              <span className="text-text-400">•</span>
              <span>{t('roll')}: {selectedChild.rollNumber || '--'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Ward Switcher */}
      {children.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-xs font-semibold text-text-500 uppercase tracking-wide mr-1 shrink-0">
            {t('student')}:
          </span>
          {children.map(child => {
            const isSelected = child.id === selectedChildId;
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => {
                  setSelectedChildId(child.id);
                  setSelectedSubject(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-ink-900 text-white border-ink-900 shadow-xs'
                    : 'bg-surface-0 text-text-700 border-border hover:bg-surface-50'
                }`}
              >
                <GraduationCap size={13} className={isSelected ? 'text-brass-500' : 'text-text-400'} />
                <span>{child.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1 print:hidden">
        <button
          onClick={() => setActiveMainTab('marksheet')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-md transition-colors flex items-center gap-2 border-b-2 ${
            activeMainTab === 'marksheet'
              ? 'border-ink-900 text-ink-900 bg-surface-0 shadow-xs'
              : 'border-transparent text-text-500 hover:text-text-900 hover:bg-surface-50'
          }`}
        >
          <Award className="w-4 h-4 text-ink-700" />
          <span>Official Grade Report & Marksheet</span>
        </button>

        <button
          onClick={() => setActiveMainTab('assessment')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-md transition-colors flex items-center gap-2 border-b-2 ${
            activeMainTab === 'assessment'
              ? 'border-ink-900 text-ink-900 bg-surface-0 shadow-xs'
              : 'border-transparent text-text-500 hover:text-text-900 hover:bg-surface-50'
          }`}
        >
          <Layers className="w-4 h-4 text-text-500" />
          <span>Continuous Assessment Components</span>
        </button>
      </div>

      {activeMainTab === 'marksheet' ? (
        <OfficialMarksheetView studentId={selectedChildId} isParent={true} />
      ) : (
        <>
          {/* Simple 3-Card Summary for Parents */}
          {isLoadingMarks ? (
        <div className="bg-surface-0 border border-border rounded-xl p-8 text-center text-xs text-text-500">
          <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-ink-700" />
          Loading academic performance...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Passed Subjects */}
          <div className="bg-surface-0 border border-border rounded-xl p-4 sm:p-5 shadow-xs">
            <span className="text-xs font-semibold text-text-500 uppercase tracking-wider block">
              {t('clearedSubjects')}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-emerald-700 tracking-tight">
                {passedCount}
              </span>
              <span className="text-sm font-mono text-text-400 font-medium">
                / {subjects.length}
              </span>
            </div>
            <p className="text-xs text-text-500 mt-1.5">
              {inProgressCount > 0 ? `${inProgressCount} ${t('evaluationsUnderway')}` : t('evaluationsFinalized')}
            </p>
          </div>

          {/* Average Performance */}
          <div className="bg-surface-0 border border-border rounded-xl p-4 sm:p-5 shadow-xs">
            <span className="text-xs font-semibold text-text-500 uppercase tracking-wider block">
              {t('averageScore')}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-text-900 tracking-tight">
                {(() => {
                  const scored = subjects.filter(s => s.subjectResult?.percentage != null);
                  if (scored.length === 0) return '—';
                  const avg = Math.round(scored.reduce((acc, s) => acc + s.subjectResult.percentage, 0) / scored.length);
                  return `${avg}%`;
                })()}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-surface-100 text-text-700">
                {t('currentTerm')}
              </span>
            </div>
            <p className="text-xs text-text-500 mt-1.5">
              {t('basedOnAssessments')}
            </p>
          </div>

          {/* Attention / Backlogs */}
          <div className={`rounded-xl p-4 sm:p-5 border shadow-xs ${
            failedCount > 0 ? 'bg-danger/5 border-danger/25' : 'bg-surface-0 border-border'
          }`}>
            <span className="text-xs font-semibold text-text-500 uppercase tracking-wider block">
              {t('academicStanding')}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-3xl font-extrabold font-mono tracking-tight ${
                failedCount > 0 ? 'text-danger' : 'text-emerald-700'
              }`}>
                {failedCount === 0 ? t('goodStanding') : `${failedCount} ${t('backlog')}`}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                failedCount > 0 ? 'bg-danger/10 text-danger' : 'bg-emerald-50 text-emerald-700'
              }`}>
                {failedCount === 0 ? t('goodStanding') : t('needsRetake')}
              </span>
            </div>
            <p className="text-xs text-text-500 mt-1.5">
              {failedCount === 0
                ? t('noFailedSubjects')
                : `${failedCount} ${t('needsRetake')}`}
            </p>
          </div>
        </div>
      )}

      {/* Gentle Advisory If Any Subject Failed */}
      {failedCount > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 sm:p-4 flex items-start gap-3">
          <AlertCircle className="text-amber-700 shrink-0 mt-0.5" size={18} />
          <div className="text-xs text-amber-900 leading-relaxed">
            <strong className="font-bold">{t('academicStanding')}:</strong> {selectedChild?.name}{' '}
            <span className="font-semibold underline">
              {subjects.filter(s => s.subjectResult?.isPass === false).map(s => s.subjectName).join(', ')}
            </span>
            .
          </div>
        </div>
      )}

      {/* Clean Subject-wise Marks List */}
      <div className="bg-surface-0 border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-text-900">
              {t('subjectResults')}
            </h3>
            <p className="text-xs text-text-500 mt-0.5">
              {t('marksHint')}
            </p>
          </div>
          <span className="text-xs text-text-500 font-medium hidden sm:inline">
            {filteredSubjects.length} {t('enrolledCourses')}
          </span>
        </div>

        {filteredSubjects.length === 0 ? (
          <div className="p-10 text-center text-xs text-text-500 italic bg-surface-50">
            {searchQuery ? `No subject matches "${searchQuery}"` : t('noSubjectsFound')}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredSubjects.map(sub => {
              const res = sub.subjectResult;
              const isPassed = res?.isPass === true;
              const isFailed = res?.isPass === false;

              return (
                <div
                  key={sub.enrollmentId}
                  onClick={() => {
                    setSelectedSubject(sub);
                    setComponentFilter('ALL');
                  }}
                  className="p-4 sm:p-5 hover:bg-surface-50/70 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  {/* Left: Subject Info */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-text-700 px-2 py-0.5 rounded bg-surface-100">
                        {sub.subjectCode}
                      </span>
                      <h4 className="font-bold text-sm sm:text-base text-text-900 group-hover:text-ink-700 transition-colors truncate">
                        {sub.subjectName}
                      </h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-500">
                      <span>{sub.credits} {t('credits')}</span>
                      <span>•</span>
                      <span>{sub.components?.length || 0} {t('assessmentsCount')}</span>
                      {sub.attemptNumber > 1 && (
                        <>
                          <span>•</span>
                          <span className="text-amber-700 font-medium">{t('attempt')} #{sub.attemptNumber}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Score and Result Status */}
                  <div className="flex items-center gap-3 sm:gap-4 shrink-0 justify-between sm:justify-end">
                    <div className="text-right">
                      {res ? (
                        <>
                          <div className={`text-base sm:text-lg font-extrabold font-mono ${
                            isFailed ? 'text-danger' : 'text-text-900'
                          }`}>
                            {res.totalMarksObtained} <span className="text-xs text-text-400 font-normal">/ {res.totalMaxMarks}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-text-500 block">
                            {res.percentage}%
                          </span>
                        </>
                      ) : (
                        <span className="text-xs font-mono text-text-400 italic">
                          {t('gradingInProgress')}
                        </span>
                      )}
                    </div>

                    <div className="min-w-[80px] text-right">
                      {isPassed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={12} /> {t('passedBadge')}
                        </span>
                      ) : isFailed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-danger/10 text-danger border border-danger/20">
                          <AlertCircle size={12} /> {t('failedBadge')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock size={12} /> {t('ongoingBadge')}
                        </span>
                      )}
                    </div>

                    <ChevronRight size={18} className="text-text-400 group-hover:text-text-900 group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Simple Marks Breakdown Modal */}
      {selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="bg-surface-0 border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border bg-surface-50/70 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-ink-900 text-white">
                    {selectedSubject.subjectCode}
                  </span>
                  {selectedSubject.subjectResult && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      selectedSubject.subjectResult.isPass === true
                        ? 'bg-emerald-50 text-emerald-700'
                        : selectedSubject.subjectResult.isPass === false
                          ? 'bg-danger/10 text-danger'
                          : 'bg-amber-50 text-amber-800'
                    }`}>
                      {selectedSubject.subjectResult.isPass === true ? t('passedBadge') : selectedSubject.subjectResult.isPass === false ? t('failedBadge') : t('ongoingBadge')}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-text-900 mt-1">
                  {selectedSubject.subjectName}
                </h3>
                {selectedSubject.subjectResult && (
                  <p className="text-xs text-text-500 mt-0.5">
                    {t('score')}: <strong>{selectedSubject.subjectResult.totalMarksObtained} / {selectedSubject.subjectResult.totalMaxMarks}</strong> ({selectedSubject.subjectResult.percentage}%)
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedSubject(null)}
                className="p-1.5 rounded-lg text-text-400 hover:text-text-900 hover:bg-surface-100 transition-colors"
                title={t('close')}
              >
                <X size={18} />
              </button>
            </div>

            {/* Assessment Component Score List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {filteredComponents.length === 0 ? (
                <div className="py-10 text-center text-xs text-text-500 italic bg-surface-50 rounded-lg">
                  {t('noSessionsFound')}
                </div>
              ) : (
                filteredComponents.map((comp) => {
                  const isScored = comp.marksObtained !== null && comp.marksObtained !== undefined;
                  const isPassing = isScored ? (comp.marksObtained >= (comp.passingMarks || 0)) : null;

                  return (
                    <div
                      key={comp.id}
                      className="p-3 rounded-lg border border-border bg-surface-0 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-text-900">
                          {comp.name}
                        </div>
                        <p className="text-[11px] text-text-500">
                          {t('maxMarks')}: {comp.maxMarks} • {t('passThreshold')}: {comp.passingMarks || '—'}
                        </p>
                      </div>

                      <div className="text-right">
                        {isScored ? (
                          <div>
                            <span className={`font-mono font-bold text-sm ${
                              isPassing ? 'text-emerald-700' : 'text-danger'
                            }`}>
                              {comp.marksObtained}
                            </span>
                            <span className="text-text-400 font-mono text-xs"> / {comp.maxMarks}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-mono text-text-400 italic">
                            {t('pendingBadge')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-border bg-surface-50/60 flex items-center justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedSubject(null)}
                className="text-xs"
              >
                {t('close')}
              </Button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
