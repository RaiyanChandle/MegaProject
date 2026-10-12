import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Megaphone, AlertCircle, CheckCircle2, Globe, Building2, Users, Layers, Info } from 'lucide-react';

const AUDIENCE_TYPES = [
  { value: 'GLOBAL', label: 'Global Notice', description: 'Institutional notice for all users', roles: ['SUPER_ADMIN'] },
  { value: 'DEPARTMENT', label: 'Department', description: 'Scored to department students & staff', roles: ['SUPER_ADMIN', 'DEPARTMENT_ADMIN'] },
  { value: 'CLASS', label: 'Class / Batch', description: 'Academic class or batch notice', roles: ['SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER'] },
  { value: 'DIVISION', label: 'Division / Section', description: 'Specific division classroom notice', roles: ['SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER'] },
  { value: 'TEACHER', label: 'Faculty Only', description: 'Internal staff communication', roles: ['SUPER_ADMIN', 'DEPARTMENT_ADMIN'] },
  { value: 'PARENT', label: 'Parents / Guardians', description: 'Notices specifically for parents', roles: ['SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER'] },
];

export default function CreateAnnouncementModal({ isOpen, onClose, onCreated }) {
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('GLOBAL');
  
  // Scope settings
  const [scopeLevel, setScopeLevel] = useState('COLLEGE'); // 'COLLEGE' | 'DEPARTMENT' | 'CLASS' | 'DIVISION'
  const [targetDepartmentId, setTargetDepartmentId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [targetDivisionId, setTargetDivisionId] = useState('');

  // Dropdown data
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [divisions, setDivisions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [fetchingDropdowns, setFetchingDropdowns] = useState(false);
  const [error, setError] = useState('');

  const [fetchingClasses, setFetchingClasses] = useState(false);
  const [fetchingDivisions, setFetchingDivisions] = useState(false);

  // Set default type & scope based on user role
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      setType('GLOBAL');
      setScopeLevel('COLLEGE');
    } else if (user?.role === 'DEPARTMENT_ADMIN') {
      setType('DEPARTMENT');
      setScopeLevel('DEPARTMENT');
      setTargetDepartmentId(user.departmentId || '');
    } else if (user?.role === 'TEACHER') {
      setType('CLASS');
      setScopeLevel('CLASS');
      setTargetDepartmentId(user.departmentId || '');
    }
  }, [user, isOpen]);

  // Fetch departments on modal open (for all roles so we can display department name accurately)
  useEffect(() => {
    if (!isOpen) return;

    const fetchDepts = async () => {
      try {
        setFetchingDropdowns(true);
        const data = await apiClient.get('/departments');
        setDepartments(data || []);
      } catch (err) {
        console.error('Failed to load departments', err);
      } finally {
        setFetchingDropdowns(false);
      }
    };

    fetchDepts();
  }, [isOpen]);

  // Fetch classes when department changes or modal opens
  useEffect(() => {
    if (!isOpen) return;

    // For Super Admin, requires selecting a department first
    if (user?.role === 'SUPER_ADMIN' && !targetDepartmentId) {
      setClasses([]);
      return;
    }

    const fetchClasses = async () => {
      try {
        setFetchingClasses(true);
        let endpoint = '/classes';
        if (user?.role === 'SUPER_ADMIN' && targetDepartmentId) {
          endpoint = `/classes?departmentId=${targetDepartmentId}`;
        } else if (targetDepartmentId || user?.departmentId) {
          endpoint = `/classes?departmentId=${targetDepartmentId || user?.departmentId}`;
        }
        const data = await apiClient.get(endpoint);
        setClasses(data || []);
      } catch (err) {
        console.error('Failed to load classes', err);
      } finally {
        setFetchingClasses(false);
      }
    };

    fetchClasses();
  }, [isOpen, targetDepartmentId, user]);

  // Fetch divisions when class changes
  useEffect(() => {
    if (!targetClassId) {
      setDivisions([]);
      return;
    }

    const fetchDivisions = async () => {
      try {
        setFetchingDivisions(true);
        const data = await apiClient.get(`/divisions?classId=${targetClassId}`);
        setDivisions(data || []);
      } catch (err) {
        console.error('Failed to load divisions', err);
      } finally {
        setFetchingDivisions(false);
      }
    };

    fetchDivisions();
  }, [targetClassId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!message.trim()) {
      setError('Message is required.');
      return;
    }

    // Resolve targeting according to selected scope level
    let finalDeptId = null;
    let finalClassId = null;
    let finalDivId = null;

    if (scopeLevel === 'COLLEGE') {
      finalDeptId = null;
      finalClassId = null;
      finalDivId = null;
    } else if (scopeLevel === 'DEPARTMENT') {
      finalDeptId = user?.role === 'SUPER_ADMIN' ? targetDepartmentId : user?.departmentId;
      if (!finalDeptId) {
        setError('Please select a target department.');
        return;
      }
      finalClassId = null;
      finalDivId = null;
    } else if (scopeLevel === 'CLASS') {
      finalDeptId = user?.role === 'SUPER_ADMIN' ? targetDepartmentId : user?.departmentId;
      if (!targetClassId) {
        setError('Please select a target class.');
        return;
      }
      finalClassId = targetClassId;
      finalDivId = null;
    } else if (scopeLevel === 'DIVISION') {
      finalDeptId = user?.role === 'SUPER_ADMIN' ? targetDepartmentId : user?.departmentId;
      if (!targetClassId) {
        setError('Please select a target class.');
        return;
      }
      if (!targetDivisionId) {
        setError('Please select a target division.');
        return;
      }
      finalClassId = targetClassId;
      finalDivId = targetDivisionId;
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        type,
        targetDepartmentId: finalDeptId || null,
        targetClassId: finalClassId || null,
        targetDivisionId: finalDivId || null,
      };

      const result = await apiClient.post('/announcements', payload);
      if (onCreated) onCreated(result);
      onClose();
      // Reset form
      setTitle('');
      setMessage('');
    } catch (err) {
      console.error('Failed to create announcement:', err);
      setError(err?.message || 'Failed to publish announcement.');
    } finally {
      setLoading(false);
    }
  };

  // Human-readable summary of wildcard targeting (Rule 28/29)
  const getTargetingSummary = () => {
    if (scopeLevel === 'COLLEGE') {
      return 'College-Wide Broadcast: Reaches all departments, classes, divisions, faculty, students & parents.';
    }
    const activeDeptId = user?.role === 'SUPER_ADMIN' ? targetDepartmentId : (targetDepartmentId || user?.departmentId);
    let deptObj = departments.find(d => d.id === activeDeptId);
    if (!deptObj && classes.length > 0 && classes[0].departmentId) {
      deptObj = departments.find(d => d.id === classes[0].departmentId);
    }
    const deptName = deptObj ? `${deptObj.name} (${deptObj.code})` : (activeDeptId ? 'Your Department' : 'Selected Department');

    if (scopeLevel === 'DEPARTMENT') {
      return `Department Wildcard: Reaches ALL classes and divisions under ${deptName}.`;
    }
    const classObj = classes.find(c => c.id === targetClassId);
    const className = classObj ? `${classObj.name} (Batch ${classObj.batchYear})` : 'Selected Class';

    if (scopeLevel === 'CLASS') {
      return `Class Wildcard: Reaches ALL divisions and students enrolled in ${className}.`;
    }
    const divObj = divisions.find(d => d.id === targetDivisionId);
    const divName = divObj ? `Division ${divObj.name}` : 'Selected Division';

    return `Specific Section: Reaches exclusively students and parents in ${className} — ${divName}.`;
  };

  const allowedTypes = AUDIENCE_TYPES.filter(t => t.roles.includes(user?.role || ''));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Publish Announcement" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 rounded-md bg-danger/10 border border-danger/20 flex items-start gap-2.5 text-danger text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-text-900 mb-1">
            Announcement Title <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., End Semester Examination Guidelines & Hall Ticket Release"
            className="w-full rounded-md border border-border px-3.5 py-2 text-sm text-text-900 bg-surface-0 focus:border-ink-700 focus:ring-1 focus:ring-ink-700 outline-none transition-colors"
          />
        </div>

        {/* Message Body */}
        <div>
          <label className="block text-sm font-medium text-text-900 mb-1">
            Message Body <span className="text-danger">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write the full notice text, instructions, deadlines, or official statement..."
            className="w-full rounded-md border border-border px-3.5 py-2 text-sm text-text-900 bg-surface-0 focus:border-ink-700 focus:ring-1 focus:ring-ink-700 outline-none transition-colors resize-y"
          />
        </div>

        {/* Audience / Notice Type */}
        <div>
          <label className="block text-sm font-medium text-text-900 mb-1.5">
            Notice Classification
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {allowedTypes.map((item) => {
              const selected = type === item.value;
              return (
                <button
                  type="button"
                  key={item.value}
                  onClick={() => setType(item.value)}
                  className={`p-2.5 rounded-md border text-left transition-all ${
                    selected
                      ? 'border-ink-900 bg-ink-900/5 text-ink-900 ring-1 ring-ink-900'
                      : 'border-border bg-surface-0 text-text-900 hover:bg-surface-50'
                  }`}
                >
                  <div className="font-semibold text-xs flex items-center justify-between">
                    <span>{item.label}</span>
                    {selected && <CheckCircle2 size={13} className="text-ink-900" />}
                  </div>
                  <p className="text-[11px] text-text-500 mt-0.5 line-clamp-1">{item.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Targeting & Scope Selection (Rule 28/29) */}
        <div className="p-4 rounded-lg bg-surface-50 border border-border space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-text-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} className="text-brass-500" />
              Target Broadcast Scope
            </label>
            <span className="text-[11px] font-mono text-text-500">
              Wildcard Resolution
            </span>
          </div>

          {/* Scope Level Radio Tabs */}
          <div className="flex flex-wrap gap-2">
            {user?.role === 'SUPER_ADMIN' && (
              <button
                type="button"
                onClick={() => {
                  setScopeLevel('COLLEGE');
                  setTargetDepartmentId('');
                  setTargetClassId('');
                  setTargetDivisionId('');
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 border transition-colors ${
                  scopeLevel === 'COLLEGE'
                    ? 'bg-ink-900 text-white border-ink-900'
                    : 'bg-surface-0 text-text-900 border-border hover:bg-surface-50'
                }`}
              >
                <Globe size={13} />
                College-Wide (All)
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setScopeLevel('DEPARTMENT');
                setTargetClassId('');
                setTargetDivisionId('');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 border transition-colors ${
                scopeLevel === 'DEPARTMENT'
                  ? 'bg-ink-900 text-white border-ink-900'
                  : 'bg-surface-0 text-text-900 border-border hover:bg-surface-50'
              }`}
            >
              <Building2 size={13} />
              Department-Wide
            </button>

            <button
              type="button"
              onClick={() => {
                setScopeLevel('CLASS');
                setTargetDivisionId('');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 border transition-colors ${
                scopeLevel === 'CLASS'
                  ? 'bg-ink-900 text-white border-ink-900'
                  : 'bg-surface-0 text-text-900 border-border hover:bg-surface-50'
              }`}
            >
              <Users size={13} />
              Specific Class
            </button>

            <button
              type="button"
              onClick={() => setScopeLevel('DIVISION')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 border transition-colors ${
                scopeLevel === 'DIVISION'
                  ? 'bg-ink-900 text-white border-ink-900'
                  : 'bg-surface-0 text-text-900 border-border hover:bg-surface-50'
              }`}
            >
              <Users size={13} />
              Specific Division
            </button>
          </div>

          {/* Conditional Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Department Selector (Only for Super Admin when scope != COLLEGE) */}
            {user?.role === 'SUPER_ADMIN' && scopeLevel !== 'COLLEGE' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-text-500 mb-1">
                  Department
                </label>
                <select
                  value={targetDepartmentId}
                  onChange={(e) => {
                    setTargetDepartmentId(e.target.value);
                    setTargetClassId('');
                    setTargetDivisionId('');
                  }}
                  className="w-full rounded-md border border-border px-3 py-2 text-xs text-text-900 bg-surface-0 focus:border-ink-700 outline-none"
                >
                  <option value="">Select Department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Class Selector (Visible for CLASS or DIVISION) */}
            {(scopeLevel === 'CLASS' || scopeLevel === 'DIVISION') && (
              <div className={scopeLevel === 'CLASS' ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-medium text-text-500 mb-1 flex items-center justify-between">
                  <span>Class / Curriculum</span>
                  {fetchingClasses && <span className="text-[10px] text-brass-600 animate-pulse font-normal">Loading classes...</span>}
                </label>
                <select
                  value={targetClassId}
                  onChange={(e) => {
                    setTargetClassId(e.target.value);
                    setTargetDivisionId('');
                  }}
                  className="w-full rounded-md border border-border px-3 py-2 text-xs text-text-900 bg-surface-0 focus:border-ink-700 outline-none"
                >
                  <option value="">Select Class...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Batch {c.batchYear})
                    </option>
                  ))}
                  {classes.length === 0 && !fetchingClasses && (
                    <option value="" disabled>No classes found for this department</option>
                  )}
                </select>
              </div>
            )}

            {/* Division Selector (Visible only for DIVISION) */}
            {scopeLevel === 'DIVISION' && (
              <div>
                <label className="block text-xs font-medium text-text-500 mb-1 flex items-center justify-between">
                  <span>Division / Section</span>
                  {fetchingDivisions && <span className="text-[10px] text-brass-600 animate-pulse font-normal">Loading divisions...</span>}
                </label>
                <select
                  value={targetDivisionId}
                  onChange={(e) => setTargetDivisionId(e.target.value)}
                  disabled={!targetClassId}
                  className="w-full rounded-md border border-border px-3 py-2 text-xs text-text-900 bg-surface-0 focus:border-ink-700 outline-none disabled:bg-surface-50 disabled:text-text-500"
                >
                  <option value="">Select Division...</option>
                  {divisions.map((div) => (
                    <option key={div.id} value={div.id}>
                      Division {div.name}
                    </option>
                  ))}
                  {targetClassId && divisions.length === 0 && !fetchingDivisions && (
                    <option value="" disabled>No divisions in this class</option>
                  )}
                </select>
              </div>
            )}
          </div>

          {/* Scope Explanation Banner */}
          <div className="flex items-start gap-2 p-2.5 rounded-md bg-info/5 border border-info/20 text-info text-xs">
            <Info size={15} className="shrink-0 mt-0.5" />
            <span>{getTargetingSummary()}</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
          >
            {loading ? 'Publishing...' : 'Publish Announcement'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
