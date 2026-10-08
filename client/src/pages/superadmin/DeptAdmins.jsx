import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import StatusBadge from '../../components/ui/StatusBadge';
import { toast } from '../../components/ui/Toast';
import { Plus, Power, PowerOff } from 'lucide-react';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function DeptAdmins() {
  const [admins, setAdmins] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [newStatus, setNewStatus] = useState(false);
  
  const [formData, setFormData] = useState({ name: '', email: '', departmentId: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [adminsData, deptsData] = await Promise.all([
        apiClient.get('/dept-admins'),
        apiClient.get('/departments')
      ]);
      setAdmins(adminsData);
      setDepartments(deptsData);
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiClient.post('/dept-admins', formData);
      toast.success('Department Admin created successfully');
      setIsModalOpen(false);
      setFormData({ name: '', email: '', departmentId: '', password: '' });
      fetchData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      await apiClient.patch(`/dept-admins/${selectedAdmin.id}/status`, { isActive: newStatus });
      toast.success(`Admin ${newStatus ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const columns = [
    { title: 'ID', key: 'instituteId', className: 'font-mono' },
    { title: 'Name', key: 'name', className: 'font-semibold' },
    { title: 'Email', key: 'email' },
    { 
      title: 'Department', 
      key: 'department', 
      render: (_, row) => row.department?.name || 'N/A' 
    },
    { 
      title: 'Status', 
      key: 'isActive', 
      render: (val) => <StatusBadge status={val ? 'ACTIVE' : 'INACTIVE'} />
    },
    { 
      title: 'Actions', 
      key: 'actions',
      render: (_, row) => (
        <button 
          className={row.isActive ? 'text-danger hover:text-danger/80' : 'text-success hover:text-success/80'}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedAdmin(row);
            setNewStatus(!row.isActive);
            setIsConfirmOpen(true);
          }}
          title={row.isActive ? 'Deactivate' : 'Activate'}
        >
          {row.isActive ? <PowerOff size={16} /> : <Power size={16} />}
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-900">Department Admins</h2>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          New Admin
        </Button>
      </div>

      <DataTable 
        columns={columns}
        data={admins}
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Create Department Admin"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name">
            <input 
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Field>
          
          <Field label="Email">
            <input 
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </Field>

          <Field label="Department">
            <select 
              value={formData.departmentId}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              required
              className="w-full bg-surface-0"
            >
              <option value="" disabled>Select a department</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </Field>

          <Field label="Temporary Password">
            <input 
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </Field>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Admin'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleToggleStatus}
        title={newStatus ? "Activate Admin" : "Deactivate Admin"}
        message={`Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} ${selectedAdmin?.name}?`}
        isDestructive={!newStatus}
        confirmText={newStatus ? 'Activate' : 'Deactivate'}
      />
    </div>
  );
}
