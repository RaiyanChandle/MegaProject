import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import { toast } from '../../components/ui/Toast';
import { 
  FileCheck, 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff, 
  RotateCcw,
  X 
} from 'lucide-react';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useSearch } from '../../context/SearchContext';

export default function ExamStaff() {
  const { searchQuery, setSearchQuery } = useSearch();
  const [staff, setStaff] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
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

  const openCreateModal = () => {
    setSelectedStaff(null);
    setFormData({ name: '', email: '', password: '' });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setSelectedStaff(item);
    setFormData({ 
      name: item.name || '', 
      email: item.email || '', 
      password: '' // empty means leave password intact
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (selectedStaff) {
        const payload = {
          name: formData.name,
          email: formData.email
        };
        if (formData.password && formData.password.trim()) {
          payload.password = formData.password.trim();
        }
        await apiClient.put(`/exam-staff/${selectedStaff.id}`, payload);
        toast.success('Exam Staff updated successfully');
      } else {
        await apiClient.post('/exam-staff', formData);
        toast.success('Exam Staff created successfully with EXKIT ID');
      }
      setIsModalOpen(false);
      fetchStaff();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const promptDelete = (item) => {
    setSelectedStaff(item);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await apiClient.delete(`/exam-staff/${selectedStaff.id}`);
      toast.success('Exam Staff deleted successfully');
      fetchStaff();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Filter staff with universal search
  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staff;
    const q = searchQuery.toLowerCase().trim();
    return staff.filter(s => 
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.instituteId?.toLowerCase().includes(q)
    );
  }, [staff, searchQuery]);

  const columns = [
    { 
      title: 'Institutional ID', 
      key: 'instituteId', 
      render: (val) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-50 border border-border text-ink-900">
          {val}
        </span>
      ),
      className: 'whitespace-nowrap'
    },
    { 
      title: 'Full Name', 
      key: 'name', 
      render: (val) => (
        <span className="font-semibold text-text-900 text-sm whitespace-nowrap">
          {val}
        </span>
      ),
      className: 'whitespace-nowrap'
    },
    { 
      title: 'Email Address', 
      key: 'email',
      className: 'font-mono text-xs text-text-500 whitespace-nowrap'
    },
    { 
      title: 'Registered', 
      key: 'createdAt', 
      render: (val) => new Date(val).toLocaleDateString(), 
      className: 'text-xs text-text-500 font-mono whitespace-nowrap' 
    },
    { 
      title: 'Actions', 
      key: 'actions',
      render: (_, row) => (
        <div className="flex items-center gap-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <button 
            className="p-1.5 rounded-md text-text-500 hover:text-ink-700 hover:bg-surface-50 transition-colors"
            onClick={() => openEditModal(row)}
            title="Edit Exam Staff"
          >
            <Edit2 size={15} />
          </button>
          <button 
            className="p-1.5 rounded-md text-text-500 hover:text-danger hover:bg-danger/10 transition-colors"
            onClick={() => promptDelete(row)}
            title="Delete Exam Staff"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
      className: 'whitespace-nowrap text-right'
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck size={24} className="text-role-examstaff" />
            <h2 className="text-xl font-bold text-text-900 tracking-tight">Examination Staff</h2>
          </div>
          <p className="text-sm text-text-500 mt-0.5">
            Manage authorized examination controllers who handle schedules, hall tickets, and results processing.
          </p>
        </div>
        <Button onClick={openCreateModal} className="shadow-xs self-start sm:self-auto">
          <Plus size={16} />
          New Exam Staff
        </Button>
      </div>

      {/* Table Card */}
      <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs space-y-4">
        {/* Table status header */}
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-text-900">Exam Staff Directory</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200">
                <span>Filtering by: &ldquo;{searchQuery}&rdquo;</span>
                <button 
                  onClick={() => setSearchQuery('')}
                  className="hover:text-amber-950 p-0.5"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </div>

          <div className="text-xs text-text-500 font-mono">
            Showing {filteredStaff.length} of {staff.length} staff members
          </div>
        </div>

        {/* Data Table */}
        {filteredStaff.length === 0 ? (
          <div className="p-12 text-center bg-surface-50 rounded-xl border border-dashed border-border text-text-500">
            <FileCheck size={36} className="mx-auto mb-2 text-text-500/50" />
            <p className="text-sm font-semibold text-text-900">No examination staff found</p>
            <p className="text-xs text-text-500 mt-0.5">
              {searchQuery ? "No examination staff match your current search query." : "Provision your first examination officer using the button above."}
            </p>
            {searchQuery && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSearchQuery('')}
                className="mt-3 inline-flex items-center gap-1 text-xs"
              >
                <RotateCcw size={12} />
                Clear Top Search
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <DataTable columns={columns} data={filteredStaff} />
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={selectedStaff ? `Edit Exam Staff: ${selectedStaff.name} (${selectedStaff.instituteId})` : 'Create Exam Staff'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Full Name" required>
            <input 
              type="text"
              placeholder="e.g. Prof. Anand Patil"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 bg-surface-0"
              required
            />
          </Field>
          
          <Field label="Email Address" required>
            <input 
              type="email"
              placeholder="e.g. anand.patil@kitcoek.in"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 bg-surface-0"
              required
            />
          </Field>

          <Field 
            label={selectedStaff ? "Reset Password (Optional)" : "Initial Password"} 
            required={!selectedStaff}
            helperText={selectedStaff ? "Leave blank to keep the current password unchanged." : "Minimum 6 characters recommended."}
          >
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                placeholder={selectedStaff ? "•••••••• (Leave blank to keep existing)" : "Enter initial password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 pr-10 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 bg-surface-0"
                required={!selectedStaff}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-400 hover:text-ink-700 focus:outline-none"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          <div className="pt-4 flex justify-end gap-3 border-t border-border/80">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : (selectedStaff ? 'Save Changes' : 'Create Staff')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Examination Staff Member"
        message={`Are you sure you want to delete ${selectedStaff?.name} (${selectedStaff?.instituteId})? This action cannot be undone.`}
        confirmText="Delete Staff"
        variant="danger"
      />
    </div>
  );
}

