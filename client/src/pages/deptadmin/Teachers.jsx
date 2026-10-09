import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import { toast } from '../../components/ui/Toast';
import { Plus, Eye, EyeOff } from 'lucide-react';

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkSuccess, setBulkSuccess] = useState(0);

  const fetchTeachers = async () => {
    try {
      const data = await apiClient.get('/teachers');
      setTeachers(data);
    } catch (error) {
      toast.error('Failed to load teachers');
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiClient.post('/teachers', formData);
      toast.success('Teacher created successfully');
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '' });
      fetchTeachers();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setBulkErrors([]);
    setBulkSuccess(0);

    try {
      const rows = csvData.split('\n').map(row => row.trim()).filter(Boolean);
      // Assume header: Name,Email,Password
      const records = rows.slice(1).map(row => {
        const [name, email, password] = row.split(',').map(s => s?.trim());
        return { name, email, password };
      });

      if (records.length === 0) {
        toast.error('No valid records found in CSV data.');
        setIsLoading(false);
        return;
      }

      const response = await apiClient.post('/teachers/bulk', { records });
      
      if (response.errors && response.errors.length > 0) {
        setBulkErrors(response.errors);
      }
      
      setBulkSuccess(response.successfulCount);
      toast.success(response.message);
      
      if (response.successfulCount > 0) {
        fetchTeachers();
      }
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
    { title: 'Created At', key: 'createdAt', render: (val) => new Date(val).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-900">Teachers</h2>
          <p className="text-sm text-text-500 mt-1">Manage faculty members for your department.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setIsBulkModalOpen(true)}>
            Bulk Import
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            New Teacher
          </Button>
        </div>
      </div>

      <DataTable 
        columns={columns}
        data={teachers}
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Create Teacher"
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
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-400 hover:text-ink-700 focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Teacher'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isBulkModalOpen} 
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Import Teachers"
      >
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          <p className="text-sm text-text-500">
            Paste your CSV data below. The first row must be the header: <code>Name,Email,Password</code>.
          </p>
          <Field label="CSV Data">
            <textarea
              className="w-full h-40 font-mono text-sm"
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="Name,Email,Password&#10;John Doe,john@example.com,pass123&#10;Jane Smith,jane@example.com,pass456"
              required
            ></textarea>
          </Field>

          {bulkErrors.length > 0 && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-md">
              <p className="text-sm font-semibold text-danger mb-2">Import Errors ({bulkErrors.length})</p>
              <ul className="text-xs text-danger space-y-1 max-h-32 overflow-y-auto">
                {bulkErrors.map((err, i) => (
                  <li key={i}>Row {err.row} ({err.email}): {err.error}</li>
                ))}
              </ul>
            </div>
          )}

          {bulkSuccess > 0 && (
            <div className="p-3 bg-success/10 border border-success/20 rounded-md">
              <p className="text-sm text-success">Successfully imported {bulkSuccess} teachers.</p>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsBulkModalOpen(false)}>
              Close
            </Button>
            <Button type="submit" disabled={isLoading || !csvData.trim()}>
              {isLoading ? 'Importing...' : 'Run Import'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
