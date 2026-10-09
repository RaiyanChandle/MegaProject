import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Calendar, Clock, DollarSign, FileCheck } from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-text-900">Welcome, {user?.name || 'Student'}!</h2>
          <p className="text-sm text-text-500 mt-1">Here is an overview of your academic progress.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-0 border border-border p-6 rounded-xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-primary/10 text-primary rounded-lg">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="text-sm font-medium text-text-500">My Subjects</div>
            <div className="text-2xl font-bold text-text-900">--</div>
          </div>
        </div>

        <div className="bg-surface-0 border border-border p-6 rounded-xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-success/10 text-success rounded-lg">
            <Clock size={24} />
          </div>
          <div>
            <div className="text-sm font-medium text-text-500">Overall Attendance</div>
            <div className="text-2xl font-bold text-text-900">--%</div>
          </div>
        </div>

        <div className="bg-surface-0 border border-border p-6 rounded-xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-warning/10 text-warning rounded-lg">
            <FileCheck size={24} />
          </div>
          <div>
            <div className="text-sm font-medium text-text-500">Recent Marks</div>
            <div className="text-2xl font-bold text-text-900">--</div>
          </div>
        </div>

        <div className="bg-surface-0 border border-border p-6 rounded-xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-danger/10 text-danger rounded-lg">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="text-sm font-medium text-text-500">Pending Fees</div>
            <div className="text-2xl font-bold text-text-900">--</div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-surface-0 border border-border rounded-xl p-6">
           <h3 className="text-lg font-semibold text-text-900 mb-4 flex items-center gap-2"><Calendar size={20} className="text-text-500"/> Upcoming Schedule</h3>
           <div className="text-sm text-text-500 italic flex items-center justify-center h-32 bg-surface-50 rounded-lg border border-dashed border-border">
             No upcoming classes or exams found.
           </div>
        </div>
        
        <div className="bg-surface-0 border border-border rounded-xl p-6">
           <h3 className="text-lg font-semibold text-text-900 mb-4 flex items-center gap-2"><BookOpen size={20} className="text-text-500"/> Recent Announcements</h3>
           <div className="text-sm text-text-500 italic flex items-center justify-center h-32 bg-surface-50 rounded-lg border border-dashed border-border">
             No new announcements.
           </div>
        </div>
      </div>
    </div>
  );
}
