import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { 
  Calendar, 
  Clock, 
  FileCheck, 
  FileText, 
  ArrowRight, 
  Plus, 
  CheckCircle2, 
  BookOpen, 
  GraduationCap,
  Layers,
  Sparkles
} from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';

export default function ExamStaffDashboard() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [terms, setTerms] = useState([]);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [examsData, termsData] = await Promise.all([
          apiClient.get('/exams'),
          apiClient.get('/academic-terms')
        ]);
        setExams(examsData || []);
        setTerms(termsData || []);
        const active = (termsData || []).find(t => t.isCurrent);
        setCurrentTerm(active || null);
      } catch (err) {
        console.error('Error fetching exam dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Compute metrics
  const totalExams = exams.length;
  const currentTermExams = exams.filter(e => currentTerm && e.academicTermId === currentTerm.id);
  const finalExams = exams.filter(e => e.examType === 'FINAL');
  const makeupExams = exams.filter(e => e.examType === 'MAKEUP');
  const upcomingExams = exams
    .filter(e => e.examDate && new Date(e.examDate) >= new Date())
    .sort((a, b) => new Date(a.examDate) - new Date(b.examDate));

  const recentSchedules = exams.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-ink-900 via-ink-800 to-[#8C4A3A] p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-xs text-white">
                <Sparkles size={12} className="text-brass-300" />
                Examinations Controller Suite
              </span>
              {currentTerm && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brass-500/20 text-brass-300 border border-brass-400/30">
                  Active Term: {currentTerm.name}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Welcome, {user?.name || 'Exam Staff'}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Manage centralized exam schedules, configure question papers, issue hall tickets, and process semester result cards across all departments.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link to="/examstaff/exams">
              <Button variant="primary" className="bg-brass-500 hover:bg-brass-600 text-ink-950 font-semibold shadow-md flex items-center gap-2">
                <Plus size={16} />
                Schedule Exam
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-500 uppercase tracking-wider">Total Scheduled</p>
            <h3 className="text-2xl font-bold text-text-900 mt-1">{loading ? '...' : totalExams}</h3>
            <p className="text-xs text-text-400 mt-1">College-wide exams</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-brass-500/10 text-brass-600 flex items-center justify-center">
            <Calendar size={24} />
          </div>
        </div>

        <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-500 uppercase tracking-wider">Current Term Exams</p>
            <h3 className="text-2xl font-bold text-text-900 mt-1">{loading ? '...' : currentTermExams.length}</h3>
            <p className="text-xs text-text-400 mt-1">{currentTerm?.name || 'All terms'}</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-info/10 text-info flex items-center justify-center">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-500 uppercase tracking-wider">Final End Sem Exams</p>
            <h3 className="text-2xl font-bold text-text-900 mt-1">{loading ? '...' : finalExams.length}</h3>
            <p className="text-xs text-text-400 mt-1">Mapped to End Sem marks</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-success/10 text-success flex items-center justify-center">
            <FileCheck size={24} />
          </div>
        </div>

        <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-500 uppercase tracking-wider">Backlog / Makeup</p>
            <h3 className="text-2xl font-bold text-text-900 mt-1">{loading ? '...' : makeupExams.length}</h3>
            <p className="text-xs text-text-400 mt-1">Re-attempt sessions</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
            <GraduationCap size={24} />
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Schedules & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Exam Schedules (2 cols) */}
        <div className="lg:col-span-2 bg-surface-0 border border-border rounded-xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-ink-700/10 text-ink-700 flex items-center justify-center">
                <Calendar size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-text-900">Recent Exam Schedules</h2>
                <p className="text-xs text-text-500">Newly scheduled examinations across departments</p>
              </div>
            </div>
            <Link 
              to="/examstaff/exams" 
              className="text-xs font-medium text-brass-600 hover:text-brass-700 flex items-center gap-1"
            >
              View all
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="divide-y divide-border">
            {loading ? (
              <div className="p-8 text-center text-sm text-text-400">Loading schedules...</div>
            ) : recentSchedules.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar size={36} className="mx-auto text-text-300 mb-2" />
                <p className="text-sm font-medium text-text-700">No exams scheduled yet</p>
                <p className="text-xs text-text-400 mt-1">Start by creating the first examination timetable.</p>
                <Link to="/examstaff/exams" className="inline-block mt-4">
                  <Button variant="primary" size="sm">Schedule Now</Button>
                </Link>
              </div>
            ) : (
              recentSchedules.map((exam) => (
                <div key={exam.id} className="p-4 hover:bg-surface-50 transition-colors flex items-center justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-surface-100 border border-border flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] uppercase font-bold text-text-500">
                        {exam.examDate ? new Date(exam.examDate).toLocaleString('default', { month: 'short' }) : 'TBD'}
                      </span>
                      <span className="text-xs font-bold text-text-900">
                        {exam.examDate ? new Date(exam.examDate).getDate() : '--'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-text-900 truncate">
                          {exam?.subject?.name || 'Subject'}
                        </span>
                        {exam?.subject?.code && (
                          <span className="text-xs px-1.5 py-0.2 rounded bg-surface-100 text-text-600 font-mono">
                            {exam.subject.code}
                          </span>
                        )}
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          exam?.examType === 'FINAL' ? 'bg-purple-100 text-purple-800' :
                          exam?.examType === 'MIDTERM' ? 'bg-blue-100 text-blue-800' :
                          exam?.examType === 'MAKEUP' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {exam?.examType || 'FINAL'}
                        </span>
                      </div>
                      <div className="text-xs text-text-500 mt-1 flex items-center gap-2">
                        <span>{exam?.class?.department?.code || 'Dept'} • Batch {exam?.class?.batchYear || '—'} (Sem {exam?.class?.semesterNumber || '—'})</span>
                        <span>•</span>
                        <span>Max: {exam?.maxMarks ?? 100} (Pass: {exam?.passingMarks ?? 40})</span>
                        {exam?.assessmentComponent && (
                          <>
                            <span>•</span>
                            <span className="text-brass-600 font-medium">Mapped: {exam.assessmentComponent.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right pl-4">
                    <span className="text-xs text-text-400 block">
                      {exam.academicTerm?.name}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Operations & Workflow Roadmap */}
        <div className="space-y-6">
          <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-500 mb-3">
              Examination Workflow
            </h2>
            <div className="space-y-3">
              <Link 
                to="/examstaff/exams" 
                className="group p-3 rounded-lg border border-border hover:border-brass-400 bg-surface-50 hover:bg-brass-50/30 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-brass-500 text-white flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-text-900 group-hover:text-brass-700">Exam Scheduling</h4>
                    <p className="text-xs text-text-500">Configure dates, marks & component links</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-text-400 group-hover:text-brass-600 transition-transform group-hover:translate-x-0.5" />
              </Link>

              <div className="p-3 rounded-lg border border-border/60 bg-surface-50/50 opacity-80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-medium text-text-800">Question Paper Workflow</h4>
                      <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded text-slate-700 font-mono">T11.3</span>
                    </div>
                    <p className="text-xs text-text-400">Draft → Submitted → Approved review</p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border/60 bg-surface-50/50 opacity-80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-medium text-text-800">Hall Ticket Issuance</h4>
                      <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded text-slate-700 font-mono">T11.4</span>
                    </div>
                    <p className="text-xs text-text-400">PDF per enrollment (backlogs included)</p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border/60 bg-surface-50/50 opacity-80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                    4
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-medium text-text-800">Bulk Result Entry & Sync</h4>
                      <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded text-slate-700 font-mono">T11.5</span>
                    </div>
                    <p className="text-xs text-text-400">Pass/Fail marks & ComponentMark sync</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
