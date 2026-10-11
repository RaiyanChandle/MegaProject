import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import StatusBadge from '../../components/ui/StatusBadge';
import { toast } from '../../components/ui/Toast';
import { 
  Calendar, 
  Plus, 
  CheckCircle, 
  Edit2, 
  Clock, 
  RotateCcw,
  Sparkles,
  X 
} from 'lucide-react';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useSearch } from '../../context/SearchContext';

export default function AcademicTerms() {
  const { searchQuery, setSearchQuery } = useSearch();
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
        toast.success('Academic term created successfully');
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
      toast.success(`${selectedTerm.name} is now the active term`);
      fetchTerms();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const currentActiveTerm = useMemo(() => {
    return terms.find(t => t.isCurrent);
  }, [terms]);

  const filteredTerms = useMemo(() => {
    if (!searchQuery.trim()) return terms;
    const q = searchQuery.toLowerCase().trim();
    return terms.filter(t => 
      t.name?.toLowerCase().includes(q)
    );
  }, [terms, searchQuery]);

  const columns = [
    { 
      title: 'Term Name', 
      key: 'name', 
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text-900 text-sm">{val}</span>
          {row.isCurrent && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Sparkles size={10} /> CURRENT
            </span>
          )}
        </div>
      ),
      className: 'whitespace-nowrap'
    },
    { 
      title: 'Start Date', 
      key: 'startDate',
      render: (val) => (
        <span className="font-mono text-xs text-text-900 whitespace-nowrap">
          {new Date(val).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
        </span>
      ),
      className: 'whitespace-nowrap'
    },
    { 
      title: 'End Date', 
      key: 'endDate',
      render: (val) => (
        <span className="font-mono text-xs text-text-900 whitespace-nowrap">
          {new Date(val).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
        </span>
      ),
      className: 'whitespace-nowrap'
    },
    { 
      title: 'Status', 
      key: 'isCurrent', 
      render: (val) => val ? (
        <StatusBadge status="ACTIVE" />
      ) : (
        <StatusBadge status="ARCHIVED" />
      ),
      className: 'whitespace-nowrap'
    },
    { 
      title: 'Actions', 
      key: 'actions',
      render: (_, row) => (
        <div className="flex items-center gap-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <button 
            className="p-1.5 rounded-md text-text-500 hover:text-ink-700 hover:bg-surface-50 transition-colors"
            onClick={() => openModal(row)}
            title="Edit Term Dates"
          >
            <Edit2 size={15} />
          </button>
          {!row.isCurrent && (
            <button 
              className="px-2.5 py-1 rounded-md text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 border border-emerald-200/80 inline-flex items-center gap-1 text-xs font-medium transition-colors"
              onClick={() => {
                setSelectedTerm(row);
                setIsConfirmOpen(true);
              }}
              title="Set as Current Active Term"
            >
              <CheckCircle size={13} />
              Set Current
            </button>
          )}
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
            <Calendar size={24} className="text-ink-900" />
            <h2 className="text-xl font-bold text-text-900 tracking-tight">Academic Terms & Semesters</h2>
          </div>
          <p className="text-sm text-text-500 mt-0.5">
            Configure institutional academic calendar semesters, examination periods, and active session windows.
          </p>
        </div>

        <Button onClick={() => openModal()} className="shadow-xs self-start sm:self-auto">
          <Plus size={16} />
          New Academic Term
        </Button>
      </div>

      {/* Active Term Focus Card */}
      {currentActiveTerm && (
        <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start md:items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <Clock size={20} className="text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-emerald-800 font-semibold">Active Institutional Term</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <h3 className="text-lg font-bold text-text-900 mt-0.5">{currentActiveTerm.name}</h3>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono text-text-500 border-t md:border-t-0 border-border/80 pt-3 md:pt-0">
            <div>
              <span className="text-text-400 block text-[10px] uppercase">Commenced</span>
              <span className="font-bold text-text-900">{new Date(currentActiveTerm.startDate).toLocaleDateString()}</span>
            </div>
            <div className="h-6 w-px bg-border"></div>
            <div>
              <span className="text-text-400 block text-[10px] uppercase">Concludes</span>
              <span className="font-bold text-text-900">{new Date(currentActiveTerm.endDate).toLocaleDateString()}</span>
            </div>
            <div className="h-6 w-px bg-border"></div>
            <button
              onClick={() => openModal(currentActiveTerm)}
              className="px-3 py-1.5 rounded-lg border border-border bg-surface-50 hover:bg-surface-100 text-text-900 font-sans text-xs transition-colors"
            >
              Modify Dates
            </button>
          </div>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs space-y-4">
        {/* Table status header */}
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-text-900">Academic Terms Registry</span>
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
            Showing {filteredTerms.length} of {terms.length} terms
          </div>
        </div>

        {/* Data Table */}
        {filteredTerms.length === 0 ? (
          <div className="p-12 text-center bg-surface-50 rounded-xl border border-dashed border-border text-text-500">
            <Calendar size={36} className="mx-auto mb-2 text-text-500/50" />
            <p className="text-sm font-semibold text-text-900">No academic terms found</p>
            <p className="text-xs text-text-500 mt-0.5">
              {searchQuery ? "No terms match your top search keyword." : "Create your first academic term using the button above."}
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
            <DataTable columns={columns} data={filteredTerms} />
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={selectedTerm ? `Edit Term: ${selectedTerm.name}` : 'Create Academic Term'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Term Name" required>
            <input 
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. 2026-ODD or 2026-EVEN"
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 bg-surface-0"
              required
            />
          </Field>
          
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date" required>
              <input 
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 bg-surface-0"
                required
              />
            </Field>
            
            <Field label="End Date" required>
              <input 
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 bg-surface-0"
                required
              />
            </Field>
          </div>

          {!selectedTerm && (
            <label className="flex items-center gap-2 mt-4 p-3 rounded-lg border border-border bg-surface-50 cursor-pointer">
              <input 
                type="checkbox" 
                checked={formData.isCurrent}
                onChange={(e) => setFormData({ ...formData, isCurrent: e.target.checked })}
                className="rounded border-border text-ink-900 focus:ring-ink-700"
              />
              <span className="text-sm font-medium text-text-900">Designate as Current Active Term immediately</span>
            </label>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-border/80">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : (selectedTerm ? 'Save Term' : 'Create Term')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Set Current Term Confirmation Dialog */}
      <ConfirmDialog 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleMakeCurrent}
        title="Activate Academic Term"
        message={`Are you sure you want to designate "${selectedTerm?.name}" as the active academic term? All attendance calculations and course offerings across the college will reference this term.`}
        confirmText="Activate Term"
      />
    </div>
  );
}

