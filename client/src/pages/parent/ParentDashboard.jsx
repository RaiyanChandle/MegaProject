import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, DollarSign, Activity } from 'lucide-react';

export default function ParentDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-text-900">Welcome, {user?.name || 'Parent'}!</h2>
          <p className="text-sm text-text-500 mt-1">Monitor your children's academic progress and fees.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-0 border border-border p-6 rounded-xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-primary/10 text-primary rounded-lg">
            <Users size={24} />
          </div>
          <div>
            <div className="text-sm font-medium text-text-500">Linked Children</div>
            <div className="text-2xl font-bold text-text-900">--</div>
          </div>
        </div>

        <div className="bg-surface-0 border border-border p-6 rounded-xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-warning/10 text-warning rounded-lg">
            <Activity size={24} />
          </div>
          <div>
            <div className="text-sm font-medium text-text-500">Recent Updates</div>
            <div className="text-2xl font-bold text-text-900">--</div>
          </div>
        </div>

        <div className="bg-surface-0 border border-border p-6 rounded-xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-danger/10 text-danger rounded-lg">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="text-sm font-medium text-text-500">Total Pending Fees</div>
            <div className="text-2xl font-bold text-text-900">--</div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-surface-0 border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-text-900">My Children</h3>
          <p className="text-sm text-text-500 mt-1">Select a child to view detailed reports.</p>
        </div>
        <div className="p-8 text-center text-sm text-text-500 italic bg-surface-50">
          No children are currently linked to your account. Please contact the department administrator.
        </div>
      </div>
    </div>
  );
}
