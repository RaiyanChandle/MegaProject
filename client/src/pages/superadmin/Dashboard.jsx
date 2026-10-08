export default function SuperAdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="bg-surface-0 border border-border rounded-md p-6">
        <h3 className="text-base font-semibold text-text-900 mb-2">Welcome to NEXUS</h3>
        <p className="text-sm text-text-500">
          This is the Super Admin dashboard. Select a configuration area from the sidebar.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-0 border border-border rounded-md p-6">
          <div className="text-xs font-medium text-text-500 uppercase tracking-wide mb-1">Total Departments</div>
          <div className="font-mono text-2xl font-medium text-text-900">0</div>
        </div>
        <div className="bg-surface-0 border border-border rounded-md p-6">
          <div className="text-xs font-medium text-text-500 uppercase tracking-wide mb-1">System Status</div>
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success mt-1">
            Healthy
          </div>
        </div>
      </div>
    </div>
  );
}
