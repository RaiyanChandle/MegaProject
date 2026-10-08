import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import { toast } from '../../components/ui/Toast';
import { Plus } from 'lucide-react';

export default function ExamStaff() {
  const [staff, setStaff] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  const fetchStaff = async () => {
    try {
      const data = await apiClient.get('/exam-staff');
      setStaff(data);
    } catch (error) {
      toast.error('Failed to load Exam Staff');
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiClient.post('/exam-staff', formData);
      toast.success('Exam Staff created successfully');
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '' });
      fetchStaff();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { title: 'ID', key: 'instituteId', className: 'font-mono' },
    { title: 'Name', key: 'name', className: 'font-semibold' },
    { title: 'Email', key: 'email' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-900">Exam Staff</h2>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          New Staff
        </Button>
      </div>

      <DataTable 
        columns={columns}
        data={staff}
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Create Exam Staff"
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
              {isLoading ? 'Creating...' : 'Create Staff'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
