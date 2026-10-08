import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import StatusBadge from '../../components/ui/StatusBadge';
import { toast } from '../../components/ui/Toast';
import { Plus, CheckCircle, Edit2 } from 'lucide-react';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function AcademicTerms() {
  const [terms, setTerms] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', startDate: '', endDate: '', isCurrent: false });
  const [isLoading, setIsLoading] = useState(false);

  const fetchTerms = async () => {
    try {
      const data = await apiClient.get('/academic-terms');
      setTerms(data);
    } catch (error) {
      toast.error('Failed to load terms');
    }
  };

  useEffect(() => {
    fetchTerms();
  }, []);

  const openModal = (term = null) => {
    setSelectedTerm(term);
    if (term) {
      // Formats '2026-08-01T00:00:00.000Z' to '2026-08-01' for input[type="date"]
      setFormData({ 
        name: term.name, 
        startDate: term.startDate.split('T')[0], 
        endDate: term.endDate.split('T')[0], 
        isCurrent: term.isCurrent 
      });
    } else {
      setFormData({ name: '', startDate: '', endDate: '', isCurrent: false });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (selectedTerm) {
        await apiClient.put(`/academic-terms/${selectedTerm.id}`, formData);
        toast.success('Term updated successfully');
      } else {
        await apiClient.post('/academic-terms', formData);
        toast.success('Term created successfully');
      }
      setIsModalOpen(false);
      fetchTerms();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMakeCurrent = async () => {
    try {
      await apiClient.patch(`/academic-terms/${selectedTerm.id}/current`);
      toast.success(`${selectedTerm.name} is now the current term`);
      fetchTerms();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const columns = [
    { title: 'Name', key: 'name', className: 'font-semibold' },
    { 
      title: 'Start Date', 
      key: 'startDate',
      render: (val) => new Date(val).toLocaleDateString()
    },
    { 
      title: 'End Date', 
      key: 'endDate',
      render: (val) => new Date(val).toLocaleDateString()
    },
    { 
      title: 'Status', 
      key: 'isCurrent', 
      render: (val) => val ? <StatusBadge status="ACTIVE" /> : <StatusBadge status="ARCHIVED" />
    },
    { 
      title: 'Actions', 
      key: 'actions',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <button 
            className="text-text-500 hover:text-ink-700"
            onClick={(e) => {
              e.stopPropagation();
              openModal(row);
            }}
          >
            <Edit2 size={16} />
          </button>
          {!row.isCurrent && (
            <button 
              className="text-text-500 hover:text-success flex items-center gap-1 text-xs font-medium"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTerm(row);
                setIsConfirmOpen(true);
              }}
            >
              <CheckCircle size={14} />
              Set Current
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-900">Academic Terms</h2>
        <Button onClick={() => openModal()}>
          <Plus size={16} />
          New Term
        </Button>
      </div>

      <DataTable 
        columns={columns}
        data={terms}
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={selectedTerm ? 'Edit Academic Term' : 'Create Academic Term'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Term Name">
            <input 
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. 2026-ODD"
              required
            />
          </Field>
          
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date">
              <input 
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </Field>
            
            <Field label="End Date">
              <input 
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </Field>
          </div>

          {!selectedTerm && (
            <label className="flex items-center gap-2 mt-4">
              <input 
                type="checkbox" 
                checked={formData.isCurrent}
                onChange={(e) => setFormData({ ...formData, isCurrent: e.target.checked })}
                className="rounded border-border text-ink-900 focus:ring-ink-700"
              />
              <span className="text-sm font-medium text-text-900">Set as Current Term immediately</span>
            </label>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : (selectedTerm ? 'Save Term' : 'Create Term')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleMakeCurrent}
        title="Set Current Term"
        message={`Are you sure you want to set ${selectedTerm?.name} as the current academic term? This will automatically deactivate the previous term for all users.`}
      />
    </div>
  );
}
