import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { 
  FileCheck, 
  Save, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Search, 
  Sparkles,
  Lock,
  Layers,
  GraduationCap,
  ShieldCheck
} from 'lucide-react';

export default function TeacherExamEvaluation() {
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [isLoadingExams, setIsLoadingExams] = useState(true);

  // Marksheet Data
  const [marksheet, setMarksheet] = useState(null);
  const [marksState, setMarksState] = useState({}); // { [enrollmentId]: number | '' }
  const [isLoadingMarksheet, setIsLoadingMarksheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Submit / Save actions
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);

  useEffect(() => {
    fetchTeacherExams();
  }, []);

  const fetchTeacherExams = async () => {
    setIsLoadingExams(true);
    try {
      const data = await apiClient.get('/exam-results/teacher/exams');
      setExams(data);
      if (data.length > 0) {
        setSelectedExamId(data[0].id);
      }
    } catch (error) {
      toast.error('Failed to load scheduled exams for evaluation');
    } finally {
      setIsLoadingExams(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      fetchMarksheet(selectedExamId);
    }
  }, [selectedExamId]);

  const fetchMarksheet = async (examId) => {
    setIsLoadingMarksheet(true);
    try {
      const data = await apiClient.get(`/exam-results/marksheet/${examId}`);
      setMarksheet(data);

      // Populate local marks state
      const initial = {};
      data.studentsRoster?.forEach(s => {
        initial[s.enrollmentId] = s.marksObtained !== null ? s.marksObtained : '';
      });
      setMarksState(initial);
    } catch (error) {
      toast.error('Failed to load exam marksheet roster');
    } finally {
      setIsLoadingMarksheet(false);
    }
  };

  // Handle Mark Change
  const handleMarkChange = (enrollmentId, value, maxMarks) => {
    if (value !== '') {
      const num = Number(value);
      if (isNaN(num) || num < 0) return;
      if (num > maxMarks) {
        toast.error(`Marks cannot exceed maximum marks (${maxMarks})`);
        return;
      }
    }

    setMarksState(prev => ({
      ...prev,
      [enrollmentId]: value
    }));
  };

  // Perform Save (Draft or Submit)
  const handleSaveMarks = async (action) => {
    if (!selectedExamId || !marksheet) return;

    const marksList = Object.entries(marksState).map(([enrollmentId, val]) => ({
      enrollmentId,
      marksObtained: val !== '' ? Number(val) : null
    }));

    setIsSaving(true);
    try {
      const res = await apiClient.post(`/exam-results/marksheet/${selectedExamId}/save`, {
        marksList,
        action
      });
      toast.success(res.message);
      setIsSubmitConfirmOpen(false);
      fetchMarksheet(selectedExamId);
      fetchTeacherExams();
    } catch (error) {
      toast.error(error.message || 'Failed to save marks');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedExam = exams.find(e => e.id === selectedExamId);
  const isLocked = marksheet?.marksheetStatus === 'SUBMITTED' || marksheet?.marksheetStatus === 'VERIFIED';

  // Filtered student roster
  const filteredRoster = useMemo(() => {
    if (!marksheet?.studentsRoster) return [];
    if (!searchQuery) return marksheet.studentsRoster;

    const q = searchQuery.toLowerCase();
    return marksheet.studentsRoster.filter(s => {
      const name = s.studentName?.toLowerCase() || '';
      const roll = s.rollNumber?.toLowerCase() || '';
      const prn = s.instituteId?.toLowerCase() || '';
      const seat = s.seatNumber?.toLowerCase() || '';
      return name.includes(q) || roll.includes(q) || prn.includes(q) || seat.includes(q);
    });
  }, [marksheet, searchQuery]);

  // Statistics calculation
  const stats = useMemo(() => {
    if (!marksheet?.studentsRoster) return { total: 0, graded: 0, passCount: 0, avg: 0 };
    const max = marksheet.exam?.maxMarks || 100;
    const passMarks = marksheet.exam?.passingMarks || 40;

    let graded = 0;
    let sum = 0;
    let passCount = 0;

    Object.values(marksState).forEach(val => {
      if (val !== '' && val !== null && !isNaN(val)) {
        graded++;
        const num = Number(val);
        sum += num;
        if (num >= passMarks) passCount++;
      }
    });

    const avg = graded > 0 ? (sum / graded).toFixed(1) : 0;
    return {
      total: marksheet.studentsRoster.length,
      graded,
      passCount,
      failCount: graded - passCount,
      avg
    };
  }, [marksheet, marksState]);

  return (
    <div className="space-y-6">
      {/* Selector & Exam Info Banner */}
      <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold text-text-700 whitespace-nowrap">
              Select Scheduled Exam:
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              disabled={isLoadingExams}
              className="text-sm rounded-lg border-border bg-surface-50 px-3 py-2 text-text-900 font-semibold focus:ring-ink-500 max-w-md"
            >
              {exams.length === 0 && <option value="">No scheduled exams found</option>}
              {exams.map(exam => (
                <option key={exam.id} value={exam.id}>
                  {exam.subject?.code} - {exam.subject?.name} [{exam.examType}] ({exam.class?.name})
                </option>
              ))}
            </select>
          </div>

          {/* Workflow Status Badge */}
          {marksheet && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-500">Evaluation Status:</span>
              {marksheet.marksheetStatus === 'VERIFIED' ? (
                <span className="text-xs font-bold text-success bg-success/10 border border-success/20 px-3 py-1 rounded flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Verified & Published
                </span>
              ) : marksheet.marksheetStatus === 'SUBMITTED' ? (
                <span className="text-xs font-bold text-warning bg-warning/10 border border-warning/20 px-3 py-1 rounded flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-warning" />
                  Submitted (Pending Exam Cell)
                </span>
              ) : marksheet.marksheetStatus === 'REJECTED' ? (
                <span className="text-xs font-bold text-danger bg-danger/10 border border-danger/20 px-3 py-1 rounded flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-danger" />
                  Revision Requested
                </span>
              ) : (
                <span className="text-xs font-bold text-ink-900 bg-surface-100 border border-border px-3 py-1 rounded">
                  Draft / In-Progress
                </span>
              )}
            </div>
          )}
        </div>

        {/* Rejection Alert Banner if Exam Cell returned with feedback */}
        {marksheet?.marksheetStatus === 'REJECTED' && marksheet.rejectionReason && (
          <div className="bg-danger/10 border-2 border-danger/30 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <strong className="text-sm font-bold text-danger block">
                Exam Cell Requested Revision
              </strong>
              <p className="text-text-700 leading-relaxed">
                <strong>Feedback from Exam Cell:</strong> {marksheet.rejectionReason}
              </p>
              <p className="text-text-500 italic">
                Please adjust the candidate marks below and click "Submit to Exam Cell" to resubmit.
              </p>
            </div>
          </div>
        )}

        {/* Lock Notice if Verified */}
        {marksheet?.marksheetStatus === 'VERIFIED' && (
          <div className="bg-success/5 border border-success/20 rounded-lg p-3 text-xs text-success flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-success" />
            <span>
              This examination marksheet was formally verified and approved by the Exam Cell on{' '}
              {new Date(marksheet.verifiedAt).toLocaleDateString()}. Marks have been synchronized to student component records and cannot be modified.
            </span>
          </div>
        )}

        {/* Exam Particulars Bar */}
        {marksheet && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-border text-xs">
            <div>
              <span className="text-text-500 block">Examination Type</span>
              <strong className="text-text-900 text-sm font-serif">{marksheet.exam?.examType}</strong>
            </div>
            <div>
              <span className="text-text-500 block">Evaluation Scheme</span>
              <span className="font-mono text-text-900 text-sm font-bold">
                Max: {marksheet.exam?.maxMarks}M | Pass: {marksheet.exam?.passingMarks}M
              </span>
            </div>
            <div>
              <span className="text-text-500 block">Candidates Graded</span>
              <span className="font-mono text-text-900 text-sm font-bold">
                {stats.graded} / {stats.total}
              </span>
            </div>
            <div>
              <span className="text-text-500 block">Pass Rate (Draft)</span>
              <span className="font-mono text-sm font-bold text-success">
                {stats.graded > 0 ? `${Math.round((stats.passCount / stats.graded) * 100)}%` : '--'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Roster Table & Toolbar */}
      <div className="bg-surface-0 border border-border rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-text-900">Candidate Evaluation Marksheet</h3>
            <span className="text-xs font-mono text-text-500">
              ({filteredRoster.length} students)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate name, roll, seat..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-surface-50 text-text-900 focus:ring-ink-500"
              />
            </div>

            {!isLocked && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSaveMarks('SAVE_DRAFT')}
                disabled={isSaving}
                className="flex items-center gap-1.5 text-xs font-semibold"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </Button>
            )}

            {!isLocked && (
              <Button
                variant="accent"
                size="sm"
                onClick={() => setIsSubmitConfirmOpen(true)}
                disabled={isSaving}
                className="flex items-center gap-1.5 text-xs font-semibold"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit to Exam Cell</span>
              </Button>
            )}
          </div>
        </div>

        {/* Marksheet Data Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-100 border-b border-border text-text-700 font-semibold uppercase text-[10px]">
              <tr>
                <th className="p-3 w-16 text-center">Roll No</th>
                <th className="p-3">Candidate Name</th>
                <th className="p-3">Institute PRN</th>
                <th className="p-3">Seat Number</th>
                <th className="p-3 text-center w-36">
                  Marks Obtained (/{marksheet?.exam?.maxMarks})
                </th>
                <th className="p-3 text-center w-24">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface-0">
              {isLoadingMarksheet ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-text-500">
                    Loading student marksheet...
                  </td>
                </tr>
              ) : filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-text-500">
                    No enrolled students found for this examination.
                  </td>
                </tr>
              ) : (
                filteredRoster.map((student) => {
                  const currentVal = marksState[student.enrollmentId] ?? '';
                  const numVal = currentVal !== '' ? Number(currentVal) : null;
                  const isPass = numVal !== null ? numVal >= (marksheet?.exam?.passingMarks || 40) : null;

                  return (
                    <tr key={student.enrollmentId} className="hover:bg-surface-50">
                      <td className="p-3 font-mono font-bold text-center text-text-900">
                        {student.rollNumber || '--'}
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-text-900 block">{student.studentName}</span>
                        {student.isBacklog && (
                          <span className="text-[10px] font-semibold text-warning bg-warning/10 px-1 rounded">
                            Re-attempt (Backlog)
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-text-600">
                        {student.instituteId}
                      </td>
                      <td className="p-3 font-mono font-semibold text-ink-900">
                        {student.seatNumber}
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={marksheet?.exam?.maxMarks || 100}
                          value={currentVal}
                          onChange={(e) => handleMarkChange(student.enrollmentId, e.target.value, marksheet?.exam?.maxMarks || 100)}
                          disabled={isLocked}
                          placeholder="--"
                          className={`w-24 text-center font-mono font-bold text-xs p-1.5 rounded border ${
                            isLocked 
                              ? 'bg-surface-100 text-text-600 border-border cursor-not-allowed'
                              : 'bg-surface-0 text-text-900 border-border focus:border-ink-700'
                          }`}
                        />
                      </td>
                      <td className="p-3 text-center">
                        {isPass !== null ? (
                          isPass ? (
                            <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded border border-success/20">
                              PASS
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded border border-danger/20">
                              FAIL
                            </span>
                          )
                        ) : (
                          <span className="text-text-400">--</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog for Submission */}
      <ConfirmDialog
        isOpen={isSubmitConfirmOpen}
        onClose={() => setIsSubmitConfirmOpen(false)}
        onConfirm={() => handleSaveMarks('SUBMIT')}
        title="Submit Marksheet to Exam Cell?"
        message={`You are submitting evaluation marks for ${stats.graded} of ${stats.total} candidates. Once submitted, this marksheet will be forwarded to the Exam Cell for formal verification and will be locked from further edits until reviewed.`}
        confirmText="Confirm & Submit"
        cancelText="Review Again"
        variant="primary"
        loading={isSaving}
      />
    </div>
  );
}
