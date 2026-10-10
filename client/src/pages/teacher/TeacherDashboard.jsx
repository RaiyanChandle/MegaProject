import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import StatusBadge from '../../components/ui/StatusBadge';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  BookOpen, 
  FileCheck, 
  FileText, 
  ArrowRight,
  Sparkles,
  Layers
} from 'lucide-react';

export default function TeacherDashboard() {
  const [allocations, setAllocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllocations = async () => {
      try {
        const data = await apiClient.get('/teachers/my-allocations');
        setAllocations(data);
      } catch (err) {
        console.error('Failed to load allocations:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllocations();
  }, []);

  const quickActions = [
    {
      title: 'Marks & Assessment Grid',
      desc: 'Enter internal continuous assessment (IA-1, IA-2, End Sem) marks with keyboard-friendly navigation.',
      href: '/teacher/marks',
      icon: FileCheck,
      badge: 'Flow 10',
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      title: 'Class Attendance',
      desc: 'Create attendance sessions and mark student records per enrollment.',
      href: '/teacher/attendance',
      icon: Clock,
      badge: 'Flow 6',
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    {
      title: 'Assignments & Submissions',
      desc: 'Create assignments, evaluate student submissions, and assign grades.',
      href: '/teacher/assignments',
      icon: FileText,
      badge: 'Flow 8',
      badgeColor: 'bg-purple-100 text-purple-800'
    },
    {
      title: 'Study Notes & Materials',
      desc: 'Upload reference materials and study notes for enrolled students.',
      href: '/teacher/notes',
      icon: BookOpen,
      badge: 'Library',
      badgeColor: 'bg-amber-100 text-amber-800'
    }
  ];

  return (
    <div className="space-y-8">
      {/* WELCOME BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-ink-900 via-ink-800 to-ink-900 p-8 text-white shadow-md">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white backdrop-blur-md border border-white/15">
            <Sparkles size={12} className="text-amber-400" />
            Teacher Portal
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Faculty Teaching Workspace
          </h2>
          <p className="text-sm text-text-400">
            Manage your allocated subjects, continuous marks assessments, attendance sessions, and class coursework.
          </p>
        </div>
      </div>

      {/* QUICK ACTIONS GRID */}
      <div>
        <h3 className="text-base font-semibold text-text-900 mb-4 flex items-center gap-2">
          <LayoutDashboard size={18} className="text-ink-700" />
          Primary Teaching Operations
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {quickActions.map(action => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                to={action.href}
                className="group flex flex-col justify-between rounded-xl border border-border bg-surface-0 p-5 shadow-2xs hover:border-ink-500 hover:shadow-sm transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-lg bg-ink-50 text-ink-700 group-hover:bg-ink-100 transition-colors">
                      <Icon size={20} />
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-2xs font-semibold ${action.badgeColor}`}>
                      {action.badge}
                    </span>
                  </div>
                  <h4 className="font-semibold text-text-900 text-sm group-hover:text-ink-900 transition-colors">
                    {action.title}
                  </h4>
                  <p className="text-xs text-text-500 mt-1.5 leading-relaxed">
                    {action.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-ink-700 group-hover:text-ink-900">
                  <span>Open</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ASSIGNED SUBJECTS QUICK LIST */}
      <div className="bg-surface-0 border border-border rounded-xl p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-text-900 text-base flex items-center gap-2">
              <Users size={18} className="text-ink-700" />
              Your Active Allocations ({allocations.length})
            </h3>
            <p className="text-xs text-text-500 mt-0.5">
              Current teaching curriculum assignments and direct marks entry shortcuts.
            </p>
          </div>
          <Link
            to="/teacher/classes"
            className="text-xs font-semibold text-ink-700 hover:text-ink-900 inline-flex items-center gap-1"
          >
            View All <ArrowRight size={13} />
          </Link>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-text-500 text-sm">Loading allocations...</div>
        ) : allocations.length === 0 ? (
          <div className="py-8 text-center text-text-500 text-sm italic bg-surface-50 rounded-lg">
            No subjects assigned to you for this term.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {allocations.map(alloc => (
              <div key={alloc.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-text-900 text-sm">
                    {alloc.subject?.code} — {alloc.subject?.name}
                  </div>
                  <div className="text-xs text-text-500 mt-0.5 flex items-center gap-2">
                    <span>{alloc.class?.name}</span>
                    <span>•</span>
                    <span>Div: {alloc.division?.name || 'All'}</span>
                    <span>•</span>
                    <span>{alloc.subject?.credits} Credits</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to="/teacher/marks"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-ink-50 text-ink-700 hover:bg-ink-100 transition-colors"
                  >
                    <FileCheck size={14} />
                    Marks Grid
                  </Link>
                  <Link
                    to="/teacher/attendance"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-50 text-text-700 hover:bg-surface-100 border border-border transition-colors"
                  >
                    <Clock size={14} />
                    Attendance
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
