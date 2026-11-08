import { Link } from 'react-router-dom';
import ShapeGrid from '../components/common/ShapeGrid';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-50 flex flex-col relative overflow-hidden">
      {/* Background Interactive ShapeGrid */}
      <div className="absolute inset-0 z-0 pointer-events-auto" style={{ width: '100%', height: '100%' }}>
        <ShapeGrid
          shape="square"
          direction="diagonal"
          lineColor="rgba(22, 33, 62, 0.08)"
          hoverColor="#C98A3E"
          hoverFillColor="#C98A3E"
          fillOpacity={0.08}
          cellSize={40}
          speed={0.5}
          tiltX={0}
          tiltY={0}
          rainbow={false}
          lineWidth={1}
          radius={1.5}
          trail={0.6}
          glow={0.2}
          twinkle={0}
          fade={1}
          clickCascade
          intro
        />
      </div>

      <header className="relative z-10 h-16 px-6 lg:px-12 flex items-center justify-between border-b border-border bg-surface-0/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5 text-ink-900">
          <img 
            src="/kitcoek.svg" 
            alt="KITCoEK Logo" 
            className="w-8 h-8 object-contain"
          />
          <span className="text-xl font-semibold tracking-wider">NEXUS</span>
        </div>
        <Link 
          to="/login"
          className="px-4 py-2 rounded-md text-sm font-medium bg-ink-900 text-white hover:bg-ink-700 transition-colors shadow-sm"
        >
          Sign In
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center max-w-3xl mx-auto pointer-events-none">
        <h1 className="text-4xl lg:text-5xl font-semibold text-text-900 mb-6 leading-tight">
          The unified engine for <span className="text-brass-500">modern engineering colleges.</span>
        </h1>
        <p className="text-lg text-text-500 mb-10 max-w-prose">
          NEXUS brings together curriculum management, real-time attendance tracking, dynamic marking schemes, and fee ledgers into a single, cohesive system.
        </p>
        <div className="flex gap-4 pointer-events-auto">
          <Link 
            to="/login"
            className="px-6 py-3 rounded-md text-base font-medium bg-brass-500 text-white hover:bg-brass-600 transition-colors shadow-sm"
          >
            Access Portal
          </Link>
        </div>
      </main>
    </div>
  );
}
