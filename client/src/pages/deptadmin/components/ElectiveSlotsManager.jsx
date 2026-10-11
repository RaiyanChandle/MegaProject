import { useState, useEffect } from 'react';
import { apiClient } from '../../../api/client';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Field from '../../../components/ui/Field';
import StatusBadge from '../../../components/ui/StatusBadge';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { toast } from '../../../components/ui/Toast';
import { Plus, Edit2, Trash2, Settings, X, Lock, Users, ArrowLeftRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ElectiveSlotsManager({ classId }) {
  const [slots, setSlots] = useState([]);
  const [globalElectives, setGlobalElectives] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Choices & Swap state (T9.5)
  const [isChoicesModalOpen, setIsChoicesModalOpen] = useState(false);
  const [slotChoicesData, setSlotChoicesData] = useState({ slot: null, choices: [] });
  const [isLoadingChoices, setIsLoadingChoices] = useState(false);

  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [selectedChoiceForSwap, setSelectedChoiceForSwap] = useState(null);
  const [swapFormData, setSwapFormData] = useState({ newSubjectId: '', reason: '', overrideCapacity: false });
  const [isSwapping, setIsSwapping] = useState(false);

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotFormData, setSlotFormData] = useState({ 
    slotName: '', 
    slotType: 'PROGRAM_ELECTIVE', 
    credits: 3,
    registrationOpensAt: '',
    registrationClosesAt: ''
  });

  const [optionFormData, setOptionFormData] = useState({ subjectId: '', maxCapacity: '' });

  const fetchSlots = async () => {
    try {
      const data = await apiClient.get(`/electives/slots?classId=${classId}`);
      setSlots(data);
    } catch (error) {
      toast.error('Failed to load elective slots');
    }
  };

  const fetchGlobalElectives = async () => {
    try {
      const data = await apiClient.get('/subjects/global-electives');
      setGlobalElectives(data);
    } catch (error) {
      toast.error('Failed to load global electives');
    }
  };

  useEffect(() => {
    if (classId) {
      fetchSlots();
      fetchGlobalElectives();
    }
  }, [classId]);

  const handleLockClosedSlots = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.post('/electives/lock-closed');
      toast.success(res.message);
      fetchSlots();
    } catch (error) {
      toast.error(error.message || 'Failed to lock expired slots');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Choices & Swap Handlers (T9.5) ---
  const openChoicesModal = async (slot) => {
    setSelectedSlot(slot);
    setIsLoadingChoices(true);
    setIsChoicesModalOpen(true);
    try {
      const data = await apiClient.get(`/electives/slots/${slot.id}/choices`);
      setSlotChoicesData(data);
    } catch (error) {
      toast.error('Failed to load student elective choices');
    } finally {
      setIsLoadingChoices(false);
    }
  };

  const openSwapModal = (choice) => {
    setSelectedChoiceForSwap(choice);
    setSwapFormData({ newSubjectId: '', reason: '', overrideCapacity: false });
    setIsSwapModalOpen(true);
  };

  const handleSwapSubmit = async (e) => {
    e.preventDefault();
    if (!swapFormData.newSubjectId) {
      toast.error('Please select a new subject');
      return;
    }
    setIsSwapping(true);
    try {
      const res = await apiClient.post('/electives/swap', {
        studentId: selectedChoiceForSwap.studentId,
        slotId: selectedSlot.id,
        newSubjectId: swapFormData.newSubjectId,
        overrideCapacity: swapFormData.overrideCapacity,
        reason: swapFormData.reason
      });
      toast.success(res.message || 'Elective swapped successfully');
      setIsSwapModalOpen(false);
      // Refresh choices and slot capacities
      const updatedChoices = await apiClient.get(`/electives/slots/${selectedSlot.id}/choices`);
      setSlotChoicesData(updatedChoices);
      fetchSlots();
    } catch (error) {
      toast.error(error.message || 'Swap failed');
    } finally {
      setIsSwapping(false);
    }
  };

  // --- Slot Handlers ---
  const openSlotModal = (slot = null) => {
    setSelectedSlot(slot);
    if (slot) {
      setSlotFormData({ 
        slotName: slot.slotName, 
        slotType: slot.slotType, 
        credits: slot.credits,
        registrationOpensAt: slot.registrationOpensAt ? new Date(slot.registrationOpensAt).toISOString().slice(0, 16) : '',
        registrationClosesAt: slot.registrationClosesAt ? new Date(slot.registrationClosesAt).toISOString().slice(0, 16) : ''
      });
    } else {
      setSlotFormData({ 
        slotName: '', 
        slotType: 'PROGRAM_ELECTIVE', 
        credits: 3,
        registrationOpensAt: '',
        registrationClosesAt: ''
      });
    }
    setIsSlotModalOpen(true);
  };

  const handleSlotSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (selectedSlot) {
        await apiClient.put(`/electives/slots/${selectedSlot.id}`, slotFormData);
        toast.success('Slot updated successfully');
      } else {
        await apiClient.post('/electives/slots', { classId, ...slotFormData });
        toast.success('Slot created successfully');
      }
      setIsSlotModalOpen(false);
      fetchSlots();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSlotDelete = async () => {
    try {
      await apiClient.delete(`/electives/slots/${selectedSlot.id}`);
      toast.success('Slot deleted successfully');
      fetchSlots();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // --- Option Handlers ---
  const openOptionModal = (slot) => {
    setSelectedSlot(slot);
    setOptionFormData({ subjectId: '', maxCapacity: '' });
    setIsOptionModalOpen(true);
  };

  const handleOptionSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiClient.post('/electives/options', {
        slotId: selectedSlot.id,
        subjectId: optionFormData.subjectId,
        maxCapacity: optionFormData.maxCapacity ? parseInt(optionFormData.maxCapacity) : null
      });
      toast.success('Option added successfully');
      setIsOptionModalOpen(false);
      fetchSlots();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveOption = async (optionId) => {
    try {
      await apiClient.delete(`/electives/options/${optionId}`);
      toast.success('Option removed');
      fetchSlots();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="bg-surface-0 border border-border rounded-xl p-6 h-fit mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-900">Elective Slots</h3>
          <p className="text-sm text-text-500 mt-1">Configure PE/OE slots and attach subjects to them.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleLockClosedSlots} size="sm" disabled={isLoading} title="Lock choices in closed slots">
            <Lock size={15} />
            Lock Expired Slots
          </Button>
          <Button onClick={() => openSlotModal()} size="sm">
            <Plus size={16} />
            New Slot
          </Button>
        </div>
      </div>

      {slots.length === 0 ? (
        <div className="text-sm text-text-500 italic py-4">No elective slots created for this class.</div>
      ) : (
        <div className="space-y-4">
          {slots.map(slot => (
            <div key={slot.id} className="border border-border rounded-lg p-4 bg-surface-50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-text-900">{slot.slotName}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={slot.slotType} />
                    <span className="text-xs text-text-500">Credits: {slot.credits}</span>
                    {slot.registrationOpensAt || slot.registrationClosesAt ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-surface-0 border border-border text-text-500 font-mono">
                        Window: {slot.registrationOpensAt ? new Date(slot.registrationOpensAt).toLocaleDateString() : 'Now'} 
                        {' → '} 
                        {slot.registrationClosesAt ? new Date(slot.registrationClosesAt).toLocaleDateString() : 'Open'}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => openChoicesModal(slot)} 
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-surface-0 border border-border text-text-700 hover:text-ink-900 hover:border-ink-500 rounded-md transition-colors shadow-2xs"
                    title="View student choices and manage administrative swaps"
                  >
                    <Users size={14} className="text-ink-600" />
                    Choices & Swaps
                  </button>
                  <button onClick={() => openSlotModal(slot)} className="text-text-500 hover:text-ink-700" title="Edit Slot">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => { setSelectedSlot(slot); setIsConfirmOpen(true); }} className="text-text-500 hover:text-danger" title="Delete Slot">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="bg-surface-0 rounded-md p-3 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-text-500 uppercase tracking-wider">Options</span>
                  <button
                    onClick={() => openOptionModal(slot)}
                    className="text-xs font-medium text-ink-700 hover:text-ink-900 flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Option
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {slot.options?.length === 0 && (
                    <span className="text-xs text-text-500 italic">No options attached yet.</span>
                  )}
                  {slot.options?.map(opt => (
                    <div key={opt.id} className="flex items-center justify-between bg-surface-50 border border-border rounded-md px-3 py-2 text-sm">
                      <div className="flex flex-col">
                        <span className="font-semibold text-text-900">
                          {opt.subject?.code}: {opt.subject?.name}
                        </span>
                        <span className="text-xs text-text-500 mt-0.5">
                          Offered by: {opt.offeredByDepartment?.name} | Capacity: {opt.maxCapacity || 'Unlimited'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveOption(opt.id)}
                        className="p-1.5 text-text-400 hover:text-danger hover:bg-danger/10 rounded-md transition-colors"
                        title="Remove Option"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SLOT MODAL */}
      <Modal isOpen={isSlotModalOpen} onClose={() => setIsSlotModalOpen(false)} title={selectedSlot ? 'Edit Slot' : 'Create New Slot'}>
        <form onSubmit={handleSlotSubmit} className="space-y-4">
          <Field label="Slot Name">
            <input
              type="text"
              value={slotFormData.slotName}
              onChange={(e) => setSlotFormData({ ...slotFormData, slotName: e.target.value })}
              placeholder="e.g. PE-1 or OE-2"
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Slot Type">
              <select
                value={slotFormData.slotType}
                onChange={(e) => setSlotFormData({ ...slotFormData, slotType: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface-0"
              >
                <option value="PROGRAM_ELECTIVE">Program Elective</option>
                <option value="OPEN_ELECTIVE">Open Elective</option>
              </select>
            </Field>
            <Field label="Credits">
              <input
                type="number"
                step="0.5"
                min="1"
                value={slotFormData.credits}
                onChange={(e) => setSlotFormData({ ...slotFormData, credits: parseFloat(e.target.value) })}
                required
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Registration Opens At (Optional)">
              <input
                type="datetime-local"
                value={slotFormData.registrationOpensAt}
                onChange={(e) => setSlotFormData({ ...slotFormData, registrationOpensAt: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface-0"
              />
            </Field>
            <Field label="Registration Closes At (Optional)">
              <input
                type="datetime-local"
                value={slotFormData.registrationClosesAt}
                onChange={(e) => setSlotFormData({ ...slotFormData, registrationClosesAt: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface-0"
              />
            </Field>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsSlotModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      {/* OPTION MODAL */}
      <Modal isOpen={isOptionModalOpen} onClose={() => setIsOptionModalOpen(false)} title="Add Elective Option">
        <form onSubmit={handleOptionSubmit} className="space-y-4">
          <p className="text-sm text-text-500 mb-2">
            Adding option to <span className="font-semibold text-text-900">{selectedSlot?.slotName}</span>
          </p>
          <Field label="Subject">
            <select
              value={optionFormData.subjectId}
              onChange={(e) => setOptionFormData({ ...optionFormData, subjectId: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface-0"
              required
            >
              <option value="">-- Select Subject --</option>
              {globalElectives
                .filter(s => s.subjectType === selectedSlot?.slotType)
                .filter(s => selectedSlot?.slotType === 'PROGRAM_ELECTIVE' ? s.classId === classId : true)
                .map(sub => {
                  const isAlreadyAdded = selectedSlot?.options?.some(opt => opt.subjectId === sub.id);
                  const isCreditMismatch = Number(sub.credits) !== Number(selectedSlot?.credits);
                  const isDisabled = isAlreadyAdded || isCreditMismatch;

                  let note = '';
                  if (isAlreadyAdded) note = ' [Already added to slot]';
                  else if (isCreditMismatch) note = ` [Incompatible: ${sub.credits} cr, slot needs ${selectedSlot?.credits} cr]`;
                  else note = ` [${sub.credits} credits]`;

                  return (
                    <option key={sub.id} value={sub.id} disabled={isDisabled}>
                      {sub.code} - {sub.name}{note}
                    </option>
                  );
                })}
            </select>
            <p className="text-xs text-text-500 mt-1.5 flex items-center justify-between">
              <span>This slot requires subjects with exactly <strong className="text-text-900 font-mono">{selectedSlot?.credits} credits</strong>.</span>
            </p>
          </Field>
          <Field label="Max Capacity (Optional)">
            <input
              type="number"
              min="1"
              value={optionFormData.maxCapacity}
              onChange={(e) => setOptionFormData({ ...optionFormData, maxCapacity: e.target.value })}
              placeholder="Leave blank for unlimited"
            />
          </Field>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsOptionModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Adding...' : 'Add Option'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleSlotDelete}
        title="Delete Slot"
        message="Are you sure you want to delete this slot? All associated options and student choices will be lost."
        confirmText="Delete"
        isDanger={true}
      />

      {/* CHOICES & SWAPS MODAL (T9.5) */}
      <Modal
        isOpen={isChoicesModalOpen}
        onClose={() => setIsChoicesModalOpen(false)}
        title={`Student Choices — ${selectedSlot?.slotName || 'Elective Slot'}`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-surface-50 border border-border rounded-lg text-xs text-text-600">
            <div className="flex items-center gap-3">
              <span><strong>Type:</strong> {selectedSlot?.slotType}</span>
              <span><strong>Credits:</strong> {selectedSlot?.credits}</span>
              <span><strong>Total Enrolled/Chosen:</strong> {slotChoicesData.choices?.length || 0}</span>
            </div>
            <span className="text-text-500 italic">Admin swap updates choice and synchronizes enrollment</span>
          </div>

          <div className="max-h-[55vh] overflow-y-auto">
            {isLoadingChoices ? (
              <div className="py-12 text-center text-text-500 text-sm">Loading student choices...</div>
            ) : slotChoicesData.choices?.length === 0 ? (
              <div className="py-12 text-center text-text-500 bg-surface-50 rounded-lg text-sm italic">
                No students have chosen an elective for this slot yet.
              </div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wider text-text-500">
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Div</th>
                    <th className="py-2.5 px-3">Chosen Subject</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {slotChoicesData.choices.map(choice => (
                    <tr key={choice.id} className="hover:bg-surface-50/60 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-text-900">
                          {choice.student?.name || `${choice.student?.firstName || ''} ${choice.student?.lastName || ''}`.trim()}
                        </div>
                        <div className="text-xs text-text-500 font-mono">
                          {choice.student?.instituteId || choice.student?.rollNumber || choice.student?.email}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs">
                        {choice.student?.division?.name || '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-text-900">
                          {choice.chosenSubject?.code}
                        </div>
                        <div className="text-xs text-text-600 truncate max-w-xs">
                          {choice.chosenSubject?.name}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={choice.status} />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openSwapModal(choice)}
                          title="Admin swap this elective"
                          className="text-xs inline-flex items-center gap-1.5"
                        >
                          <ArrowLeftRight size={13} />
                          Swap
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="pt-3 border-t border-border flex justify-end">
            <Button variant="secondary" onClick={() => setIsChoicesModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* ADMIN SWAP MODAL (T9.5) */}
      <Modal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
        title="Admin-Approved Elective Swap"
      >
        <form onSubmit={handleSwapSubmit} className="space-y-4">
          <div className="p-3 bg-surface-50 border border-border rounded-lg text-xs space-y-1">
            <div className="text-text-700">
              <strong>Student:</strong> {selectedChoiceForSwap?.student?.name || selectedChoiceForSwap?.student?.rollNumber} ({selectedChoiceForSwap?.student?.instituteId || selectedChoiceForSwap?.student?.rollNumber})
            </div>
            <div className="text-text-700">
              <strong>Current Elective:</strong> {selectedChoiceForSwap?.chosenSubject?.code} — {selectedChoiceForSwap?.chosenSubject?.name}
            </div>
            <div className="text-text-500 flex items-center gap-1">
              <strong>Status:</strong> <StatusBadge status={selectedChoiceForSwap?.status || 'LOCKED'} />
            </div>
          </div>

          <Field label="New Elective Subject">
            <select
              value={swapFormData.newSubjectId}
              onChange={(e) => setSwapFormData({ ...swapFormData, newSubjectId: e.target.value })}
              required
            >
              <option value="">-- Select New Subject --</option>
              {selectedSlot?.options?.map(opt => {
                const isCurrent = opt.subjectId === selectedChoiceForSwap?.chosenSubjectId;
                return (
                  <option 
                    key={opt.id} 
                    value={opt.subjectId}
                    disabled={isCurrent}
                  >
                    {opt.subject?.code} - {opt.subject?.name} {isCurrent ? '(Current Subject)' : `(Cap: ${opt.maxCapacity || 'Unlimited'})`}
                  </option>
                );
              })}
            </select>
          </Field>

          <Field label="Administrative Reason / Note">
            <input
              type="text"
              value={swapFormData.reason}
              onChange={(e) => setSwapFormData({ ...swapFormData, reason: e.target.value })}
              placeholder="e.g. Schedule clash, approved committee petition"
            />
          </Field>

          <label className="flex items-start gap-2.5 pt-1 text-xs text-text-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={swapFormData.overrideCapacity}
              onChange={(e) => setSwapFormData({ ...swapFormData, overrideCapacity: e.target.checked })}
              className="mt-0.5 rounded border-border text-ink-600 focus:ring-ink-500"
            />
            <div>
              <span className="font-semibold text-text-900">Override Seat Capacity</span>
              <p className="text-text-500">Allow swap even if the target subject has reached its max capacity.</p>
            </div>
          </label>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <Button type="button" variant="secondary" onClick={() => setIsSwapModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSwapping}>
              {isSwapping ? 'Swapping...' : 'Execute Swap'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
