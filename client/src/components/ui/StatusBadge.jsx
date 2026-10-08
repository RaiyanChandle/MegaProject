import React from 'react';

// Maps exact schema statuses to the 5 semantic colors in design.md
const statusMap = {
  // success
  PRESENT: 'bg-success/10 text-success',
  PASSED: 'bg-success/10 text-success',
  CONFIRMED: 'bg-success/10 text-success',
  APPROVED: 'bg-success/10 text-success',
  ACCEPTED: 'bg-success/10 text-success',
  SUCCESS: 'bg-success/10 text-success',
  ACTIVE: 'bg-success/10 text-success',
  PUBLISHED: 'bg-success/10 text-success',
  PAID: 'bg-success/10 text-success',

  // danger
  ABSENT: 'bg-danger/10 text-danger',
  FAILED: 'bg-danger/10 text-danger',
  REJECTED: 'bg-danger/10 text-danger',
  WITHDRAWN: 'bg-danger/10 text-danger',
  OVERDUE: 'bg-danger/10 text-danger',
  LATE: 'bg-danger/10 text-danger',

  // warning
  PENDING: 'bg-warning/10 text-warning',
  DRAFT: 'bg-warning/10 text-warning',
  LATE_SUBMISSION: 'bg-warning/10 text-warning',
  PARTIAL: 'bg-warning/10 text-warning',

  // info
  SUBMITTED: 'bg-info/10 text-info',
  LOCKED: 'bg-info/10 text-info',
  ENROLLED: 'bg-info/10 text-info',
  ONGOING: 'bg-info/10 text-info',
  IN_PROGRESS: 'bg-info/10 text-info',

  // neutral
  UPLOADED: 'bg-neutral/10 text-neutral',
  INACTIVE: 'bg-neutral/10 text-neutral',
  ARCHIVED: 'bg-neutral/10 text-neutral',
  COMPLETED: 'bg-neutral/10 text-neutral', // Note: could be success, but neutral fits finished historical data sometimes.

  // subjects
  CORE: 'bg-info/10 text-info',
  PROGRAM_ELECTIVE: 'bg-warning/10 text-warning',
  OPEN_ELECTIVE: 'bg-success/10 text-success',
};

export default function StatusBadge({ status, className = '' }) {
  const normalizedStatus = typeof status === 'string' ? status.toUpperCase() : 'UNKNOWN';
  const colorClass = statusMap[normalizedStatus] || 'bg-neutral/10 text-neutral';
  
  // Format nicely for display (e.g., LATE_SUBMISSION -> Late Submission)
  const displayLabel = normalizedStatus.replace(/_/g, ' ').replace(
    /\w\S*/g, 
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass} ${className}`}>
      {displayLabel}
    </span>
  );
}
