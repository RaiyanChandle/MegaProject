import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import { 
  X, 
  Search, 
  Hash, 
  Users, 
  Mail, 
  Building2, 
  Calendar, 
  GraduationCap, 
  ShieldCheck, 
  FileText,
  RotateCcw,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Download,
  Copy,
  Check,
  CheckCircle2,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { toast } from '../ui/Toast';

export default function IdRegistryModal({ prefix, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedStudentId, setExpandedStudentId] = useState(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [selectedDivision, setSelectedDivision] = useState('ALL');
  const [selectedEnrollmentStatus, setSelectedEnrollmentStatus] = useState('ALL');

  useEffect(() => {
    if (!isOpen || !prefix) return;

    const fetchUsers = async () => {
      setIsLoading(true);
      setSearchQuery('');
      setSelectedDept('ALL');
      setSelectedBatch('ALL');
      setSelectedDivision('ALL');
      setSelectedEnrollmentStatus('ALL');
      setExpandedStudentId(null);
      try {
        const res = await apiClient.get(`/dashboard/id-registry/${prefix}`);
        setData(res);
      } catch (error) {
        toast.error(`Failed to load registry records for ${prefix}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, prefix]);

  const users = data?.users || [];

  // Extract distinct facets
  const uniqueDepartments = useMemo(() => {
    const depts = new Set();
    users.forEach(u => {
      const dName = u.departmentName || u.department;
      if (dName && dName !== 'Unassigned') depts.add(dName);
    });
    return Array.from(depts).sort();
  }, [users]);

  const uniqueBatches = useMemo(() => {
    const batches = new Set();
    users.forEach(u => {
      if (u.batch) batches.add(u.batch);
    });
    return Array.from(batches).sort().reverse();
  }, [users]);

  const uniqueDivisions = useMemo(() => {
    const divs = new Set();
    users.forEach(u => {
      if (u.divisionName) divs.add(u.divisionName);
    });
    return Array.from(divs).sort();
  }, [users]);

  // Filtering
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch = 
          u.name?.toLowerCase().includes(q) ||
          u.instituteId?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.rollNumber?.toLowerCase().includes(q) ||
          u.department?.toLowerCase().includes(q) ||
          u.departmentName?.toLowerCase().includes(q) ||
          u.batch?.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Department
      if (selectedDept !== 'ALL') {
        const d = u.departmentName || u.department;
        if (d !== selectedDept) return false;
      }

      // Batch
      if (selectedBatch !== 'ALL' && u.batch !== selectedBatch) {
        return false;
      }

      // Division
      if (selectedDivision !== 'ALL') {
        if (selectedDivision === 'UNASSIGNED' && u.hasDivision) return false;
        if (selectedDivision !== 'UNASSIGNED' && u.divisionName !== selectedDivision) return false;
      }

      // Enrollment Status
      if (selectedEnrollmentStatus !== 'ALL') {
        if (selectedEnrollmentStatus === 'ENROLLED' && (!u.totalEnrollments || u.totalEnrollments === 0)) return false;
        if (selectedEnrollmentStatus === 'PENDING' && u.totalEnrollments > 0) return false;
      }

      return true;
    });
  }, [users, searchQuery, selectedDept, selectedBatch, selectedDivision, selectedEnrollmentStatus]);

  const hasActiveFilters = 
    searchQuery.trim() !== '' || 
    selectedDept !== 'ALL' || 
    selectedBatch !== 'ALL' || 
    selectedDivision !== 'ALL' || 
    selectedEnrollmentStatus !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedDept('ALL');
    setSelectedBatch('ALL');
    setSelectedDivision('ALL');
    setSelectedEnrollmentStatus('ALL');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success(`Copied ${text}`);
  };

  const exportCSV = () => {
    if (!filteredUsers.length) return;
    const headers = ['InstituteID', 'Name', 'Email', 'Department', 'BatchYear', 'Division', 'RollNumber', 'EnrolledSubjectsCount', 'RegisteredAt'];
    const rows = filteredUsers.map(u => [
      `"${u.instituteId || ''}"`,
      `"${u.name || ''}"`,
      `"${u.email || ''}"`,
      `"${u.departmentName || u.department || ''}"`,
      `"${u.batch || ''}"`,
      `"${u.divisionName || ''}"`,
      `"${u.rollNumber || ''}"`,
      `"${u.totalEnrollments || 0}"`,
      `"${u.createdAt ? new Date(u.createdAt).toISOString() : ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${prefix}_registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const isStudentView = prefix === 'STKIT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-ink-900/70 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div 
        className="bg-surface-0 border border-border rounded-xl shadow-2xl w-[98vw] max-w-7xl h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-border bg-surface-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-ink-900 text-brass-500 flex items-center justify-center shadow-xs">
              {isStudentView ? <GraduationCap size={22} /> : <Hash size={22} />}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold text-text-900 font-sans tracking-tight">
                  {data?.title || `Directory: ${prefix}`}
                </h3>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-ink-700 text-white font-semibold">
                  {data?.totalCount ?? 0} Accounts
                </span>
              </div>
              <p className="text-xs text-text-500 mt-0.5">
                {data?.description || 'All provisioned user records under this ID sequence.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={exportCSV}
              disabled={filteredUsers.length === 0}
              className="px-3.5 py-1.5 rounded-md border border-border bg-surface-0 text-xs font-medium text-text-900 hover:bg-surface-50 flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs"
              title="Export current view to CSV"
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-text-500 hover:text-text-900 hover:bg-surface-50 transition-colors"
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Structured Filter Bar */}
        <div className="px-6 py-3 border-b border-border bg-surface-0 flex flex-col gap-2.5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[260px] max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-500" />
              <input
                type="text"
                placeholder={isStudentView ? "Search by name, roll no, STKIT, email..." : "Search by name, ID, email..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-md border border-border text-xs focus:border-ink-700 focus:ring-1 focus:ring-ink-700 bg-surface-50 placeholder:text-text-500"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Department */}
              {uniqueDepartments.length > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-text-500 font-medium hidden md:inline">Dept:</span>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="px-2.5 py-1.5 rounded-md border border-border bg-surface-50 text-xs text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700 max-w-[180px] truncate"
                  >
                    <option value="ALL">All Departments</option>
                    {uniqueDepartments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Batch */}
              {isStudentView && uniqueBatches.length > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-text-500 font-medium hidden md:inline">Batch:</span>
                  <select
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="px-2.5 py-1.5 rounded-md border border-border bg-surface-50 text-xs text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700 font-mono"
                  >
                    <option value="ALL">All Batches</option>
                    {uniqueBatches.map(b => (
                      <option key={b} value={b}>Batch {b}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Division */}
              {isStudentView && (
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-text-500 font-medium hidden md:inline">Div:</span>
                  <select
                    value={selectedDivision}
                    onChange={(e) => setSelectedDivision(e.target.value)}
                    className="px-2.5 py-1.5 rounded-md border border-border bg-surface-50 text-xs text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
                  >
                    <option value="ALL">All Divisions</option>
                    {uniqueDivisions.map(d => (
                      <option key={d} value={d}>Division {d}</option>
                    ))}
                    <option value="UNASSIGNED">Unassigned</option>
                  </select>
                </div>
              )}

              {/* Subjects State */}
              {isStudentView && (
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-text-500 font-medium hidden md:inline">Subjects:</span>
                  <select
                    value={selectedEnrollmentStatus}
                    onChange={(e) => setSelectedEnrollmentStatus(e.target.value)}
                    className="px-2.5 py-1.5 rounded-md border border-border bg-surface-50 text-xs text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
                  >
                    <option value="ALL">All Subjects</option>
                    <option value="ENROLLED">Enrolled in Subjects</option>
                    <option value="PENDING">Pending (0 Subjects)</option>
                  </select>
                </div>
              )}

              {/* Clear button */}
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="px-2.5 py-1.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium hover:bg-amber-100 flex items-center gap-1 transition-colors"
                  title="Reset all active filters"
                >
                  <RotateCcw size={12} /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Sub-bar: Clean Status Bar */}
          <div className="flex items-center justify-between text-xs text-text-500 font-mono pt-1">
            <div className="flex items-center gap-2">
              <span>
                Showing <strong className="text-text-900">{filteredUsers.length}</strong> of {users.length} provisioned accounts
              </span>
              {hasActiveFilters && (
                <span className="text-ink-700 font-semibold">• (Filtered View)</span>
              )}
            </div>
            {isStudentView && (
              <span className="text-[11px] text-text-500 hidden sm:inline">
                Click any subject count badge to view enrolled subjects
              </span>
            )}
          </div>
        </div>

        {/* Spacious Table Area with Persistent Always-Visible Horizontal Scrollbar */}
        <div className="flex-1 min-h-0 p-4 md:p-6 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-14 bg-surface-50 rounded-lg animate-pulse border border-border" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-16 text-center bg-surface-50 rounded-xl border border-dashed border-border text-text-500 my-auto">
              <Hash size={40} className="mx-auto mb-3 text-text-500/50" />
              <p className="text-base font-semibold text-text-900">No matching records found</p>
              <p className="text-xs text-text-500 mt-1 max-w-md mx-auto">
                {hasActiveFilters 
                  ? "No accounts match your current filter parameters. Try clearing or adjusting search keywords."
                  : `No users have been provisioned under the ${prefix} sequence yet.`}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="mt-4 px-4 py-1.5 rounded-md bg-ink-900 text-white text-xs font-medium hover:bg-ink-700 transition-colors"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-auto always-visible-scrollbar w-full border border-border rounded-xl shadow-xs bg-surface-0">
              <table className="min-w-[1050px] w-full text-left border-collapse text-sm">
                <thead className="sticky top-0 z-20 bg-surface-50 border-b border-border shadow-xs">
                  <tr className="bg-surface-50 text-text-500 text-xs font-medium uppercase tracking-wide select-none">
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Institute ID</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">{isStudentView ? 'Student & Roll' : 'Full Name'}</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Department</th>
                    {isStudentView && <th className="py-3 px-4 font-medium whitespace-nowrap">Cohort & Division</th>}
                    {isStudentView && <th className="py-3 px-4 font-medium whitespace-nowrap">Enrolled Subjects</th>}
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Email Address</th>
                    <th className="py-3 px-4 font-medium text-right whitespace-nowrap">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((user) => {
                    const isExpanded = expandedStudentId === user.id;

                    return (
                      <React.Fragment key={user.id}>
                        <tr className={`hover:bg-surface-50/80 transition-colors ${isExpanded ? 'bg-surface-50/60' : ''}`}>
                          {/* Institute ID with copy button */}
                          <td className="py-3 px-4 font-mono font-semibold text-ink-900 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-1 rounded bg-surface-50 border border-border text-xs">
                                {user.instituteId}
                              </span>
                              <button
                                onClick={() => copyToClipboard(user.instituteId)}
                                className="text-text-500 hover:text-ink-700 p-1 rounded transition-colors"
                                title="Copy ID"
                              >
                                {copiedId === user.instituteId ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                              </button>
                            </div>
                          </td>

                          {/* Name & Roll (Clean whitespace-nowrap layout) */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div>
                              <div className="font-semibold text-text-900 leading-snug">
                                {user.name}
                              </div>
                              {user.rollNumber && (
                                <div className="font-mono text-xs text-text-500 leading-snug mt-0.5">
                                  Roll No: {user.rollNumber}
                                </div>
                              )}
                              {user.secondaryField && !user.rollNumber && (
                                <div className="text-xs text-text-500 leading-snug mt-0.5">
                                  {user.secondaryField}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Department with Code (single line, no wrapping) */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-text-900 text-xs capitalize">
                                {user.departmentName || user.department}
                              </span>
                              {user.departmentCode && (
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-50 border border-border text-text-500 uppercase font-semibold">
                                  {user.departmentCode}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Cohort & Division (Student only) */}
                          {isStudentView && (
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-medium px-2 py-0.5 rounded bg-surface-50 border border-border text-text-900">
                                  Batch {user.batch || '—'}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                                  user.hasDivision 
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}>
                                  {user.division}
                                </span>
                              </div>
                            </td>
                          )}

                          {/* Enrolled Subjects Button (Clickable directly) */}
                          {isStudentView && (
                            <td className="py-3 px-4 whitespace-nowrap">
                              <button
                                onClick={() => setExpandedStudentId(isExpanded ? null : user.id)}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-all border ${
                                  isExpanded
                                    ? 'bg-ink-700 text-white border-ink-700 shadow-xs'
                                    : user.totalEnrollments > 0
                                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                                }`}
                                title="Click to view subject roster"
                              >
                                <BookOpen size={12} />
                                <span>{user.totalEnrollments} Subjects</span>
                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                            </td>
                          )}

                          {/* Email Address */}
                          <td className="py-3 px-4 font-mono text-xs text-text-500 whitespace-nowrap">
                            {user.email}
                          </td>

                          {/* Registered Date */}
                          <td className="py-3 px-4 font-mono text-xs text-text-500 text-right whitespace-nowrap">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                          </td>
                        </tr>

                        {/* Expanded Subject Roster Drawer */}
                        {isStudentView && isExpanded && (
                          <tr className="bg-surface-50/90 border-b border-border">
                            <td colSpan={7} className="p-4 pl-8 md:pl-12">
                              <div className="bg-surface-0 border border-border rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-3 border-b border-border/80 pb-2.5">
                                  <div className="flex items-center gap-2">
                                    <BookOpen size={15} className="text-brass-500" />
                                    <h4 className="text-xs font-bold text-text-900 uppercase tracking-wider">
                                      Active Subject Enrollments • {user.name} ({user.instituteId})
                                    </h4>
                                  </div>
                                  <span className="text-xs font-mono text-text-500">
                                    {user.enrollments?.length || 0} Registered Curriculum Subjects
                                  </span>
                                </div>

                                {(!user.enrollments || user.enrollments.length === 0) ? (
                                  <div className="py-3 px-2 text-xs text-text-500 italic flex items-center gap-2">
                                    <span>No subjects currently enrolled. Assign student to a division to automatically enroll into core subjects.</span>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {user.enrollments.map((enr) => (
                                      <div key={enr.id} className="p-3 rounded-lg border border-border bg-surface-50 hover:bg-surface-0 transition-colors flex flex-col justify-between">
                                        <div>
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="font-mono text-xs font-bold text-ink-900">
                                              {enr.code}
                                            </span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-0 border border-border font-medium text-text-500">
                                              {enr.type}
                                            </span>
                                          </div>
                                          <p className="font-semibold text-text-900 text-xs line-clamp-1" title={enr.name}>
                                            {enr.name}
                                          </p>
                                        </div>
                                        <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-text-500 font-mono">
                                          <span>Attempt {enr.attemptNumber}</span>
                                          <span className="text-emerald-700 font-semibold">{enr.status}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="px-6 py-3.5 border-t border-border bg-surface-50 flex items-center justify-between text-xs text-text-500 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-text-700">
              NEXUS Directory • [{prefix}]
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-md bg-ink-900 text-white font-medium hover:bg-ink-700 transition-colors shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
