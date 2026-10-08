import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Building2, Users, FileCheck, Calendar } from 'lucide-react';
import { toast } from '../../components/ui/Toast';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    departmentsCount: 0,
    deptAdminsCount: 0,
    examStaffCount: 0,
    academicTermsCount: 0
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiClient.get('/dashboard/superadmin');
        setStats(data);
      } catch (error) {
        toast.error('Failed to load dashboard analytics');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    { title: 'Total Departments', value: stats.departmentsCount, icon: Building2 },
    { title: 'Department Admins', value: stats.deptAdminsCount, icon: Users },
    { title: 'Exam Staff', value: stats.examStaffCount, icon: FileCheck },
    { title: 'Academic Terms', value: stats.academicTermsCount, icon: Calendar }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-surface-0 border border-border rounded-md p-6">
        <h3 className="text-base font-semibold text-text-900 mb-2">Welcome to NEXUS</h3>
        <p className="text-sm text-text-500">
          Super Admin dashboard. Manage global configurations and organization structure below.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-surface-0 border border-border rounded-xl p-6 flex items-center shadow-sm">
              <div className="p-3 rounded-md bg-ink-100 text-ink-700 mr-4">
                <Icon size={24} />
              </div>
              <div>
                <div className="text-xs font-medium text-text-500 uppercase tracking-wide mb-1">
                  {card.title}
                </div>
                <div className="font-mono text-2xl font-semibold text-text-900">
                  {isLoading ? '...' : card.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
