import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import { 
  Building2, 
  Users, 
  FileCheck, 
  Calendar, 
  BookOpen, 
  GraduationCap, 
  UserCheck, 
  ShieldCheck, 
  TrendingUp, 
  Activity, 
  ArrowUpRight, 
  Layers, 
  Hash, 
  CheckCircle2, 
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '../../components/ui/Toast';
import IdRegistryModal from '../../components/superadmin/IdRegistryModal';

export default function SuperAdminDashboard() {
  const [data, setData] = useState(null); 
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPrefix, setSelectedPrefix] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get('/dashboard/superadmin');
        setData(res);
      } catch (error) {
        toast.error('Failed to load dashboard analytics');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const departments = data?.departmentBreakdown || [];
  const batches = data?.batchDistribution || [];
  const validPrefixes = ['STKIT', 'FCKIT', 'DAKIT', 'SAKIT', 'EXKIT'];
  const idSequences = (data?.idSequences || []).filter(seq => validPrefixes.includes(seq.prefix));
  const currentTerm = data?.currentTerm;
  const attendance = data?.attendanceStats;

  // Compute student total across departments or fallback
  const totalStudents = data?.studentsCount || 0;
  const totalTeachers = data?.teachersCount || 0;
  const studentFacultyRatio = totalTeachers > 0 ? (totalStudents / totalTeachers).toFixed(1) : 'N/A';

  // Find max student count in departments for bar chart scaling
  const maxDeptStudents = useMemo(() => {
    if (!departments.length) return 1;
    return Math.max(...departments.map(d => d.studentsCount), 1);
  }, [departments]);

  // Total batch student count for percentage calculation
  const totalBatchStudents = useMemo(() => {
    return batches.reduce((acc, b) => acc + b.count, 0) || 1;
  }, [batches]);

  const palette = ['#16213E', '#C98A3E', '#2B4C7E', '#1F6F6F', '#5B3A73', '#8C4A3A', '#2F6B4F'];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-28 bg-surface-0 border border-border rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-32 bg-surface-0 border border-border rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-surface-0 border border-border rounded-xl animate-pulse" />
          <div className="h-80 bg-surface-0 border border-border rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Institutional Top Banner */}
      <div className="bg-gradient-to-r from-ink-900 via-ink-900 to-ink-700 text-white rounded-xl p-6 shadow-md border border-ink-700 relative overflow-hidden">
        {/* Subtle decorative background watermarks */}
        <div className="absolute -right-8 -bottom-10 opacity-10 pointer-events-none">
          <Building2 size={220} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-full bg-brass-500/20 text-brass-500 border border-brass-500/30 text-xs font-semibold tracking-wider font-mono uppercase inline-flex items-center gap-1.5">
                <Sparkles size={12} /> Institutional Executive Overview
              </span>
              <span className="text-xs text-slate-300 font-mono flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                Live Node
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
              Super Admin Analytics & Control Console
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Real-time monitoring across academic departments, student enrollments, faculty allocations, and system sequence registries.
            </p>
          </div>

          {/* Current Academic Term Pill */}
          <div className="bg-surface-0/10 backdrop-blur-md border border-white/10 rounded-lg p-3 text-right shrink-0">
            <span className="text-xs uppercase tracking-wider text-slate-300 font-mono block">
              Active Term
            </span>
            <span className="text-lg font-bold text-white font-mono flex items-center justify-end gap-1.5 mt-0.5">
              <Calendar size={16} className="text-brass-500" />
              {currentTerm ? currentTerm.name : 'No Active Term'}
            </span>
            {currentTerm && (
              <span className="text-[11px] text-slate-300 block font-mono mt-0.5">
                {new Date(currentTerm.startDate).toLocaleDateString()} — {new Date(currentTerm.endDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs hover:shadow-sm transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-text-500 uppercase tracking-wider">
              Enrolled Students
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-role-student flex items-center justify-center">
              <GraduationCap size={20} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-3xl font-bold text-text-900 tracking-tight">
              {totalStudents.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Active Enrolled
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-text-500 font-mono">
            <span>Batches: {batches.length} cohorts</span>
            <span>Ratio: {studentFacultyRatio}:1</span>
          </div>
        </div>

        {/* Total Faculty */}
        <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-text-500 uppercase tracking-wider">
              Faculty Members
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-brass-600 flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-3xl font-bold text-text-900 tracking-tight">
              {totalTeachers.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Teaching Staff
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-text-500 font-mono">
            <span>Subjects: {data?.subjectsCount || 0}</span>
            <span>Classes: {data?.classesCount || 0}</span>
          </div>
        </div>

        {/* Academic Departments */}
        <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-text-500 uppercase tracking-wider">
              Departments
            </span>
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-role-deptadmin flex items-center justify-center">
              <Building2 size={20} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-3xl font-bold text-text-900 tracking-tight">
              {data?.departmentsCount || 0}
            </span>
            <Link 
              to="/superadmin/departments" 
              className="text-xs font-medium text-ink-700 hover:text-ink-900 flex items-center gap-0.5"
            >
              Manage <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-text-500 font-mono">
            <span>Admins: {data?.deptAdminsCount || 0}</span>
            <span>Exam Staff: {data?.examStaffCount || 0}</span>
          </div>
        </div>

        {/* Institutional Resources & Term */}
        <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-text-500 uppercase tracking-wider">
              Digital Library
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <BookOpen size={20} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-3xl font-bold text-text-900 tracking-tight">
              {data?.libraryCount || 0}
            </span>
            <Link 
              to="/superadmin/library" 
              className="text-xs font-medium text-ink-700 hover:text-ink-900 flex items-center gap-0.5"
            >
              Browse <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-text-500 font-mono">
            <span>Terms: {data?.academicTermsCount || 0}</span>
            <span>Status: Operational</span>
          </div>
        </div>
      </div>

      {/* Main Analytics Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Department Distribution Bar Chart */}
        <div className="lg:col-span-2 bg-surface-0 border border-border rounded-xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="text-base font-semibold text-text-900 flex items-center gap-2">
                <Activity size={18} className="text-brass-500" />
                Department Enrollment & Faculty Strength
              </h3>
              <p className="text-xs text-text-500 mt-0.5">
                Comparative headcount breakdown across configured engineering faculties
              </p>
            </div>
            <Link 
              to="/superadmin/departments" 
              className="text-xs font-medium text-ink-700 hover:text-ink-900 flex items-center gap-1 self-start sm:self-auto px-2.5 py-1 rounded bg-surface-50 border border-border"
            >
              View Full Directory <ExternalLink size={12} />
            </Link>
          </div>

          {departments.length === 0 ? (
            <div className="p-8 text-center bg-surface-50 rounded-lg border border-dashed border-border text-text-500 text-sm">
              No departments configured yet. Create departments to visualize comparative enrollment.
            </div>
          ) : (
            <div className="space-y-4">
              {departments.map((dept, index) => {
                const percent = Math.round((dept.studentsCount / maxDeptStudents) * 100);
                const color = palette[index % palette.length];

                return (
                  <div key={dept.id} className="group p-3 rounded-lg hover:bg-surface-50 transition-colors border border-transparent hover:border-border">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span 
                          className="w-2.5 h-2.5 rounded-sm shrink-0" 
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-semibold text-text-900 truncate">
                          {dept.name}
                        </span>
                        <span className="font-mono text-[11px] text-text-500 px-1.5 py-0.5 rounded bg-surface-50 border border-border shrink-0">
                          {dept.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                        <span className="text-text-900 font-semibold">
                          {dept.studentsCount} <span className="text-text-500 font-normal">students</span>
                        </span>
                        <span className="text-text-500 hidden sm:inline">
                          {dept.teachersCount} faculty
                        </span>
                        <span className="text-text-500 hidden sm:inline">
                          {dept.classesCount} classes
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Visualizer */}
                    <div className="w-full h-3 bg-surface-50 rounded-full overflow-hidden flex border border-border/80">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.max(percent, 4)}%`,
                          backgroundColor: color 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Summary Footnote */}
          <div className="mt-6 pt-4 border-t border-border flex flex-wrap items-center justify-between text-xs text-text-500 gap-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              All department directories and curriculum structures active
            </span>
            <span className="font-mono">
              Total Enrolled: {totalStudents} students
            </span>
          </div>
        </div>

        {/* Right Column (1 Col): Cohort / Batch Distribution Radial & Cards */}
        <div className="bg-surface-0 border border-border rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text-900 flex items-center gap-2">
                <Layers size={18} className="text-brass-500" />
                Batch Cohorts
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-50 border border-border text-text-500">
                {batches.length} Batches
              </span>
            </div>
            <p className="text-xs text-text-500 mb-5">
              Distribution of enrolled undergraduate and postgraduate students by admitted batch year.
            </p>

            {batches.length === 0 ? (
              <div className="p-6 text-center bg-surface-50 rounded-lg border border-dashed border-border text-text-500 text-sm">
                No students enrolled in cohorts yet.
              </div>
            ) : (
              <div className="space-y-3.5">
                {batches.map((b, idx) => {
                  const share = Math.round((b.count / totalBatchStudents) * 100);
                  const color = palette[idx % palette.length];

                  return (
                    <div key={b.batchYear} className="p-3 rounded-lg border border-border bg-surface-50/50 hover:bg-surface-50 transition-colors">
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span className="font-mono text-text-900">
                          Batch {b.batchYear}
                        </span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-text-900 font-bold">{b.count}</span>
                          <span className="text-text-500 text-[11px]">({share}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-surface-0 rounded-full overflow-hidden border border-border/60">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${share}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Institutional ID Directory (Clickable to Inspect Full Record List) */}
      <div className="bg-surface-0 border border-border rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Hash size={18} className="text-brass-500" />
              <h3 className="text-base font-semibold text-text-900">
                Institutional ID Directory
              </h3>
            </div>
            <p className="text-xs text-text-500 mt-0.5">
              Unique institutional identification sequences. Click any category below to view all provisioned accounts and details.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 self-start sm:self-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Sequence Counters
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 mt-4">
          {idSequences.map((seq) => {
            const prefixLabels = {
              STKIT: 'Students',
              FCKIT: 'Faculty Members',
              DAKIT: 'Dept Admins',
              SAKIT: 'Super Admins',
              EXKIT: 'Exam Staff'
            };

            return (
              <button 
                key={seq.prefix} 
                onClick={() => setSelectedPrefix(seq.prefix)}
                className="p-3.5 rounded-lg border border-border bg-surface-50/60 flex flex-col justify-between hover:border-brass-500 hover:bg-surface-0 hover:shadow-md transition-all text-left group cursor-pointer"
                title={`Click to view all accounts under ${seq.prefix}`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-text-500 block">
                      {prefixLabels[seq.prefix] || 'Account Category'}
                    </span>
                    <ChevronRight size={14} className="text-text-500 group-hover:text-brass-500 transition-colors" />
                  </div>
                  <span className="font-mono text-sm font-bold text-ink-900 mt-0.5 block group-hover:text-brass-600 transition-colors">
                    {seq.prefix}
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-border/80 flex items-baseline justify-between w-full">
                  <span className="text-[10px] text-text-500">Issued</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-base font-bold text-text-900">
                      {seq.lastUsed}
                    </span>
                    <span className="text-[10px] text-brass-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      View
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Access Control Deck */}
      <div className="bg-surface-0 border border-border rounded-xl p-6 shadow-xs">
        <h3 className="text-base font-semibold text-text-900 mb-1 flex items-center gap-2">
          <ShieldCheck size={18} className="text-brass-500" />
          Administrative Governance Deck
        </h3>
        <p className="text-xs text-text-500 mb-4">
          Direct navigation to core institutional governance and academic configuration modules
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            to="/superadmin/departments"
            className="p-4 rounded-lg border border-border hover:border-ink-700 hover:bg-surface-50 transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <Building2 size={20} className="text-ink-700 group-hover:text-brass-500 transition-colors" />
              <ArrowUpRight size={16} className="text-text-500 group-hover:text-ink-900 transition-colors" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-900">Departments</p>
              <p className="text-xs text-text-500 mt-0.5">Create & configure faculties</p>
            </div>
          </Link>

          <Link
            to="/superadmin/admins"
            className="p-4 rounded-lg border border-border hover:border-ink-700 hover:bg-surface-50 transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <Users size={20} className="text-ink-700 group-hover:text-brass-500 transition-colors" />
              <ArrowUpRight size={16} className="text-text-500 group-hover:text-ink-900 transition-colors" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-900">Department Admins</p>
              <p className="text-xs text-text-500 mt-0.5">Provision departmental leaders</p>
            </div>
          </Link>

          <Link
            to="/superadmin/exam-staff"
            className="p-4 rounded-lg border border-border hover:border-ink-700 hover:bg-surface-50 transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <FileCheck size={20} className="text-ink-700 group-hover:text-brass-500 transition-colors" />
              <ArrowUpRight size={16} className="text-text-500 group-hover:text-ink-900 transition-colors" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-900">Examination Staff</p>
              <p className="text-xs text-text-500 mt-0.5">Manage college-wide exam officers</p>
            </div>
          </Link>

          <Link
            to="/superadmin/academic-terms"
            className="p-4 rounded-lg border border-border hover:border-ink-700 hover:bg-surface-50 transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <Calendar size={20} className="text-ink-700 group-hover:text-brass-500 transition-colors" />
              <ArrowUpRight size={16} className="text-text-500 group-hover:text-ink-900 transition-colors" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-900">Academic Terms</p>
              <p className="text-xs text-text-500 mt-0.5">Set term windows & active term</p>
            </div>
          </Link>
        </div>
      </div>

      {/* ID Registry Modal for inspecting all people under the clicked sequence */}
      <IdRegistryModal
        prefix={selectedPrefix}
        isOpen={!!selectedPrefix}
        onClose={() => setSelectedPrefix(null)}
      />
    </div>
  );
}
