import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { Plus, ArrowLeft, Edit2, Trash2 } from 'lucide-react';

export default function ClassDetails() {
  const { id } = useParams();
  const [classData, setClassData] = useState(null);
  
  // --- Divisions State ---
  const [divisions, setDivisions] = useState([]);
  const [isDivModalOpen, setIsDivModalOpen] = useState(false);
  const [isDivConfirmOpen, setIsDivConfirmOpen] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [divFormData, setDivFormData] = useState({ name: '' });
  const [isDivLoading, setIsDivLoading] = useState(false);

  // --- Subjects State ---
  const [subjects, setSubjects] = useState([]);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isSubConfirmOpen, setIsSubConfirmOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subFormData, setSubFormData] = useState({ name: '', code: '', subjectType: 'CORE', credits: 4 });
  const [isSubLoading, setIsSubLoading] = useState(false);

  const fetchClassDetails = async () => {
    try {
      const cls = await apiClient.get(`/classes/${id}`);
      setClassData(cls);
      const divs = await apiClient.get(`/divisions?classId=${id}`);
      setDivisions(divs);
      const subs = await apiClient.get(`/subjects?classId=${id}`);
      setSubjects(subs);
    } catch (error) {
      toast.error('Failed to load class details');
    }
  };

  useEffect(() => {
    fetchClassDetails();
  }, [id]);

  // --- Divisions Handlers ---
  const openDivModal = (div = null) => {
    setSelectedDivision(div);
    if (div) {
      setDivFormData({ name: div.name });
    } else {
      setDivFormData({ name: '' });
    }
    setIsDivModalOpen(true);
  };

  const handleDivSubmit = async (e) => {
    e.preventDefault();
    setIsDivLoading(true);
    try {
      if (selectedDivision) {
        await apiClient.put(`/divisions/${selectedDivision.id}`, { name: divFormData.name });
        toast.success('Division updated successfully');
      } else {
        await apiClient.post('/divisions', { classId: id, name: divFormData.name });
        toast.success('Division created successfully');
      }
      setIsDivModalOpen(false);
      fetchClassDetails();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsDivLoading(false);
    }
  };

  const handleDivDelete = async () => {
    try {
      await apiClient.delete(`/divisions/${selectedDivision.id}`);
      toast.success('Division deleted successfully');
      fetchClassDetails();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // --- Subjects Handlers ---
  const openSubModal = (sub = null) => {
    setSelectedSubject(sub);
    if (sub) {
      setSubFormData({ name: sub.name, code: sub.code, subjectType: sub.subjectType, credits: sub.credits });
    } else {
      setSubFormData({ name: '', code: '', subjectType: 'CORE', credits: 4 });
    }
    setIsSubModalOpen(true);
  };

  const handleSubSubmit = async (e) => {
    e.preventDefault();
    setIsSubLoading(true);
    try {
      if (selectedSubject) {
        await apiClient.put(`/subjects/${selectedSubject.id}`, subFormData);
        toast.success('Subject updated successfully');
      } else {
        await apiClient.post('/subjects', { classId: id, ...subFormData });
        toast.success('Subject created successfully');
      }
      setIsSubModalOpen(false);
      fetchClassDetails();
    } catch (error) {
      toast.error(error.message); // Friendly error for globally unique Subject Code
    } finally {
      setIsSubLoading(false);
    }
  };

  const handleSubDelete = async () => {
    try {
      await apiClient.delete(`/subjects/${selectedSubject.id}`);
      toast.success('Subject deleted successfully');
      fetchClassDetails();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const divColumns = [
    { title: 'Division Name', key: 'name', className: 'font-semibold' },
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
          <button onClick={() => openDivModal(row)} className="text-text-500 hover:text-ink-700" title="Edit Division">
            <Edit2 size={16} />
          </button>
          <button onClick={() => { setSelectedDivision(row); setIsDivConfirmOpen(true); }} className="text-text-500 hover:text-danger" title="Delete Division">
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  const subColumns = [
    { title: 'Subject Code', key: 'code', className: 'font-mono text-sm' },
    { title: 'Name', key: 'name', className: 'font-semibold' },
    { 
      title: 'Type', 
      key: 'subjectType',
      render: (val) => <StatusBadge status={val} />
    },
    { title: 'Credits', key: 'credits' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <button onClick={() => openSubModal(row)} className="text-text-500 hover:text-ink-700" title="Edit Subject">
            <Edit2 size={16} />
          </button>
          <button onClick={() => { setSelectedSubject(row); setIsSubConfirmOpen(true); }} className="text-text-500 hover:text-danger" title="Delete Subject">
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  if (!classData) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/deptadmin/classes" className="text-text-500 hover:text-ink-700">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-xl font-semibold text-text-900">{classData.name}</h2>
          <p className="text-sm text-text-500 mt-1">Batch: {classData.batchYear} | Semester: {classData.semesterNumber}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* DIVISIONS */}
        <div className="lg:col-span-1 bg-surface-0 border border-border rounded-xl p-6 h-fit">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-900">Divisions</h3>
            <Button onClick={() => openDivModal()} size="sm">
              <Plus size={16} />
              New
            </Button>
          </div>
          {divisions.length > 0 ? (
            <DataTable columns={divColumns} data={divisions} />
          ) : (
            <div className="text-sm text-text-500 italic py-4">No divisions created yet.</div>
          )}
        </div>

        {/* SUBJECTS */}
        <div className="lg:col-span-2 bg-surface-0 border border-border rounded-xl p-6 h-fit">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-900">Subjects</h3>
            <Button onClick={() => openSubModal()} size="sm">
              <Plus size={16} />
              New Subject
            </Button>
          </div>
          {subjects.length > 0 ? (
            <DataTable columns={subColumns} data={subjects} />
          ) : (
            <div className="text-sm text-text-500 italic py-4">No subjects attached to this class yet.</div>
          )}
        </div>

      </div>

      {/* Division Modal */}
      <Modal isOpen={isDivModalOpen} onClose={() => setIsDivModalOpen(false)} title={selectedDivision ? 'Edit Division' : 'Create New Division'}>
        <form onSubmit={handleDivSubmit} className="space-y-4">
          <Field label="Division Name">
            <input type="text" value={divFormData.name} onChange={(e) => setDivFormData({ ...divFormData, name: e.target.value.toUpperCase() })} placeholder="e.g. A" required />
          </Field>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsDivModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isDivLoading}>{isDivLoading ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      {/* Subject Modal */}
      <Modal isOpen={isSubModalOpen} onClose={() => setIsSubModalOpen(false)} title={selectedSubject ? 'Edit Subject' : 'Create New Subject'}>
        <form onSubmit={handleSubSubmit} className="space-y-4">
          <Field label="Subject Name">
            <input type="text" value={subFormData.name} onChange={(e) => setSubFormData({ ...subFormData, name: e.target.value })} placeholder="e.g. Data Structures" required />
          </Field>
          
          <div className="grid grid-cols-2 gap-4">
            <Field label="Subject Code (Globally Unique)">
              <input type="text" value={subFormData.code} onChange={(e) => setSubFormData({ ...subFormData, code: e.target.value.toUpperCase() })} placeholder="e.g. CS101" required className="uppercase font-mono" />
            </Field>
            
            <Field label="Credits">
              <input type="number" min="1" max="10" value={subFormData.credits} onChange={(e) => setSubFormData({ ...subFormData, credits: parseInt(e.target.value) })} required />
            </Field>
          </div>

          <Field label="Subject Type">
            <select value={subFormData.subjectType} onChange={(e) => setSubFormData({ ...subFormData, subjectType: e.target.value })} className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 bg-surface-0">
              <option value="CORE">Core (Compulsory)</option>
              <option value="PROGRAM_ELECTIVE">Program Elective (PE)</option>
              <option value="OPEN_ELECTIVE">Open Elective (OE)</option>
            </select>
          </Field>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsSubModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubLoading}>{isSubLoading ? 'Saving...' : 'Save Subject'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialogs */}
      <ConfirmDialog 
        isOpen={isDivConfirmOpen} 
        onClose={() => setIsDivConfirmOpen(false)} 
        onConfirm={handleDivDelete} 
        title="Delete Division" 
        message={`Are you sure you want to delete Division ${selectedDivision?.name}?`} 
        confirmText="Delete" 
        isDanger={true} 
      />
      <ConfirmDialog 
        isOpen={isSubConfirmOpen} 
        onClose={() => setIsSubConfirmOpen(false)} 
        onConfirm={handleSubDelete} 
        title="Delete Subject" 
        message={`Are you sure you want to delete ${selectedSubject?.code}? This action cannot be undone.`} 
        confirmText="Delete" 
        isDanger={true} 
      />
    </div>
  );
}
