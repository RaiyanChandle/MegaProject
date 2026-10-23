import { Link, useNavigate } from 'react-router-dom';
import { 
  Clock, 
  ArrowLeft, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  Calendar, 
  DollarSign, 
  Settings as SettingsIcon, 
  ShieldCheck, 
  Users 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ComingSoon({
  title = 'Module Coming Soon',
  module = 'Upcoming Academic Feature',
  phase = 'Active Roadmap',
  description = 'This feature is currently under active development as part of the NEXUS institutional ERP rollout. Check back soon for updates.',
  features = [],
  icon: Icon = Clock
}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const getDashboardPath = () => {
    switch (user?.role) {
      case 'SUPER_ADMIN': return '/superadmin';
      case 'DEPARTMENT_ADMIN': return '/deptadmin';
      case 'TEACHER': return '/teacher';
      case 'STUDENT': return '/student';
      case 'PARENT': return '/parent';
      case 'EXAM_STAFF': return '/examstaff';
      default: return '/';
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 font-sans space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-500 hover:text-text-900 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Previous Page
        </button>
      </div>

      {/* Main Feature Card */}
      <div className="bg-surface-0 border border-border rounded-xl p-6 sm:p-10 shadow-xs relative overflow-hidden">
        {/* Subtle decorative background watermark */}
        <div className="absolute -right-8 -bottom-8 opacity-5 pointer-events-none text-ink-900">
          <Icon size={240} />
        </div>

        <div className="relative z-10 space-y-6">
          {/* Status & Phase Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-brass-500/10 text-brass-600 border border-brass-500/20 text-xs font-semibold font-mono tracking-wider uppercase inline-flex items-center gap-1.5">
              <Sparkles size={13} /> {phase}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-ink-900/5 text-ink-900 border border-ink-900/10 text-xs font-medium font-mono">
              {module}
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-ink-900 text-white shrink-0 shadow-xs">
                <Icon size={24} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-text-900 tracking-tight">
                {title}
              </h1>
            </div>
            <p className="text-sm text-text-500 max-w-2xl leading-relaxed pt-1">
              {description}
            </p>
          </div>

          {/* Planned Deliverables Box */}
          {features && features.length > 0 && (
            <div className="bg-surface-50 border border-border/80 rounded-lg p-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-500 flex items-center gap-1.5">
                <Layers size={14} /> Planned Deliverables in this Release
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-text-900">
                    <CheckCircle2 size={15} className="text-success shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Return CTA */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to={getDashboardPath()}
              className="inline-flex items-center gap-2 bg-ink-900 hover:bg-ink-700 text-white px-4 py-2.5 rounded-md text-xs font-medium transition-colors shadow-xs"
            >
              Return to Dashboard
            </Link>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 bg-surface-0 hover:bg-surface-50 text-text-900 border border-border px-4 py-2.5 rounded-md text-xs font-medium transition-colors"
            >
              Previous View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
