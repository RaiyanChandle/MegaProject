import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import { toast } from '../../components/ui/Toast';
import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubjects = async () => {
    try {
      const data = await apiClient.get('/subjects');
      setSubjects(data);
    } catch (error) {
      toast.error('Failed to load subjects');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const columns = [
    { 
      title: 'Subject Code', 
      key: 'code', 
      className: 'font-mono text-sm',
      render: (val, row) => (
        <Link to={`/deptadmin/subjects/${row.id}`} className="text-ink-700 hover:underline font-medium">
          {val}
        </Link>
      )
    },
    { title: 'Name', key: 'name', className: 'font-semibold' },
    { 
      title: 'Class', 
      key: 'class',
      render: (val, row) => (
        <Link to={`/deptadmin/classes/${row.classId}`} className="text-ink-700 hover:underline font-medium">
          {val?.name} (Sem {val?.semesterNumber})
        </Link>
      )
    },
    { 
      title: 'Type', 
      key: 'subjectType',
      render: (val) => <StatusBadge status={val} />
    },
    { title: 'Credits', key: 'credits' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <Link 
          to={`/deptadmin/subjects/${row.id}`} 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink-100 text-ink-700 hover:bg-ink-200 rounded-md text-sm font-medium transition-colors"
        >
          <BookOpen size={14} />
          Manage Scheme
        </Link>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-900">All Subjects</h2>
          <p className="text-sm text-text-500 mt-1">
            Global view of all subjects taught across your department.
          </p>
        </div>
      </div>

      <div className="bg-surface-0 border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-md bg-ink-100 text-ink-700">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-text-900">{subjects.length}</div>
            <div className="text-sm font-medium text-text-500">Total Subjects</div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-text-500 py-4">Loading subjects...</div>
        ) : subjects.length > 0 ? (
          <DataTable columns={columns} data={subjects} />
        ) : (
          <div className="text-sm text-text-500 italic py-4">
            No subjects found. Subjects can be created inside a specific class.
          </div>
        )}
      </div>
    </div>
  );
}
