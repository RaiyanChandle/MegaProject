import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import { toast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { BookOpen, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSearch } from '../../context/SearchContext';

export default function Subjects() {
  const { searchQuery } = useSearch();
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availableBatchYears, setAvailableBatchYears] = useState([]);
  const [selectedBatchYear, setSelectedBatchYear] = useState('');
  
  const [isViewStudentsModalOpen, setIsViewStudentsModalOpen] = useState(false);
  const [subjectStudents, setSubjectStudents] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const fetchSubjects = async () => {
    try {
      const data = await apiClient.get('/subjects');
      setSubjects(data);
      
      const uniqueYears = Array.from(new Set(data.map(s => s.class?.batchYear).filter(Boolean))).sort().reverse();
      setAvailableBatchYears(uniqueYears);
      if (uniqueYears.length > 0) {
        setSelectedBatchYear(uniqueYears[0]);
      }
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
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleViewStudents(row)} 
            className="text-text-500 hover:text-primary transition-colors flex items-center gap-1 text-xs font-medium" 
            title="View Enrolled Students"
          >
            <Users size={16} /> Students
          </button>
          <div className="w-px h-4 bg-border"></div>
          <Link 
            to={`/deptadmin/subjects/${row.id}`} 
            className="inline-flex items-center gap-1.5 text-text-500 hover:text-ink-700 text-xs font-medium transition-colors"
          >
            <BookOpen size={16} />
            Manage Scheme
          </Link>
        </div>
      )
    }
  ];

  const handleViewStudents = async (sub) => {
    setSelectedSubject(sub);
    try {
      const studs = await apiClient.get(`/subjects/${sub.id}/students`);
      setSubjectStudents(studs);
      setIsViewStudentsModalOpen(true);
    } catch (error) {
      toast.error('Failed to load students for this subject');
    }
  };

  const studentColumns = [
    { title: 'Roll No', key: 'rollNumber', className: 'font-mono' },
    { title: 'Name', key: 'name', className: 'font-semibold' },
    { title: 'Email', key: 'email', className: 'text-sm' },
  ];

  const filteredSubjects = subjects.filter(s => {
    // 1. Batch Year filter
    if (selectedBatchYear && s.class?.batchYear !== selectedBatchYear) {
      return false;
    }
    
    // 2. Search filter
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      if (
        !s.name?.toLowerCase().includes(lowerQ) &&
        !s.code?.toLowerCase().includes(lowerQ)
      ) {
        return false;
      }
    }
    return true;
  });

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

      {availableBatchYears.length > 0 && (
        <div className="flex border-b border-border overflow-x-auto">
          {availableBatchYears.map(year => (
            <button
              key={year}
              onClick={() => setSelectedBatchYear(year)}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                selectedBatchYear === year
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-500 hover:text-text-900 hover:border-border'
              }`}
            >
              Batch {year}
            </button>
          ))}
        </div>
      )}

      <div className="bg-surface-0 border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-md bg-ink-100 text-ink-700">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-text-900">{filteredSubjects.length}</div>
            <div className="text-sm font-medium text-text-500">Subjects in Batch {selectedBatchYear}</div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-text-500 py-4">Loading subjects...</div>
        ) : filteredSubjects.length > 0 ? (
          <DataTable columns={columns} data={filteredSubjects} />
        ) : (
          <div className="text-sm text-text-500 italic py-4">
            No subjects found for this batch year. Subjects can be created inside a specific class.
          </div>
        )}
      </div>

      {/* View Students Modal */}
      <Modal 
        isOpen={isViewStudentsModalOpen} 
        onClose={() => setIsViewStudentsModalOpen(false)} 
        title={`Enrolled Students - ${selectedSubject?.name} (${selectedSubject?.code})`}
        maxWidth="max-w-4xl"
      >
        <div className="max-h-[60vh] overflow-y-auto">
          {subjectStudents.length > 0 ? (
            <DataTable columns={studentColumns} data={subjectStudents} />
          ) : (
            <div className="text-center p-6 text-text-500 bg-surface-50 rounded-md">
              No students are currently enrolled in this subject.
            </div>
          )}
        </div>
        <div className="pt-4 flex justify-end">
          <Button type="button" variant="secondary" onClick={() => setIsViewStudentsModalOpen(false)}>Close</Button>
        </div>
      </Modal>
    </div>
  );
}
