import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import { 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Plus, 
  Users, 
  AlertCircle,
  ShieldCheck,
  CalendarDays,
  FileCheck,
  Award
} from 'lucide-react';

export default function ExamStaffDashboard() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const data = await apiClient.get('/exams');
        setExams(data);
      } catch (error) {
        console.error('Failed to load dashboard exams:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  // Upcoming exams in the next 14 days
  const now = new Date();
  const upcomingExams = exams
    .filter(e => e.examDate && new Date(e.examDate) >= now)
    .sort((a, b) => new Date(a.examDate) - new Date(b.examDate))
    .slice(0, 5);

  const pendingVerificationCount = exams.reduce((acc, curr) => {
    return acc + (curr.resultCount - (curr.verifiedResultCount || 0));
  }, 0);

  const totalCandidatesScheduled = exams.reduce((acc, curr) => {
    return acc + (curr.candidateCount || 0);
  }, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-surface-0 border border-border rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#8C4A3A]" />
            <span className="text-xs font-mono font-semibold text-text-500 uppercase tracking-wider">
              EXAMINATION CONTROLLER PORTAL
            </span>
          </div>
          <h1 className="text-2xl font-bold text-text-900 tracking-tight">
            Welcome back, {user?.name || 'Exam Controller'}
          </h1>
          <p className="text-sm text-text-500">
            ID: <span className="font-mono text-text-900 font-medium">{user?.instituteId || 'EXKIT'}</span> • Official exam scheduling, question papers, hall tickets, and results verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/examstaff/exams">
            <Button variant="accent" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>Schedule New Exam</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-0 border border-border rounded-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-500 uppercase tracking-wider">Total Scheduled</span>
            <div className="w-8 h-8 rounded-full bg-ink-700/10 flex items-center justify-center text-ink-700">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-3xl font-bold text-text-900 mt-2">
            {loading ? '...' : exams.length}
          </div>
          <span className="text-xs text-text-500 mt-1 block">Active across all terms</span>
        </div>

        <div className="bg-surface-0 border border-border rounded-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-500 uppercase tracking-wider">Upcoming (14d)</span>
            <div className="w-8 h-8 rounded-full bg-info/10 flex items-center justify-center text-info">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-3xl font-bold text-info mt-2">
            {loading ? '...' : upcomingExams.length}
          </div>
          <span className="text-xs text-text-500 mt-1 block">Scheduled on calendar</span>
        </div>

        <div className="bg-surface-0 border border-border rounded-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-500 uppercase tracking-wider">Eligible Candidates</span>
            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center text-success">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-3xl font-bold text-success mt-2">
            {loading ? '...' : totalCandidatesScheduled}
          </div>
          <span className="text-xs text-text-500 mt-1 block">Subject enrollments</span>
        </div>

        <div className="bg-surface-0 border border-border rounded-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-500 uppercase tracking-wider">Pending Verification</span>
            <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center text-warning">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-3xl font-bold text-warning mt-2">
            {loading ? '...' : pendingVerificationCount}
          </div>
          <span className="text-xs text-text-500 mt-1 block">Awaiting Exam Cell signoff</span>
        </div>
      </div>

      {/* Quick Action Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link 
          to="/examstaff/exams" 
          className="bg-surface-0 border border-border rounded-lg p-5 hover:border-ink-700 hover:shadow-xs transition-all group"
        >
          <div className="w-10 h-10 rounded-md bg-ink-900 text-white flex items-center justify-center mb-3">
            <CalendarDays className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-text-900 group-hover:text-ink-700">
            Exam Scheduling
          </h3>
          <p className="text-xs text-text-500 mt-1">
            Create Midterm, Final, and Makeup exams. Map each schedule to internal assessment components.
          </p>
          <div className="flex items-center gap-1 text-xs font-medium text-ink-700 mt-4">
            <span>Manage schedules</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link 
          to="/examstaff/halltickets" 
          className="bg-surface-0 border border-border rounded-lg p-5 hover:border-ink-700 hover:shadow-xs transition-all group"
        >
          <div className="w-10 h-10 rounded-md bg-ink-700 text-white flex items-center justify-center mb-3">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-text-900 group-hover:text-ink-700">
            Hall Ticket Desk
          </h3>
          <p className="text-xs text-text-500 mt-1">
            Generate formal admit cards per student enrollment, assign seat numbers, and print official passes.
          </p>
          <div className="flex items-center gap-1 text-xs font-medium text-ink-700 mt-4">
            <span>View Hall Tickets</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link 
          to="/examstaff/results" 
          className="bg-surface-0 border border-border rounded-lg p-5 hover:border-ink-700 hover:shadow-xs transition-all group"
        >
          <div className="w-10 h-10 rounded-md bg-brass-500 text-white flex items-center justify-center mb-3">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-text-900 group-hover:text-ink-700">
            Results Verification
          </h3>
          <p className="text-xs text-text-500 mt-1">
            Verify submitted paper marks, approve and publish results, sync with internal marks and compile SGPA.
          </p>
          <div className="flex items-center gap-1 text-xs font-medium text-ink-700 mt-4">
            <span>Verify & Publish</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      {/* Upcoming Timetable Section */}
      <div className="bg-surface-0 border border-border rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-text-900">Next Upcoming Examinations</h2>
            <p className="text-xs text-text-500">Upcoming exam sessions scheduled on the institutional calendar.</p>
          </div>
          <Link to="/examstaff/exams">
            <Button variant="secondary" size="sm" className="text-xs">
              View All Timetable
            </Button>
          </Link>
        </div>

        <div className="divide-y divide-border/60">
          {upcomingExams.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-500">
              No upcoming exams scheduled in the next 14 days.
            </div>
          ) : (
            upcomingExams.map((exam) => {
              const examDateObj = new Date(exam.examDate);
              const daysDiff = Math.ceil((examDateObj - now) / (1000 * 60 * 60 * 24));
              return (
                <div key={exam.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-surface-50 border border-border flex flex-col items-center justify-center font-mono">
                      <span className="text-[10px] text-text-500 uppercase leading-none">
                        {examDateObj.toLocaleString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-sm font-bold text-text-900 leading-none mt-0.5">
                        {examDateObj.getDate()}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-900">
                          {exam.subject?.name}
                        </span>
                        <StatusBadge status={exam.examType} />
                      </div>
                      <div className="text-xs text-text-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{exam.subject?.code}</span>
                        <span>•</span>
                        <span>{exam.class?.name}</span>
                        <span>•</span>
                        <span>{examDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div className="hidden sm:flex flex-col">
                      <span className="text-xs font-mono font-medium text-text-900">
                        {exam.candidateCount ?? 0} candidates
                      </span>
                      <span className="text-[11px] text-text-500">
                        Max: {exam.maxMarks}M
                      </span>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-info/10 text-info">
                      in {daysDiff} days
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
