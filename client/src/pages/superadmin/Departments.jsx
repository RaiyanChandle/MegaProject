import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import { toast } from '../../components/ui/Toast';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [isLoading, setIsLoading] = useState(false);

  const fetchDepartments = async () => {
    try {
      const data = await apiClient.get('/departments');
      setDepartments(data);
    } catch (error) {
      toast.error('Failed to load departments');
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (selectedDept) {
        await apiClient.put(`/departments/${selectedDept.id}`, formData);
        toast.success('Department updated successfully');
      } else {
        await apiClient.post('/departments', formData);
        toast.success('Department created successfully');
      }
      setIsModalOpen(false);
      fetchDepartments();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/departments/${selectedDept.id}`);
      toast.success('Department deleted');
      fetchDepartments();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const openModal = (dept = null) => {
    setSelectedDept(dept);
    setFormData(dept ? { name: dept.name, code: dept.code } : { name: '', code: '' });
    setIsModalOpen(true);
  };

  const columns = [
    { title: 'Code', key: 'code', className: 'font-mono' },
    { title: 'Name', key: 'name', className: 'font-semibold' },
    { 
      title: 'Actions', 
      key: 'actions',
      render: (_, row) => (
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <button 
            className="text-text-500 hover:text-ink-700"
            onClick={() => openModal(row)}
          >
            <Edit2 size={16} />
          </button>
          <button 
            className="text-text-500 hover:text-danger"
            onClick={() => {
              setSelectedDept(row);
              setIsConfirmOpen(true);
            }}
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
        <h2 className="text-xl font-semibold text-text-900">Departments</h2>
        <Button onClick={() => openModal()}>
          <Plus size={16} />
          New Department
        </Button>
      </div>

      <DataTable 
        columns={columns}
        data={departments}
        keyField="id"
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={selectedDept ? 'Edit Department' : 'Create Department'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Department Code">
            <input 
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. CSE"
              required
              className="font-mono"
            />
          </Field>
          
          <Field label="Department Name">
            <input 
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Computer Science and Engineering"
              required
            />
          </Field>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Department'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Department"
        message={`Are you sure you want to delete ${selectedDept?.name}? This action cannot be undone.`}
        isDestructive
      />
    </div>
  );
}
