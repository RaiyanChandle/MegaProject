import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, DollarSign, Clock, ChevronRight } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';

export default function ParentDashboard() {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const data = await apiClient.get('/parents/my-children');
        setChildren(data);
      } catch (err) {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    };
    fetchChildren();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-text-900">Welcome, {user?.name || 'Parent'}!</h2>
          <p className="text-sm text-text-500 mt-1">Monitor your children's academic progress and attendance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-0 border border-border p-6 rounded-md flex items-center gap-4">
          <div className="p-3 bg-ink-900/10 text-ink-900 rounded-md">
            <Users size={24} />
          </div>
          <div>
            <div className="text-sm font-medium text-text-500">Linked Children</div>
            <div className="text-2xl font-bold font-mono text-text-900">
              {children.length}
            </div>
          </div>
        </div>

        <Link to="/parent/attendance" className="bg-surface-0 border border-border p-6 rounded-md flex items-center gap-4 hover:border-ink-700 transition-colors">
          <div className="p-3 bg-success/10 text-success rounded-md">
            <Clock size={24} />
          </div>
          <div>
            <div className="text-sm font-medium text-text-500">Attendance Portal</div>
            <div className="text-sm font-semibold text-text-900 mt-0.5 flex items-center gap-1">
              View Records <ChevronRight size={16} />
            </div>
          </div>
        </Link>

        <div className="bg-surface-0 border border-border p-6 rounded-md flex items-center gap-4">
          <div className="p-3 bg-neutral/10 text-neutral rounded-md">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="text-sm font-medium text-text-500">Fee Status</div>
            <div className="text-2xl font-bold font-mono text-text-900">
              --
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-0 border border-border rounded-md overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-900">My Children</h3>
            <p className="text-sm text-text-500 mt-0.5">Select a child to view their attendance and academics.</p>
          </div>
          <Link to="/parent/attendance">
            <Button variant="primary" size="sm">
              Attendance Records
            </Button>
          </Link>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center text-sm text-text-500">Loading children...</div>
        ) : children.length > 0 ? (
          <div className="divide-y divide-border">
            {children.map(child => (
              <div key={child.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-50 transition-colors">
                <div>
                  <div className="font-semibold text-base text-text-900">{child.name}</div>
                  <div className="text-xs text-text-500 font-mono mt-1">
                    ID: {child.instituteId} • Roll: {child.rollNumber} • Batch: {child.batchYear}
                  </div>
                  <div className="text-xs text-text-500 mt-0.5">
                    Dept: {child.department?.name} {child.division?.name && `• Div: ${child.division.name}`}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link to="/parent/attendance">
                    <Button variant="secondary" size="sm" className="flex items-center gap-1.5">
                      <Clock size={14} /> View Attendance
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-text-500 italic bg-surface-50">
            No children are currently linked to your account. Please contact the department administrator.
          </div>
        )}
      </div>
    </div>
  );
}
