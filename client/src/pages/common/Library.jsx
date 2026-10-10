import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { 
  BookOpen, 
  ExternalLink, 
  Search, 
  Calendar, 
  User, 
  FileText 
} from 'lucide-react';

export default function DigitalLibrary() {
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const data = await apiClient.get('/library');
        setResources(data);
      } catch (error) {
        toast.error('Failed to load library resources');
      } finally {
        setIsLoading(false);
      }
    };
    fetchResources();
  }, []);

  const filteredResources = resources.filter(r =>
    !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-text-500">
        Loading digital library...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-text-900">Digital Library</h2>
        <p className="text-sm text-text-500 mt-1">
          Access institute-wide academic regulations, handbooks, reference books, and official publications.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-surface-0 border border-border rounded-md p-4">
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-2.5 text-text-500" size={16} />
          <input
            type="text"
            placeholder="Search library documents and resources..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border bg-surface-0 focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
          />
        </div>
      </div>

      {/* Grid of Documents */}
      {filteredResources.length === 0 ? (
        <EmptyState
          title="No Resources Found"
          description={
            resources.length === 0
              ? "The digital library has no published documents at this time."
              : "No resources matched your search query."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((item) => (
            <div
              key={item.id}
              className="bg-surface-0 border border-border rounded-md p-5 flex flex-col justify-between hover:border-ink-700 transition-colors"
            >
              <div>
                <div className="p-2.5 rounded-md bg-ink-900/10 text-ink-900 w-fit mb-3">
                  <FileText size={20} />
                </div>

                <h3 className="text-base font-semibold text-text-900 mb-1 line-clamp-2">
                  {item.title}
                </h3>

                <div className="text-xs text-text-500">
                  Published by: {item.uploadedBy?.name || 'Academic Administration'}
                </div>
              </div>

              <div className="pt-3 border-t border-border mt-4 flex items-center justify-between">
                <span className="font-mono text-xs text-text-500">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-ink-900 text-white hover:bg-ink-700 transition-colors"
                >
                  <ExternalLink size={13} /> View File
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
