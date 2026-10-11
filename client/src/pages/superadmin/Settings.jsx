import { useState } from 'react';
import { apiClient } from '../../api/client';
import Button from '../../components/ui/Button';
import Field from '../../components/ui/Field';
import { toast } from '../../components/ui/Toast';
import { 
  Key, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  User, 
  Mail, 
  Fingerprint, 
  CheckCircle2, 
  Lock,
  Building,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.newPassword.length < 6) {
      return toast.error("New password must be at least 6 characters");
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error("New passwords do not match");
    }

    setIsLoading(true);
    try {
      await apiClient.put('/auth/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      toast.success("Security password updated successfully");
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-text-900 tracking-tight">Account & Security Settings</h2>
        <p className="text-sm text-text-500 mt-0.5">
          Review your administrative credentials, active session status, and update security credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Card & Session Telemetry */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-ink-900 text-white font-bold text-base flex items-center justify-center shrink-0 shadow-xs">
                {(user?.name || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-text-900 truncate">{user?.name || 'Administrator'}</h3>
                <span className="font-mono text-xs text-text-500 font-semibold px-2 py-0.5 rounded bg-surface-50 border border-border inline-block mt-0.5">
                  {user?.instituteId || 'SUPER_ADMIN'}
                </span>
              </div>
            </div>

            <div className="border-t border-border/80 pt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between text-text-500">
                <span className="flex items-center gap-1.5"><Mail size={13} /> Email</span>
                <span className="font-medium text-text-900 truncate max-w-[170px]" title={user?.email}>
                  {user?.email || 'admin@kitcoek.in'}
                </span>
              </div>
              <div className="flex items-center justify-between text-text-500">
                <span className="flex items-center gap-1.5"><Fingerprint size={13} /> Role</span>
                <span className="font-semibold text-ink-900 uppercase">
                  {user?.role?.replace('_', ' ') || 'SUPER ADMIN'}
                </span>
              </div>
              <div className="flex items-center justify-between text-text-500">
                <span className="flex items-center gap-1.5"><Building size={13} /> Organization</span>
                <span className="font-medium text-text-900">KITCOEK Kolhapur</span>
              </div>
            </div>
          </div>

          {/* Security Telemetry */}
          <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-900 uppercase tracking-wider">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>Session Health</span>
            </div>
            <p className="text-xs text-text-500">
              Authenticated via encrypted JSON Web Token (JWT). Role permission enforcement is actively verified on all institutional endpoints.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>Session Status: Active & Secured</span>
            </div>
          </div>
        </div>

        {/* Right Column: Change Password */}
        <div className="lg:col-span-2">
          <div className="bg-surface-0 border border-border rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 border-b border-border/80 pb-4">
              <div className="p-2 rounded-lg bg-surface-50 border border-border text-ink-900">
                <Lock size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-900">Update Password</h3>
                <p className="text-xs text-text-500">Ensure your account uses a strong, unique password.</p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <Field label="Current Password" required>
                <div className="relative">
                  <input 
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Enter current password"
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    className="w-full rounded-md border border-border px-3 py-2 pr-10 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 bg-surface-0"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-400 hover:text-ink-700 focus:outline-none"
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field 
                  label="New Password" 
                  required 
                  helperText="Minimum 6 characters"
                >
                  <div className="relative">
                    <input 
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                      className="w-full rounded-md border border-border px-3 py-2 pr-10 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 bg-surface-0"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-400 hover:text-ink-700 focus:outline-none"
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>

                <Field label="Confirm New Password" required>
                  <div className="relative">
                    <input 
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repeat new password"
                      value={passwords.confirmPassword}
                      onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                      className="w-full rounded-md border border-border px-3 py-2 pr-10 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 bg-surface-0"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-400 hover:text-ink-700 focus:outline-none"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>
              </div>

              <div className="pt-3 border-t border-border/80 flex items-center justify-between">
                <span className="text-xs text-text-500 font-mono">
                  All active sessions will remain valid.
                </span>
                <Button type="submit" disabled={isLoading} className="shadow-xs">
                  {isLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
