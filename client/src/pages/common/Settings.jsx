import React, { useState, useEffect } from 'react';
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
  Smartphone,
  Bell,
  Languages,
  Check,
  GraduationCap,
  Layers,
  BookOpen,
  Calendar,
  LogOut,
  Sliders,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const ROLE_METAS = {
  SUPER_ADMIN: {
    label: 'Super Administrator',
    color: '#5B3A73',
    badgeClass: 'bg-[#5B3A73]',
    scope: 'Institutional Master Control',
    icon: Sparkles
  },
  DEPARTMENT_ADMIN: {
    label: 'Department Administrator',
    color: '#1F6F6F',
    badgeClass: 'bg-[#1F6F6F]',
    scope: 'Departmental Academic Governance',
    icon: Building
  },
  TEACHER: {
    label: 'Faculty Member',
    color: '#C98A3E',
    badgeClass: 'bg-[#C98A3E]',
    scope: 'Instruction & Continuous Evaluation',
    icon: BookOpen
  },
  STUDENT: {
    label: 'Student',
    color: '#2B4C7E',
    badgeClass: 'bg-[#2B4C7E]',
    scope: 'Undergraduate Program Curriculum',
    icon: GraduationCap
  },
  PARENT: {
    label: 'Parent / Guardian',
    color: '#5B6B8C',
    badgeClass: 'bg-[#5B6B8C]',
    scope: 'Ward Academic Oversight',
    icon: User
  },
  EXAM_STAFF: {
    label: 'Examination Controller',
    color: '#8C4A3A',
    badgeClass: 'bg-[#8C4A3A]',
    scope: 'Examination Operations & Result Auditing',
    icon: Layers
  }
};

export default function Settings() {
  const { user, logout } = useAuth();
  const { currentLanguage, changeLanguage, languages, t } = useLanguage();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'security', 'notifications', 'preferences'
  
  // Password State
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Notification Preferences State (Persisted locally per user)
  const notifStorageKey = `nexus_notif_prefs_${user?.id || 'guest'}`;
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(notifStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      circulars: true,
      academicAlerts: true,
      examReminders: true,
      emailDigest: false
    };
  });

  const roleMeta = ROLE_METAS[user?.role] || {
    label: user?.role?.replace('_', ' ') || 'Authorized User',
    color: '#16213E',
    badgeClass: 'bg-ink-900',
    scope: 'Institutional Access',
    icon: User
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!passwords.currentPassword) {
      return toast.error("Current password is required");
    }
    if (passwords.newPassword.length < 6) {
      return toast.error("New password must be at least 6 characters");
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error("New passwords do not match");
    }

    setIsUpdatingPassword(true);
    try {
      await apiClient.put('/auth/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      toast.success("Security credentials updated successfully");
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleNotificationToggle = (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    try {
      localStorage.setItem(notifStorageKey, JSON.stringify(updated));
      toast.success("Preferences saved");
    } catch (e) {}
  };

  // Password strength checker helper
  const getPasswordStrength = (pwd) => {
    if (!pwd) return null;
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-600', percent: '40%' };
    if (score <= 4) return { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-600', percent: '75%' };
    return { label: 'Very Strong', color: 'bg-ink-900', text: 'text-ink-900', percent: '100%' };
  };

  const pwdStrength = getPasswordStrength(passwords.newPassword);

  return (
    <div className="max-w-5xl space-y-6 pb-16 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-text-900 tracking-tight">
              {user?.role === 'PARENT' ? t('settings') : 'Account & Security Settings'}
            </h1>
            <span 
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full text-white shadow-xs hidden sm:inline-flex items-center gap-1"
              style={{ backgroundColor: roleMeta.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {roleMeta.label}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-500 mt-1">
            Manage your credentials, personalized notification preferences, and session security.
          </p>
        </div>

        {/* Quick Sign Out Action */}
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-danger/30 text-danger hover:bg-danger/10 transition-colors shrink-0 shadow-xs"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border overflow-x-auto custom-scrollbar pb-px">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all shrink-0 ${
            activeTab === 'profile'
              ? 'border-ink-900 text-ink-900'
              : 'border-transparent text-text-500 hover:text-text-900 hover:border-border'
          }`}
        >
          <User size={15} />
          <span>Profile & Identity</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all shrink-0 ${
            activeTab === 'security'
              ? 'border-ink-900 text-ink-900'
              : 'border-transparent text-text-500 hover:text-text-900 hover:border-border'
          }`}
        >
          <Lock size={15} />
          <span>Security & Password</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all shrink-0 ${
            activeTab === 'notifications'
              ? 'border-ink-900 text-ink-900'
              : 'border-transparent text-text-500 hover:text-text-900 hover:border-border'
          }`}
        >
          <Bell size={15} />
          <span>Notifications</span>
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all shrink-0 ${
            activeTab === 'preferences'
              ? 'border-ink-900 text-ink-900'
              : 'border-transparent text-text-500 hover:text-text-900 hover:border-border'
          }`}
        >
          <Sliders size={15} />
          <span>Preferences</span>
        </button>
      </div>

      {/* TAB 1: Profile & Identity */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
          {/* Main Identity Badge */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-surface-0 border border-border rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl text-white shadow-sm shrink-0"
                  style={{ backgroundColor: roleMeta.color }}
                >
                  {(user?.name || user?.instituteId || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-text-900 truncate">
                    {user?.name || 'Authorized Member'}
                  </h3>
                  <span className="font-mono text-xs text-text-700 font-semibold px-2 py-0.5 rounded bg-surface-100 border border-border inline-block mt-1">
                    {user?.instituteId || (user?.role === 'PARENT' ? user?.phoneNumber || user?.email : user?.role)}
                  </span>
                </div>
              </div>

              <div className="border-t border-border/80 pt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-text-500">
                  <span className="flex items-center gap-1.5"><Fingerprint size={13} /> Role Scope</span>
                  <span className="font-semibold text-text-900">{roleMeta.label}</span>
                </div>
                <div className="flex items-center justify-between text-text-500">
                  <span className="flex items-center gap-1.5"><Building size={13} /> Institution</span>
                  <span className="font-semibold text-text-900">KITCOEK Kolhapur</span>
                </div>
                {user?.department?.name && (
                  <div className="flex items-center justify-between text-text-500">
                    <span className="flex items-center gap-1.5"><Layers size={13} /> Department</span>
                    <span className="font-semibold text-text-900 truncate max-w-[170px]" title={user?.department?.name}>
                      {user?.department?.name}
                    </span>
                  </div>
                )}
                {user?.email && (
                  <div className="flex items-center justify-between text-text-500">
                    <span className="flex items-center gap-1.5"><Mail size={13} /> Email</span>
                    <span className="font-medium text-text-900 truncate max-w-[170px]" title={user?.email}>
                      {user?.email}
                    </span>
                  </div>
                )}
                {user?.phoneNumber && (
                  <div className="flex items-center justify-between text-text-500">
                    <span className="flex items-center gap-1.5"><Smartphone size={13} /> Contact</span>
                    <span className="font-mono font-medium text-text-900">
                      {user?.phoneNumber}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Session Verification Card */}
            <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-text-900 uppercase tracking-wider">
                <ShieldCheck size={16} className="text-emerald-600" />
                <span>Security Clearance</span>
              </div>
              <p className="text-xs text-text-500 leading-relaxed">
                Authorized under NEXUS Institutional ERP with active scope: <strong className="text-text-700">{roleMeta.scope}</strong>.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>Token Verified & Active</span>
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Role Context Information */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface-0 border border-border rounded-xl p-6 shadow-xs space-y-5">
              <div className="border-b border-border/80 pb-3">
                <h3 className="text-base font-bold text-text-900">Institutional Details</h3>
                <p className="text-xs text-text-500">Official academic directory record</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Student Specific */}
                {user?.role === 'STUDENT' && (
                  <>
                    <div className="bg-surface-50 p-3.5 rounded-lg border border-border space-y-1">
                      <span className="text-text-500 font-medium">Permanent Registration Number (PRN)</span>
                      <p className="font-mono font-bold text-sm text-text-900">{user?.prn || 'Not Registered'}</p>
                    </div>
                    <div className="bg-surface-50 p-3.5 rounded-lg border border-border space-y-1">
                      <span className="text-text-500 font-medium">Roll Number</span>
                      <p className="font-mono font-bold text-sm text-text-900">{user?.rollNumber || 'N/A'}</p>
                    </div>
                    <div className="bg-surface-50 p-3.5 rounded-lg border border-border space-y-1">
                      <span className="text-text-500 font-medium">Class & Division</span>
                      <p className="font-bold text-sm text-text-900">
                        {user?.division?.class?.name ? `${user.division.class.name} - Division ${user.division.name}` : 'General Section'}
                      </p>
                    </div>
                    <div className="bg-surface-50 p-3.5 rounded-lg border border-border space-y-1">
                      <span className="text-text-500 font-medium">Semester</span>
                      <p className="font-bold text-sm text-text-900">Semester {user?.semester || 1}</p>
                    </div>
                  </>
                )}

                {/* Faculty Specific */}
                {user?.role === 'TEACHER' && (
                  <>
                    <div className="bg-surface-50 p-3.5 rounded-lg border border-border space-y-1">
                      <span className="text-text-500 font-medium">Designation</span>
                      <p className="font-bold text-sm text-text-900">{user?.designation || 'Assistant Professor'}</p>
                    </div>
                    <div className="bg-surface-50 p-3.5 rounded-lg border border-border space-y-1">
                      <span className="text-text-500 font-medium">Faculty Identifier</span>
                      <p className="font-mono font-bold text-sm text-text-900">{user?.instituteId || 'FCKIT'}</p>
                    </div>
                    <div className="bg-surface-50 p-3.5 rounded-lg border border-border space-y-1">
                      <span className="text-text-500 font-medium">Department Assignment</span>
                      <p className="font-bold text-sm text-text-900">{user?.department?.name || 'Department of Technology'}</p>
                    </div>
                    <div className="bg-surface-50 p-3.5 rounded-lg border border-border space-y-1">
                      <span className="text-text-500 font-medium">Institutional Status</span>
                      <p className="font-bold text-sm text-emerald-700">Full-Time Academic Faculty</p>
                    </div>
                  </>
                )}

                {/* Department Admin Specific */}
                {user?.role === 'DEPARTMENT_ADMIN' && (
                  <>
                    <div className="bg-surface-50 p-3.5 rounded-lg border border-border space-y-1">
                      <span className="text-text-500 font-medium">Department Code</span>
                      <p className="font-mono font-bold text-sm text-text-900">{user?.department?.code || 'DEPT'}</p>
                    </div>
                    <div className="bg-surface-50 p-3.5 rounded-lg border border-border space-y-1">
                      <span className="text-text-500 font-medium">Managed Department</span>
                      <p className="font-bold text-sm text-text-900">{user?.department?.name || 'Department Admin Office'}</p>
                    </div>
                    <div className="bg-surface-50 p-3.5 rounded-lg border border-border space-y-1">
                      <span className="text-text-500 font-medium">Administrative ID</span>
                      <p className="font-mono font-bold text-sm text-text-900">{user?.instituteId || 'DAKIT'}</p>
                    </div>
                    <div className="bg-surface-50 p-3.5 rounded-lg border border-border space-y-1">
                      <span className="text-text-500 font-medium">Authority Level</span>
                      <p className="font-bold text-sm text-emerald-700">Department Controller & Allocations</p>
                    </div>
                  </>
                )}

                {/* Parent Specific */}
                {user?.role === 'PARENT' && (
                  <>
                    <div className="bg-surface-50 p-3.5 rounded-lg border border-border space-y-1 sm:col-span-2">
                      <span className="text-text-500 font-medium">Linked Wards / Children</span>
                      {user?.children && user.children.length > 0 ? (
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {user.children.map((childObj) => (
                            <div key={childObj.student?.id || Math.random()} className="p-2.5 rounded bg-surface-0 border border-border flex items-center gap-2">
                              <GraduationCap size={16} className="text-ink-700 shrink-0" />
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-text-900 truncate">{childObj.student?.name}</p>
                                <p className="text-[10px] font-mono text-text-500">PRN: {childObj.student?.prn || 'N/A'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="font-bold text-xs text-text-700 mt-1">Directly synced to ward credentials</p>
                      )}
                    </div>
                  </>
                )}

                {/* Exam Staff Specific */}
                {user?.role === 'EXAM_STAFF' && (
                  <>
                    <div className="bg-surface-50 p-3.5 rounded-lg border border-border space-y-1">
                      <span className="text-text-500 font-medium">Staff ID</span>
                      <p className="font-mono font-bold text-sm text-text-900">{user?.instituteId || 'EXKIT'}</p>
                    </div>
                    <div className="bg-surface-50 p-3.5 rounded-lg border border-border space-y-1">
                      <span className="text-text-500 font-medium">Assigned Division</span>
                      <p className="font-bold text-sm text-text-900">Examination Cell & Evaluation Office</p>
                    </div>
                  </>
                )}

                {/* Super Admin Specific */}
                {user?.role === 'SUPER_ADMIN' && (
                  <>
                    <div className="bg-surface-50 p-3.5 rounded-lg border border-border space-y-1">
                      <span className="text-text-500 font-medium">Clearance Level</span>
                      <p className="font-bold text-sm text-purple-900">Tier 1 Master Super Administrator</p>
                    </div>
                    <div className="bg-surface-50 p-3.5 rounded-lg border border-border space-y-1">
                      <span className="text-text-500 font-medium">System Domain</span>
                      <p className="font-bold text-sm text-text-900">College-Wide Academic Enterprise (KITCOEK)</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Security & Password */}
      {activeTab === 'security' && (
        <div className="max-w-2xl bg-surface-0 border border-border rounded-xl p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center gap-3 border-b border-border/80 pb-4">
            <div className="p-2.5 rounded-xl bg-surface-50 border border-border text-ink-900">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-900">Update Account Password</h3>
              <p className="text-xs text-text-500">Ensure your account password is strong, secure, and known only to you.</p>
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

            {/* Password Strength Meter */}
            {passwords.newPassword && pwdStrength && (
              <div className="p-3 bg-surface-50 border border-border rounded-lg space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-500 font-medium">Password Strength:</span>
                  <span className={`font-bold ${pwdStrength.text}`}>{pwdStrength.label}</span>
                </div>
                <div className="w-full h-1.5 bg-surface-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${pwdStrength.color} transition-all duration-300`} 
                    style={{ width: pwdStrength.percent }}
                  />
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-border/80 flex items-center justify-between">
              <span className="text-xs text-text-500 font-mono">
                Authenticated session remains valid.
              </span>
              <Button type="submit" disabled={isUpdatingPassword} className="shadow-xs">
                {isUpdatingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Notifications */}
      {activeTab === 'notifications' && (
        <div className="max-w-2xl bg-surface-0 border border-border rounded-xl p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center gap-3 border-b border-border/80 pb-4">
            <div className="p-2.5 rounded-xl bg-surface-50 border border-border text-ink-900">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-900">Notification Preferences</h3>
              <p className="text-xs text-text-500">Configure which institutional alerts and digests you receive.</p>
            </div>
          </div>

          <div className="divide-y divide-border/80">
            {/* Circulars */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-text-900">Official Circulars & Notices</p>
                <p className="text-xs text-text-500">Instant in-app notification badges when new memos or announcements are published.</p>
              </div>
              <button
                type="button"
                onClick={() => handleNotificationToggle('circulars')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  notifications.circulars ? 'bg-ink-900' : 'bg-surface-200'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  notifications.circulars ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Academic Alerts */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-text-900">Academic & Attendance Alerts</p>
                <p className="text-xs text-text-500">Threshold alerts regarding attendance compliance and newly finalized test scores.</p>
              </div>
              <button
                type="button"
                onClick={() => handleNotificationToggle('academicAlerts')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  notifications.academicAlerts ? 'bg-ink-900' : 'bg-surface-200'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  notifications.academicAlerts ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Exam Reminders */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-text-900">Examination Timetable & Hall Ticket Releases</p>
                <p className="text-xs text-text-500">Alerts when exam schedules are finalized and hall tickets become downloadable.</p>
              </div>
              <button
                type="button"
                onClick={() => handleNotificationToggle('examReminders')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  notifications.examReminders ? 'bg-ink-900' : 'bg-surface-200'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  notifications.examReminders ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Email Digest */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-text-900">Weekly Email Digest</p>
                <p className="text-xs text-text-500">Summary of department updates, attendance statistics, and pending tasks.</p>
              </div>
              <button
                type="button"
                onClick={() => handleNotificationToggle('emailDigest')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  notifications.emailDigest ? 'bg-ink-900' : 'bg-surface-200'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  notifications.emailDigest ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Preferences & Interface */}
      {activeTab === 'preferences' && (
        <div className="max-w-2xl bg-surface-0 border border-border rounded-xl p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center gap-3 border-b border-border/80 pb-4">
            <div className="p-2.5 rounded-xl bg-surface-50 border border-border text-ink-900">
              <Languages size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-900">Interface & Language Preferences</h3>
              <p className="text-xs text-text-500">Choose your preferred regional language and review device telemetry.</p>
            </div>
          </div>

          {/* Language Selector (Particularly useful for Parent portal, accessible to all) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-900 uppercase tracking-wider">
                Display Language
              </span>
              <span className="text-xs text-text-500">
                Current: <strong className="text-ink-900">{languages.find(l => l.code === currentLanguage)?.name || 'English'}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {languages.map((lang) => {
                const isSelected = currentLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      changeLanguage(lang.code);
                      toast.success(`Language set to ${lang.name}`);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-ink-900 text-white border-ink-900 shadow-xs'
                        : 'bg-surface-50 hover:bg-surface-100 text-text-800 border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold block">{lang.native}</span>
                      {isSelected && <Check size={14} className="text-brass-400" />}
                    </div>
                    <span className={`text-[10px] font-mono mt-0.5 block ${isSelected ? 'text-slate-300' : 'text-text-500'}`}>
                      {lang.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Session Diagnostics */}
          <div className="pt-4 border-t border-border/80 space-y-3">
            <span className="text-xs font-bold text-text-900 uppercase tracking-wider block">
              Session Diagnostics
            </span>
            <div className="bg-surface-50 p-4 rounded-xl border border-border grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-text-500 block">Session Token Validity</span>
                <span className="font-mono font-semibold text-text-900">24-Hour Active Rotation</span>
              </div>
              <div>
                <span className="text-text-500 block">Encryption Standard</span>
                <span className="font-mono font-semibold text-text-900">TLS 1.3 / AES-GCM</span>
              </div>
              <div>
                <span className="text-text-500 block">Host Environment</span>
                <span className="font-mono font-semibold text-text-900">KITCOEK Institutional Cloud</span>
              </div>
              <div>
                <span className="text-text-500 block">Access Verification</span>
                <span className="font-mono font-semibold text-emerald-700">Strict Role Enforced</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
