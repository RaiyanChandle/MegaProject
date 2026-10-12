import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { Plus, ArrowLeft, Edit2, Trash2 } from 'lucide-react';

export default function SubjectDetails() {
  const { id } = useParams();
  const [subjectData, setSubjectData] = useState(null);
  const [components, setComponents] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', maxMarks: 100, category: 'INTERNAL' });
  const [isLoading, setIsLoading] = useState(false);

  // --- Allocations State ---
  const [allocations, setAllocations] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [isAllocModalOpen, setIsAllocModalOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [isAllocLoading, setIsAllocLoading] = useState(false);

  const fetchData = async () => {
    try {
      const sub = await apiClient.get(`/subjects/${id}`);
      setSubjectData(sub);
      
      const comps = await apiClient.get(`/assessment-components?subjectId=${id}`);
      setComponents(comps);

      const allocs = await apiClient.get(`/subject-allocations?subjectId=${id}&classId=${sub.classId}`);
      setAllocations(allocs);

      const allTeachers = await apiClient.get('/teachers');
      setTeachers(allTeachers);

      const divs = await apiClient.get(`/divisions?classId=${sub.classId}`);
      setDivisions(divs);
    } catch (error) {
      toast.error('Failed to load subject details');
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const openModal = (comp = null) => {
    setSelectedComponent(comp);
    if (comp) {
      setFormData({ name: comp.name, maxMarks: comp.maxMarks, category: comp.category });
    } else {
      setFormData({ name: '', maxMarks: 100, category: 'INTERNAL' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (selectedComponent) {
        await apiClient.put(`/assessment-components/${selectedComponent.id}`, formData);
        toast.success('Component updated successfully');
      } else {
        await apiClient.post('/assessment-components', { subjectId: id, ...formData });
        toast.success('Component created successfully');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/assessment-components/${selectedComponent.id}`);
      toast.success('Component deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleAllocateTeacher = async (e) => {
    e.preventDefault();
    if (!selectedTeacherId) return;
    
    setIsAllocLoading(true);
    try {
      await apiClient.post('/subject-allocations', {
        teacherId: selectedTeacherId,
        subjectId: id,
        classId: subjectData.classId,
        divisionId: selectedDivisionId || null
      });
      toast.success('Teacher allocated successfully');
      setIsAllocModalOpen(false);
      setSelectedTeacherId('');
      setSelectedDivisionId('');
      fetchData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsAllocLoading(false);
    }
  };

  const handleRemoveAllocation = async (allocationId) => {
    if (!window.confirm('Are you sure you want to remove this teacher from the subject?')) return;
    try {
      await apiClient.delete(`/subject-allocations/${allocationId}`);
      toast.success('Allocation removed');
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const totalMarks = components.reduce((sum, comp) => sum + Number(comp.maxMarks), 0);

  const columns = [
    { title: 'Component Name', key: 'name', className: 'font-semibold' },
    { 
      title: 'Category', 
      key: 'category',
      render: (val) => <StatusBadge status={val} />
    },
    { 
      title: 'Max Marks', 
      key: 'maxMarks',
      className: 'font-mono'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <button 
            onClick={() => openModal(row)}
            className="text-text-500 hover:text-ink-700"
            title="Edit Component"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => {
              setSelectedComponent(row);
              setIsConfirmOpen(true);
            }}
            className="text-text-500 hover:text-danger"
            title="Delete Component"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  const allocColumns = [
    { title: 'Teacher ID', key: 'instituteId', render: (_, row) => row.teacher?.instituteId, className: 'font-mono text-sm' },
    { title: 'Teacher Name', key: 'teacherName', render: (_, row) => row.teacher?.name, className: 'font-semibold' },
    { title: 'Email', key: 'email', render: (_, row) => row.teacher?.email },
    { title: 'Division', key: 'division', render: (_, row) => row.division?.name || <span className="text-text-400 italic">All Divisions</span> },
    { 
      title: 'Allocated On', 
      key: 'createdAt',
      render: (val) => new Date(val).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <button 
          onClick={() => handleRemoveAllocation(row.id)}
          className="text-text-500 hover:text-danger text-xs font-medium"
        >
          Remove
        </button>
      )
    }
  ];

  if (!subjectData) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/deptadmin/classes/${subjectData.classId}`} className="text-text-500 hover:text-ink-700">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-xl font-semibold text-text-900">{subjectData.name} ({subjectData.code})</h2>
          <p className="text-sm text-text-500 mt-1">
            {subjectData.class?.name} | <StatusBadge status={subjectData.subjectType} /> | Credits: {subjectData.credits}
          </p>
        </div>
      </div>

      <div className="bg-surface-0 border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-text-900">Marking Scheme (Assessment Components)</h3>
            <p className="text-sm text-text-500 mt-1">
              Define the breakdown of marks for this subject. Total marks: <span className="font-semibold text-ink-700">{totalMarks}</span>
            </p>
          </div>
          <Button onClick={() => openModal()} size="sm">
            <Plus size={16} />
            New Component
          </Button>
        </div>
        
        {components.length > 0 ? (
          <DataTable columns={columns} data={components} />
        ) : (
          <div className="text-sm text-text-500 italic py-4">No assessment components defined yet.</div>
        )}
      </div>

      <div className="bg-surface-0 border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-text-900">Allocated Teachers</h3>
            <p className="text-sm text-text-500 mt-1">
              Teachers assigned to teach this subject to the current class.
            </p>
          </div>
          <Button onClick={() => setIsAllocModalOpen(true)} size="sm">
            <Plus size={16} />
            Allocate Teacher
          </Button>
        </div>
        
        {allocations.length > 0 ? (
          <DataTable columns={allocColumns} data={allocations} />
        ) : (
          <div className="text-sm text-text-500 italic py-4">No teachers allocated to this subject yet.</div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedComponent ? 'Edit Component' : 'Create New Component'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Component Name">
            <input 
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Mid Semester Exam"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Max Marks">
              <input 
                type="number"
                step="0.5"
                min="1"
                value={formData.maxMarks}
                onChange={(e) => setFormData({ ...formData, maxMarks: parseFloat(e.target.value) })}
                required
              />
            </Field>

            <Field label="Category">
              <select 
                value={formData.category} 
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 bg-surface-0"
              >
                <option value="INTERNAL">Internal</option>
                <option value="EXTERNAL">External</option>
              </select>
            </Field>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : (selectedComponent ? 'Save Changes' : 'Create Component')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Component"
        message={`Are you sure you want to delete ${selectedComponent?.name}? Marks associated with it (if any) will also be lost.`}
        confirmText="Delete"
        isDanger={true}
      />

      <Modal
        isOpen={isAllocModalOpen}
        onClose={() => setIsAllocModalOpen(false)}
        title="Allocate Teacher to Subject"
      >
        <form onSubmit={handleAllocateTeacher} className="space-y-4">
          <Field label="Select Teacher">
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              required
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 bg-surface-0"
            >
              <option value="">-- Choose a teacher --</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.instituteId})</option>
              ))}
            </select>
          </Field>

          <Field label="Target Division (Optional)">
            <select
              value={selectedDivisionId}
              onChange={(e) => setSelectedDivisionId(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 bg-surface-0"
            >
              <option value="">All Divisions (Entire Class)</option>
              {divisions.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <p className="text-xs text-text-400 mt-1">If left blank, the teacher will be assigned to all divisions.</p>
          </Field>
          
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsAllocModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isAllocLoading || !selectedTeacherId}>
              {isAllocLoading ? 'Allocating...' : 'Confirm Allocation'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
