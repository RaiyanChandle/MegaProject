import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppShell({ role, title }) {
  return (
    <div className="flex h-screen w-full bg-surface-50 overflow-hidden">
      <Sidebar role={role} />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Topbar title={title} />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
