import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../../api/client';
import Button from '../../components/ui/Button';
import { toast } from '../../components/ui/Toast';
import {
  Award,
  GraduationCap,
  BarChart2,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Building,
  Users,
  Calendar,
  TrendingUp,
  ChevronRight,
  X,
  FileCheck,
  Layers,
  Printer,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { useSearch } from '../../context/SearchContext';
import { CollegeSealLogo, ExamControllerSeal } from '../student/StudentResultCard';

// Helper to ensure percentage never exceeds 100%
const clampPercentage = (val) => {
  if (val === null || val === undefined || isNaN(val)) return null;
  return Number(Math.min(100, Math.max(0, Number(val))).toFixed(2));
};

const getGradeColor = (grade) => {
  if (!grade) return '';
  if (['O', 'A+', 'A'].includes(grade)) return 'text-emerald-600';
  if (['B+', 'B'].includes(grade)) return 'text-sky-600';
  if (grade === 'C') return 'text-amber-600';
  return 'text-red-600';
};

const statusColors = {
  NOT_GENERATED: 'bg-amber-50 text-amber-700 border-amber-200',
  PARTIAL: 'bg-sky-50 text-sky-700 border-sky-200',
  COMPLETE: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

const statusLabels = {
  NOT_GENERATED: 'Not Generated',
  PARTIAL: 'Partial',
  COMPLETE: 'Complete'
};

export default function ResultProcessing() {
  const { searchQuery } = useSearch();

  const [terms, setTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('MIDTERM');
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Selected class detail view
  const [selectedClass, setSelectedClass] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Student detail modal
  const [studentDetail, setStudentDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Pending subjects alert modal
  const [pendingModalInfo, setPendingModalInfo] = useState(null);

  // Generating
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchClassesOverview();
  }, []);

  useEffect(() => {
    if (selectedTermId) {
      fetchClassesOverview(selectedTermId, selectedExamType);
    }
  }, [selectedTermId, selectedExamType]);

  const fetchClassesOverview = async (termId, examType = selectedExamType) => {
    try {
      setLoadingClasses(true);
      const params = new URLSearchParams();
      if (termId) params.append('academicTermId', termId);
      if (examType) params.append('examType', examType);

      const data = await apiClient.get(`/results/classes?${params.toString()}`);
      setClasses(data.classes || []);
      setTerms(data.terms || []);
      if (!selectedTermId && data.academicTermId) {
        setSelectedTermId(data.academicTermId);
      }
    } catch (err) {
      toast.error('Failed to load classes');
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchClassStudents = async (cls, examType = selectedExamType) => {
    setSelectedClass(cls);
    setClassStudents([]);
    try {
      setLoadingStudents(true);
      const params = new URLSearchParams({
        classId: cls.id,
        academicTermId: selectedTermId,
        examType
      });
      const data = await apiClient.get(`/results/class-students?${params.toString()}`);
      setClassStudents(data.students || []);
    } catch (err) {
      toast.error('Failed to load students for this class');
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchStudentDetail = async (studentId, examType = selectedExamType) => {
    try {
      setLoadingDetail(true);
      const params = new URLSearchParams();
      if (selectedTermId) params.append('academicTermId', selectedTermId);
      if (examType) params.append('examType', examType);

      const data = await apiClient.get(`/results/student/${studentId}?${params.toString()}`);
      setStudentDetail(data);
    } catch (err) {
      toast.error('Failed to load student result detail');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Generate result cards: strictly checks if any subject is pending
  const handleGenerateForClass = async () => {
    if (!selectedClass || !selectedTermId) return;
    try {
      setGenerating(true);
      const res = await apiClient.post('/results/generate', {
        classId: selectedClass.id,
        academicTermId: selectedTermId,
        examType: selectedExamType
      });

      toast.success(res.message || `Generated ${selectedExamType} result cards for ${res.generated} student(s)`);

      if (res.skippedCount > 0) {
        toast.warning(`Skipped ${res.skippedCount} student(s) because some subject marks are pending`);
      }

      // Refresh
      await fetchClassStudents(selectedClass, selectedExamType);
      await fetchClassesOverview(selectedTermId, selectedExamType);
    } catch (err) {
      const errMsg = err.response?.data?.error || `Failed to generate ${selectedExamType} result cards`;
      toast.error(errMsg);

      // Show comprehensive modal with the list of pending subjects
      if (err.response?.data?.pendingSubjects) {
        setPendingModalInfo({
          title: `Cannot Generate ${selectedExamType} Results`,
          message: errMsg,
          subjects: err.response.data.pendingSubjects,
          skippedStudents: err.response.data.skippedStudents || []
        });
      }
    } finally {
      setGenerating(false);
    }
  };

  // Print single student result card from modal with College Header and Exam Type
  const handlePrintStudentResult = () => {
    const printEl = document.getElementById('staff-student-result-printable');
    if (!printEl) {
      toast.error('Printable document is not ready');
      return;
    }

    try {
      const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(el => el.outerHTML)
        .join('\n');

      let iframe = document.getElementById('staff-result-print-frame');
      if (iframe) iframe.remove();

      iframe = document.createElement('iframe');
      iframe.id = 'staff-result-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${selectedExamType}_Result_${studentDetail?.student?.rollNumber || 'Student'}</title>
            ${styleLinks}
            <style>
              @page { size: A4 portrait; margin: 7mm 8mm; }
              *, *::before, *::after { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              html, body { width: 100% !important; margin: 0 !important; padding: 0 !important; background: #FFFFFF !important; color: #000000 !important; font-family: "IBM Plex Serif", Georgia, serif; }
              .printable-document { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
            </style>
          </head>
          <body>
            <div class="printable-document bg-white text-black font-serif">
              ${printEl.innerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => iframe.remove(), 1500);
      }, 350);
    } catch (err) {
      console.warn('Iframe print error fallback:', err);
      window.print();
    }
  };

  // Download single student result card from modal with College Header and Exam Type
  const handleDownloadStudentResult = () => {
    const printEl = document.getElementById('staff-student-result-printable');
    if (!printEl) return;

    const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => el.outerHTML)
      .join('\n');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${selectedExamType}_Result_Card_${studentDetail?.student?.rollNumber || 'Student'}.html</title>
    ${styleLinks}
    <style>
      @page { size: A4 portrait; margin: 7mm 8mm; }
      body { margin: 0; padding: 20px; font-family: "IBM Plex Serif", Georgia, serif; background: #f8fafc; color: #000; }
      .container { max-width: 820px; margin: 0 auto; background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }
    </style>
  </head>
  <body>
    <div class="container">
      ${printEl.innerHTML}
    </div>
  </body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedExamType}_Result_Card_${studentDetail?.student?.rollNumber || studentDetail?.student?.instituteId || 'Student'}.html`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${selectedExamType} Result Card downloaded`);
  };

  // Export full Class Result Ledger with College Header and Exam Type
  const handleExportClassResults = () => {
    if (!selectedClass || classStudents.length === 0) {
      toast.error('No students to export for this class');
      return;
    }

    const termName = terms.find(t => t.id === selectedTermId)?.name || 'Current Term';
    const totalStudents = classStudents.length;
    const processedStudents = classStudents.filter(s => s.resultCard);
    const passCount = classStudents.filter(s => s.resultCard && s.resultCard.percentage >= 40).length;
    const passRate = totalStudents > 0 ? ((passCount / totalStudents) * 100).toFixed(1) : 0;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${selectedExamType}_Class_Result_Sheet_${selectedClass.name.replace(/\s+/g, '_')}.html</title>
    <style>
      @page { size: A4 landscape; margin: 8mm; }
      * { box-sizing: border-box; }
      body { font-family: "IBM Plex Serif", Georgia, serif; font-size: 11px; color: #000; background: #fff; margin: 0; padding: 15px; }
      .header-box { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
      .inst-sub { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; }
      .inst-title { font-size: 16px; font-weight: bold; text-transform: uppercase; margin: 3px 0; }
      .inst-meta { font-size: 9px; color: #334155; }
      .exam-office { font-size: 11px; font-weight: bold; text-transform: uppercase; margin-top: 4px; }
      .doc-badge { display: inline-block; padding: 2px 12px; border: 1px solid #000; font-family: monospace; font-size: 11px; font-weight: bold; background: #f1f5f9; margin-top: 4px; }
      .info-bar { display: flex; justify-content: space-between; border: 1px solid #000; padding: 6px 10px; background: #f8fafc; font-size: 11px; margin-bottom: 12px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px; }
      th, td { border: 1px solid #000; padding: 5px 6px; text-align: center; }
      th { background: #f1f5f9; font-weight: bold; }
      td.left { text-align: left; }
      .pass { color: #15803d; font-weight: bold; }
      .fail { color: #b91c1c; font-weight: bold; }
      .pending { color: #b45309; font-weight: bold; }
      .stats-box { border: 1px solid #000; padding: 8px; background: #f8fafc; display: flex; justify-content: space-around; margin-bottom: 20px; font-size: 11px; }
      .sig-row { display: flex; justify-content: space-between; margin-top: 35px; text-align: center; }
      .sig-item { min-width: 160px; border-top: 1px solid #000; padding-top: 4px; font-size: 10px; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="header-box">
      <div class="inst-sub">Autonomous Institute • Affiliated to Shivaji University, Kolhapur</div>
      <div class="inst-title">KOLHAPUR INSTITUTE OF TECHNOLOGY'S COLLEGE OF ENGINEERING (AUTONOMOUS)</div>
      <div class="inst-meta">Approved by AICTE New Delhi • Recognized by Govt. of Maharashtra • Accredited by NAAC with 'A+' Grade</div>
      <div class="inst-meta">Gokul Shirgaon, Kolhapur - 416234, Maharashtra | Web: www.kitcoek.in</div>
      <div class="exam-office">OFFICE OF THE CONTROLLER OF EXAMINATIONS</div>
      <div class="doc-badge">${selectedExamType} CONSOLIDATED CLASS RESULT LEDGER / GRADE SHEET</div>
    </div>

    <div class="info-bar">
      <div><strong>Class:</strong> ${selectedClass.name} (Semester ${selectedClass.semesterNumber})</div>
      <div><strong>Department:</strong> ${selectedClass.department}</div>
      <div><strong>Academic Term:</strong> ${termName} • <strong>Exam Type:</strong> ${selectedExamType}</div>
      <div><strong>Date of Export:</strong> ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 30px;">#</th>
          <th style="width: 80px;">Roll No</th>
          <th style="width: 100px;">Institute PRN</th>
          <th>Candidate Name</th>
          <th style="width: 40px;">Div</th>
          <th style="width: 70px;">${selectedExamType} Marks</th>
          <th style="width: 60px;">Max Marks</th>
          <th style="width: 70px;">Percentage</th>
          <th style="width: 60px;">SGPA</th>
          <th style="width: 80px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${classStudents.map((s, idx) => {
          const rc = s.resultCard;
          const pct = rc ? clampPercentage(rc.percentage) : null;
          const isPass = pct != null ? pct >= 40 : null;
          const isPending = !s.canGenerate && s.pendingSubjects?.length > 0;
          return `
            <tr>
              <td>${idx + 1}</td>
              <td style="font-family: monospace; font-weight: bold;">${s.rollNumber || '—'}</td>
              <td style="font-family: monospace;">${s.instituteId}</td>
              <td class="left"><strong>${s.name}</strong></td>
              <td>${s.division || 'A'}</td>
              <td>${rc?.totalMarks != null ? rc.totalMarks : (isPending ? 'Pending' : '—')}</td>
              <td>${rc?.maxMarks != null ? rc.maxMarks : '—'}</td>
              <td style="font-family: monospace; font-weight: bold;">${pct != null ? `${pct}%` : '—'}</td>
              <td style="font-family: monospace; font-weight: bold;">${rc?.sgpa != null ? rc.sgpa : '—'}</td>
              <td class="${isPending ? 'pending' : isPass === true ? 'pass' : isPass === false ? 'fail' : 'pending'}">
                ${isPending ? 'PENDING MARKS' : rc ? (isPass ? 'PASS' : 'FAIL') : 'NOT GENERATED'}
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <div class="stats-box">
      <div>Total Enrolled: <strong>${totalStudents}</strong></div>
      <div>Cards Generated: <strong>${processedStudents.length} / ${totalStudents}</strong></div>
      <div>Students Passed: <strong>${passCount}</strong></div>
      <div>Class Pass Percentage: <strong>${passRate}%</strong></div>
    </div>

    <div class="sig-row">
      <div class="sig-item">Prepared & Checked By<br><span style="font-weight: normal; font-size: 9px;">Class Coordinator</span></div>
      <div class="sig-item">Verified By<br><span style="font-weight: normal; font-size: 9px;">Examination Cell Scrutiny</span></div>
      <div class="sig-item">Controller of Examinations<br><span style="font-weight: normal; font-size: 9px;">KIT College of Engineering (Autonomous)</span></div>
    </div>
  </body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedExamType}_Class_Result_Ledger_${selectedClass.name.replace(/\s+/g, '_')}_${termName.replace(/\s+/g, '_')}.html`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${selectedExamType} Class Result Ledger exported successfully`);
  };

  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return classes;
    const q = searchQuery.toLowerCase();
    return classes.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.department?.toLowerCase().includes(q)
    );
  }, [classes, searchQuery]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const q = searchQuery.toLowerCase();
    return classStudents.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.instituteId?.toLowerCase().includes(q) ||
      s.rollNumber?.toLowerCase().includes(q)
    );
  }, [classStudents, searchQuery]);

  const computed = studentDetail?.computed;
  const modalStudent = studentDetail?.student;
  const modalTerm = studentDetail?.academicTerm;
  const modalExamType = studentDetail?.examType || selectedExamType;
  const safePercentage = clampPercentage(computed?.percentage);
  const safeGrandTotalMarks = computed?.totalMarks != null ? Math.min(computed.totalMarks, computed.maxMarks || computed.totalMarks) : null;
  const hasModalPending = computed?.pendingSubjects && computed.pendingSubjects.length > 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brass-400 to-amber-600 flex items-center justify-center text-white shadow-md">
            <Award size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-900">Result Processing & SGPA Generation</h1>
            <p className="text-xs text-text-500">
              Generate result cards by exam series ({selectedExamType}), block cards with pending subjects, and export marks sheets
            </p>
          </div>
        </div>

        {/* Controls: Exam Type & Term selector & Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Exam Type Selector (Midterm / Final / Internal) */}
          <div className="flex items-center gap-1.5 bg-surface-0 border border-border rounded-lg px-2.5 py-1.5 shadow-xs">
            <span className="text-xs font-semibold text-text-500">Exam:</span>
            <select
              value={selectedExamType}
              onChange={e => setSelectedExamType(e.target.value)}
              className="bg-transparent text-text-900 text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="MIDTERM">Midterm Exam</option>
              <option value="FINAL">Final Exam</option>
              <option value="INTERNAL">Internal Exam</option>
            </select>
          </div>

          <select
            value={selectedTermId}
            onChange={e => setSelectedTermId(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-surface-0 text-sm font-medium text-text-900 focus:outline-none focus:border-brass-500 cursor-pointer shadow-xs"
          >
            {terms.map(t => (
              <option key={t.id} value={t.id}>{t.name} {t.isCurrent ? '(Current)' : ''}</option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchClassesOverview(selectedTermId, selectedExamType)}
            disabled={loadingClasses}
            className="flex items-center gap-1.5 text-xs shadow-xs"
          >
            <RefreshCw size={13} className={loadingClasses ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Class List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Building size={14} className="text-text-400" />
            <h2 className="text-sm font-semibold text-text-700 uppercase tracking-wider">
              Classes ({selectedExamType})
            </h2>
            <span className="ml-auto text-xs text-text-400">{filteredClasses.length}</span>
          </div>

          {loadingClasses ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 rounded-full border-2 border-brass-500 border-t-transparent animate-spin" />
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-10 text-text-500 text-sm">
              No classes found for this term.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredClasses.map(cls => (
                <button
                  key={cls.id}
                  onClick={() => fetchClassStudents(cls, selectedExamType)}
                  className={`w-full text-left rounded-xl border p-4 transition-all hover:shadow-sm ${
                    selectedClass?.id === cls.id
                      ? 'border-brass-500 bg-brass-50/50 shadow-sm'
                      : 'border-border bg-surface-0 hover:border-brass-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-text-900">{cls.name}</p>
                      <p className="text-xs text-text-500 mt-0.5">{cls.department} • Sem {cls.semesterNumber}</p>
                    </div>
                    <ChevronRight size={14} className="text-text-400 mt-0.5 shrink-0" />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-text-500">
                      {cls.generatedCount} / {cls.totalStudents} {selectedExamType} cards
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColors[cls.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {statusLabels[cls.status] || cls.status}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-1 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${cls.status === 'COMPLETE' ? 'bg-emerald-500' : cls.status === 'PARTIAL' ? 'bg-sky-500' : 'bg-gray-300'}`}
                      style={{ width: cls.totalStudents > 0 ? `${(cls.generatedCount / cls.totalStudents) * 100}%` : '0%' }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Students / Detail */}
        <div className="lg:col-span-2">
          {!selectedClass ? (
            <div className="flex flex-col items-center justify-center h-60 border-2 border-dashed border-border rounded-2xl text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center">
                <GraduationCap size={22} className="text-text-400" />
              </div>
              <p className="text-text-500 text-sm font-medium">
                Select a class to process and view {selectedExamType} results
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Class action bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-surface-0 border border-border rounded-xl shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-text-900">{selectedClass.name}</p>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brass-100 text-brass-800 font-bold border border-brass-300">
                      {selectedExamType} EXAM
                    </span>
                  </div>
                  <p className="text-xs text-text-500 mt-0.5">
                    {selectedClass.department} • {selectedClass.totalStudents} students enrolled
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportClassResults}
                    disabled={classStudents.length === 0}
                    icon={<FileSpreadsheet size={13} />}
                    className="text-xs font-semibold shadow-xs"
                  >
                    Export {selectedExamType} Results
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleGenerateForClass}
                    disabled={generating || loadingStudents}
                    className="flex items-center gap-2 text-xs font-semibold bg-brass-500 hover:bg-brass-600 text-ink-950 shadow-xs"
                  >
                    <Sparkles size={14} />
                    {generating ? 'Generating...' : `Generate ${selectedExamType} Results`}
                  </Button>
                </div>
              </div>

              {/* Students list */}
              {loadingStudents ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-6 h-6 rounded-full border-2 border-brass-500 border-t-transparent animate-spin" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-10 text-text-500 text-sm border border-border rounded-xl">
                  No students found for this class in the selected term.
                </div>
              ) : (
                <div className="bg-surface-0 border border-border rounded-xl overflow-hidden shadow-xs">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-text-400" />
                      <span className="text-sm font-semibold text-text-700">Enrolled Candidates</span>
                    </div>
                    <span className="text-xs text-text-400">{filteredStudents.length} candidates</span>
                  </div>
                  <div className="divide-y divide-border">
                    {filteredStudents.map(s => {
                      const studentPct = clampPercentage(s.resultCard?.percentage);
                      const isPending = !s.canGenerate && s.pendingSubjects?.length > 0;
                      return (
                        <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-surface-50 transition-colors">
                          <div className="min-w-0 pr-3">
                            <p className="text-sm font-semibold text-text-900 truncate">{s.name}</p>
                            <p className="text-xs text-text-500 font-mono">{s.instituteId} • Roll: {s.rollNumber} • Div: {s.division}</p>
                            {/* Explicit notification of pending subjects */}
                            {isPending && (
                              <p className="text-[11px] text-amber-700 font-semibold mt-0.5 flex items-center gap-1">
                                <AlertTriangle size={12} className="shrink-0" />
                                Pending: {s.pendingSubjects.map(p => `${p.subjectCode} (${p.subjectName})`).join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-auto">
                            {s.resultCard ? (
                              <div className="text-right">
                                <p className="text-xs font-bold text-text-900">SGPA: {s.resultCard.sgpa ?? '—'}</p>
                                <p className="text-xs text-text-500">{studentPct != null ? `${studentPct}%` : '—'}</p>
                              </div>
                            ) : isPending ? (
                              <span
                                className="text-[10px] px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 font-semibold cursor-pointer hover:bg-amber-100"
                                onClick={() => {
                                  setPendingModalInfo({
                                    title: `Pending Subjects: ${s.name}`,
                                    message: `Results cannot be generated for this student until the following subject evaluations are completed:`,
                                    subjects: s.pendingSubjects.map(p => `${p.subjectCode} - ${p.subjectName}`),
                                    skippedStudents: []
                                  });
                                }}
                              >
                                {s.pendingSubjects.length} Subject(s) Pending
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded border bg-gray-50 text-gray-600 border-gray-200 font-semibold">
                                Ready to Generate
                              </span>
                            )}
                            <button
                              onClick={() => fetchStudentDetail(s.id, selectedExamType)}
                              className="p-1.5 rounded-lg hover:bg-surface-100 text-text-400 hover:text-brass-600 transition-colors"
                              title="View Official Grade Card"
                            >
                              <BarChart2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
           PENDING SUBJECTS WARNING MODAL
          ══════════════════════════════════════════════════════════ */}
      {pendingModalInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setPendingModalInfo(null)}>
          <div
            className="bg-surface-0 rounded-2xl shadow-2xl border-2 border-amber-500/40 w-full max-w-lg p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 rounded-xl bg-amber-500/10">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-bold text-text-900 text-base">{pendingModalInfo.title}</h3>
                <p className="text-xs text-text-500">Evaluation marks missing</p>
              </div>
            </div>

            <p className="text-xs text-text-700 leading-relaxed">
              {pendingModalInfo.message}
            </p>

            <div className="space-y-1.5 max-h-48 overflow-y-auto bg-surface-50 p-3 rounded-xl border border-border">
              <p className="text-[11px] font-bold text-text-700 uppercase tracking-wider mb-1">
                Pending Subject Results:
              </p>
              {pendingModalInfo.subjects.map((subj, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>{subj}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setPendingModalInfo(null)}
                className="bg-brass-500 hover:bg-brass-600 text-ink-950 font-semibold text-xs"
              >
                Understood
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
           STUDENT RESULT CARD MODAL (With College Header & EXAM TYPE)
          ══════════════════════════════════════════════════════════ */}
      {studentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm" onClick={() => setStudentDetail(null)}>
          <div
            className="bg-surface-0 rounded-2xl shadow-2xl border border-border w-full max-w-4xl max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Actions Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border sticky top-0 bg-surface-0/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-2.5">
                <Award size={18} className="text-brass-500" />
                <span className="font-bold text-text-900 text-sm">
                  {modalExamType} Grade Card: {studentDetail.student?.name}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brass-100 text-brass-800 font-bold border border-brass-300">
                  {modalExamType}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrintStudentResult}
                  icon={<Printer size={13} />}
                  className="text-xs"
                >
                  Print / Save PDF
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleDownloadStudentResult}
                  icon={<Download size={13} />}
                  className="text-xs bg-brass-500 hover:bg-brass-600 text-ink-950 font-semibold"
                >
                  Download HTML
                </Button>
                <button
                  onClick={() => setStudentDetail(null)}
                  className="p-1.5 rounded-lg hover:bg-surface-100 text-text-400 ml-2"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body: High-Fidelity Printable Document */}
            <div className="p-4 sm:p-6 bg-surface-50 space-y-4">
              {/* Alert if pending */}
              {hasModalPending && (
                <div className="p-4 rounded-xl border-2 border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5 text-amber-900">
                    <AlertTriangle size={15} />
                    Cannot Finalize Result: {computed.pendingSubjects.length} Subject(s) have Pending Marks for {modalExamType}:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {computed.pendingSubjects.map((p, idx) => (
                      <span key={idx} className="bg-white px-2 py-0.5 rounded border border-amber-300 font-mono font-bold text-amber-900">
                        {p.subjectCode} - {p.subjectName} ({p.reason})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {loadingDetail ? (
                <div className="flex items-center justify-center h-48">
                  <div className="w-8 h-8 rounded-full border-2 border-brass-500 border-t-transparent animate-spin" />
                </div>
              ) : computed ? (
                <div
                  id="staff-student-result-printable"
                  className="printable-document bg-white text-black font-serif border-2 border-black p-4 sm:p-5 rounded-lg shadow-sm max-w-[800px] mx-auto space-y-3"
                >
                  {/* Institutional College Header */}
                  <div className="text-center border-b-2 border-black pb-3 space-y-1">
                    <div className="flex items-center justify-center gap-3">
                      <CollegeSealLogo size={58} />
                      <div className="text-center">
                        <div className="text-[9px] uppercase tracking-wider font-mono text-gray-700 font-bold">
                          Autonomous Institute • Affiliated to Shivaji University, Kolhapur
                        </div>
                        <h1 className="text-base sm:text-lg font-bold uppercase tracking-tight text-black font-serif leading-tight">
                          KOLHAPUR INSTITUTE OF TECHNOLOGY'S COLLEGE OF ENGINEERING (AUTONOMOUS)
                        </h1>
                        <div className="text-[9.5px] text-gray-800 font-sans">
                          Approved by AICTE New Delhi • Recognized by Govt. of Maharashtra • Accredited by NAAC with 'A+' Grade
                        </div>
                        <div className="text-[8.5px] text-gray-600 font-sans">
                          Gokul Shirgaon, Kolhapur - 416234, Maharashtra | Web: www.kitcoek.in
                        </div>
                      </div>
                    </div>

                    <div className="pt-1.5">
                      <div className="text-[10px] font-bold tracking-wider text-black uppercase font-mono">
                        OFFICE OF THE CONTROLLER OF EXAMINATIONS
                      </div>
                      <div className="mt-1">
                        <span className="inline-block px-3 py-0.5 border border-black font-mono font-bold text-xs tracking-wider uppercase bg-gray-100">
                          {modalExamType} STATEMENT OF GRADES & MARKS (PROVISIONAL)
                        </span>
                      </div>
                      <div className="text-[10px] font-mono font-semibold text-gray-800 pt-0.5">
                        ACADEMIC TERM: {modalTerm?.name?.toUpperCase() || 'CURRENT TERM'} • EXAM TYPE: {modalExamType}
                      </div>
                    </div>
                  </div>

                  {/* Candidate Profile */}
                  <div className="border border-black p-2 bg-gray-50/50 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      <div>
                        <span className="font-sans font-semibold text-gray-700 text-[10px] block">Candidate Name:</span>
                        <span className="font-serif font-bold text-xs text-black uppercase">{modalStudent?.name}</span>
                      </div>
                      <div>
                        <span className="font-sans font-semibold text-gray-700 text-[10px] block">Permanent PRN:</span>
                        <span className="font-mono font-bold text-xs text-black">{modalStudent?.instituteId}</span>
                      </div>
                      <div>
                        <span className="font-sans font-semibold text-gray-700 text-[10px] block">Roll No & Division:</span>
                        <span className="font-mono text-xs text-black font-bold">
                          {modalStudent?.rollNumber} • Div: {modalStudent?.division || 'A'}
                        </span>
                      </div>
                      <div>
                        <span className="font-sans font-semibold text-gray-700 text-[10px] block">Department:</span>
                        <span className="font-serif text-[11px] text-black font-semibold">{modalStudent?.department}</span>
                      </div>
                      <div>
                        <span className="font-sans font-semibold text-gray-700 text-[10px] block">Class & Semester:</span>
                        <span className="font-serif text-[11px] text-black font-semibold">
                          {modalStudent?.class} {modalStudent?.semesterNumber ? `(Sem ${modalStudent.semesterNumber})` : ''}
                        </span>
                      </div>
                      <div>
                        <span className="font-sans font-semibold text-gray-700 text-[10px] block">Exam Series:</span>
                        <span className="font-mono text-[10px] text-gray-800 font-bold">{modalExamType} Exam Series</span>
                      </div>
                    </div>
                  </div>

                  {/* Course Evaluation Table: ONLY THIS EXAM TYPE */}
                  <div className="border border-black overflow-hidden">
                    <table className="w-full border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-gray-100 border-b border-black text-center font-bold font-sans">
                          <th className="border-r border-black p-1 w-6">#</th>
                          <th className="border-r border-black p-1 text-left">Course Code & Title</th>
                          <th className="border-r border-black p-1 w-10">Credits</th>
                          <th className="border-r border-black p-1 w-12">{modalExamType} Max</th>
                          <th className="border-r border-black p-1 w-12">Scored</th>
                          <th className="border-r border-black p-1 w-12">Percentage</th>
                          <th className="border-r border-black p-1 w-10">Grade</th>
                          <th className="border-r border-black p-1 w-8">GP</th>
                          <th className="p-1 w-12">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {computed.subjectBreakdown.map((s, idx) => {
                          const subjPct = clampPercentage(s.percentage);
                          return (
                            <tr key={idx} className="border-b border-gray-300 text-center">
                              <td className="border-r border-black p-1 font-mono">{idx + 1}</td>
                              <td className="border-r border-black p-1 text-left">
                                <span className="font-mono font-bold mr-1">{s.subjectCode}</span>
                                <span>{s.subjectName}</span>
                              </td>
                              <td className="border-r border-black p-1 font-bold">{s.credits}</td>
                              <td className="border-r border-black p-1">{s.maxMarks != null ? s.maxMarks : '—'}</td>
                              <td className="border-r border-black p-1 font-bold">
                                {s.marksObtained != null ? s.marksObtained : '—'}
                              </td>
                              <td className="border-r border-black p-1 font-mono">{subjPct != null ? `${subjPct}%` : '—'}</td>
                              <td className="border-r border-black p-1 font-bold">{s.grade || '—'}</td>
                              <td className="border-r border-black p-1">{s.gradePoint != null ? s.gradePoint : '—'}</td>
                              <td className="p-1 font-bold">
                                {s.isPending ? (
                                  <span className="text-amber-700">PENDING</span>
                                ) : s.isPass === true ? (
                                  <span className="text-green-800">PASS</span>
                                ) : (
                                  <span className="text-red-800">FAIL</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Summary Row */}
                        <tr className="bg-gray-100 font-bold border-t-2 border-black text-center text-[10.5px]">
                          <td colSpan="2" className="border-r border-black p-1.5 text-left font-sans">
                            {modalExamType} TOTAL / SGPA
                          </td>
                          <td className="border-r border-black p-1.5">{computed.totalCredits}</td>
                          <td className="border-r border-black p-1.5">{computed.maxMarks != null ? computed.maxMarks : '—'}</td>
                          <td className="border-r border-black p-1.5 font-bold">{safeGrandTotalMarks != null ? safeGrandTotalMarks : '—'}</td>
                          <td className="border-r border-black p-1.5 font-mono font-bold">{safePercentage != null ? `${safePercentage}%` : '—'}</td>
                          <td className="border-r border-black p-1.5">{computed.overallGrade || '—'}</td>
                          <td className="border-r border-black p-1.5 font-bold">{computed.sgpa != null ? computed.sgpa.toFixed(2) : '—'}</td>
                          <td className="p-1.5 font-bold">
                            {hasModalPending ? (
                              <span className="text-amber-700">PENDING</span>
                            ) : computed.overallPass === true ? (
                              <span className="text-green-800">PASS</span>
                            ) : (
                              <span className="text-red-800">FAIL</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Box */}
                  <div className="border border-black p-2 bg-gray-50 text-xs">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <span className="text-[9px] text-gray-700 block uppercase font-sans">Credits Earned</span>
                        <strong className="text-sm font-mono text-black">{computed.earnedCredits} / {computed.totalCredits}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-700 block uppercase font-sans">{modalExamType} SGPA</span>
                        <strong className="text-sm font-mono text-black">{computed.sgpa != null ? computed.sgpa.toFixed(2) : '—'}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-700 block uppercase font-sans">Percentage</span>
                        <strong className="text-sm font-mono text-black">{safePercentage != null ? `${safePercentage}%` : '—'}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-700 block uppercase font-sans">Result Awarded</span>
                        <strong className="text-xs font-serif text-black uppercase">
                          {hasModalPending ? 'PENDING' : (computed.classification || (computed.overallPass ? 'FIRST CLASS' : 'FAIL / ATKT'))}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Grading scale */}
                  <div className="border border-black p-1.5 text-[8.5px] text-gray-700 font-sans text-center">
                    Grading Scale: O (90-100%, GP 10) | A+ (80-89%, GP 9) | A (70-79%, GP 8) | B+ (60-69%, GP 7) | B (50-59%, GP 6) | C (40-49%, GP 5) | F (&lt;40%, GP 0)
                  </div>

                  {/* Signatures */}
                  <div className="pt-2 border-t border-black grid grid-cols-3 gap-2 items-end text-center text-xs">
                    <div className="border-t border-black pt-1">
                      <span className="font-sans font-semibold text-[9px] block">Prepared By</span>
                      <span className="text-[8px] text-gray-600 block">Class Coordinator</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <ExamControllerSeal size={44} />
                      <div className="border-t border-black pt-1 w-full">
                        <span className="font-sans font-semibold text-[9px] block">Verified By</span>
                        <span className="text-[8px] text-gray-600 block">Exam Cell</span>
                      </div>
                    </div>
                    <div className="border-t border-black pt-1">
                      <span className="font-sans font-semibold text-[9px] block uppercase">Controller of Examinations</span>
                      <span className="text-[8px] text-gray-600 block">KITCoEK (Autonomous)</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-text-500">
                  <AlertCircle size={28} className="mx-auto mb-2 text-text-300" />
                  <p className="text-sm">No subject data found for this student in the selected term.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
