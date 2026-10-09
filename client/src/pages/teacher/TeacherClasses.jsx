import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import { BookOpen } from 'lucide-react';
import { toast } from '../../components/ui/Toast';

export default function TeacherClasses() {
  const [allocations, setAllocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllocations = async () => {
      try {
        const data = await apiClient.get('/teachers/my-allocations');
        setAllocations(data);
      } catch (error) {
        toast.error('Failed to load your assigned classes');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllocations();
  }, []);

  const columns = [
    { 
      title: 'Subject', 
      key: 'subjectName',
      render: (_, row) => (
        <div>
          <div className="font-semibold text-text-900">{row.subject?.name}</div>
          <div className="text-xs font-mono text-text-500">{row.subject?.code}</div>
        </div>
      )
    },
    { 
      title: 'Class & Division', 
      key: 'classInfo',
      render: (_, row) => (
        <div>
          <div className="font-medium text-text-900">{row.class?.name}</div>
          <div className="text-xs text-text-500">
            Batch: {row.class?.batchYear} | Sem: {row.class?.semesterNumber}
            {row.division?.name && ` | Div: ${row.division.name}`}
          </div>
        </div>
      )
    },
    {
      title: 'Type',
      key: 'subjectType',
      render: (_, row) => <StatusBadge status={row.subject?.subjectType} />
    },
    {
      title: 'Credits',
      key: 'credits',
      render: (_, row) => row.subject?.credits
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-900">My Classes & Subjects</h2>
          <p className="text-sm text-text-500 mt-1">
            Subjects and divisions assigned to you for the current academic session.
          </p>
        </div>
      </div>

      <div className="bg-surface-0 border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-md bg-ink-100 text-ink-700">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-text-900">{allocations.length}</div>
            <div className="text-sm font-medium text-text-500">Active Allocations</div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-text-500 py-4">Loading your classes...</div>
        ) : allocations.length > 0 ? (
          <DataTable columns={columns} data={allocations} />
        ) : (
          <div className="text-sm text-text-500 italic py-4 bg-surface-50 p-6 rounded-lg text-center border border-dashed border-border">
            You have not been assigned any subjects yet.
          </div>
        )}
      </div>
    </div>
  );
}
