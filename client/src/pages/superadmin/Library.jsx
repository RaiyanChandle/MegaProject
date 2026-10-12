import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { 
  BookOpen, 
  Upload, 
  ExternalLink, 
  Trash2, 
  Edit2, 
  Plus, 
  FileText,
  RotateCcw,
  X 
} from 'lucide-react';
import { useSearch } from '../../context/SearchContext';

export default function SuperAdminLibrary() {
  const { searchQuery, setSearchQuery } = useSearch();
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editFile, setEditFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Delete Confirm State
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchResources = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get('/library');
      setResources(data);
    } catch (error) {
      toast.error('Failed to load library resources');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a resource title');
      return;
    }
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('file', selectedFile);

      const token = sessionStorage.getItem('nexus_token');
      const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const baseUrl = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/$/, '')}/api`;

      const response = await fetch(`${baseUrl}/library`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload resource');
      }

      toast.success('Resource added to Central Library');
      setIsUploadModalOpen(false);
      setTitle('');
      setSelectedFile(null);
      setResources(prev => [data, ...prev]);
    } catch (error) {
      toast.error(error.message || 'Failed to upload resource');
    } finally {
      setIsUploading(false);
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditFile(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      toast.error('Please enter a resource title');
      return;
    }

    setIsEditing(true);
    try {
      const formData = new FormData();
      formData.append('title', editTitle.trim());
      if (editFile) {
        formData.append('file', editFile);
      }

      const token = sessionStorage.getItem('nexus_token');
      const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const baseUrl = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/$/, '')}/api`;

      const response = await fetch(`${baseUrl}/library/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update resource');
      }

      toast.success('Library resource updated successfully');
      setEditingItem(null);
      fetchResources();
    } catch (error) {
      toast.error(error.message || 'Failed to update resource');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);

    try {
      await apiClient.delete(`/library/${itemToDelete.id}`);
      toast.success('Resource removed from library');
      setResources(prev => prev.filter(r => r.id !== itemToDelete.id));
      setItemToDelete(null);
    } catch (error) {
      toast.error(error.message || 'Failed to delete resource');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredResources = useMemo(() => {
    if (!searchQuery.trim()) return resources;
    const q = searchQuery.toLowerCase().trim();
    return resources.filter(r => 
      r.title?.toLowerCase().includes(q) ||
      r.uploadedBy?.name?.toLowerCase().includes(q)
    );
  }, [resources, searchQuery]);

  const columns = [
    {
      title: 'Resource Title',
      key: 'title',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-brass-600 shrink-0" />
          <span className="font-semibold text-text-900 text-sm">
            {row.title}
          </span>
        </div>
      )
    },
    {
      title: 'Uploaded By',
      key: 'uploadedBy',
      render: (_, row) => (
        <span className="text-xs text-text-500 whitespace-nowrap">
          {row.uploadedBy?.name || 'Administrator'}
        </span>
      ),
      className: 'whitespace-nowrap'
    },
    {
      title: 'Date Added',
      key: 'createdAt',
      render: (_, row) => (
        <span className="font-mono text-xs text-text-500 whitespace-nowrap">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
      className: 'whitespace-nowrap'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <div className="flex items-center gap-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <a
            href={row.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-border bg-surface-50 hover:bg-surface-100 text-text-900 transition-colors"
          >
            <ExternalLink size={12} /> View File
          </a>

          <button
            type="button"
            onClick={() => openEditModal(row)}
            className="p-1.5 rounded-md text-text-500 hover:text-ink-700 hover:bg-surface-50 transition-colors"
            title="Edit Resource"
          >
            <Edit2 size={15} />
          </button>

          <button
            type="button"
            onClick={() => setItemToDelete(row)}
            className="p-1.5 rounded-md text-text-500 hover:text-danger hover:bg-danger/10 transition-colors"
            title="Delete resource"
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
            <BookOpen size={24} className="text-brass-600" />
            <h2 className="text-xl font-bold text-text-900 tracking-tight">Digital Library & Repository</h2>
          </div>
          <p className="text-sm text-text-500 mt-0.5">
            Institute-wide central repository for handbooks, regulation documents, syllabi copies, and reference material.
          </p>
        </div>

        <Button
          onClick={() => setIsUploadModalOpen(true)}
          className="shadow-xs self-start sm:self-auto"
        >
          <Upload size={16} /> Upload Resource
        </Button>
      </div>

      {/* Table Card */}
      <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs space-y-4">
        {/* Table status header */}
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-text-900">Institutional Repository</span>
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
            Showing {filteredResources.length} of {resources.length} resources
          </div>
        </div>

        {/* Data Table */}
        {isLoading ? (
          <div className="py-12 text-center text-sm text-text-500">
            Loading library resources...
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="p-12 text-center bg-surface-50 rounded-xl border border-dashed border-border text-text-500">
            <BookOpen size={36} className="mx-auto mb-2 text-text-500/50" />
            <p className="text-sm font-semibold text-text-900">No library resources found</p>
            <p className="text-xs text-text-500 mt-0.5">
              {searchQuery 
                ? "No resources match your top search keyword." 
                : "Upload your first institutional handbook, regulation document, or reference book."}
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
            <DataTable columns={columns} data={filteredResources} />
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Institutional Library Resource"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <Field label="Document Title" required>
            <input
              type="text"
              required
              placeholder="e.g. Academic Regulations 2026-2027 Handbook"
              value={title}
              onChange={e => setTitle(e.target.value)}
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
            <p className="text-xs text-text-500 mt-1">Maximum file size: 25MB</p>
          </Field>

          <div className="flex justify-end gap-3 pt-3 border-t border-border/80">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsUploadModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading}
            >
              {isUploading ? 'Uploading to Cloudinary...' : 'Upload Resource'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="Edit Library Resource"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Field label="Document Title" required>
            <input
              type="text"
              required
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
            />
          </Field>

          <Field 
            label="Replace Document (Optional)" 
            helperText="Leave empty to keep the existing document file."
          >
            <input
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip"
              onChange={e => setEditFile(e.target.files[0] || null)}
              className="w-full rounded-md border border-border bg-surface-0 px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-ink-900 file:text-white"
            />
            {editingItem && (
              <p className="text-xs text-text-500 mt-1 font-mono truncate">
                Current file: {editingItem.url}
              </p>
            )}
          </Field>

          <div className="flex justify-end gap-3 pt-3 border-t border-border/80">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingItem(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isEditing}
            >
              {isEditing ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title="Remove Library Resource"
        message={`Are you sure you want to remove "${itemToDelete?.title}" from the digital library? Students and faculty will no longer be able to access it.`}
        confirmText={isDeleting ? 'Removing...' : 'Remove Resource'}
        variant="danger"
      />
    </div>
  );
}
