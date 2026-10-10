import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
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
  ArrowRight,
  Building2,
  Sparkles
} from 'lucide-react';

export default function StudentElectives() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl">
        <div className="h-8 bg-surface-50 animate-pulse rounded-md w-64 border border-border" />
        <div className="h-24 bg-surface-0 animate-pulse rounded-md border border-border" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-surface-0 animate-pulse rounded-md border border-border" />
          <div className="h-64 bg-surface-0 animate-pulse rounded-md border border-border" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-md border border-danger/20 bg-danger/5 max-w-3xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-danger mt-0.5 shrink-0" size={20} />
          <div>
            <h3 className="text-sm font-semibold text-danger">Error Loading Electives</h3>
            <p className="text-sm text-text-500 mt-1">{error}</p>
            <button
              onClick={fetchElectiveSlots}
              className="mt-3 text-sm font-medium text-ink-900 underline hover:text-ink-700"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { classInfo, slots = [], message } = data || {};

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-text-900 flex items-center gap-2.5">
            <Layers className="text-brass-500" size={28} />
            Elective Subject Registration
          </h1>
          <p className="text-sm text-text-500 mt-1">
            Browse available Program and Open Electives, monitor remaining seat quotas, and track registration deadlines.
          </p>
        </div>

        {classInfo && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-0 border border-border text-xs text-text-500 font-mono">
            <Building2 size={14} className="text-text-500" />
            <span className="font-semibold text-text-900">{classInfo.name}</span>
            <span>•</span>
            <span>Batch {classInfo.batchYear}</span>
            <span>•</span>
            <span>Sem {classInfo.semesterNumber}</span>
          </div>
        )}
      </div>

      {/* Info / Class Alert if no slots or no class */}
      {message && slots.length === 0 && (
        <div className="p-4 rounded-md border border-warning/20 bg-warning/5 text-sm text-warning flex items-start gap-3">
          <Info size={18} className="shrink-0 mt-0.5" />
          <div>{message}</div>
        </div>
      )}

      {slots.length === 0 ? (
        <EmptyState
          title="No Elective Slots Available"
          description="Your current semester curriculum does not have any active elective slots configured at this time. When your department opens elective registration, available slots will appear here."
        />
      ) : (
        <div className="space-y-6">
          {slots.map((slot) => {
            const hasChoice = Boolean(slot.studentChoice);
            const choice = slot.studentChoice;
            const isWindowOpen = slot.isWindowOpen;
            const windowStatus = slot.windowStatus;

            return (
              <div 
                key={slot.id} 
                className="rounded-md border border-border bg-surface-0 overflow-hidden shadow-none transition-shadow"
              >
                {/* Slot Card Header */}
                <div className="p-5 border-b border-border bg-surface-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-xl font-semibold text-text-900">{slot.slotName}</h2>
                      <StatusBadge status={slot.slotType} />
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-surface-0 border border-border text-text-500">
                        {slot.credits} Credits
                      </span>
                    </div>

                    <p className="text-xs text-text-500">
                      {slot.slotType === 'PROGRAM_ELECTIVE' 
                        ? 'Departmental Program Elective: Specialized course offered within your discipline.'
                        : 'Open Elective: Interdisciplinary course offered across collaborating departments.'}
                    </p>
                  </div>

                  {/* Window Status Badge */}
                  <div className="flex flex-col md:items-end gap-1">
                    <div className="flex items-center gap-2">
                      {windowStatus === 'OPEN' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-success/10 text-success">
                          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                          Registration Open
                        </span>
                      )}
                      {windowStatus === 'UPCOMING' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-info/10 text-info">
                          <Clock size={12} />
                          Opens Soon
                        </span>
                      )}
                      {windowStatus === 'CLOSED' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-neutral/10 text-neutral">
                          <Lock size={12} />
                          Registration Closed
                        </span>
                      )}
                      {windowStatus === 'NOT_SCHEDULED' && (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-neutral/10 text-neutral">
                          Open
                        </span>
                      )}
                    </div>

                    {(slot.registrationOpensAt || slot.registrationClosesAt) && (
                      <div className="text-[11px] font-mono text-text-500 flex items-center gap-1">
                        <Calendar size={12} />
                        {slot.registrationOpensAt && (
                          <span>From {new Date(slot.registrationOpensAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                        {slot.registrationOpensAt && slot.registrationClosesAt && <span> • </span>}
                        {slot.registrationClosesAt && (
                          <span>Until {new Date(slot.registrationClosesAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Current Student Choice Banner (if already chosen) */}
                {hasChoice && (
                  <div className="px-5 py-3 bg-surface-50 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1 rounded-full bg-success/10 text-success">
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <span className="text-text-500 font-medium">Your Current Selection: </span>
                        <span className="font-semibold text-text-900">{choice.chosenSubjectName}</span>
                        <span className="text-text-500 font-mono ml-1.5">({choice.chosenSubjectCode})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-text-500 font-medium">Status:</span>
                      <StatusBadge status={choice.status} />
                      {choice.chosenAt && (
                        <span className="text-[11px] font-mono text-text-500">
                          {new Date(choice.chosenAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Options List / Grid */}
                <div className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-500">
                      Offered Subject Options ({slot.options?.length || 0})
                    </h3>
                    <span className="text-xs text-text-500">
                      {isWindowOpen ? 'Select an available subject below' : 'Window is currently not accepting changes'}
                    </span>
                  </div>

                  {(!slot.options || slot.options.length === 0) ? (
                    <div className="py-8 text-center text-sm text-text-500 italic bg-surface-50 rounded-md border border-border border-dashed">
                      No subject options have been published for this elective slot yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {slot.options.map((option) => {
                        const isChosen = option.isSelectedByStudent;
                        const isFull = option.isFull;
                        const hasCapacityLimit = option.maxCapacity !== null;
                        const capacityPct = hasCapacityLimit 
                          ? Math.min(100, Math.round((option.confirmedCount / option.maxCapacity) * 100))
                          : 0;

                        return (
                          <div
                            key={option.id}
                            className={`rounded-lg border p-4 flex flex-col justify-between transition-all duration-150 ${
                              isChosen
                                ? 'border-ink-900 bg-surface-50/80 shadow-sm ring-1 ring-ink-900'
                                : 'border-border bg-surface-0 hover:border-ink-700 hover:shadow-sm'
                            }`}
                          >
                            <div className="space-y-2.5">
                              {/* Subject Code & Status */}
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-mono text-xs font-medium text-ink-900 bg-ink-900/5 px-2 py-0.5 rounded">
                                  {option.subjectCode}
                                </span>
                                
                                {isChosen ? (
                                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-ink-900 text-white">
                                    <CheckCircle2 size={12} />
                                    Selected
                                  </span>
                                ) : isFull ? (
                                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-danger/10 text-danger">
                                    Full
                                  </span>
                                ) : (
                                  <span className="font-mono text-xs text-text-500">
                                    {option.credits} cr
                                  </span>
                                )}
                              </div>

                              {/* Subject Title */}
                              <div>
                                <h4 className="text-base font-semibold text-text-900 leading-snug">
                                  {option.subjectName}
                                </h4>
                                {option.offeredByDepartmentName && (
                                  <p className="text-xs text-text-500 mt-1 flex items-center gap-1.5">
                                    <Building2 size={12} className="shrink-0" />
                                    <span className="truncate">{option.offeredByDepartmentName}</span>
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Capacity & Quota Section */}
                            <div className="mt-4 pt-3 border-t border-border space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-text-500 flex items-center gap-1">
                                  <Users size={12} />
                                  Available Seats:
                                </span>
                                
                                <span className={`font-mono font-medium ${isFull ? 'text-danger' : 'text-text-900'}`}>
                                  {hasCapacityLimit ? (
                                    <span>
                                      <strong className={option.seatsRemaining <= 5 && !isFull ? 'text-warning' : ''}>
                                        {option.seatsRemaining}
                                      </strong>
                                      <span className="text-text-500"> / {option.maxCapacity}</span>
                                    </span>
                                  ) : (
                                    <span className="text-success font-sans">Unlimited</span>
                                  )}
                                </span>
                              </div>

                              {/* Capacity Bar if capped */}
                              {hasCapacityLimit && (
                                <div className="w-full bg-surface-50 rounded-full h-1.5 overflow-hidden border border-border">
                                  <div 
                                    className={`h-full transition-all duration-300 rounded-full ${
                                      isFull 
                                        ? 'bg-danger' 
                                        : capacityPct > 80 
                                          ? 'bg-warning' 
                                          : 'bg-success'
                                    }`}
                                    style={{ width: `${capacityPct}%` }}
                                  />
                                </div>
                              )}

                              {/* Selection Guidance Message */}
                              <div className="pt-1 flex items-center justify-between text-[11px] text-text-500">
                                {isChosen ? (
                                  <span className="text-ink-700 font-medium flex items-center gap-1">
                                    <Sparkles size={12} /> Your recorded choice
                                  </span>
                                ) : isFull ? (
                                  <span className="text-danger">No seats remaining</span>
                                ) : !isWindowOpen ? (
                                  <span className="text-neutral">Window not active</span>
                                ) : (
                                  <span className="text-text-500">Ready for selection</span>
                                )}

                                {hasCapacityLimit && (
                                  <span className="font-mono text-text-500">
                                    {option.confirmedCount} confirmed
                                  </span>
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
    </div>
  );
}
