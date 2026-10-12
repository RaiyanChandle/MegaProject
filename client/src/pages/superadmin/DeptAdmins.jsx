import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import StatusBadge from '../../components/ui/StatusBadge';
import { toast } from '../../components/ui/Toast';
import { 
  Users, 
  Plus, 
  Power, 
  PowerOff, 
  Eye, 
  EyeOff, 
  Edit2, 
  Trash2, 
  Search, 
  Building2, 
  UserCheck, 
  ShieldCheck, 
  RotateCcw,
  KeyRound,
  ExternalLink,
  X
} from 'lucide-react';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useSearch } from '../../context/SearchContext';

export default function DeptAdmins() {
  const { searchQuery, setSearchQuery } = useSearch();
  const [admins, setAdmins] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [newStatus, setNewStatus] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    departmentId: '', 
    password: '' 
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Filters state
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchData = async () => {
    try {
      const [adminsData, deptsData] = await Promise.all([
        apiClient.get('/dept-admins'),
        apiClient.get('/departments')
      ]);
      setAdmins(adminsData);
      setDepartments(deptsData);
    } catch (error) {
      toast.error('Failed to load department admins');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setSelectedAdmin(null);
    setFormData({ 
      name: '', 
      email: '', 
      departmentId: departments[0]?.id || '', 
      password: '' 
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const openEditModal = (admin) => {
    setSelectedAdmin(admin);
    setFormData({ 
      name: admin.name, 
      email: admin.email, 
      departmentId: admin.departmentId, 
      password: '' // Optional for reset
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (selectedAdmin) {
        // Update (PUT)
        await apiClient.put(`/dept-admins/${selectedAdmin.id}`, formData);
        toast.success('Department Administrator updated successfully');
      } else {
        // Create (POST)
        if (!formData.password) {
          toast.error('Password is required when creating a new administrator');
          setIsLoading(false);
          return;
        }
        await apiClient.post('/dept-admins', formData);
        toast.success('Department Administrator created successfully');
      }
      setIsModalOpen(false);
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
      toast.success(`Admin ${newStatus ? 'activated' : 'deactivated'} successfully`);
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/dept-admins/${selectedAdmin.id}`);
      toast.success('Department Administrator deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Metrics
  const totalAdmins = admins.length;
  const activeAdmins = admins.filter(a => a.isActive).length;
  const inactiveAdmins = totalAdmins - activeAdmins;
  const uniqueCoveredDepts = new Set(admins.map(a => a.departmentId)).size;

  // Filtered admins
  const filteredAdmins = useMemo(() => {
    return admins.filter(admin => {
      // 1. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch = 
          admin.name?.toLowerCase().includes(q) ||
          admin.email?.toLowerCase().includes(q) ||
          admin.instituteId?.toLowerCase().includes(q) ||
          admin.department?.name?.toLowerCase().includes(q) ||
          admin.department?.code?.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // 2. Department filter
      if (selectedDeptFilter !== 'ALL' && admin.departmentId !== selectedDeptFilter) {
        return false;
      }

      // 3. Status filter
      if (statusFilter === 'ACTIVE' && !admin.isActive) return false;
      if (statusFilter === 'INACTIVE' && admin.isActive) return false;

      return true;
    });
  }, [admins, searchQuery, selectedDeptFilter, statusFilter]);

  const hasActiveFilters = searchQuery.trim() !== '' || selectedDeptFilter !== 'ALL' || statusFilter !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedDeptFilter('ALL');
    setStatusFilter('ALL');
  };

  const columns = [
    { 
      title: 'Institute ID', 
      key: 'instituteId', 
      render: (val) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-50 border border-border text-ink-900">
          {val}
        </span>
      ),
      className: 'whitespace-nowrap'
    },
    { 
      title: 'Name', 
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
      title: 'Assigned Department', 
      key: 'department', 
      render: (dept) => dept ? (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-xs font-medium text-text-900">{dept.name}</span>
          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface-50 border border-border text-text-500 uppercase font-semibold">
            {dept.code}
          </span>
        </div>
      ) : (
        <span className="text-xs text-text-500 italic">Unassigned</span>
      ),
      className: 'whitespace-nowrap'
    },
    { 
      title: 'Status', 
      key: 'isActive', 
      render: (val) => (
        <StatusBadge status={val ? 'ACTIVE' : 'INACTIVE'} />
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
          {/* Edit button */}
          <button 
            className="p-1.5 rounded-md text-text-500 hover:text-ink-700 hover:bg-surface-50 transition-colors"
            onClick={() => openEditModal(row)}
            title="Edit Administrator details"
          >
            <Edit2 size={15} />
          </button>

          {/* Toggle status button */}
          <button 
            className={`p-1.5 rounded-md transition-colors ${
              row.isActive 
                ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50' 
                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
            }`}
            onClick={() => {
              setSelectedAdmin(row);
              setNewStatus(!row.isActive);
              setIsConfirmOpen(true);
            }}
            title={row.isActive ? 'Deactivate account' : 'Activate account'}
          >
            {row.isActive ? <PowerOff size={15} /> : <Power size={15} />}
          </button>

          {/* Delete button */}
          <button 
            className="p-1.5 rounded-md text-text-500 hover:text-danger hover:bg-danger/10 transition-colors"
            onClick={() => {
              setSelectedAdmin(row);
              setIsDeleteOpen(true);
            }}
            title="Delete Administrator account"
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
            <UserCheck size={24} className="text-role-deptadmin" />
            <h2 className="text-xl font-bold text-text-900 tracking-tight">Department Administrators</h2>
          </div>
          <p className="text-sm text-text-500 mt-0.5">
            Provision departmental leaders who manage classes, division enrollments, faculty allocations, and curricula.
          </p>
        </div>
        <Button onClick={openCreateModal} className="shadow-xs self-start sm:self-auto">
          <Plus size={16} />
          New Dept Admin
        </Button>
      </div>

      {/* Table & Filter Card */}
      <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/80 pb-4">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Universal Search Filter Badge */}
            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200">
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

            {/* Department Filter */}
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-md border border-border bg-surface-50 text-xs text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
            >
              <option value="ALL">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-md border border-border bg-surface-50 text-xs text-text-900 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Deactivated Only</option>
            </select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-2.5 py-1.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium hover:bg-amber-100 flex items-center gap-1 transition-colors"
                title="Reset filters"
              >
                <RotateCcw size={12} /> Clear
              </button>
            )}
          </div>

          <div className="text-xs text-text-500 font-mono shrink-0">
            Showing {filteredAdmins.length} of {admins.length} administrators
          </div>
        </div>

        {/* Table */}
        {filteredAdmins.length === 0 ? (
          <div className="p-12 text-center bg-surface-50 rounded-xl border border-dashed border-border text-text-500">
            <Users size={36} className="mx-auto mb-2 text-text-500/50" />
            <p className="text-sm font-semibold text-text-900">No department administrators found</p>
            <p className="text-xs text-text-500 mt-0.5">
              {hasActiveFilters 
                ? "No administrators match your current filter parameters or top universal search query."
                : "Create your first department administrator using the button above."}
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
            <DataTable columns={columns} data={filteredAdmins} />
          </div>
        )}
      </div>

      {/* Create / Edit Department Admin Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={selectedAdmin ? `Edit Admin: ${selectedAdmin.name} (${selectedAdmin.instituteId})` : 'New Department Administrator'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Full Name" required>
            <input 
              type="text" 
              placeholder="e.g. Dr. Ramesh Kulkarni" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 bg-surface-0"
              required
            />
          </Field>

          <Field label="Email Address" required>
            <input 
              type="email" 
              placeholder="e.g. ramesh.k@college.edu" 
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 bg-surface-0"
              required
            />
          </Field>

          <Field label="Assigned Department" required>
            <select
              value={formData.departmentId}
              onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 bg-surface-0"
              required
            >
              <option value="" disabled>Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </Field>

          <Field 
            label={selectedAdmin ? "Reset Password (Leave blank to keep existing)" : "Account Password"} 
            required={!selectedAdmin}
            helperText={selectedAdmin ? "Only fill this field if you want to set a new password for this administrator." : "Initial password for login access."}
          >
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder={selectedAdmin ? "•••••••• (Unchanged)" : "Enter password"} 
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 bg-surface-0 pr-10"
                required={!selectedAdmin}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-500 hover:text-text-900"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {selectedAdmin ? 'Save Changes' : 'Create Administrator'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Status Toggle Dialog */}
      <ConfirmDialog 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleToggleStatus}
        title={newStatus ? 'Activate Administrator' : 'Deactivate Administrator'}
        message={`Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} access for "${selectedAdmin?.name}" (${selectedAdmin?.instituteId})? ${!newStatus ? 'They will no longer be able to log in to the department portal.' : 'They will regain access to their portal.'}`}
        confirmText={newStatus ? 'Activate Account' : 'Deactivate Account'}
        variant={newStatus ? 'primary' : 'warning'}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Department Administrator"
        message={`Are you sure you want to permanently delete "${selectedAdmin?.name}" (${selectedAdmin?.instituteId})? This action cannot be undone.`}
        confirmText="Delete Account"
        variant="danger"
      />
    </div>
  );
}
