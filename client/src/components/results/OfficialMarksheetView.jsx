import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { 
  Award, 
  Printer, 
  FileText, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Sparkles,
  BookOpen,
  CalendarCheck,
  RefreshCw
} from 'lucide-react';

export default function OfficialMarksheetView({ studentId = null, isParent = false }) {
  const [academicTerms, setAcademicTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [activeResultType, setActiveResultType] = useState('COMBINED'); // 'COMBINED' | 'MSE' | 'ESE'

  const [resultCardData, setResultCardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch terms on mount
  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    try {
      let terms = [];
      try {
        const termsRes = await apiClient.get('/academic-terms');
        terms = Array.isArray(termsRes) ? termsRes : [];
      } catch (e) {
        // Fallback to /exams/form-options if available
        const fallback = await apiClient.get('/exams/form-options').catch(() => null);
        terms = fallback?.academicTerms || [];
      }

      setAcademicTerms(terms);
      const current = terms.find(t => t.isCurrent) || terms[0];
      if (current) {
        setSelectedTermId(current.id);
      }
    } catch (error) {
      toast.error('Failed to load academic terms');
    }
  };

  // Fetch result card when term or resultType or studentId changes
  useEffect(() => {
    if (selectedTermId) {
      fetchResultCard();
    }
  }, [selectedTermId, activeResultType, studentId]);

  const fetchResultCard = async () => {
    setIsLoading(true);
    try {
      let url = '';
      if (isParent || studentId) {
        url = `/result-cards/my-card?academicTermId=${selectedTermId}&resultType=${activeResultType}${studentId ? `&studentId=${studentId}` : ''}`;
      } else {
        url = `/result-cards/my-card?academicTermId=${selectedTermId}&resultType=${activeResultType}`;
      }

      const data = await apiClient.get(url);
      setResultCardData(data);
    } catch (error) {
      // 404 or incomplete results
      setResultCardData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const currentTermObj = academicTerms.find(t => t.id === selectedTermId);

  return (
    <div className="space-y-6">
      {/* Action / Toolbar (Hidden on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-semibold text-text-900 tracking-tight flex items-center gap-2">
            <Award className="text-ink-700" size={22} />
            Official Statement of Grades & Marksheet
          </h2>
          <p className="text-xs text-text-500 mt-1">
            Official autonomous examination statement. SGPA is generated exclusively on the Combined Result.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Term Selector */}
          <select
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            className="rounded-md border border-border bg-surface-0 px-3 py-1.5 text-xs font-semibold text-text-900 focus:border-ink-700 shadow-xs"
          >
            {academicTerms.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} {t.isCurrent ? '(Current)' : ''}
              </option>
            ))}
          </select>

          <Button
            variant="secondary"
            onClick={fetchResultCard}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </Button>

          {resultCardData?.resultCardId && (
            <Button
              variant="accent"
              onClick={handlePrint}
              className="flex items-center gap-2 text-xs shadow-xs"
            >
              <Printer size={15} />
              <span>Print Marksheet</span>
            </Button>
          )}
        </div>
      </div>

      {/* 3 Result Type Options (Hidden on print) */}
      <div className="bg-surface-0 border border-border rounded-xl p-1.5 flex flex-wrap items-center gap-2 shadow-xs print:hidden">
        <button
          type="button"
          onClick={() => setActiveResultType('COMBINED')}
          className={`flex-1 min-w-[200px] px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
            activeResultType === 'COMBINED'
              ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
              : 'bg-surface-50 text-text-600 hover:text-text-900 hover:bg-surface-100 border-border/60'
          }`}
        >
          <Award size={15} className={activeResultType === 'COMBINED' ? 'text-amber-400' : 'text-text-400'} />
          <span>Combined Result (Final SGPA)</span>
          <span className={`px-1.5 py-0.2 rounded text-3xs font-mono font-semibold ${
            activeResultType === 'COMBINED' ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-200 text-slate-700'
          }`}>
            Includes SGPA
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveResultType('MSE')}
          className={`flex-1 min-w-[180px] px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
            activeResultType === 'MSE'
              ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
              : 'bg-surface-50 text-text-600 hover:text-text-900 hover:bg-surface-100 border-border/60'
          }`}
        >
          <CalendarCheck size={15} className={activeResultType === 'MSE' ? 'text-blue-400' : 'text-text-400'} />
          <span>Mid-Semester (MSE Result)</span>
          <span className="text-3xs font-normal opacity-70">Internal</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveResultType('ESE')}
          className={`flex-1 min-w-[180px] px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
            activeResultType === 'ESE'
              ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
              : 'bg-surface-50 text-text-600 hover:text-text-900 hover:bg-surface-100 border-border/60'
          }`}
        >
          <BookOpen size={15} className={activeResultType === 'ESE' ? 'text-purple-400' : 'text-text-400'} />
          <span>End-Semester (ESE Result)</span>
          <span className="text-3xs font-normal opacity-70">External</span>
        </button>
      </div>

      {/* Main Marksheet View */}
      {isLoading ? (
        <div className="p-16 text-center text-text-500 bg-surface-0 border border-border rounded-xl">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-3" />
          <div className="text-sm font-medium">Loading official examination statement...</div>
        </div>
      ) : !resultCardData || !resultCardData.resultCardId ? (
        <div className="bg-surface-0 border border-border rounded-xl p-10">
          <EmptyState
            icon={FileText}
            title={`${activeResultType} Results Not Yet Declared`}
            description={`The Examination Cell has not yet released the ${activeResultType} statement of grades for the selected academic term. Please check back after verification and result processing by the Autonomous Examination Cell.`}
          />
        </div>
      ) : (
        /* OFFICIAL PRINTABLE AUTONOMOUS MARKSHEET CARD */
        <div className="bg-white border-2 border-slate-900 rounded-xl p-8 shadow-sm font-serif print:border-none print:shadow-none print:p-0 print:m-0 space-y-6">
          {/* College Official Branding Header */}
          <div className="text-center border-b-2 border-slate-900 pb-5">
            <div className="flex items-center justify-center gap-2 text-slate-950 font-black tracking-wide uppercase text-lg sm:text-xl">
              <Building2 size={24} className="shrink-0 text-slate-800" />
              <span>KIT'S COLLEGE OF ENGINEERING (AUTONOMOUS) KOLHAPUR</span>
            </div>
            <div className="text-xs font-sans text-slate-600 mt-1 uppercase tracking-wider font-semibold">
              An Autonomous Institute Affiliated to Shivaji University, Kolhapur · NAAC 'A+' Grade
            </div>
            <div className="mt-3 inline-block px-4 py-1 bg-slate-900 text-white rounded font-sans text-xs font-bold uppercase tracking-widest">
              {activeResultType === 'COMBINED' 
                ? 'Semester Grade Report (SGPA Statement)' 
                : `${activeResultType} Statement of Marks`}
            </div>
          </div>

          {/* Candidate Profile Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 border border-slate-300 rounded-lg p-4 font-sans text-xs">
            <div>
              <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider block">Candidate Name</span>
              <div className="font-bold text-slate-950 text-sm mt-0.5">{resultCardData.student?.name}</div>
            </div>
            <div>
              <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider block">Roll Number</span>
              <div className="font-mono font-bold text-slate-950 text-sm mt-0.5">{resultCardData.student?.rollNumber}</div>
            </div>
            <div>
              <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider block">PRN / Institute ID</span>
              <div className="font-mono font-bold text-slate-950 text-sm mt-0.5">{resultCardData.student?.instituteId}</div>
            </div>
            <div>
              <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider block">Programme & Dept</span>
              <div className="font-bold text-slate-950 text-xs mt-0.5">
                {resultCardData.student?.className} ({resultCardData.student?.departmentName || 'Engineering'})
              </div>
            </div>
            <div className="col-span-2">
              <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider block">Examination Term</span>
              <div className="font-semibold text-slate-900 text-xs mt-0.5">
                {currentTermObj?.name || 'Academic Term'}
              </div>
            </div>
            <div className="col-span-2">
              <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider block">Result Type</span>
              <div className="font-semibold text-slate-900 text-xs mt-0.5">
                {activeResultType === 'COMBINED' ? 'Final Combined (All Components)' : `${activeResultType} Component Only`}
              </div>
            </div>
          </div>

          {/* Courses & Marks Statement Table */}
          <div className="border-2 border-slate-900 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-900 font-sans text-2xs uppercase text-slate-900 font-bold tracking-wider">
                  <th className="py-2.5 px-3">Course Code</th>
                  <th className="py-2.5 px-4 min-w-[200px]">Course Title</th>
                  <th className="py-2.5 px-2 text-center w-14">Credits</th>
                  <th className="py-2.5 px-3 text-center w-24">
                    {activeResultType === 'MSE' ? 'MSE (30)' : activeResultType === 'ESE' ? 'ESE (50)' : 'Marks'}
                  </th>
                  <th className="py-2.5 px-2 text-center w-16">%</th>
                  {activeResultType === 'COMBINED' && (
                    <>
                      <th className="py-2.5 px-2 text-center w-14">Grade</th>
                      <th className="py-2.5 px-2 text-center w-12">GP</th>
                      <th className="py-2.5 px-2 text-center w-16">Credit Pts</th>
                    </>
                  )}
                  <th className="py-2.5 px-3 text-center w-20">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 font-sans">
                {resultCardData.subjects?.map((s) => (
                  <tr key={s.enrollmentId} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{s.subjectCode}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-950">{s.subjectName}</td>
                    <td className="py-2.5 px-2 text-center font-mono font-semibold text-slate-800">{s.credits}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                      {s.marksObtained !== null ? `${s.marksObtained} / ${s.maxMarks}` : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-slate-700">
                      {s.percentage !== null ? `${s.percentage}%` : '—'}
                    </td>

                    {activeResultType === 'COMBINED' && (
                      <>
                        <td className="py-2.5 px-2 text-center font-mono font-black text-slate-900">
                          {s.grade}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-slate-800">
                          {s.gradePoint}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-950">
                          {s.creditPoints}
                        </td>
                      </>
                    )}

                    <td className="py-2.5 px-3 text-center">
                      {s.isPass === true ? (
                        <span className="text-emerald-700 font-bold text-3xs uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                          Pass
                        </span>
                      ) : s.isPass === false ? (
                        <span className="text-rose-700 font-bold text-3xs uppercase bg-rose-50 px-2 py-0.5 rounded border border-rose-300">
                          {activeResultType === 'COMBINED' ? 'ATKT' : 'Fail'}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium text-3xs uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Performance Summary Banner */}
          <div className="bg-slate-50 border-2 border-slate-900 rounded-lg p-4 font-sans flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider">
                  {activeResultType === 'COMBINED' ? 'Total Credits' : 'Courses Evaluated'}
                </span>
                <div className="font-mono text-base font-bold text-slate-950 mt-0.5">
                  {activeResultType === 'COMBINED' 
                    ? `${resultCardData.earnedCredits} / ${resultCardData.totalCredits} Earned`
                    : `${resultCardData.subjects?.length || 0} Courses`}
                </div>
              </div>

              <div>
                <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider">
                  Aggregate Marks
                </span>
                <div className="font-mono text-base font-bold text-slate-950 mt-0.5">
                  {resultCardData.totalMarksObtained} / {resultCardData.totalMaxMarks} ({resultCardData.percentage}%)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider block">
                  Semester Standing
                </span>
                <div className="mt-0.5">
                  {resultCardData.standing === 'PASS' ? (
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                      PASS
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-900 border border-rose-300">
                      {activeResultType === 'COMBINED' ? 'ATKT / BACKLOG' : 'NEEDS IMPROVEMENT'}
                    </span>
                  )}
                </div>
              </div>

              {/* SGPA Box: Displayed Prominently ONLY on Combined Result */}
              {activeResultType === 'COMBINED' ? (
                <div className="bg-white border-2 border-slate-900 rounded-lg px-5 py-2.5 text-center shadow-xs">
                  <span className="text-3xs font-black uppercase tracking-widest text-slate-700 block">
                    SGPA
                  </span>
                  <span className="font-mono text-2xl font-black text-slate-950 block leading-tight">
                    {Number(resultCardData.sgpa || 0).toFixed(2)}
                  </span>
                </div>
              ) : (
                <div className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-center">
                  <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">
                    SGPA
                  </span>
                  <span className="text-2xs font-mono text-slate-400 italic block">
                    Combined Only
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Official Signatures & Seal Section */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-3 gap-6 font-sans text-xs">
            <div>
              <span className="text-3xs text-slate-500 uppercase tracking-wider block">Declaration Date</span>
              <div className="font-mono font-semibold text-slate-900 mt-1">
                {resultCardData.processedAt 
                  ? new Date(resultCardData.processedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>

            <div className="text-center">
              <span className="text-3xs text-slate-500 uppercase tracking-wider block">Autonomous Cell Seal</span>
              <div className="mt-2 text-2xs font-mono text-slate-400 italic">
                [ KITCoEK Examination Seal ]
              </div>
            </div>

            <div className="text-right">
              <div className="h-6" />
              <div className="border-t border-slate-900 pt-1 font-bold text-slate-950">
                Controller of Examinations
              </div>
              <span className="text-3xs text-slate-500">KIT's College of Engineering</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
