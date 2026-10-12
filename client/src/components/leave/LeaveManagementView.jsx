import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';
import EmptyState from '../ui/EmptyState';
import ConfirmDialog from '../ui/ConfirmDialog';
import Toast from '../ui/Toast';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  AlertCircle, 
  FileText, 
  Trash2,
  CalendarDays,
  UserCheck
} from 'lucide-react';

export default function LeaveManagementView({ role = 'STUDENT', title = 'Leave Applications', subtitle = 'Submit and monitor your leave requests' }) {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [leaveToCancel, setLeaveToCancel] = useState(null);
  const [toast, setToast] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    fromDate: '',
    toDate: '',
    reason: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/leaves/my-requests');
      setLeaves(data || []);
    } catch (err) {
      console.error('Failed to load leave requests:', err);
      setToast({ type: 'danger', message: err.message || 'Failed to load leave requests.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  // Compute duration in days
  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return 0;
    const diffTime = Math.abs(e - s);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const selectedDays = calculateDays(formData.fromDate, formData.toDate);

  const validateForm = () => {
    const errors = {};
    if (!formData.fromDate) {
      errors.fromDate = 'From Date is required.';
    }
    if (!formData.toDate) {
      errors.toDate = 'To Date is required.';
    }
    if (formData.fromDate && formData.toDate) {
      const from = new Date(formData.fromDate);
      const to = new Date(formData.toDate);
      if (from > to) {
        errors.toDate = 'To Date cannot be before From Date.';
      }
    }
    if (!formData.reason || formData.reason.trim().length < 5) {
      errors.reason = 'Please provide a clear reason (at least 5 characters).';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      await apiClient.post('/leaves', {
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        reason: formData.reason.trim()
      });

      setToast({ type: 'success', message: 'Leave request submitted successfully!' });
      setIsApplyModalOpen(false);
      setFormData({ fromDate: '', toDate: '', reason: '' });
      setFormErrors({});
      await fetchLeaveRequests();
    } catch (err) {
      console.error('Error submitting leave:', err);
      setToast({ type: 'danger', message: err.message || 'Failed to submit leave request.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!leaveToCancel) return;
    try {
      await apiClient.delete(`/leaves/${leaveToCancel.id}`);
      setToast({ type: 'success', message: 'Leave request cancelled successfully.' });
      setLeaveToCancel(null);
      await fetchLeaveRequests();
    } catch (err) {
      console.error('Error cancelling leave:', err);
      setToast({ type: 'danger', message: err.message || 'Failed to cancel leave request.' });
    }
  };

  // Metrics
  const totalCount = leaves.length;
  const pendingCount = leaves.filter((l) => l.status === 'PENDING').length;
  const approvedCount = leaves.filter((l) => l.status === 'APPROVED').length;
  const rejectedCount = leaves.filter((l) => l.status === 'REJECTED').length;

  // Filtered leaves
  const filteredLeaves = leaves.filter((l) => {
    if (filter === 'ALL') return true;
    return l.status === filter;
  });

  const formatDateDisplay = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTimeDisplay = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-900 tracking-tight">{title}</h1>
          <p className="text-sm text-text-500 mt-1">{subtitle}</p>
        </div>
        <Button
          onClick={() => setIsApplyModalOpen(true)}
          className="inline-flex items-center gap-2 bg-ink-900 hover:bg-ink-700 text-white shadow-sm"
        >
          <Plus size={18} />
          <span>Apply for Leave</span>
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-0 border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-500 uppercase tracking-wider">Total Applied</p>
            <p className="text-2xl font-bold text-text-900 mt-1">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface-50 border border-border flex items-center justify-center text-ink-900">
            <CalendarDays size={20} />
          </div>
        </div>

        <div className="bg-surface-0 border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-500 uppercase tracking-wider">Pending Review</p>
            <p className="text-2xl font-bold text-warning mt-1">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center text-warning">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-surface-0 border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-500 uppercase tracking-wider">Approved</p>
            <p className="text-2xl font-bold text-success mt-1">{approvedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center text-success">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-surface-0 border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-500 uppercase tracking-wider">Rejected</p>
            <p className="text-2xl font-bold text-danger mt-1">{rejectedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center text-danger">
            <XCircle size={20} />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-surface-0 border border-border rounded-xl shadow-sm overflow-hidden">
        {/* Filter Navigation Bar */}
        <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-surface-50/50">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'All Requests', count: totalCount },
              { id: 'PENDING', label: 'Pending', count: pendingCount },
              { id: 'APPROVED', label: 'Approved', count: approvedCount },
              { id: 'REJECTED', label: 'Rejected', count: rejectedCount }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  filter === tab.id
                    ? 'bg-ink-900 text-white shadow-sm'
                    : 'text-text-500 hover:text-text-900 hover:bg-surface-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  filter === tab.id ? 'bg-white/20 text-white' : 'bg-surface-200 text-text-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <span className="text-xs text-text-500 font-medium">
            Showing {filteredLeaves.length} of {totalCount} records
          </span>
        </div>

        {/* Requests Table */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-border border-t-ink-900"></div>
            <p className="text-sm text-text-500 mt-3">Loading leave requests...</p>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={filter === 'ALL' ? 'No leave requests submitted yet' : `No ${filter.toLowerCase()} leave requests`}
              description={
                filter === 'ALL'
                  ? 'Submit your first leave request using the "Apply for Leave" button above.'
                  : `There are currently no leave requests with status "${filter}".`
              }
              action={
                filter === 'ALL' ? (
                  <Button
                    onClick={() => setIsApplyModalOpen(true)}
                    className="mt-4 bg-ink-900 hover:bg-ink-700 text-white"
                  >
                    Apply for Leave
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-50 text-text-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Period & Duration</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Submitted On</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reviewer Details</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLeaves.map((req) => {
                  const days = calculateDays(req.fromDate, req.toDate);
                  const isPending = req.status === 'PENDING';

                  return (
                    <tr key={req.id} className="hover:bg-surface-50/70 transition-colors">
                      {/* Period */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 font-medium text-text-900">
                            <Calendar size={15} className="text-text-500 shrink-0" />
                            <span>
                              {formatDateDisplay(req.fromDate)} &rarr; {formatDateDisplay(req.toDate)}
                            </span>
                          </div>
                          <span className="inline-flex items-center w-fit px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-100 text-text-700 border border-border">
                            {days} {days === 1 ? 'day' : 'days'}
                          </span>
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-text-900 text-sm whitespace-pre-wrap line-clamp-2" title={req.reason}>
                          {req.reason}
                        </p>
                      </td>

                      {/* Submitted On */}
                      <td className="py-3.5 px-4 text-text-500 text-xs whitespace-nowrap">
                        {formatDateTimeDisplay(req.createdAt)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={req.status} />
                      </td>

                      {/* Reviewer Details */}
                      <td className="py-3.5 px-4 text-xs">
                        {req.resolvedByDeptAdmin ? (
                          <div className="space-y-0.5">
                            <p className="font-medium text-text-900 flex items-center gap-1">
                              <UserCheck size={13} className="text-success shrink-0" />
                              {req.resolvedByDeptAdmin.name}
                            </p>
                            <p className="text-text-500 text-[11px]">
                              {formatDateDisplay(req.resolvedAt)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-text-400 italic">Pending HOD / Admin</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {isPending ? (
                          <button
                            onClick={() => setLeaveToCancel(req)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 rounded-md transition-colors"
                            title="Cancel this pending leave request"
                          >
                            <Trash2 size={14} />
                            <span>Cancel</span>
                          </button>
                        ) : (
                          <span className="text-xs text-text-400">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply for Leave Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsApplyModalOpen(false);
            setFormErrors({});
          }
        }}
        title="Apply for Leave"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleApplySubmit} className="space-y-4">
          <div className="bg-surface-50 border border-border rounded-lg p-3 text-xs text-text-500">
            {role === 'STUDENT' ? (
              <p>
                Your leave application will be reviewed and approved by your <strong>Department Admin</strong>. Please specify your dates and detailed reason accurately.
              </p>
            ) : (
              <p>
                Faculty leave requests are subject to approval by your <strong>Department Admin / HOD</strong>.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-900 mb-1">
                From Date <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                value={formData.fromDate}
                onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                className={`w-full rounded-md border ${
                  formErrors.fromDate ? 'border-danger' : 'border-border'
                } px-3 py-2 text-sm bg-surface-0 focus:outline-none focus:ring-1 focus:ring-ink-700`}
                required
              />
              {formErrors.fromDate && (
                <p className="text-danger text-[11px] mt-1">{formErrors.fromDate}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-text-900 mb-1">
                To Date <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                value={formData.toDate}
                onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                className={`w-full rounded-md border ${
                  formErrors.toDate ? 'border-danger' : 'border-border'
                } px-3 py-2 text-sm bg-surface-0 focus:outline-none focus:ring-1 focus:ring-ink-700`}
                required
              />
              {formErrors.toDate && (
                <p className="text-danger text-[11px] mt-1">{formErrors.toDate}</p>
              )}
            </div>
          </div>

          {/* Duration Preview */}
          {selectedDays > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-info/10 text-info border border-info/20 rounded-md text-xs font-medium">
              <Calendar size={15} />
              <span>Leave Duration: {selectedDays} {selectedDays === 1 ? 'day' : 'days'}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text-900 mb-1">
              Reason for Leave <span className="text-danger">*</span>
            </label>
            <textarea
              rows={4}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder={
                role === 'STUDENT'
                  ? "e.g. Attending a family medical emergency / recuperating from illness..."
                  : "e.g. Attending academic conference / research work / personal emergency..."
              }
              className={`w-full rounded-md border ${
                formErrors.reason ? 'border-danger' : 'border-border'
              } px-3 py-2 text-sm bg-surface-0 focus:outline-none focus:ring-1 focus:ring-ink-700 resize-none`}
              required
            />
            {formErrors.reason && (
              <p className="text-danger text-[11px] mt-1">{formErrors.reason}</p>
            )}
            <p className="text-[11px] text-text-400 mt-1">
              Please include sufficient context for your department administrator.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsApplyModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-ink-900 hover:bg-ink-700 text-white min-w-[120px]"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Cancel Dialog */}
      <ConfirmDialog
        isOpen={Boolean(leaveToCancel)}
        onClose={() => setLeaveToCancel(null)}
        onConfirm={handleConfirmCancel}
        title="Cancel Leave Request"
        message={`Are you sure you want to cancel your leave request from ${formatDateDisplay(
          leaveToCancel?.fromDate
        )} to ${formatDateDisplay(leaveToCancel?.toDate)}? This action cannot be undone.`}
        confirmText="Cancel Leave"
        isDestructive={true}
      />
    </div>
  );
}
