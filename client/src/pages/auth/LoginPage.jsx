import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BookOpen } from 'lucide-react';

import { apiClient } from '../../api/client';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const data = await apiClient.post('/auth/login', { identifier, password });
      login(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-surface-0 rounded-xl shadow-lg border border-border p-8">
        <div className="flex flex-col items-center mb-8">
          <BookOpen size={40} className="text-brass-500 mb-4" />
          <h2 className="text-2xl font-semibold text-text-900">Welcome to NEXUS</h2>
          <p className="text-sm text-text-500 mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-danger bg-danger/10 rounded-md border border-danger/20">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-900">Institute ID or Email</label>
            <input 
              type="text" 
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
              placeholder="e.g. SAKIT0001"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-900">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-ink-900 hover:bg-ink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink-700 disabled:opacity-50 mt-6 transition-colors"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
