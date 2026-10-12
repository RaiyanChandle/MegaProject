import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import Button from '../../components/ui/Button';
import { toast } from '../../components/ui/Toast';
import { 
  FileCheck, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  Layers,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';
import TeacherExamEvaluation from './TeacherExamEvaluation';

export default function TeacherMarks() {
  const [activeTab, setActiveTab] = useState('internal');
  const [allocations, setAllocations] = useState([]);
  const [selectedAllocationId, setSelectedAllocationId] = useState('');
  const [isLoadingAllocations, setIsLoadingAllocations] = useState(true);

  // Grid Data (Read-Only Register)
  const [gridData, setGridData] = useState(null);
  const [isLoadingGrid, setIsLoadingGrid] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch teacher's allocated subjects on load
  useEffect(() => {
    fetchAllocations();
  }, []);

  const fetchAllocations = async () => {
    setIsLoadingAllocations(true);
    try {
      const data = await apiClient.get('/marks/teacher-subjects');
      setAllocations(data);
      if (data.length > 0) {
        setSelectedAllocationId(data[0].id);
      }
    } catch (error) {
      toast.error('Failed to load subject allocations');
    } finally {
      setIsLoadingAllocations(false);
    }
  };

  // Load grid when selected allocation changes
  useEffect(() => {
    if (selectedAllocationId) {
      const alloc = allocations.find(a => a.id === selectedAllocationId);
      if (alloc) {
        fetchGrid(alloc.subjectId, alloc.divisionId);
      }
    }
  }, [selectedAllocationId]);

  const fetchGrid = async (subjectId, divisionId) => {
    setIsLoadingGrid(true);
    try {
      const query = divisionId ? `?subjectId=${subjectId}&divisionId=${divisionId}` : `?subjectId=${subjectId}`;
      const data = await apiClient.get(`/marks/grid${query}`);
      setGridData(data);
    } catch (error) {
      toast.error(error.message || 'Failed to load marks grid');
    } finally {
      setIsLoadingGrid(false);
    }
  };

  const handleRefresh = () => {
    const alloc = allocations.find(a => a.id === selectedAllocationId);
    if (alloc) {
      fetchGrid(alloc.subjectId, alloc.divisionId);
      toast.info('Refreshed marks register');
    }
  };

  // Filter rows based on search
  const filteredRows = (gridData?.rows || []).filter(row => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      row.studentName?.toLowerCase().includes(q) ||
      row.rollNumber?.toLowerCase().includes(q) ||
      row.instituteId?.toLowerCase().includes(q)
    );
  });

  // Calculate row total and pass/fail status
  const calculateRowStats = (row) => {
    if (!gridData?.subject?.components) return { total: 0, percentage: 0, isPass: null, allGraded: false };
    const enrMarks = row.marks || {};
    let total = 0;
    let allGraded = true;
    let passedExternal = true;

    gridData.subject.components.forEach(comp => {
      const val = enrMarks[comp.id];
      if (val !== undefined && val !== null && val !== '') {
        const num = Number(val);
        total += num;
        if (comp.category === 'EXTERNAL' && num < 0.4 * comp.maxMarks) {
          passedExternal = false;
        }
      } else {
        allGraded = false;
      }
    });

    const totalMax = gridData.subject.components.reduce((sum, c) => sum + Number(c.maxMarks), 0);
    const percentage = totalMax > 0 ? Number(((total / totalMax) * 100).toFixed(1)) : 0;
    
    // Check if backend already computed official subject result
    let isPass = row.subjectResult?.isPass ?? null;
    if (isPass === null && allGraded && totalMax > 0) {
      isPass = (percentage >= 40.0) && passedExternal;
    }

    return { total, totalMax, percentage, isPass, allGraded };
  };

  const totalMaxMarks = gridData?.subject?.components?.reduce((sum, c) => sum + Number(c.maxMarks), 0) || 0;

  return (
    <div className="space-y-6">
      {/* MODULE TABS: Continuous Assessment vs Formal Exam Evaluation */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab('internal')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-md transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'internal'
              ? 'border-ink-900 text-ink-900 bg-surface-0 shadow-xs'
              : 'border-transparent text-text-500 hover:text-text-900 hover:bg-surface-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Continuous Assessment (Internal Components)</span>
        </button>

        <button
          onClick={() => setActiveTab('exams')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-md transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'exams'
              ? 'border-ink-900 text-ink-900 bg-surface-0 shadow-xs'
              : 'border-transparent text-text-500 hover:text-text-900 hover:bg-surface-50'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Official Examination Evaluation (MSE & ESE)</span>
        </button>
      </div>

      {activeTab === 'exams' ? (
        <TeacherExamEvaluation />
      ) : (
        <div className="space-y-6">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-semibold text-text-900 flex items-center gap-2">
                  <Layers className="text-ink-700" size={24} />
                  Continuous Assessment Register
                </h2>
                <span className="px-2.5 py-0.5 rounded text-2xs font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  Read-Only Register
                </span>
              </div>
              <p className="text-sm text-text-500 mt-1">
                Verified assessment records synchronized from Official Examination Evaluation.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                onClick={handleRefresh}
                disabled={isLoadingGrid}
                className="flex items-center gap-1.5 text-xs"
              >
                <RefreshCw size={14} className={isLoadingGrid ? 'animate-spin' : ''} />
                Refresh Register
              </Button>

              <Button 
                variant="accent"
                onClick={() => setActiveTab('exams')}
                className="flex items-center gap-2 text-xs"
              >
                <FileCheck size={15} />
                <span>Evaluate in Official Exam Desk</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          </div>

          {/* POLICY CALLOUT BANNER */}
          <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-4 text-xs text-amber-950 flex items-start gap-3.5 shadow-xs">
            <AlertCircle size={20} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <div className="font-semibold text-amber-950 text-sm">
                Continuous Assessment Verification Protocol
              </div>
              <p className="text-amber-900/90 leading-relaxed">
                Direct editing of Continuous Assessment marks is prohibited. Faculty members must enter student marks exclusively through the{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('exams')}
                  className="font-bold underline text-amber-950 hover:text-black focus:outline-none"
                >
                  Official Examination Evaluation (MSE & ESE)
                </button>{' '}
                portal. Once marks are submitted and formally verified by the Examination Cell, they will automatically reflect in this Continuous Assessment register.
              </p>
            </div>
          </div>

          {/* ALLOCATION SELECTOR & FILTER BAR */}
          <div className="bg-surface-0 border border-border rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <label className="text-sm font-medium text-text-700 whitespace-nowrap">
                Assigned Subject:
              </label>
              <select
                value={selectedAllocationId}
                onChange={(e) => setSelectedAllocationId(e.target.value)}
                disabled={isLoadingAllocations}
                className="text-sm rounded-lg border-border bg-surface-50 px-3 py-2 text-text-900 focus:ring-ink-500 max-w-md font-medium"
              >
                {allocations.map(alloc => (
                  <option key={alloc.id} value={alloc.id}>
                    {alloc.subject?.code} - {alloc.subject?.name} ({alloc.class?.name}{alloc.division ? ` / Div ${alloc.division.name}` : ''})
                  </option>
                ))}
              </select>
            </div>

            {/* SEARCH BOX */}
            <div className="relative w-full md:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student or roll no..."
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-surface-50 border border-border rounded-lg text-text-900 focus:ring-ink-500"
              />
            </div>
          </div>

          {/* METRIC BADGES / SUMMARY */}
          {gridData?.subject && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-surface-0 border border-border rounded-lg p-3">
                <span className="text-xs text-text-500 uppercase font-medium">Subject Code</span>
                <div className="text-base font-semibold text-text-900 font-mono mt-0.5">
                  {gridData.subject.code}
                </div>
              </div>
              <div className="bg-surface-0 border border-border rounded-lg p-3">
                <span className="text-xs text-text-500 uppercase font-medium">Credits</span>
                <div className="text-base font-semibold text-text-900 mt-0.5">
                  {gridData.subject.credits} Credits
                </div>
              </div>
              <div className="bg-surface-0 border border-border rounded-lg p-3">
                <span className="text-xs text-text-500 uppercase font-medium">Total Scheme Marks</span>
                <div className="text-base font-semibold text-text-900 mt-0.5">
                  {totalMaxMarks} Marks ({gridData.subject.components?.length || 0} Components)
                </div>
              </div>
              <div className="bg-surface-0 border border-border rounded-lg p-3">
                <span className="text-xs text-text-500 uppercase font-medium">Enrolled Students</span>
                <div className="text-base font-semibold text-text-900 mt-0.5">
                  {gridData.rows?.length || 0} Students
                </div>
              </div>
            </div>
          )}

          {/* MARKS GRID TABLE */}
          <div className="bg-surface-0 border border-border rounded-xl shadow-2xs overflow-hidden">
            {isLoadingGrid ? (
              <div className="py-20 text-center text-text-500">
                <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2"></div>
                <div>Loading students and continuous assessment register...</div>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="py-20 text-center text-text-500 italic">
                No students enrolled for this subject allocation.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-surface-50 border-b border-border text-xs uppercase text-text-600 font-semibold tracking-wider">
                      <th className="py-3 px-3 w-16 text-center">Roll No</th>
                      <th className="py-3 px-3 min-w-[180px]">Student Name</th>
                      <th className="py-3 px-2 w-14 text-center">Div</th>
                      
                      {/* Dynamic Assessment Components */}
                      {gridData.subject.components.map(comp => (
                        <th key={comp.id} className="py-3 px-3 text-center min-w-[120px] border-l border-border/60">
                          <div className="font-semibold text-text-900">{comp.name}</div>
                          <div className="text-2xs text-text-500 font-mono mt-0.5 flex items-center justify-center gap-1">
                            <span>Max: {comp.maxMarks}</span>
                            <span className={`px-1 py-0.2 rounded font-sans text-3xs ${comp.category === 'EXTERNAL' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                              {comp.category}
                            </span>
                          </div>
                        </th>
                      ))}

                      <th className="py-3 px-3 text-center w-24 border-l border-border">Total</th>
                      <th className="py-3 px-3 text-center w-20">%</th>
                      <th className="py-3 px-3 text-center w-28">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-sans">
                    {filteredRows.map((row) => {
                      const stats = calculateRowStats(row);

                      return (
                        <tr 
                          key={row.enrollmentId} 
                          className="hover:bg-surface-50/70 transition-colors"
                        >
                          {/* Roll Number */}
                          <td className="py-2.5 px-3 text-center font-mono text-xs font-semibold text-text-700">
                            {row.rollNumber}
                          </td>

                          {/* Student Info */}
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-text-900">{row.studentName}</div>
                            <div className="text-2xs text-text-400 font-mono">{row.instituteId}</div>
                          </td>

                          {/* Division */}
                          <td className="py-2.5 px-2 text-center text-xs font-mono text-text-600">
                            {row.divisionName}
                          </td>

                          {/* Component Marks (Read-Only Badges) */}
                          {gridData.subject.components.map(comp => {
                            const val = row.marks?.[comp.id];
                            const hasMark = val !== undefined && val !== null && val !== '';

                            return (
                              <td key={comp.id} className="py-2.5 px-2 border-l border-border/50 text-center">
                                {hasMark ? (
                                  <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-text-900 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    {val}
                                    <span className="text-3xs text-emerald-600 font-normal">/{comp.maxMarks}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-2xs font-mono text-text-400 px-2 py-0.5 rounded bg-surface-50 border border-border/60">
                                    Pending Exam
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          {/* Live Computed Total */}
                          <td className="py-2.5 px-3 text-center font-mono font-semibold text-text-900 border-l border-border">
                            {stats.total} <span className="text-3xs text-text-400 font-normal">/ {stats.totalMax}</span>
                          </td>

                          {/* Live Computed Percentage */}
                          <td className="py-2.5 px-3 text-center font-mono text-xs text-text-700">
                            {stats.percentage}%
                          </td>

                          {/* Result Badge */}
                          <td className="py-2.5 px-3 text-center">
                            {stats.isPass === true ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={11} /> Pass
                              </span>
                            ) : stats.isPass === false ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertCircle size={11} /> Fail
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium bg-surface-100 text-text-500 border border-border">
                                Incomplete
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
      )}
    </div>
  );
}
