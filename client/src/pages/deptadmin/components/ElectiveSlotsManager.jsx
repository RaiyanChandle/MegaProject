import { useState, useEffect } from 'react';
import { apiClient } from '../../../api/client';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Field from '../../../components/ui/Field';
import StatusBadge from '../../../components/ui/StatusBadge';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { toast } from '../../../components/ui/Toast';
import { Plus, Edit2, Trash2, Settings, X } from 'lucide-react';

export default function ElectiveSlotsManager({ classId }) {
  const [slots, setSlots] = useState([]);
  const [globalElectives, setGlobalElectives] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotFormData, setSlotFormData] = useState({ slotName: '', slotType: 'PROGRAM_ELECTIVE', credits: 3 });

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

  // --- Slot Handlers ---
  const openSlotModal = (slot = null) => {
    setSelectedSlot(slot);
    if (slot) {
      setSlotFormData({ slotName: slot.slotName, slotType: slot.slotType, credits: slot.credits });
    } else {
      setSlotFormData({ slotName: '', slotType: 'PROGRAM_ELECTIVE', credits: 3 });
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
        <Button onClick={() => openSlotModal()} size="sm">
          <Plus size={16} />
          New Slot
        </Button>
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
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                .map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.code} - {sub.name} (Credits: {sub.credits}, Class: {sub.class?.name})
                  </option>
                ))}
            </select>
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
    </div>
  );
}
