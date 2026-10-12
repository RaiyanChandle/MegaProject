import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { useSearch } from '../../context/SearchContext';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Users, 
  Layers, 
  Info, 
  Building2,
  Check,
  ChevronRight,
  ArrowRight,
  GraduationCap,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StudentElectives() {
  const { searchQuery } = useSearch();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Confirm modal state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    slot: null,
    option: null
  });

  const fetchElectiveSlots = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/electives/my-slots');
      setData(response);
    } catch (err) {
      console.error('Failed to load elective slots:', err);
      setError(err.message || 'Failed to load elective options');
      toast.error(err.message || 'Failed to load elective options');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchElectiveSlots();
  }, []);

  // Handle stage 1: Save as PENDING (Draft)
  const handleChoose = async (slotId, subjectId) => {
    setActionLoading(true);
    try {
      const res = await apiClient.post('/electives/choose', { slotId, subjectId });
      toast.success(res.message || 'Choice saved as pending. Please confirm to secure your seat.');
      await fetchElectiveSlots();
    } catch (err) {
      console.error('Choose elective failed:', err);
      toast.error(err.message || 'Failed to record choice');
    } finally {
      setActionLoading(false);
    }
  };

  // Open confirmation modal for stage 2: CONFIRMED + Enrollment
  const promptConfirmChoice = (slot, option) => {
    setConfirmDialog({
      isOpen: true,
      slot,
      option
    });
  };

  // Execute confirm in transactional endpoint
  const executeConfirmChoice = async () => {
    const { slot, option } = confirmDialog;
    if (!slot || !option) return;

    setActionLoading(true);
    try {
      const res = await apiClient.post('/electives/confirm', { 
        slotId: slot.id, 
        subjectId: option.subjectId 
      });
      toast.success(res.message || 'Elective choice confirmed and enrolled!');
      await fetchElectiveSlots();
    } catch (err) {
      console.error('Confirm elective failed:', err);
      toast.error(err.message || 'Failed to confirm elective');
    } finally {
      setActionLoading(false);
      setConfirmDialog({ isOpen: false, slot: null, option: null });
    }
  };

  const { classInfo, slots = [], message } = data || {};

  // Summary Metrics
  const confirmedCount = useMemo(() => {
    return slots.filter(s => s.studentChoice?.status === 'CONFIRMED').length;
  }, [slots]);

  const pendingCount = useMemo(() => {
    return slots.filter(s => s.studentChoice?.status === 'PENDING').length;
  }, [slots]);

  const openWindowsCount = useMemo(() => {
    return slots.filter(s => s.windowStatus === 'OPEN' || s.isWindowOpen).length;
  }, [slots]);

  // Filter slots and options based on universal search
  const filteredSlots = useMemo(() => {
    if (!searchQuery.trim()) return slots;
    const q = searchQuery.toLowerCase();

    return slots.map(slot => {
      const matchesSlotName = slot.slotName?.toLowerCase().includes(q);
      const matchingOptions = (slot.options || []).filter(opt => 
        opt.subjectCode?.toLowerCase().includes(q) ||
        opt.subjectName?.toLowerCase().includes(q) ||
        opt.offeredByDepartmentName?.toLowerCase().includes(q)
      );

      if (matchesSlotName || matchingOptions.length > 0) {
        return {
          ...slot,
          options: matchesSlotName ? slot.options : matchingOptions
        };
      }
      return null;
    }).filter(Boolean);
  }, [slots, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 max-w-7xl pb-12">
        <div className="h-24 bg-surface-0 animate-pulse rounded-xl border border-border" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-surface-0 animate-pulse rounded-xl border border-border" />
          ))}
        </div>
        <div className="h-64 bg-surface-0 animate-pulse rounded-xl border border-border" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl border border-danger/30 bg-danger/5 max-w-2xl my-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-danger mt-0.5 shrink-0" size={20} />
          <div>
            <h3 className="text-sm font-bold text-danger">Unable to Load Electives</h3>
            <p className="text-xs text-text-600 mt-1">{error}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchElectiveSlots}
              className="mt-3 text-xs"
            >
              <RefreshCw size={12} className="mr-1" /> Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl pb-12">
      {/* Mobile-Optimized Header */}
      <div className="bg-surface-0 border border-border rounded-xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-ink-900 text-white flex items-center justify-center shrink-0 shadow-xs border border-ink-700">
              <Layers size={22} className="text-brass-500" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-bold text-text-900 tracking-tight truncate">
                  Elective Registration
                </h1>
                {classInfo && (
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-50 border border-border text-ink-900 font-semibold">
                    Sem {classInfo.semesterNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-500 mt-0.5">
                Select your departmental and open elective courses for this term
              </p>
            </div>
          </div>

          {/* Quick Academic Navigation */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
            <Link
              to="/student/subjects"
              className="text-center justify-center px-3 py-2 rounded-lg border border-border bg-surface-50 hover:bg-surface-100 text-text-900 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-xs"
            >
              <BookOpen size={13} className="text-ink-900 shrink-0" />
              <span>My Subjects</span>
            </Link>
            <Link
              to="/student/attendance"
              className="text-center justify-center px-3 py-2 rounded-lg bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-xs"
            >
              <Clock size={13} className="shrink-0" />
              <span>Attendance</span>
            </Link>
          </div>
        </div>

        {/* Academic Details Pill on Mobile */}
        {classInfo && (
          <div className="mt-3.5 pt-3 border-t border-border/60 flex flex-wrap items-center gap-2 text-xs text-text-500 font-mono">
            <span className="inline-flex items-center gap-1 text-text-700 font-medium">
              <Building2 size={13} className="text-ink-900" />
              {classInfo.name}
            </span>
            <span>•</span>
            <span>Batch {classInfo.batchYear}</span>
            <span>•</span>
            <span>Semester {classInfo.semesterNumber}</span>
          </div>
        )}
      </div>

      {/* KPI Summary Cards (2x2 on mobile, 4 in a row on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Slots */}
        <div className="bg-surface-0 border border-border rounded-xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-text-500 font-medium uppercase tracking-wide">
              Total Slots
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-ink-900/10 text-ink-900">
              <Layers size={15} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-text-900">
              {slots.length}
            </div>
            <span className="text-[10px] sm:text-[11px] text-text-500 block truncate">
              Offered in semester
            </span>
          </div>
        </div>

        {/* Confirmed Electives */}
        <div className="bg-surface-0 border border-border rounded-xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-text-500 font-medium uppercase tracking-wide">
              Enrolled
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700">
              {confirmedCount}
            </div>
            <span className="text-[10px] sm:text-[11px] text-text-500 block truncate">
              {confirmedCount === slots.length && slots.length > 0 ? 'All seats secured' : `${slots.length - confirmedCount} remaining`}
            </span>
          </div>
        </div>

        {/* Pending Draft Choices */}
        <div className="bg-surface-0 border border-border rounded-xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-text-500 font-medium uppercase tracking-wide">
              Pending
            </span>
            <div className={`p-1.5 sm:p-2 rounded-lg ${pendingCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-surface-100 text-text-500'}`}>
              <Clock size={15} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className={`text-xl sm:text-2xl font-bold font-mono ${pendingCount > 0 ? 'text-amber-800' : 'text-text-900'}`}>
              {pendingCount}
            </div>
            <span className="text-[10px] sm:text-[11px] text-text-500 block truncate">
              {pendingCount > 0 ? 'Needs confirmation' : 'Zero draft picks'}
            </span>
          </div>
        </div>

        {/* Active Windows */}
        <div className="bg-surface-0 border border-border rounded-xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs text-text-500 font-medium uppercase tracking-wide">
              Window Status
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg bg-surface-100 text-text-700">
              <Calendar size={15} />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-text-900">
              {openWindowsCount} <span className="text-xs font-normal text-text-500">Open</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-text-500 block truncate">
              {openWindowsCount > 0 ? 'Registration active' : 'Windows closed'}
            </span>
          </div>
        </div>
      </div>

      {/* Info Message if no slots */}
      {message && slots.length === 0 && (
        <div className="p-4 rounded-xl border border-warning/20 bg-warning/5 text-xs sm:text-sm text-warning flex items-start gap-3">
          <Info size={16} className="shrink-0 mt-0.5" />
          <div>{message}</div>
        </div>
      )}

      {slots.length === 0 ? (
        <div className="bg-surface-0 border border-border rounded-xl p-10 text-center text-xs text-text-500">
          <Layers size={28} className="mx-auto mb-2 text-text-400" />
          <p className="font-bold text-sm text-text-900">No Elective Slots Available</p>
          <p className="text-text-400 mt-1 max-w-sm mx-auto">
            Your current semester curriculum does not have any active elective slots configured at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {filteredSlots.map((slot) => {
            const hasChoice = Boolean(slot.studentChoice);
            const choice = slot.studentChoice;
            const isWindowOpen = slot.isWindowOpen;
            const windowStatus = slot.windowStatus;
            const isLocked = choice?.status === 'LOCKED';
            const isConfirmed = choice?.status === 'CONFIRMED';
            const isPending = choice?.status === 'PENDING';

            return (
              <div 
                key={slot.id} 
                className="rounded-xl border border-border bg-surface-0 overflow-hidden shadow-xs"
              >
                {/* Slot Card Header */}
                <div className="p-4 sm:p-5 border-b border-border bg-surface-50/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-ink-900 text-white uppercase">
                          {slot.slotType === 'PROGRAM_ELECTIVE' ? 'PE' : 'OE'}
                        </span>
                        <h2 className="text-base sm:text-lg font-bold text-text-900">
                          {slot.slotName}
                        </h2>
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-0 border border-border text-text-700">
                          {slot.credits} Credits
                        </span>
                      </div>
                      <p className="text-xs text-text-500">
                        {slot.slotType === 'PROGRAM_ELECTIVE' 
                          ? 'Departmental Program Elective course.'
                          : 'Open Elective course across departments.'}
                      </p>
                    </div>

                    {/* Window Status Pill */}
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                      {windowStatus === 'OPEN' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          Registration Open
                        </span>
                      )}
                      {windowStatus === 'UPCOMING' && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-surface-100 text-text-600 border border-border">
                          <Clock size={12} />
                          Opens Soon
                        </span>
                      )}
                      {windowStatus === 'CLOSED' && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-surface-100 text-text-500 border border-border">
                          <Lock size={12} />
                          Registration Closed
                        </span>
                      )}
                      {windowStatus === 'NOT_SCHEDULED' && (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-surface-100 text-text-600 border border-border">
                          Open
                        </span>
                      )}

                      {slot.registrationClosesAt && (
                        <span className="text-[11px] font-mono text-text-400">
                          Until {new Date(slot.registrationClosesAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Current Student Choice Banner (Full-width clean card) */}
                {hasChoice && (
                  <div className={`p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    isConfirmed 
                      ? 'bg-emerald-50/60' 
                      : isPending 
                        ? 'bg-amber-50/60' 
                        : 'bg-surface-50'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-full shrink-0 ${
                        isConfirmed
                          ? 'bg-emerald-100 text-emerald-800'
                          : isPending
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-surface-200 text-text-700'
                      }`}>
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <div className="text-[11px] text-text-500 font-medium">Selected Course</div>
                        <div className="font-bold text-text-900 text-sm">
                          {choice.chosenSubjectName}
                          <span className="text-text-500 font-mono text-xs ml-1.5 font-normal">
                            ({choice.chosenSubjectCode})
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isConfirmed
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : isPending
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-surface-100 text-text-700'
                      }`}>
                        {choice.status}
                      </span>

                      {/* Immediate confirm button if still pending */}
                      {isPending && isWindowOpen && !isLocked && (
                        <Button 
                          variant="primary" 
                          size="sm" 
                          className="h-8 text-xs px-3"
                          disabled={actionLoading}
                          onClick={() => {
                            const opt = slot.options?.find(o => o.subjectId === choice.chosenSubjectId);
                            if (opt) promptConfirmChoice(slot, opt);
                          }}
                        >
                          Confirm & Secure Seat
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Options List / Grid: Mobile Ergonomic Cards */}
                <div className="p-4 sm:p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-700">
                      Offered Subject Options ({slot.options?.length || 0})
                    </h3>
                    <span className="text-[11px] text-text-500 hidden sm:inline">
                      {isLocked 
                        ? 'Locked by administration' 
                        : isWindowOpen 
                          ? 'Select to confirm enrollment' 
                          : 'Window currently closed'}
                    </span>
                  </div>

                  {(!slot.options || slot.options.length === 0) ? (
                    <div className="py-8 text-center text-xs text-text-500 italic bg-surface-50 rounded-xl border border-border border-dashed">
                      No subject options have been published for this slot yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {slot.options.map((option) => {
                        const isChosen = option.isSelectedByStudent;
                        const optionConfirmed = isChosen && choice?.status === 'CONFIRMED';
                        const optionPending = isChosen && choice?.status === 'PENDING';
                        const isFull = option.isFull;
                        const hasCapacityLimit = option.maxCapacity !== null;
                        const capacityPct = hasCapacityLimit 
                          ? Math.min(100, Math.round((option.confirmedCount / option.maxCapacity) * 100))
                          : 0;

                        return (
                          <div
                            key={option.id}
                            className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                              optionConfirmed
                                ? 'border-emerald-600 bg-emerald-50/30 ring-1 ring-emerald-500/20 shadow-xs'
                                : optionPending
                                  ? 'border-amber-500 bg-amber-50/30 ring-1 ring-amber-500/20 shadow-xs'
                                  : 'border-border bg-surface-0 hover:border-ink-700/60'
                            }`}
                          >
                            <div className="space-y-2">
                              {/* Option Header */}
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-mono text-xs font-bold text-ink-900 bg-surface-50 border border-border px-2 py-0.5 rounded">
                                  {option.subjectCode}
                                </span>
                                
                                {optionConfirmed ? (
                                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 size={12} /> Confirmed
                                  </span>
                                ) : optionPending ? (
                                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800">
                                    <Clock size={12} /> Pending Confirm
                                  </span>
                                ) : isFull ? (
                                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold bg-danger/10 text-danger">
                                    Capacity Full
                                  </span>
                                ) : (
                                  <span className="font-mono text-xs text-text-500">
                                    {option.credits} cr
                                  </span>
                                )}
                              </div>

                              {/* Title & Department */}
                              <div>
                                <h4 className="text-sm sm:text-base font-bold text-text-900 leading-snug">
                                  {option.subjectName}
                                </h4>
                                {option.offeredByDepartmentName && (
                                  <p className="text-xs text-text-500 mt-1 flex items-center gap-1.5 truncate">
                                    <Building2 size={12} className="shrink-0 text-text-400" />
                                    <span className="truncate">{option.offeredByDepartmentName}</span>
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Capacity Bar & Counter */}
                            <div className="mt-3.5 pt-3 border-t border-border/80 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-text-500 flex items-center gap-1 text-[11px]">
                                  <Users size={12} className="text-text-400" />
                                  Available Seats:
                                </span>
                                
                                <span className={`font-mono text-xs font-semibold ${isFull && !isChosen ? 'text-danger' : 'text-text-900'}`}>
                                  {hasCapacityLimit ? (
                                    <span>
                                      <strong className={option.seatsRemaining <= 5 && !isFull ? 'text-amber-700' : ''}>
                                        {option.seatsRemaining}
                                      </strong>
                                      <span className="text-text-400"> / {option.maxCapacity}</span>
                                    </span>
                                  ) : (
                                    <span className="text-emerald-700 font-sans">Unlimited</span>
                                  )}
                                </span>
                              </div>

                              {/* Capacity Bar */}
                              {hasCapacityLimit && (
                                <div className="w-full bg-surface-100 rounded-full h-1.5 overflow-hidden border border-border/40">
                                  <div 
                                    className={`h-full transition-all duration-300 rounded-full ${
                                      isFull 
                                        ? 'bg-danger' 
                                        : capacityPct > 80 
                                          ? 'bg-amber-500' 
                                          : 'bg-emerald-600'
                                    }`}
                                    style={{ width: `${capacityPct}%` }}
                                  />
                                </div>
                              )}

                              {/* Action Buttons: Full Width Touch Targets on Mobile */}
                              <div className="pt-2">
                                {optionConfirmed ? (
                                  <div className="w-full text-center py-2 text-xs font-bold text-emerald-800 bg-emerald-100/60 rounded-lg border border-emerald-300 flex items-center justify-center gap-1.5">
                                    <Check size={14} /> Enrolled in this Course
                                  </div>
                                ) : isLocked ? (
                                  <div className="w-full text-center py-2 text-xs text-text-500 bg-surface-50 rounded-lg border border-border font-medium">
                                    Locked by Administration
                                  </div>
                                ) : !isWindowOpen ? (
                                  <div className="w-full text-center py-2 text-xs text-text-500 bg-surface-50 rounded-lg border border-border font-medium">
                                    Registration Closed
                                  </div>
                                ) : isFull && !isChosen ? (
                                  <div className="w-full text-center py-2 text-xs text-danger bg-danger/5 rounded-lg border border-danger/20 font-semibold">
                                    Course Full
                                  </div>
                                ) : optionPending ? (
                                  <Button
                                    variant="primary"
                                    className="w-full h-10 text-xs font-semibold shadow-xs"
                                    disabled={actionLoading}
                                    onClick={() => promptConfirmChoice(slot, option)}
                                  >
                                    Confirm Choice & Enroll
                                  </Button>
                                ) : (
                                  <div className="grid grid-cols-2 gap-2">
                                    <Button
                                      variant="secondary"
                                      className="h-10 text-xs font-semibold"
                                      disabled={actionLoading}
                                      onClick={() => handleChoose(slot.id, option.subjectId)}
                                    >
                                      Draft Pick
                                    </Button>
                                    <Button
                                      variant="primary"
                                      className="h-10 text-xs font-semibold shadow-xs"
                                      disabled={actionLoading}
                                      onClick={() => promptConfirmChoice(slot, option)}
                                    >
                                      Confirm
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, slot: null, option: null })}
        onConfirm={executeConfirmChoice}
        title="Confirm Elective Registration"
        confirmText="Confirm & Enroll"
        cancelText="Cancel"
        message={`Are you sure you want to confirm "${confirmDialog.option?.subjectName} (${confirmDialog.option?.subjectCode})" for ${confirmDialog.slot?.slotName}? This will atomically reserve 1 seat and enroll you in this subject for the current academic term.`}
      />
    </div>
  );
}
