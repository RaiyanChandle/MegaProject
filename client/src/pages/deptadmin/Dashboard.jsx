import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  UserCheck,
  Megaphone,
  Clock,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  PlusCircle,
  FileText
} from 'lucide-react';
import { toast } from '../../components/ui/Toast';

export default function DeptAdminDashboard() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await apiClient.get('/dashboard/deptadmin');
        setData(res);
      } catch (error) {
        console.error('Error fetching department dashboard:', error);
        toast.error('Failed to load department analytics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const department = data?.department;
  const admin = data?.admin;
  const term = data?.currentTerm;
  const stats = data?.stats;
  const classes = data?.classesSummary || [];
  const batchDistribution = data?.batchDistribution || [];
  const unallocatedSubjects = data?.unallocatedSubjects || [];
  const pendingLeaves = data?.pendingLeaves || [];
  const recentAnnouncements = data?.recentAnnouncements || [];
  const subjectTypes = data?.subjectTypesBreakdown || { core: 0, programElective: 0, openElective: 0 };

  // Calculate maximum batch size for scale
  const maxBatchCount = useMemo(() => {
    if (!batchDistribution.length) return 1;
    return Math.max(...batchDistribution.map(b => b.count), 1);
  }, [batchDistribution]);

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        {/* Loading Skeleton */}
        <div className="h-36 bg-surface-0 border border-border rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-28 bg-surface-0 border border-border rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-surface-0 border border-border rounded-xl animate-pulse" />
          <div className="h-96 bg-surface-0 border border-border rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. Header Banner with Department Branding */}
      <div className="bg-gradient-to-r from-ink-900 via-ink-900 to-[#1F6F6F] text-white rounded-xl p-6 shadow-md border border-ink-700 relative overflow-hidden">
        {/* Subtle decorative watermark */}
        <div className="absolute -right-6 -bottom-8 opacity-10 pointer-events-none">
          <Building2 size={200} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#1F6F6F]/40 text-teal-200 border border-teal-400/30 text-xs font-semibold tracking-wider font-mono uppercase inline-flex items-center gap-1.5">
                <ShieldCheck size={13} /> {admin?.instituteId || 'DAKIT'} • Department Portal
              </span>
              {term && (
                <span className="px-2.5 py-0.5 rounded-full bg-brass-500/20 text-brass-500 border border-brass-500/30 text-xs font-medium font-mono inline-flex items-center gap-1.5">
                  <Calendar size={12} /> {term.name} {term.isCurrent && '(Active Term)'}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              {department ? `${department.name} (${department.code})` : 'Department Administration'}
            </h1>
            <p className="text-sm text-text-500 text-gray-300 max-w-2xl">
              Welcome, <span className="text-white font-medium">{admin?.name || 'Administrator'}</span>. Academic oversight, class curricula, faculty allocations, and roster governance.
            </p>
          </div>

          {/* Quick Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
            <Link
              to="/deptadmin/classes"
              className="inline-flex items-center gap-1.5 bg-[#1F6F6F] hover:bg-[#185858] text-white px-3.5 py-2 rounded-md text-xs font-medium transition-colors shadow-sm"
            >
              <PlusCircle size={15} /> Add Class
            </Link>
            <Link
              to="/deptadmin/teachers"
              className="inline-flex items-center gap-1.5 bg-surface-0/10 hover:bg-surface-0/20 text-white border border-white/20 px-3.5 py-2 rounded-md text-xs font-medium transition-colors backdrop-blur-sm"
            >
              <UserCheck size={15} /> Faculty Allocations
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-surface-0 border border-border rounded-md p-4 transition-all hover:shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-text-500">Enrolled Students</span>
            <div className="p-2 rounded-md bg-[#2B4C7E]/10 text-[#2B4C7E]">
              <GraduationCap size={18} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold font-mono text-text-900">{stats?.studentsCount || 0}</span>
            <span className="text-xs font-mono text-text-500">
              Ratio {stats?.studentTeacherRatio || 'N/A'}:1
            </span>
          </div>
          <div className="mt-2 text-xs text-text-500 flex items-center justify-between border-t border-border/50 pt-2">
            <span>Across {batchDistribution.length} active batches</span>
            <Link to="/deptadmin/students" className="text-ink-700 hover:text-ink-900 font-medium inline-flex items-center">
              View <ChevronRight size={12} />
            </Link>
          </div>
        </div>

        {/* Faculty Count */}
        <div className="bg-surface-0 border border-border rounded-md p-4 transition-all hover:shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-text-500">Faculty Members</span>
            <div className="p-2 rounded-md bg-brass-500/10 text-brass-600">
              <Users size={18} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold font-mono text-text-900">{stats?.teachersCount || 0}</span>
            <span className="text-xs text-success font-medium">Active Staff</span>
          </div>
          <div className="mt-2 text-xs text-text-500 flex items-center justify-between border-t border-border/50 pt-2">
            <span>Department Teaching Pool</span>
            <Link to="/deptadmin/teachers" className="text-ink-700 hover:text-ink-900 font-medium inline-flex items-center">
              Directory <ChevronRight size={12} />
            </Link>
          </div>
        </div>

        {/* Curriculum Structure */}
        <div className="bg-surface-0 border border-border rounded-md p-4 transition-all hover:shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-text-500">Classes & Divisions</span>
            <div className="p-2 rounded-md bg-[#1F6F6F]/10 text-[#1F6F6F]">
              <Layers size={18} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold font-mono text-text-900">{stats?.classesCount || 0}</span>
            <span className="text-xs font-mono text-text-500">{stats?.divisionsCount || 0} Divisions</span>
          </div>
          <div className="mt-2 text-xs text-text-500 flex items-center justify-between border-t border-border/50 pt-2">
            <span>{stats?.subjectsCount || 0} Total Subjects</span>
            <Link to="/deptadmin/classes" className="text-ink-700 hover:text-ink-900 font-medium inline-flex items-center">
              Classes <ChevronRight size={12} />
            </Link>
          </div>
        </div>

        {/* Subject Allocation Health */}
        <div className="bg-surface-0 border border-border rounded-md p-4 transition-all hover:shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-text-500">Allocation Rate</span>
            <div className={`p-2 rounded-md ${stats?.unallocatedSubjectsCount > 0 ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
              <BookOpen size={18} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold font-mono text-text-900">{stats?.allocationRate || 0}%</span>
            {stats?.unallocatedSubjectsCount > 0 ? (
              <span className="text-xs text-danger font-medium font-mono">{stats.unallocatedSubjectsCount} Unassigned</span>
            ) : (
              <span className="text-xs text-success font-medium">100% Allocated</span>
            )}
          </div>
          {/* Progress bar */}
          <div className="w-full bg-surface-50 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${stats?.allocationRate === 100 ? 'bg-success' : stats?.allocationRate > 75 ? 'bg-brass-500' : 'bg-danger'}`}
              style={{ width: `${stats?.allocationRate || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Operational Highlights & Alert Strip (if any unallocated subjects or pending leaves exist) */}
      {(stats?.unallocatedSubjectsCount > 0 || stats?.pendingLeavesCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats?.unallocatedSubjectsCount > 0 && (
            <div className="bg-danger/5 border border-danger/20 rounded-md p-3.5 flex items-start gap-3">
              <AlertTriangle className="text-danger shrink-0 mt-0.5" size={18} />
              <div className="space-y-1 text-xs">
                <span className="font-semibold text-danger block">Faculty Allocation Required</span>
                <p className="text-text-500">
                  <span className="font-mono font-medium text-text-900">{stats.unallocatedSubjectsCount} subject(s)</span> have no teacher assigned for this term.
                </p>
                <Link
                  to="/deptadmin/teachers"
                  className="inline-flex items-center gap-1 font-medium text-danger hover:underline pt-0.5"
                >
                  Allocate Teachers <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          )}

          {stats?.pendingLeavesCount > 0 && (
            <div className="bg-warning/5 border border-warning/30 rounded-md p-3.5 flex items-start gap-3">
              <Clock className="text-warning shrink-0 mt-0.5" size={18} />
              <div className="space-y-1 text-xs">
                <span className="font-semibold text-warning block">Pending Leave Requests</span>
                <p className="text-text-500">
                  <span className="font-mono font-medium text-text-900">{stats.pendingLeavesCount} leave application(s)</span> from students/faculty awaiting your decision.
                </p>
                <Link
                  to="/deptadmin/leaves"
                  className="inline-flex items-center gap-1 font-medium text-warning hover:underline pt-0.5"
                >
                  Review Requests <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Main 2-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols Wide) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Class Curriculum Matrix */}
          <div className="bg-surface-0 border border-border rounded-md overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-text-900">Department Classes & Curriculum</h2>
                <p className="text-xs text-text-500">Active class instances, semester levels, and configured divisions</p>
              </div>
              <Link
                to="/deptadmin/classes"
                className="text-xs text-ink-700 hover:text-ink-900 font-medium inline-flex items-center gap-1"
              >
                Manage All <ArrowRight size={13} />
              </Link>
            </div>

            {classes.length === 0 ? (
              <div className="p-8 text-center">
                <Layers className="mx-auto text-text-500/40 mb-2" size={32} />
                <p className="text-sm font-medium text-text-900">No classes configured yet</p>
                <p className="text-xs text-text-500 mt-1 max-w-sm mx-auto">
                  Create your department's semester classes and divisions to start enrolling students.
                </p>
                <Link
                  to="/deptadmin/classes"
                  className="mt-3 inline-flex items-center gap-1.5 bg-ink-900 text-white px-3 py-1.5 rounded-md text-xs font-medium"
                >
                  <PlusCircle size={14} /> Add First Class
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-50 text-text-500 text-xs font-medium uppercase tracking-wide border-b border-border">
                    <tr>
                      <th className="px-5 py-3">Class Name</th>
                      <th className="px-4 py-3">Batch</th>
                      <th className="px-4 py-3">Semester</th>
                      <th className="px-4 py-3">Divisions</th>
                      <th className="px-4 py-3 text-right">Subjects</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {classes.map((cls) => (
                      <tr key={cls.id} className="hover:bg-surface-50/70 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-text-900 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#1F6F6F]" />
                          {cls.name}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-text-500">{cls.batchYear}</td>
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 rounded-full bg-surface-50 border border-border text-xs font-mono font-medium">
                            Sem {cls.semesterNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {cls.divisions.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {cls.divisions.map((div, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 rounded bg-ink-900/5 text-ink-900 font-mono text-xs border border-ink-900/10">
                                  {div}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-text-500 italic">No divisions</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-medium text-text-900">
                          {cls.subjectsCount}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            to={`/deptadmin/classes/${cls.id}`}
                            className="text-xs text-ink-700 hover:text-ink-900 font-medium inline-flex items-center gap-0.5"
                          >
                            Details <ChevronRight size={13} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Subject Breakdown & Curriculum Types */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-0 border border-border rounded-md p-4">
              <span className="text-xs font-medium uppercase tracking-wider text-text-500 block mb-1">Core Subjects</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold font-mono text-text-900">{subjectTypes.core}</span>
                <span className="text-xs text-text-500 font-medium">Mandatory</span>
              </div>
              <p className="text-xs text-text-500 mt-2">Auto-enrolled upon division assignment.</p>
            </div>

            <div className="bg-surface-0 border border-border rounded-md p-4">
              <span className="text-xs font-medium uppercase tracking-wider text-text-500 block mb-1">Program Electives</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold font-mono text-text-900">{subjectTypes.programElective}</span>
                <span className="text-xs text-info font-medium font-mono">PE Slots</span>
              </div>
              <p className="text-xs text-text-500 mt-2">Branch-specific student option choice.</p>
            </div>

            <div className="bg-surface-0 border border-border rounded-md p-4">
              <span className="text-xs font-medium uppercase tracking-wider text-text-500 block mb-1">Open Electives</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold font-mono text-text-900">{subjectTypes.openElective}</span>
                <span className="text-xs text-brass-600 font-medium font-mono">OE Slots</span>
              </div>
              <p className="text-xs text-text-500 mt-2">Cross-department institute offerings.</p>
            </div>
          </div>

          {/* Batch Enrollment Distribution */}
          <div className="bg-surface-0 border border-border rounded-md p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-text-900">Student Enrollment by Batch</h3>
                <p className="text-xs text-text-500">Distribution of registered departmental students</p>
              </div>
              <span className="text-xs font-mono font-medium text-text-500">
                {batchDistribution.reduce((sum, b) => sum + b.count, 0)} Total
              </span>
            </div>

            {batchDistribution.length === 0 ? (
              <p className="text-xs text-text-500 italic py-2">No students registered in any batch yet.</p>
            ) : (
              <div className="space-y-3">
                {batchDistribution.map((batch, index) => {
                  const percent = Math.round((batch.count / maxBatchCount) * 100);
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-medium text-text-900">Batch {batch.batchYear}</span>
                        <span className="font-mono text-text-500">{batch.count} students</span>
                      </div>
                      <div className="w-full bg-surface-50 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-ink-700 h-full rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col Wide: Operational Queues & Shortcuts) */}
        <div className="space-y-6">
          {/* Quick Administrative Operations */}
          <div className="bg-surface-0 border border-border rounded-md p-5">
            <h3 className="text-sm font-semibold text-text-900 mb-3">Department Shortcuts</h3>
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/deptadmin/classes"
                className="p-2.5 rounded border border-border hover:border-ink-700 hover:bg-surface-50 transition-colors flex flex-col items-center justify-center text-center gap-1 group"
              >
                <Layers size={18} className="text-text-500 group-hover:text-ink-900" />
                <span className="text-xs font-medium text-text-900">Classes</span>
              </Link>
              <Link
                to="/deptadmin/subjects"
                className="p-2.5 rounded border border-border hover:border-ink-700 hover:bg-surface-50 transition-colors flex flex-col items-center justify-center text-center gap-1 group"
              >
                <BookOpen size={18} className="text-text-500 group-hover:text-ink-900" />
                <span className="text-xs font-medium text-text-900">Subjects</span>
              </Link>
              <Link
                to="/deptadmin/teachers"
                className="p-2.5 rounded border border-border hover:border-ink-700 hover:bg-surface-50 transition-colors flex flex-col items-center justify-center text-center gap-1 group"
              >
                <Users size={18} className="text-text-500 group-hover:text-ink-900" />
                <span className="text-xs font-medium text-text-900">Faculty</span>
              </Link>
              <Link
                to="/deptadmin/students"
                className="p-2.5 rounded border border-border hover:border-ink-700 hover:bg-surface-50 transition-colors flex flex-col items-center justify-center text-center gap-1 group"
              >
                <GraduationCap size={18} className="text-text-500 group-hover:text-ink-900" />
                <span className="text-xs font-medium text-text-900">Students</span>
              </Link>
              <Link
                to="/deptadmin/attendance"
                className="p-2.5 rounded border border-border hover:border-ink-700 hover:bg-surface-50 transition-colors flex flex-col items-center justify-center text-center gap-1 group"
              >
                <CheckCircle2 size={18} className="text-text-500 group-hover:text-ink-900" />
                <span className="text-xs font-medium text-text-900">Attendance</span>
              </Link>
              <Link
                to="/deptadmin/leaves"
                className="p-2.5 rounded border border-border hover:border-ink-700 hover:bg-surface-50 transition-colors flex flex-col items-center justify-center text-center gap-1 group"
              >
                <Clock size={18} className="text-text-500 group-hover:text-ink-900" />
                <span className="text-xs font-medium text-text-900">Leaves</span>
              </Link>
            </div>
          </div>

          {/* Pending Leaves Queue */}
          <div className="bg-surface-0 border border-border rounded-md overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-warning" />
                <h3 className="text-sm font-semibold text-text-900">Pending Leave Approvals</h3>
              </div>
              <Link to="/deptadmin/leaves" className="text-xs text-ink-700 hover:text-ink-900 font-medium">
                View All
              </Link>
            </div>

            {pendingLeaves.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-500">
                <CheckCircle2 className="mx-auto text-success/60 mb-1" size={24} />
                No pending leave requests.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {pendingLeaves.map((leave) => (
                  <div key={leave.id} className="p-3.5 hover:bg-surface-50 transition-colors space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-text-900">{leave.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-warning/10 text-warning border border-warning/20">
                        {leave.type}
                      </span>
                    </div>
                    <p className="text-xs text-text-500 line-clamp-1 italic">"{leave.reason}"</p>
                    <div className="flex items-center justify-between text-[11px] font-mono text-text-500 pt-0.5">
                      <span>{new Date(leave.fromDate).toLocaleDateString()} - {new Date(leave.toDate).toLocaleDateString()}</span>
                      <Link to="/deptadmin/leaves" className="text-ink-700 hover:text-ink-900 font-medium">
                        Review →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Department Announcements */}
          <div className="bg-surface-0 border border-border rounded-md overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone size={16} className="text-ink-900" />
                <h3 className="text-sm font-semibold text-text-900">Notices & Circulars</h3>
              </div>
              <Link to="/deptadmin/announcements" className="text-xs text-ink-700 hover:text-ink-900 font-medium">
                Manage
              </Link>
            </div>

            {recentAnnouncements.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-500">
                No recent announcements.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentAnnouncements.map((ann) => (
                  <div key={ann.id} className="p-3.5 hover:bg-surface-50 transition-colors space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-900 line-clamp-1">{ann.title}</span>
                      <span className="text-[10px] font-mono text-text-500">
                        {new Date(ann.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-text-500 line-clamp-2">{ann.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
