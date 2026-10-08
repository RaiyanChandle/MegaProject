import { useState } from 'react';
import { apiClient } from '../../api/client';
import Button from '../../components/ui/Button';
import Field from '../../components/ui/Field';
import { toast } from '../../components/ui/Toast';
import { Key, Eye, EyeOff } from 'lucide-react';
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
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error("New passwords do not match");
    }

    setIsLoading(true);
    try {
      await apiClient.put('/auth/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      toast.success("Password updated successfully");
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-text-900">Settings</h2>
        <p className="text-sm text-text-500 mt-1">Manage your account preferences and security.</p>
      </div>

      {/* Profile Info Readonly */}
      <div className="bg-surface-0 border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-surface-50">
          <h3 className="text-sm font-semibold text-text-900">Profile Information</h3>
        </div>
        <div className="p-6 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-text-500 uppercase tracking-wider mb-1">Name</p>
            <p className="text-base font-semibold text-text-900">{user?.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-text-500 uppercase tracking-wider mb-1">Email</p>
            <p className="text-base font-medium text-text-900">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-text-500 uppercase tracking-wider mb-1">Role</p>
            <p className="text-base font-medium text-text-900">{user?.role?.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-text-500 uppercase tracking-wider mb-1">Institute ID</p>
            <p className="text-base font-mono font-medium text-text-900">{user?.instituteId}</p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-surface-0 border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-surface-50 flex items-center gap-2">
          <Key size={18} className="text-text-500" />
          <h3 className="text-sm font-semibold text-text-900">Change Password</h3>
        </div>
        <form onSubmit={handlePasswordChange} className="p-6 space-y-4 max-w-md">
          <Field label="Current Password">
            <div className="relative">
              <input 
                type={showCurrentPassword ? "text" : "password"}
                value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                className="w-full pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-400 hover:text-ink-700 focus:outline-none"
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          
          <Field label="New Password">
            <div className="relative">
              <input 
                type={showNewPassword ? "text" : "password"}
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                className="w-full pr-10"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-400 hover:text-ink-700 focus:outline-none"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          
          <Field label="Confirm New Password">
            <div className="relative">
              <input 
                type={showConfirmPassword ? "text" : "password"}
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                className="w-full pr-10"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-400 hover:text-ink-700 focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>

          <div className="pt-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
