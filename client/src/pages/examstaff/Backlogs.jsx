import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import Button from '../../components/ui/Button';
import { toast } from '../../components/ui/Toast';
import {
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Users,
  Calendar,
  ArrowRight,
  Search,
  Building,
  Layers,
  BookOpen,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Clock,
  ChevronRight,
  Check
} from 'lucide-react';
import { useSearch } from '../../context/SearchContext';

export default function Backlogs() {
  const { searchQuery } = useSearch();

  const [terms, setTerms] = useState([]);
  const [sourceTermId, setSourceTermId] = useState('');
  const [targetTermId, setTargetTermId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Selected items for bulk re-attempt creation
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (sourceTermId || targetTermId) {
      fetchCandidates();
    }
  }, [sourceTermId, targetTermId, selectedDeptId]);

  const fetchInitialData = async () => {
    try {
      const [termData, deptData] = await Promise.all([
        apiClient.get('/academic-terms'),
        apiClient.get('/departments')
      ]);

      const termList = termData.terms || termData || [];
      setTerms(termList);
      setDepartments(deptData.departments || deptData || []);

      const current = termList.find(t => t.isCurrent);
      if (current) {
        setTargetTermId(current.id);
        // Find previous term if available for source
        const previous = termList.find(t => t.id !== current.id);
        if (previous) {
          setSourceTermId(previous.id);
        } else {
          setSourceTermId(''); // all terms
        }
      } else if (termList.length > 0) {
        setTargetTermId(termList[0].id);
      }
    } catch (err) {
      console.error('Failed to load initial metadata:', err);
      toast.error('Failed to load terms or departments');
    }
  };

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (sourceTermId) params.append('academicTermId', sourceTermId);
      if (targetTermId) params.append('targetTermId', targetTermId);
      if (selectedDeptId) params.append('departmentId', selectedDeptId);

      const res = await apiClient.get(`/backlogs/failed-enrollments?${params.toString()}`);
      const list = res.failedEnrollments || [];
      setCandidates(list);

      // Auto-select eligible candidates (not already enrolled in target term and not passed later)
      const eligible = list
        .filter(c => !c.alreadyEnrolledInTargetTerm && !c.hasPassedLater)
        .map(c => c.id);
      setSelectedIds(new Set(eligible));
    } catch (err) {
      console.error('Failed to fetch backlog candidates:', err);
      toast.error('Failed to fetch backlog candidates');
    } finally {
      setLoading(false);
    }
  };

  // Toggle selection
  const handleToggleOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleAll = (eligibleCandidates) => {
    if (selectedIds.size === eligibleCandidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(eligibleCandidates.map(c => c.id)));
    }
  };

  // Bulk create re-attempt enrollments
  const handleCreateReattempts = async () => {
    if (!targetTermId) {
      toast.error('Please select a target academic term for re-attempt enrollment');
      return;
    }

    const idsToCreate = Array.from(selectedIds);
    if (idsToCreate.length === 0) {
      toast.error('No candidates selected for re-attempt enrollment');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiClient.post('/backlogs/create-reattempts', {
        targetAcademicTermId: targetTermId,
        enrollmentIds: idsToCreate
      });

      toast.success(res.message || `Successfully created ${res.createdCount} re-attempt enrollments`);

      if (res.skippedCount > 0) {
        toast.warning(`Skipped ${res.skippedCount} candidate(s) (already enrolled or cleared)`);
      }

      await fetchCandidates();
    } catch (err) {
      console.error('Re-attempt creation error:', err);
      toast.error(err.response?.data?.error || 'Failed to create re-attempt enrollments');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return candidates;
    const q = searchQuery.toLowerCase();
    return candidates.filter(c =>
      c.studentName?.toLowerCase().includes(q) ||
      c.instituteId?.toLowerCase().includes(q) ||
      c.rollNumber?.toLowerCase().includes(q) ||
      c.subjectName?.toLowerCase().includes(q) ||
      c.subjectCode?.toLowerCase().includes(q)
    );
  }, [candidates, searchQuery]);

  // Eligibility
  const eligibleCandidates = useMemo(() => {
    return filteredCandidates.filter(c => !c.alreadyEnrolledInTargetTerm && !c.hasPassedLater);
  }, [filteredCandidates]);

  const stats = useMemo(() => {
    const total = candidates.length;
    const enrolledInTarget = candidates.filter(c => c.alreadyEnrolledInTargetTerm).length;
    const cleared = candidates.filter(c => c.hasPassedLater).length;
    const pendingEnrollment = candidates.filter(c => !c.alreadyEnrolledInTargetTerm && !c.hasPassedLater).length;
    const uniqueStudents = new Set(candidates.map(c => c.studentId)).size;
    return { total, enrolledInTarget, cleared, pendingEnrollment, uniqueStudents };
  }, [candidates]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-ink-900 flex items-center justify-center text-white">
            <RotateCcw size={20} className="text-brass-500" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-900">Backlog & Re-attempt Enrollments</h1>
            <p className="text-xs text-text-500">
              Manage failed subjects, increment attempt counters, and create re-attempt enrollments for target terms (Rules 6–9)
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCandidates}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateReattempts}
            disabled={submitting || selectedIds.size === 0 || !targetTermId}
            className="flex items-center gap-1.5 text-xs bg-ink-900 text-white hover:bg-ink-700"
          >
            <Sparkles size={13} className="text-brass-500" />
            {submitting ? 'Creating...' : `Create Re-attempts (${selectedIds.size})`}
          </Button>
        </div>
      </div>

      {/* Filter & Term Selectors */}
      <div className="bg-surface-0 border border-border rounded-md p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Source Term */}
          <div>
            <label className="block text-xs font-medium text-text-900 mb-1">
              Source Exam Term (Where failure occurred)
            </label>
            <select
              value={sourceTermId}
              onChange={e => setSourceTermId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md border border-border bg-surface-50 text-xs text-text-900 focus:border-ink-700 focus:outline-none"
            >
              <option value="">All Academic Terms</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>{t.name} {t.isCurrent ? '(Current)' : ''}</option>
              ))}
            </select>
          </div>

          {/* Target Term for Re-attempt */}
          <div>
            <label className="block text-xs font-medium text-text-900 mb-1">
              Target Term for Re-attempt Enrollment (Next Term)
            </label>
            <select
              value={targetTermId}
              onChange={e => setTargetTermId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md border border-border bg-surface-50 text-xs font-semibold text-text-900 focus:border-ink-700 focus:outline-none"
            >
              {terms.map(t => (
                <option key={t.id} value={t.id}>{t.name} {t.isCurrent ? '(Active / Current)' : ''}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-xs font-medium text-text-900 mb-1">
              Department
            </label>
            <select
              value={selectedDeptId}
              onChange={e => setSelectedDeptId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md border border-border bg-surface-50 text-xs text-text-900 focus:border-ink-700 focus:outline-none"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-0 border border-border rounded-md p-3">
          <p className="text-xs text-text-500 font-medium">Failed Subjects</p>
          <p className="text-xl font-bold font-mono text-danger mt-1">{stats.total}</p>
          <p className="text-[11px] text-text-500 mt-0.5">{stats.uniqueStudents} unique student(s)</p>
        </div>

        <div className="bg-surface-0 border border-border rounded-md p-3">
          <p className="text-xs text-text-500 font-medium">Pending Re-enrollment</p>
          <p className="text-xl font-bold font-mono text-warning mt-1">{stats.pendingEnrollment}</p>
          <p className="text-[11px] text-text-500 mt-0.5">Ready for next term</p>
        </div>

        <div className="bg-surface-0 border border-border rounded-md p-3">
          <p className="text-xs text-text-500 font-medium">Enrolled in Target Term</p>
          <p className="text-xl font-bold font-mono text-info mt-1">{stats.enrolledInTarget}</p>
          <p className="text-[11px] text-text-500 mt-0.5">Attempt counter incremented</p>
        </div>

        <div className="bg-surface-0 border border-border rounded-md p-3">
          <p className="text-xs text-text-500 font-medium">Cleared Later</p>
          <p className="text-xl font-bold font-mono text-success mt-1">{stats.cleared}</p>
          <p className="text-[11px] text-text-500 mt-0.5">Passed on re-attempt</p>
        </div>
      </div>

      {/* Candidate List Table */}
      <div className="bg-surface-0 border border-border rounded-md overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="select-all-candidates"
              checked={eligibleCandidates.length > 0 && selectedIds.size === eligibleCandidates.length}
              onChange={() => handleToggleAll(eligibleCandidates)}
              className="rounded border-border text-ink-900 focus:ring-ink-700 cursor-pointer"
            />
            <label htmlFor="select-all-candidates" className="text-xs font-semibold text-text-900 cursor-pointer">
              Select All Eligible ({eligibleCandidates.length})
            </label>
          </div>

          <span className="text-xs text-text-500">
            {selectedIds.size} candidate(s) selected
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 rounded-full border-2 border-brass-500 border-t-transparent animate-spin" />
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="text-center py-12 text-sm text-text-500">
            No backlog records found matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-surface-50 text-text-500 text-xs font-medium uppercase tracking-wide border-b border-border">
                  <th className="p-3 w-8"></th>
                  <th className="p-3">Candidate</th>
                  <th className="p-3">Subject / Course</th>
                  <th className="p-3">Original Class</th>
                  <th className="p-3">Failed Term</th>
                  <th className="p-3 text-center">Attempt</th>
                  <th className="p-3">Next Term Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCandidates.map(c => {
                  const isEligible = !c.alreadyEnrolledInTargetTerm && !c.hasPassedLater;
                  const isChecked = selectedIds.has(c.id);

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-surface-50 transition-colors ${isChecked ? 'bg-surface-50/70' : ''}`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={!isEligible}
                          onChange={() => handleToggleOne(c.id)}
                          className="rounded border-border text-ink-900 focus:ring-ink-700 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </td>

                      <td className="p-3">
                        <p className="font-semibold text-text-900 text-xs">{c.studentName}</p>
                        <p className="font-mono text-[11px] text-text-500">
                          {c.instituteId} • Roll: {c.rollNumber} • Div: {c.divisionName}
                        </p>
                      </td>

                      <td className="p-3">
                        <p className="font-semibold text-text-900 text-xs">{c.subjectName}</p>
                        <p className="font-mono text-[11px] text-text-500">
                          Code: {c.subjectCode} • {c.credits} Credits ({c.subjectType})
                        </p>
                      </td>

                      <td className="p-3">
                        <p className="text-xs text-text-900">{c.originalClassName}</p>
                        <p className="font-mono text-[11px] text-text-500">
                          Batch: {c.originalBatchYear} (Sem {c.originalSemesterNumber})
                        </p>
                      </td>

                      <td className="p-3">
                        <span className="text-xs text-text-700 font-medium">{c.failedTermName}</span>
                        <span className="block text-[10px] text-danger font-semibold">FAILED</span>
                      </td>

                      <td className="p-3 text-center">
                        <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold">
                          <span className="text-danger">Att {c.attemptNumber}</span>
                          <ArrowRight size={11} className="text-text-400" />
                          <span className="text-ink-900 font-bold">Att {c.nextAttemptNumber}</span>
                        </span>
                      </td>

                      <td className="p-3">
                        {c.hasPassedLater ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-success/10 text-success">
                            <CheckCircle2 size={11} />
                            Cleared
                          </span>
                        ) : c.alreadyEnrolledInTargetTerm ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-info/10 text-info">
                              Enrolled (Attempt {c.nextAttemptNumber})
                            </span>
                            {c.teacherAllocatedInNewTerm ? (
                              <p className="text-[10px] text-text-500 font-mono">Faculty: {c.allocatedTeacherName}</p>
                            ) : (
                              <p className="text-[10px] text-warning flex items-center gap-0.5">
                                <AlertTriangle size={10} /> No faculty allocated
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-warning/10 text-warning">
                            <Clock size={11} />
                            Pending Re-enrollment
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
