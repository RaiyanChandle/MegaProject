import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { 
  BookOpen, 
  Plus, 
  FileText, 
  ExternalLink, 
  Trash2, 
  Upload, 
  Calendar,
  Layers
} from 'lucide-react';

export default function TeacherNotes() {
  const [allocations, setAllocations] = useState([]);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [notes, setNotes] = useState([]);
  const [isLoadingAllocations, setIsLoadingAllocations] = useState(true);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  // Modal: Upload Note
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [noteForm, setNoteForm] = useState({
    topic: '',
    divisionId: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Delete Confirm
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Fetch allocations on mount
  useEffect(() => {
    const fetchAllocations = async () => {
      try {
        const data = await apiClient.get('/teachers/my-allocations');
        setAllocations(data);
        if (data.length > 0) {
          setSelectedAllocation(data[0]);
        }
      } catch (error) {
        toast.error('Failed to load your allocated subjects');
      } finally {
        setIsLoadingAllocations(false);
      }
    };
    fetchAllocations();
  }, []);

  // 2. Fetch notes when selected allocation changes
  useEffect(() => {
    if (!selectedAllocation) return;

    const fetchNotes = async () => {
      setIsLoadingNotes(true);
      try {
        const queryParams = new URLSearchParams({
          subjectId: selectedAllocation.subjectId
        });
        if (selectedAllocation.divisionId) {
          queryParams.append('divisionId', selectedAllocation.divisionId);
        }

        const data = await apiClient.get(`/notes?${queryParams.toString()}`);
        setNotes(data);
      } catch (error) {
        toast.error('Failed to load study notes');
      } finally {
        setIsLoadingNotes(false);
      }
    };

    fetchNotes();
  }, [selectedAllocation]);

  // Handle Note Upload
  const handleUploadNote = async (e) => {
    e.preventDefault();
    if (!noteForm.topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('subjectId', selectedAllocation.subjectId);
      formData.append('topic', noteForm.topic.trim());
      if (selectedAllocation.divisionId) {
        formData.append('divisionId', selectedAllocation.divisionId);
      } else if (noteForm.divisionId) {
        formData.append('divisionId', noteForm.divisionId);
      }
      formData.append('file', selectedFile);

      // Raw fetch with Bearer token for multipart/form-data
      const token = sessionStorage.getItem('nexus_token');
      const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const baseUrl = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/$/, '')}/api`;

      const response = await fetch(`${baseUrl}/notes`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload note');
      }

      toast.success('Study note uploaded successfully');
      setIsUploadModalOpen(false);
      setNoteForm({ topic: '', divisionId: '' });
      setSelectedFile(null);
      setNotes(prev => [data, ...prev]);
    } catch (error) {
      toast.error(error.message || 'Failed to upload note');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Note Deletion
  const handleDeleteNote = async () => {
    if (!noteToDelete) return;
    setIsDeleting(true);

    try {
      await apiClient.delete(`/notes/${noteToDelete.id}`);
      toast.success('Note deleted successfully');
      setNotes(prev => prev.filter(n => n.id !== noteToDelete.id));
      setNoteToDelete(null);
    } catch (error) {
      toast.error(error.message || 'Failed to delete note');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      title: 'Topic',
      key: 'topic',
      render: (_, row) => (
        <div>
          <div className="font-semibold text-text-900">{row.topic}</div>
          <div className="text-xs text-text-500 mt-0.5">
            {row.division?.name ? `Division ${row.division.name}` : 'All Divisions (Class-wide)'}
          </div>
        </div>
      )
    },
    {
      title: 'Subject',
      key: 'subject',
      render: (_, row) => (
        <div>
          <div className="font-medium text-text-900">{row.subject?.name}</div>
          <div className="text-xs font-mono text-text-500">{row.subject?.code}</div>
        </div>
      )
    },
    {
      title: 'Uploaded Date',
      key: 'createdAt',
      render: (_, row) => (
        <span className="font-mono text-xs text-text-500">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <a
            href={row.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-surface-0 hover:bg-surface-50 text-text-900 transition-colors"
          >
            <ExternalLink size={13} /> View Material
          </a>

          <button
            type="button"
            onClick={() => setNoteToDelete(row)}
            className="p-1.5 rounded-md text-text-500 hover:text-danger hover:bg-danger/10 transition-colors"
            title="Delete note"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  if (isLoadingAllocations) {
    return (
      <div className="p-8 text-center text-sm text-text-500">
        Loading allocated subjects...
      </div>
    );
  }

  if (allocations.length === 0) {
    return (
      <EmptyState
        title="No Subjects Allocated"
        description="You have not been assigned any subjects yet. Please contact your Department Administrator."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-text-900">Study Notes & Material</h2>
          <p className="text-sm text-text-500 mt-1">
            Upload lecture notes, slides, and reference materials for enrolled students.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Upload size={16} /> Upload Material
        </Button>
      </div>

      {/* Allocation Tabs */}
      <div className="bg-surface-0 border border-border rounded-md p-4">
        <label className="text-xs font-semibold text-text-500 uppercase tracking-wide block mb-2">
          Select Subject & Class
        </label>
        <div className="flex flex-wrap gap-2">
          {allocations.map((alloc) => {
            const isSelected = selectedAllocation?.id === alloc.id;
            return (
              <button
                key={alloc.id}
                onClick={() => setSelectedAllocation(alloc)}
                className={`px-3.5 py-2 rounded-md text-sm font-medium transition-colors text-left border ${
                  isSelected
                    ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
                    : 'bg-surface-50 text-text-900 border-border hover:bg-surface-100'
                }`}
              >
                <div className="font-semibold">{alloc.subject?.name}</div>
                <div className={`text-xs ${isSelected ? 'text-surface-200' : 'text-text-500'}`}>
                  {alloc.class?.name} {alloc.division?.name && `• Div ${alloc.division.name}`} ({alloc.subject?.code})
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes Table */}
      <div className="bg-surface-0 border border-border rounded-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-text-900">
              Uploaded Materials for {selectedAllocation?.subject?.name}
            </h3>
            <p className="text-xs text-text-500 font-mono mt-0.5">
              Class: {selectedAllocation?.class?.name} | Batch: {selectedAllocation?.class?.batchYear}
              {selectedAllocation?.division?.name && ` | Div: ${selectedAllocation.division.name}`}
            </p>
          </div>
          <div className="text-xs font-mono text-text-500">
            Total Notes: {notes.length}
          </div>
        </div>

        {isLoadingNotes ? (
          <div className="py-8 text-center text-sm text-text-500">
            Loading notes...
          </div>
        ) : notes.length > 0 ? (
          <DataTable columns={columns} data={notes} />
        ) : (
          <EmptyState
            title="No Study Notes Uploaded"
            description="Upload lecture slides, PDF notes, or reference docs for students enrolled in this subject."
            action={
              <Button variant="primary" size="sm" onClick={() => setIsUploadModalOpen(true)}>
                <Plus size={14} className="mr-1" /> Upload First Note
              </Button>
            }
          />
        )}
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Study Material / Note"
      >
        <form onSubmit={handleUploadNote} className="space-y-4">
          <Field label="Subject & Class">
            <input
              type="text"
              disabled
              value={`${selectedAllocation?.subject?.name} (${selectedAllocation?.subject?.code}) - ${selectedAllocation?.class?.name}`}
              className="w-full rounded-md border border-border bg-surface-50 px-3 py-2 text-sm text-text-500"
            />
          </Field>

          <Field label="Note / Lecture Topic" required>
            <input
              type="text"
              required
              placeholder="e.g. Chapter 4: B-Trees and Graph Algorithms"
              value={noteForm.topic}
              onChange={e => setNoteForm(prev => ({ ...prev, topic: e.target.value }))}
              className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
            />
          </Field>

          <Field label="Select Document (PDF, Word, PPT, ZIP)" required>
            <input
              type="file"
              required
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip"
              onChange={e => setSelectedFile(e.target.files[0] || null)}
              className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-ink-900 file:text-white"
            />
            <p className="text-xs text-text-500 mt-1">Maximum file size: 15MB</p>
          </Field>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsUploadModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isUploading}
            >
              {isUploading ? 'Uploading to Cloudinary...' : 'Upload Material'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!noteToDelete}
        onClose={() => setNoteToDelete(null)}
        onConfirm={handleDeleteNote}
        title="Delete Study Note"
        message={`Are you sure you want to delete "${noteToDelete?.topic}"? Enrolled students will no longer be able to access this document.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        variant="danger"
      />
    </div>
  );
}
