import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Toast from '../../components/ui/Toast';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  User,
  GraduationCap,
  Briefcase,
  AlertCircle,
  Calendar,
  Check,
  X,
  FileText,
  RotateCcw
} from 'lucide-react';

export default function LeaveManagement() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  // Review modal state
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [decisionAction, setDecisionAction] = useState(null); // 'APPROVED' | 'REJECTED'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View full reason modal state
  const [detailLeave, setDetailLeave] = useState(null);

  const fetchDepartmentLeaves = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (roleFilter !== 'ALL') params.append('role', roleFilter);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const data = await apiClient.get(`/leaves/department${queryString}`);
      setLeaves(data || []);
    } catch (err) {
      console.error('Failed to load leave requests:', err);
      setToast({ type: 'danger', message: err.message || 'Failed to load department leave requests.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartmentLeaves();
  }, [statusFilter, roleFilter]);

  const handleResolve = async () => {
    if (!selectedLeave || !decisionAction) return;

    try {
      setIsSubmitting(true);
      const res = await apiClient.patch(`/leaves/${selectedLeave.id}/status`, {
        status: decisionAction
      });

      window.dispatchEvent(new CustomEvent('nexus:refresh-notifications'));

      setToast({
        type: decisionAction === 'APPROVED' ? 'success' : 'danger',
        message: `Leave request for ${
          selectedLeave.student?.name || selectedLeave.teacher?.name || 'applicant'
        } has been ${decisionAction.toLowerCase()}.`
      });

      setSelectedLeave(null);
      setDecisionAction(null);
      await fetchDepartmentLeaves();
    } catch (err) {
      console.error('Failed to resolve leave request:', err);
      setToast({ type: 'danger', message: err.message || 'Failed to update leave request status.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return 0;
    const diffTime = Math.abs(e - s);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

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

  // Metrics
  const totalCount = leaves.length;
  const pendingCount = leaves.filter((l) => l.status === 'PENDING').length;
  const approvedCount = leaves.filter((l) => l.status === 'APPROVED').length;
  const rejectedCount = leaves.filter((l) => l.status === 'REJECTED').length;
  const studentLeavesCount = leaves.filter((l) => Boolean(l.studentId)).length;
  const teacherLeavesCount = leaves.filter((l) => Boolean(l.teacherId)).length;

  // Search filtering
  const filteredLeaves = leaves.filter((req) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const requesterName = (req.student?.name || req.teacher?.name || '').toLowerCase();
    const requesterId = (req.student?.instituteId || req.teacher?.instituteId || '').toLowerCase();
    const reason = (req.reason || '').toLowerCase();
    return requesterName.includes(q) || requesterId.includes(q) || reason.includes(q);
  });

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
          <h1 className="text-2xl font-bold text-text-900 tracking-tight">Leave Approvals</h1>
          <p className="text-sm text-text-500 mt-1">
            Review and resolve academic and faculty leave requests for your department
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={fetchDepartmentLeaves}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-text-700"
          >
            <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-0 border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-500 uppercase tracking-wider">Pending Review</p>
            <p className="text-2xl font-bold text-warning mt-1">{pendingCount}</p>
            <p className="text-[11px] text-text-400 mt-0.5">Awaiting HOD decision</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center text-warning relative">
            <Clock size={20} />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-warning rounded-full animate-ping"></span>
            )}
          </div>
        </div>

        <div className="bg-surface-0 border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-500 uppercase tracking-wider">Total Received</p>
            <p className="text-2xl font-bold text-text-900 mt-1">{totalCount}</p>
            <p className="text-[11px] text-text-400 mt-0.5">
              {studentLeavesCount} Students &bull; {teacherLeavesCount} Faculty
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface-50 border border-border flex items-center justify-center text-ink-900">
            <CalendarDays size={20} />
          </div>
        </div>

        <div className="bg-surface-0 border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-500 uppercase tracking-wider">Approved</p>
            <p className="text-2xl font-bold text-success mt-1">{approvedCount}</p>
            <p className="text-[11px] text-text-400 mt-0.5">Granted leaves</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center text-success">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-surface-0 border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-500 uppercase tracking-wider">Rejected</p>
            <p className="text-2xl font-bold text-danger mt-1">{rejectedCount}</p>
            <p className="text-[11px] text-text-400 mt-0.5">Declined requests</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center text-danger">
            <XCircle size={20} />
          </div>
        </div>
      </div>

      {/* Main Filter & Table Card */}
      <div className="bg-surface-0 border border-border rounded-xl shadow-sm overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 border-b border-border bg-surface-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'ALL', label: 'All', count: totalCount },
              { id: 'PENDING', label: 'Pending', count: pendingCount },
              { id: 'APPROVED', label: 'Approved', count: approvedCount },
              { id: 'REJECTED', label: 'Rejected', count: rejectedCount }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-ink-900 text-white shadow-sm'
                    : 'text-text-500 hover:text-text-900 hover:bg-surface-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-surface-200 text-text-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Role Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-md border border-border bg-surface-0 px-3 py-1.5 text-xs text-text-900 focus:outline-none focus:ring-1 focus:ring-ink-700"
            >
              <option value="ALL">All Requesters</option>
              <option value="STUDENT">Students Only</option>
              <option value="TEACHER">Faculty Only</option>
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, ID, reason..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-border bg-surface-0 text-text-900 focus:outline-none focus:ring-1 focus:ring-ink-700 w-48 sm:w-60"
              />
            </div>
          </div>
        </div>

        {/* Requests Table */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-border border-t-ink-900"></div>
            <p className="text-sm text-text-500 mt-3">Loading department leave requests...</p>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={
                statusFilter === 'ALL' && roleFilter === 'ALL' && !searchQuery
                  ? 'No leave requests received yet'
                  : 'No matching leave requests found'
              }
              description={
                statusFilter === 'ALL' && roleFilter === 'ALL' && !searchQuery
                  ? 'When students or teachers submit leave requests, they will appear here for review.'
                  : 'Try adjusting your filter tabs or search keywords to view other records.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-50 text-text-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Applicant</th>
                  <th className="py-3 px-4">Period & Duration</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Submitted On</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Resolution</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLeaves.map((req) => {
                  const isStudent = Boolean(req.studentId);
                  const applicant = isStudent ? req.student : req.teacher;
                  const days = calculateDays(req.fromDate, req.toDate);
                  const isPending = req.status === 'PENDING';

                  return (
                    <tr key={req.id} className="hover:bg-surface-50/70 transition-colors">
                      {/* Applicant */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isStudent 
                              ? 'bg-[#2B4C7E]/10 text-[#2B4C7E] border border-[#2B4C7E]/30'
                              : 'bg-[#C98A3E]/10 text-[#C98A3E] border border-[#C98A3E]/30'
                          }`}>
                            {applicant?.name?.charAt(0) || (isStudent ? 'S' : 'F')}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-text-900">{applicant?.name || 'Unknown'}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold tracking-wide uppercase ${
                                isStudent
                                  ? 'bg-[#2B4C7E]/10 text-[#2B4C7E]'
                                  : 'bg-[#C98A3E]/10 text-[#C98A3E]'
                              }`}>
                                {isStudent ? 'Student' : 'Faculty'}
                              </span>
                            </div>
                            <p className="text-xs text-text-500 font-mono mt-0.5">
                              {applicant?.instituteId || '-'}
                              {isStudent && applicant?.rollNumber && (
                                <span className="ml-1 text-text-400 font-sans font-normal">
                                  &bull; Roll {applicant.rollNumber}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Period & Duration */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 font-medium text-text-900 text-xs">
                            <Calendar size={14} className="text-text-400 shrink-0" />
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
                        <button
                          type="button"
                          onClick={() => setDetailLeave(req)}
                          className="text-left group"
                          title="Click to view full reason"
                        >
                          <p className="text-text-900 text-xs line-clamp-2 group-hover:text-ink-700 transition-colors">
                            {req.reason}
                          </p>
                          <span className="text-[11px] text-ink-700 underline underline-offset-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            View full details
                          </span>
                        </button>
                      </td>

                      {/* Submitted On */}
                      <td className="py-3.5 px-4 text-text-500 text-xs whitespace-nowrap">
                        {formatDateTimeDisplay(req.createdAt)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={req.status} />
                      </td>

                      {/* Resolution */}
                      <td className="py-3.5 px-4 text-xs">
                        {req.resolvedByDeptAdmin ? (
                          <div className="space-y-0.5">
                            <p className="font-medium text-text-900">
                              {req.resolvedByDeptAdmin.name}
                            </p>
                            <p className="text-text-500 text-[11px]">
                              {formatDateDisplay(req.resolvedAt)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-text-400 italic">Unresolved</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedLeave(req);
                                setDecisionAction('APPROVED');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-success hover:bg-success/10 border border-success/30 rounded-md transition-colors"
                              title="Approve this leave request"
                            >
                              <Check size={14} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedLeave(req);
                                setDecisionAction('REJECTED');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10 border border-danger/30 rounded-md transition-colors"
                              title="Reject this leave request"
                            >
                              <X size={14} />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end">
                            <button
                              onClick={() => {
                                setSelectedLeave(req);
                                setDecisionAction(req.status === 'APPROVED' ? 'REJECTED' : 'APPROVED');
                              }}
                              className="text-xs text-text-500 hover:text-ink-700 underline underline-offset-2 transition-colors"
                            >
                              Change to {req.status === 'APPROVED' ? 'Reject' : 'Approve'}
                            </button>
                          </div>
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

      {/* Confirmation Modal for Decision (Approve / Reject) */}
      <Modal
        isOpen={Boolean(selectedLeave && decisionAction)}
        onClose={() => {
          if (!isSubmitting) {
            setSelectedLeave(null);
            setDecisionAction(null);
          }
        }}
        title={`${decisionAction === 'APPROVED' ? 'Approve' : 'Reject'} Leave Request`}
        maxWidth="max-w-md"
      >
        {selectedLeave && (
          <div className="space-y-4">
            <p className="text-sm text-text-600">
              Are you sure you want to <strong>{decisionAction?.toLowerCase()}</strong> this leave application?
            </p>

            {/* Applicant Summary */}
            <div className="bg-surface-50 border border-border rounded-lg p-3 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-text-500">Applicant:</span>
                <span className="font-semibold text-text-900">
                  {selectedLeave.student?.name || selectedLeave.teacher?.name} ({selectedLeave.studentId ? 'Student' : 'Faculty'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-500">Institute ID:</span>
                <span className="font-mono text-text-900">
                  {selectedLeave.student?.instituteId || selectedLeave.teacher?.instituteId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-500">Leave Period:</span>
                <span className="text-text-900 font-medium">
                  {formatDateDisplay(selectedLeave.fromDate)} &rarr; {formatDateDisplay(selectedLeave.toDate)} ({calculateDays(selectedLeave.fromDate, selectedLeave.toDate)} days)
                </span>
              </div>
              <div>
                <span className="text-text-500 block mb-1">Reason:</span>
                <p className="p-2 bg-surface-0 rounded border border-border text-text-800 italic">
                  "{selectedLeave.reason}"
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedLeave(null);
                  setDecisionAction(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleResolve}
                disabled={isSubmitting}
                className={
                  decisionAction === 'APPROVED'
                    ? 'bg-success hover:bg-success/90 text-white min-w-[100px]'
                    : 'bg-danger hover:bg-danger/90 text-white min-w-[100px]'
                }
              >
                {isSubmitting ? 'Processing...' : `Confirm ${decisionAction === 'APPROVED' ? 'Approval' : 'Rejection'}`}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* View Full Reason Modal */}
      <Modal
        isOpen={Boolean(detailLeave)}
        onClose={() => setDetailLeave(null)}
        title="Leave Request Details"
        maxWidth="max-w-lg"
      >
        {detailLeave && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <p className="font-bold text-text-900">
                  {detailLeave.student?.name || detailLeave.teacher?.name}
                </p>
                <p className="text-xs text-text-500 font-mono">
                  {detailLeave.student?.instituteId || detailLeave.teacher?.instituteId} &bull;{' '}
                  {detailLeave.studentId ? 'Student' : 'Faculty'}
                </p>
              </div>
              <StatusBadge status={detailLeave.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-surface-50 rounded-lg border border-border">
                <span className="text-text-500 block">From Date</span>
                <span className="font-semibold text-text-900 text-sm mt-0.5 block">
                  {formatDateDisplay(detailLeave.fromDate)}
                </span>
              </div>
              <div className="p-2.5 bg-surface-50 rounded-lg border border-border">
                <span className="text-text-500 block">To Date</span>
                <span className="font-semibold text-text-900 text-sm mt-0.5 block">
                  {formatDateDisplay(detailLeave.toDate)}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-text-500 uppercase tracking-wider">
                Full Reason Stated:
              </span>
              <div className="p-3 bg-surface-50 border border-border rounded-lg text-text-900 whitespace-pre-wrap leading-relaxed">
                {detailLeave.reason}
              </div>
            </div>

            {detailLeave.resolvedByDeptAdmin && (
              <div className="text-xs p-3 bg-info/10 text-info border border-info/20 rounded-lg">
                <p className="font-semibold">Review Decision Record</p>
                <p className="mt-0.5">
                  Decided by {detailLeave.resolvedByDeptAdmin.name} on{' '}
                  {formatDateTimeDisplay(detailLeave.resolvedAt)}.
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setDetailLeave(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
