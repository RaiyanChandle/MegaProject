import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { 
  BookOpen, 
  Upload, 
  ExternalLink, 
  Trash2, 
  Search, 
  Plus, 
  FileText 
} from 'lucide-react';

export default function SuperAdminLibrary() {
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal: Upload Resource
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Delete Confirm
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

  const filteredResources = resources.filter(r => 
    !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      title: 'Resource Title',
      key: 'title',
      render: (_, row) => (
        <div className="font-semibold text-text-900">
          {row.title}
        </div>
      )
    },
    {
      title: 'Uploaded By',
      key: 'uploadedBy',
      render: (_, row) => (
        <span className="text-xs text-text-500">
          {row.uploadedBy?.name || 'Administrator'}
        </span>
      )
    },
    {
      title: 'Date Added',
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
            href={row.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-surface-0 hover:bg-surface-50 text-text-900 transition-colors"
          >
            <ExternalLink size={13} /> View File
          </a>

          <button
            type="button"
            onClick={() => setItemToDelete(row)}
            className="p-1.5 rounded-md text-text-500 hover:text-danger hover:bg-danger/10 transition-colors"
            title="Delete resource"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-text-900">Digital Library & Repository</h2>
          <p className="text-sm text-text-500 mt-1">
            Institute-wide repository of syllabi, academic regulations, handbooks, and e-books.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Upload size={16} /> Upload Resource
        </Button>
      </div>

      {/* Search and Table Card */}
      <div className="bg-surface-0 border border-border rounded-md p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 text-text-500" size={16} />
            <input
              type="text"
              placeholder="Search library resources by title..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border bg-surface-0 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
            />
          </div>

          <div className="text-xs font-mono text-text-500">
            Total Items: {resources.length}
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-text-500">
            Loading library resources...
          </div>
        ) : filteredResources.length > 0 ? (
          <DataTable columns={columns} data={filteredResources} />
        ) : (
          <EmptyState
            title="No Library Resources Found"
            description={
              resources.length === 0
                ? "Upload the first institutional handbook, regulation document, or reference book."
                : "No items match your search query."
            }
            action={
              resources.length === 0 ? (
                <Button variant="primary" size="sm" onClick={() => setIsUploadModalOpen(true)}>
                  <Plus size={14} className="mr-1" /> Add First Resource
                </Button>
              ) : null
            }
          />
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
              {isUploading ? 'Uploading to Cloudinary...' : 'Upload Resource'}
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
        confirmText={isDeleting ? 'Removing...' : 'Remove'}
        variant="danger"
      />
    </div>
  );
}
