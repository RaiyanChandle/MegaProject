import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import { toast } from '../../components/ui/Toast';
import { 
  Building2, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Users, 
  GraduationCap, 
  Layers, 
  UserCheck, 
  AlertCircle,
  ExternalLink,
  RotateCcw,
  X
} from 'lucide-react';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Link } from 'react-router-dom';
import { useSearch } from '../../context/SearchContext';

export default function Departments() {
  const { searchQuery, setSearchQuery } = useSearch();
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
      toast.success('Department deleted successfully');
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

  // Filtered departments by universal search
  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return departments;
    const q = searchQuery.toLowerCase().trim();
    return departments.filter(d => 
      d.name?.toLowerCase().includes(q) || 
      d.code?.toLowerCase().includes(q) ||
      (d.deptAdmins && d.deptAdmins.some(a => 
        a.name?.toLowerCase().includes(q) || 
        a.instituteId?.toLowerCase().includes(q)
      ))
    );
  }, [departments, searchQuery]);

  const columns = [
    { 
      title: 'Code', 
      key: 'code', 
      render: (val) => (
        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-surface-50 border border-border text-ink-900 uppercase">
          {val}
        </span>
      ),
      className: 'whitespace-nowrap'
    },
    { 
      title: 'Department Name', 
      key: 'name', 
      render: (val) => (
        <span className="font-semibold text-text-900 text-sm">
          {val}
        </span>
      ),
      className: 'whitespace-nowrap'
    },
    {
      title: 'Department Admin',
      key: 'deptAdmins',
      render: (admins) => {
        if (!admins || admins.length === 0) {
          return (
            <Link 
              to="/superadmin/admins"
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1 hover:bg-amber-100 transition-colors"
              title="Click to appoint admin"
            >
              <span>Unassigned</span>
              <ExternalLink size={10} />
            </Link>
          );
        }
        const activeAdmin = admins.find(a => a.isActive) || admins[0];
        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-xs font-medium text-text-900">{activeAdmin.name}</span>
            <span className="font-mono text-[10px] text-text-500 px-1.5 py-0.2 rounded bg-surface-50 border border-border">
              {activeAdmin.instituteId}
            </span>
          </div>
        );
      },
      className: 'whitespace-nowrap'
    },
    {
      title: 'Faculty',
      key: 'teachers',
      render: (teachers) => (
        <span className="text-xs font-mono text-text-900 whitespace-nowrap">
          {teachers ? teachers.length : 0} Members
        </span>
      ),
      className: 'whitespace-nowrap'
    },
    {
      title: 'Students',
      key: 'students',
      render: (students) => (
        <span className="text-xs font-mono font-semibold text-ink-900 whitespace-nowrap">
          {students ? students.length : 0} Enrolled
        </span>
      ),
      className: 'whitespace-nowrap'
    },
    {
      title: 'Classes',
      key: 'classes',
      render: (classes) => (
        <span className="text-xs font-mono text-text-500 whitespace-nowrap">
          {classes ? classes.length : 0} Classes
        </span>
      ),
      className: 'whitespace-nowrap'
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
            onClick={() => openModal(row)}
            title="Edit department"
          >
            <Edit2 size={15} />
          </button>
          <button 
            className="p-1.5 rounded-md text-text-500 hover:text-danger hover:bg-danger/10 transition-colors"
            onClick={() => {
              setSelectedDept(row);
              setIsConfirmOpen(true);
            }}
            title="Delete department"
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 size={24} className="text-ink-900" />
            <h2 className="text-xl font-bold text-text-900 tracking-tight">Academic Departments</h2>
          </div>
          <p className="text-sm text-text-500 mt-0.5">
            Configure institutional engineering faculties, department codes, and appointed leadership.
          </p>
        </div>
        <Button onClick={() => openModal()} className="shadow-xs self-start sm:self-auto">
          <Plus size={16} />
          Add Department
        </Button>
      </div>

      {/* Table Card */}
      <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs space-y-4">
        {/* Table status header */}
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-text-900">Departments Directory</span>
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
            Showing {filteredDepartments.length} of {departments.length} departments
          </div>
        </div>

        {/* Data Table */}
        {filteredDepartments.length === 0 ? (
          <div className="p-12 text-center bg-surface-50 rounded-xl border border-dashed border-border text-text-500">
            <Building2 size={36} className="mx-auto mb-2 text-text-500/50" />
            <p className="text-sm font-semibold text-text-900">No departments found</p>
            <p className="text-xs text-text-500 mt-0.5">
              {searchQuery ? "No matches found for your search term in top bar. Try a different query or clear the search." : "Create your first academic department using the button above."}
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
            <DataTable columns={columns} data={filteredDepartments} />
          </div>
        )}
      </div>

      {/* Create / Edit Department Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={selectedDept ? 'Edit Academic Department' : 'Create New Department'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Department Name" required>
            <input 
              type="text" 
              placeholder="e.g. Computer Science and Engineering" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 bg-surface-0"
              required
            />
          </Field>
          
          <Field 
            label="Department Code" 
            required
            helperText="Short unique code for curricula and student references (e.g. CSE, MECH, CIVIL, ECE)."
          >
            <input 
              type="text" 
              placeholder="e.g. CSE" 
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full rounded-md border border-border px-3 py-2 text-sm font-mono uppercase focus:border-ink-700 focus:ring-1 focus:ring-ink-700 bg-surface-0"
              required
            />
          </Field>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {selectedDept ? 'Save Changes' : 'Create Department'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Department"
        message={`Are you sure you want to delete "${selectedDept?.name}" (${selectedDept?.code})? This action cannot be undone if the department has no active records.`}
        confirmText="Delete Department"
        variant="danger"
      />
    </div>
  );
}
