import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { Plus, Eye, Edit2, Trash2, Copy } from 'lucide-react';

export default function Classes() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', batchYear: '', semesterNumber: '' });

  const fetchClasses = async () => {
    try {
      const data = await apiClient.get('/classes');
      setClasses(data);
    } catch (error) {
      toast.error('Failed to load classes');
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const openModal = (cls = null) => {
    setSelectedClass(cls);
    if (cls) {
      setFormData({ 
        name: cls.name, 
        batchYear: cls.batchYear, 
        semesterNumber: cls.semesterNumber 
      });
    } else {
      setFormData({ name: '', batchYear: '', semesterNumber: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (selectedClass) {
        await apiClient.put(`/classes/${selectedClass.id}`, formData);
        toast.success('Class updated successfully');
      } else {
        await apiClient.post('/classes', formData);
        toast.success('Class created successfully');
      }
      setIsModalOpen(false);
      fetchClasses();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/classes/${selectedClass.id}`);
      toast.success('Class deleted successfully');
      fetchClasses();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [cloneBatchYear, setCloneBatchYear] = useState('');

  const openCloneModal = (cls) => {
    setSelectedClass(cls);
    setCloneBatchYear(''); // Reset
    setIsCloneModalOpen(true);
  };

  const handleCloneSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiClient.post(`/classes/${selectedClass.id}/clone`, { newBatchYear: cloneBatchYear });
      toast.success('Class cloned successfully! Check your new curriculum instance.');
      setIsCloneModalOpen(false);
      fetchClasses();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { title: 'Class Name', key: 'name', className: 'font-semibold' },
    { title: 'Batch Year', key: 'batchYear' },
    { title: 'Semester', key: 'semesterNumber' },
    { 
      title: 'Created At', 
      key: 'createdAt',
      render: (val) => new Date(val).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(`/deptadmin/classes/${row.id}`)}
            className="text-text-500 hover:text-ink-700 flex items-center gap-1 text-xs font-medium"
            title="View Details"
          >
            <Eye size={16} />
          </button>
          <div className="h-4 w-px bg-border"></div>
          <button 
            onClick={() => openCloneModal(row)}
            className="text-text-500 hover:text-ink-700"
            title="Clone to new Batch Year"
          >
            <Copy size={16} />
          </button>
          <button 
            onClick={() => openModal(row)}
            className="text-text-500 hover:text-ink-700"
            title="Edit Class"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => {
              setSelectedClass(row);
              setIsConfirmOpen(true);
            }}
            className="text-text-500 hover:text-danger"
            title="Delete Class"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-900">Classes</h2>
          <p className="text-sm text-text-500 mt-1">Manage curriculum instances for your department.</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus size={16} />
          New Class
        </Button>
      </div>

      <DataTable columns={columns} data={classes} />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedClass ? 'Edit Class' : 'Create New Class'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Class Name">
            <input 
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. CSE Sem 3"
              required
            />
          </Field>
          
          <div className="grid grid-cols-2 gap-4">
            <Field label="Batch Year">
              <input 
                type="text"
                value={formData.batchYear}
                onChange={(e) => setFormData({ ...formData, batchYear: e.target.value })}
                placeholder="e.g. 2024-2028"
                required
              />
            </Field>
            
            <Field label="Semester Number">
              <input 
                type="number"
                min="1"
                max="10"
                value={formData.semesterNumber}
                onChange={(e) => setFormData({ ...formData, semesterNumber: e.target.value })}
                required
              />
            </Field>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : (selectedClass ? 'Save Changes' : 'Create Class')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isCloneModalOpen} 
        onClose={() => setIsCloneModalOpen(false)} 
        title="Clone Class to Next Batch"
      >
        <form onSubmit={handleCloneSubmit} className="space-y-4">
          <p className="text-sm text-text-500 mb-2">
            Cloning <span className="font-semibold text-text-900">{selectedClass?.name} (Batch: {selectedClass?.batchYear}, Sem: {selectedClass?.semesterNumber})</span>.
            This will copy all divisions, subjects, marking schemes, and elective slots into a new batch year.
          </p>

          <Field label="New Batch Year">
            <input 
              type="text"
              value={cloneBatchYear}
              onChange={(e) => setCloneBatchYear(e.target.value)}
              placeholder="e.g. 2025-2029"
              required
            />
          </Field>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsCloneModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Cloning...' : 'Clone Class'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Class"
        message={`Are you sure you want to delete ${selectedClass?.name}? This action cannot be undone.`}
        confirmText="Delete"
        isDanger={true}
      />
    </div>
  );
}
