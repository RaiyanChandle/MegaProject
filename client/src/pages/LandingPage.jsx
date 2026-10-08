import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      <header className="h-16 px-6 lg:px-12 flex items-center justify-between border-b border-border bg-surface-0">
        <div className="flex items-center gap-2 text-ink-900">
          <BookOpen size={24} className="text-brass-500" />
          <span className="text-xl font-semibold tracking-wider">NEXUS</span>
        </div>
        <Link 
          to="/login"
          className="px-4 py-2 rounded-md text-sm font-medium bg-ink-900 text-white hover:bg-ink-700 transition-colors"
        >
          Sign In
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl lg:text-5xl font-semibold text-text-900 mb-6 leading-tight">
          The unified engine for <span className="text-brass-500">modern engineering colleges.</span>
        </h1>
        <p className="text-lg text-text-500 mb-10 max-w-prose">
          NEXUS brings together curriculum management, real-time attendance tracking, dynamic marking schemes, and fee ledgers into a single, cohesive system.
        </p>
        <div className="flex gap-4">
          <Link 
            to="/login"
            className="px-6 py-3 rounded-md text-base font-medium bg-brass-500 text-white hover:bg-brass-600 transition-colors"
          >
            Access Portal
          </Link>
        </div>
      </main>
    </div>
  );
}
