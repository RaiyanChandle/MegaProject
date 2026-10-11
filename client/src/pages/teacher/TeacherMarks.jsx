import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../api/client';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import { toast } from '../../components/ui/Toast';
import { 
  FileCheck, 
  Save, 
  HelpCircle, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Search,
  Filter,
  Layers
} from 'lucide-react';

export default function TeacherMarks() {
  const [allocations, setAllocations] = useState([]);
  const [selectedAllocationId, setSelectedAllocationId] = useState('');
  const [isLoadingAllocations, setIsLoadingAllocations] = useState(true);

  // Grid Data
  const [gridData, setGridData] = useState(null);
  const [isLoadingGrid, setIsLoadingGrid] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local edited marks map: { [enrollmentId]: { [componentId]: string | number } }
  const [marksState, setMarksState] = useState({});
  const [dirtyEnrollments, setDirtyEnrollments] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);

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
    setDirtyEnrollments(new Set());
    try {
      const query = divisionId ? `?subjectId=${subjectId}&divisionId=${divisionId}` : `?subjectId=${subjectId}`;
      const data = await apiClient.get(`/marks/grid${query}`);
      setGridData(data);

      // Initialize local marks state
      const initialMarks = {};
      data.rows.forEach(row => {
        initialMarks[row.enrollmentId] = { ...(row.marks || {}) };
      });
      setMarksState(initialMarks);
    } catch (error) {
      toast.error(error.message || 'Failed to load marks grid');
    } finally {
      setIsLoadingGrid(false);
    }
  };

  // Handle cell change
  const handleMarkChange = (enrollmentId, componentId, value, maxMarks) => {
    // Basic formatting
    if (value !== '' && (isNaN(value) || Number(value) < 0)) {
      return;
    }

    setMarksState(prev => ({
      ...prev,
      [enrollmentId]: {
        ...(prev[enrollmentId] || {}),
        [componentId]: value
      }
    }));

    setDirtyEnrollments(prev => {
      const next = new Set(prev);
      next.add(enrollmentId);
      return next;
    });
  };

  // Handle keyboard navigation between input cells (ArrowUp, ArrowDown, Enter)
  const handleKeyDown = (e, rowIndex, compIndex) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.getElementById(`mark-input-${rowIndex + 1}-${compIndex}`);
      if (nextInput) nextInput.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.getElementById(`mark-input-${rowIndex - 1}-${compIndex}`);
      if (prevInput) prevInput.focus();
    } else if (e.key === 'ArrowRight' && e.target.selectionStart === e.target.value.length) {
      const nextColInput = document.getElementById(`mark-input-${rowIndex}-${compIndex + 1}`);
      if (nextColInput) nextColInput.focus();
    } else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0) {
      const prevColInput = document.getElementById(`mark-input-${rowIndex}-${compIndex - 1}`);
      if (prevColInput) prevColInput.focus();
    }
  };

  // Save marks
  const handleSave = async () => {
    if (!gridData || !gridData.subject) return;

    // Build payload of marks to save
    const payloadMarks = [];
    let hasValidationErrors = false;

    // Scan through all dirty or all rows
    gridData.rows.forEach(row => {
      const enrMarks = marksState[row.enrollmentId] || {};
      gridData.subject.components.forEach(comp => {
        const val = enrMarks[comp.id];
        if (val !== undefined && val !== null && val !== '') {
          const num = Number(val);
          if (num > comp.maxMarks) {
            hasValidationErrors = true;
            toast.error(`Marks for ${row.studentName} in ${comp.name} (${num}) exceed max marks (${comp.maxMarks})`);
          } else {
            payloadMarks.push({
              enrollmentId: row.enrollmentId,
              componentId: comp.id,
              marksObtained: num
            });
          }
        }
      });
    });

    if (hasValidationErrors) return;

    if (payloadMarks.length === 0) {
      toast.info('No mark changes to save');
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiClient.post('/marks/save', {
        subjectId: gridData.subject.id,
        marks: payloadMarks
      });

      toast.success(res.message || 'Marks saved successfully');
      setDirtyEnrollments(new Set());

      // Refresh grid to reflect computed SubjectResult
      const currentAlloc = allocations.find(a => a.id === selectedAllocationId);
      if (currentAlloc) {
        fetchGrid(currentAlloc.subjectId, currentAlloc.divisionId);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to save marks');
    } finally {
      setIsSaving(false);
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

  // Calculate live row total and status
  const calculateRowStats = (row) => {
    if (!gridData?.subject?.components) return { total: 0, percentage: 0, isPass: null };
    const enrMarks = marksState[row.enrollmentId] || {};
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
    
    let isPass = null;
    if (allGraded && totalMax > 0) {
      isPass = (percentage >= 40.0) && passedExternal;
    }

    return { total, totalMax, percentage, isPass, allGraded };
  };

  const selectedAlloc = allocations.find(a => a.id === selectedAllocationId);
  const totalMaxMarks = gridData?.subject?.components?.reduce((sum, c) => sum + Number(c.maxMarks), 0) || 0;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text-900 flex items-center gap-2">
            <FileCheck className="text-ink-700" size={24} />
            Marks & Internal Assessment Grid
          </h2>
          <p className="text-sm text-text-500 mt-1">
            Flow 10: Enter component marks per student enrollment. Supports keyboard navigation and partial save.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !gridData}
            className="flex items-center gap-2"
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : dirtyEnrollments.size > 0 ? `Save (${dirtyEnrollments.size} modified)` : 'Save Marks'}
          </Button>
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

      {/* KEYBOARD SHORTCUTS HINT */}
      <div className="bg-ink-50/50 border border-ink-200/60 rounded-lg p-3 text-xs text-text-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-ink-600" />
          <span><strong>Keyboard Friendly:</strong> Use <kbd className="px-1.5 py-0.5 bg-surface-0 border border-border rounded text-2xs font-mono">Arrow Keys</kbd> or <kbd className="px-1.5 py-0.5 bg-surface-0 border border-border rounded text-2xs font-mono">Enter</kbd> to jump between cells effortlessly.</span>
        </div>
        <span className="text-text-500 hidden sm:inline">Total marks automatically computed</span>
      </div>

      {/* MARKS GRID TABLE */}
      <div className="bg-surface-0 border border-border rounded-xl shadow-2xs overflow-hidden">
        {isLoadingGrid ? (
          <div className="py-20 text-center text-text-500">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2"></div>
            <div>Loading students and marks grid...</div>
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
                    <th key={comp.id} className="py-3 px-3 text-center min-w-[110px] border-l border-border/60">
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
                {filteredRows.map((row, rowIndex) => {
                  const stats = calculateRowStats(row);
                  const isRowDirty = dirtyEnrollments.has(row.enrollmentId);

                  return (
                    <tr 
                      key={row.enrollmentId} 
                      className={`hover:bg-surface-50/70 transition-colors ${isRowDirty ? 'bg-ink-50/20' : ''}`}
                    >
                      {/* Roll Number */}
                      <td className="py-2 px-3 text-center font-mono text-xs font-semibold text-text-700">
                        {row.rollNumber}
                      </td>

                      {/* Student Info */}
                      <td className="py-2 px-3">
                        <div className="font-medium text-text-900">{row.studentName}</div>
                        <div className="text-2xs text-text-400 font-mono">{row.instituteId}</div>
                      </td>

                      {/* Division */}
                      <td className="py-2 px-2 text-center text-xs font-mono text-text-600">
                        {row.divisionName}
                      </td>

                      {/* Component Inputs */}
                      {gridData.subject.components.map((comp, compIndex) => {
                        const currentVal = marksState[row.enrollmentId]?.[comp.id] ?? '';
                        const isExceeded = currentVal !== '' && Number(currentVal) > comp.maxMarks;

                        return (
                          <td key={comp.id} className="py-2 px-2 border-l border-border/50 text-center">
                            <input
                              id={`mark-input-${rowIndex}-${compIndex}`}
                              type="number"
                              min="0"
                              max={comp.maxMarks}
                              step="0.5"
                              value={currentVal}
                              onChange={(e) => handleMarkChange(row.enrollmentId, comp.id, e.target.value, comp.maxMarks)}
                              onKeyDown={(e) => handleKeyDown(e, rowIndex, compIndex)}
                              placeholder="—"
                              className={`w-20 text-center py-1 px-1.5 text-sm font-mono rounded border transition-all ${
                                isExceeded
                                  ? 'border-danger bg-danger/10 text-danger focus:ring-danger'
                                  : 'border-border bg-surface-0 focus:border-ink-500 focus:ring-ink-500'
                              }`}
                            />
                          </td>
                        );
                      })}

                      {/* Live Computed Total */}
                      <td className="py-2 px-3 text-center font-mono font-semibold text-text-900 border-l border-border">
                        {stats.total} <span className="text-3xs text-text-400 font-normal">/ {stats.totalMax}</span>
                      </td>

                      {/* Live Computed Percentage */}
                      <td className="py-2 px-3 text-center font-mono text-xs text-text-700">
                        {stats.percentage}%
                      </td>

                      {/* Result Badge (T10.1 & T10.3) */}
                      <td className="py-2 px-3 text-center">
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
  );
}
