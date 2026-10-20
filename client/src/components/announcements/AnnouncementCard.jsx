import React, { useState } from 'react';
import StatusBadge from '../ui/StatusBadge';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Globe, 
  Building2, 
  Users, 
  Trash2, 
  Clock, 
  ShieldCheck, 
  UserCheck, 
  GraduationCap 
} from 'lucide-react';

export default function AnnouncementCard({ announcement, onDelete }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Creator resolution
  let creatorName = 'Unknown Author';
  let creatorId = '—';
  let creatorRole = 'STAFF';
  let roleColor = '#5B6072';

  if (announcement.createdBySuperAdmin) {
    creatorName = announcement.createdBySuperAdmin.name;
    creatorId = announcement.createdBySuperAdmin.instituteId;
    creatorRole = t('superAdmin');
    roleColor = '#5B3A73'; // Plum
  } else if (announcement.createdByDeptAdmin) {
    creatorName = announcement.createdByDeptAdmin.name;
    creatorId = announcement.createdByDeptAdmin.instituteId;
    creatorRole = t('deptAdmin');
    roleColor = '#1F6F6F'; // Teal
  } else if (announcement.createdByTeacher) {
    creatorName = announcement.createdByTeacher.name;
    creatorId = announcement.createdByTeacher.instituteId;
    creatorRole = t('faculty');
    roleColor = '#C98A3E'; // Brass
  }

  // Permission to delete
  const canDelete =
    user?.role === 'SUPER_ADMIN' ||
    (user?.role === 'DEPARTMENT_ADMIN' && (
      announcement.createdByDeptAdminId === user?.id || 
      (user?.departmentId && announcement.targetDepartmentId === user?.departmentId) ||
      !announcement.createdBySuperAdminId // Dept Admin can delete departmental notices
    )) ||
    (user?.role === 'TEACHER' && announcement.createdByTeacherId === user?.id);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (onDelete) await onDelete(announcement.id);
      setShowConfirmDelete(false);
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Targeting badge label
  const renderTargetBadge = () => {
    if (!announcement.targetDepartmentId) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#5B3A73]/10 text-[#5B3A73]">
          <Globe size={12} />
          {t('collegeWideAll')}
        </span>
      );
    }

    if (announcement.targetDepartment && !announcement.targetClassId) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#1F6F6F]/10 text-[#1F6F6F]">
          <Building2 size={12} />
          {t('deptPrefix')} {announcement.targetDepartment.code || announcement.targetDepartment.name}
        </span>
      );
    }

    if (announcement.targetClass && !announcement.targetDivisionId) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-info/10 text-info">
          <Users size={12} />
          {t('classPrefix')} {announcement.targetClass.name}
        </span>
      );
    }

    if (announcement.targetDivision) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-brass-500/15 text-brass-600">
          <Users size={12} />
          {t('divisionPrefix')} {announcement.targetDivision.name} ({announcement.targetClass?.name})
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral/10 text-neutral">
        {t('targetedNotice')}
      </span>
    );
  };

  const formattedDate = announcement.createdAt 
    ? new Date(announcement.createdAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : '—';

  return (
    <>
      <div className="rounded-md border border-border bg-surface-0 p-5 transition-colors hover:border-ink-700/30">
        {/* Header: Title, Target Badge, Type, Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-border/60">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={announcement.type} />
              {renderTargetBadge()}
            </div>
            <h4 className="text-base font-semibold text-text-900 tracking-tight">
              {announcement.title}
            </h4>
          </div>

          {/* Delete Action if authorized */}
          {canDelete && (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="self-start text-text-500 hover:text-danger p-1.5 rounded-md hover:bg-danger/10 transition-colors focus:outline-none focus:ring-1 focus:ring-danger"
              title="Delete Announcement"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {/* Message body */}
        <div className="py-3.5">
          <p className="text-sm text-text-900 leading-relaxed whitespace-pre-line max-w-prose">
            {announcement.message}
          </p>
        </div>

        {/* Footer: Author Info & Timestamp */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/40 text-xs text-text-500">
          {/* Creator Tag */}
          <div className="flex items-center gap-2">
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: roleColor }} 
              title={creatorRole}
            />
            <span className="font-medium text-text-900">
              {creatorName}
            </span>
            <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-surface-50 border border-border text-text-500">
              {creatorId}
            </span>
            <span 
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: roleColor }}
            >
              {creatorRole}
            </span>
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-1 font-mono text-[11px] text-text-500">
            <Clock size={12} />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDelete}
        title={t('deleteAnnouncement')}
        message={t('deleteConfirmMsg')}
        confirmText={t('deleteBtn')}
        cancelText={t('cancelBtn')}
        isDestructive={true}
        loading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setShowConfirmDelete(false)}
      />
    </>
  );
}
