import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import { toast } from '../../components/ui/Toast';
import { 
  FileText, 
  Printer, 
  Download, 
  Calendar, 
  Layers, 
  Building, 
  User, 
  QrCode, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Sparkles,
  Info,
  RefreshCw
} from 'lucide-react';

export default function StudentHallTicket() {
  const { user } = useAuth();

  const [terms, setTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('MIDTERM');
  
  const [admitCard, setAdmitCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchingCard, setFetchingCard] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // 1. Initial Load: Fetch Academic Terms
  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setLoading(true);
        const termsData = await apiClient.get('/academic-terms');
        setTerms(termsData || []);

        const current = (termsData || []).find(t => t.isCurrent);
        const termId = current ? current.id : (termsData?.[0]?.id || '');
        setSelectedTermId(termId);
      } catch (err) {
        console.error('Error fetching academic terms:', err);
        toast.error('Failed to load academic terms');
      } finally {
        setLoading(false);
      }
    };

    fetchTerms();
  }, []);

  // 2. Fetch Student Admit Card whenever term or exam type changes
  useEffect(() => {
    if (!selectedTermId || !user?.id) return;

    const fetchAdmitCard = async () => {
      try {
        setFetchingCard(true);
        setErrorMsg(null);
        setAdmitCard(null);

        const params = new URLSearchParams();
        if (selectedTermId) params.append('academicTermId', selectedTermId);
        if (selectedExamType) params.append('examType', selectedExamType);

        const res = await apiClient.get(`/hall-tickets/student/${user.id}?${params.toString()}`);
        setAdmitCard(res);
      } catch (err) {
        console.warn('Admit card fetch returned error/not found:', err.response?.data?.error);
        const msg = err.response?.data?.error || `No ${selectedExamType} hall ticket has been published for this semester yet.`;
        setErrorMsg(msg);
        setAdmitCard(null);
      } finally {
        setFetchingCard(false);
      }
    };

    fetchAdmitCard();
  }, [selectedTermId, selectedExamType, user?.id]);

  // Handle System Print targeting exclusively the Admit Card (Single-Page A4)
  const handlePrint = () => {
    const printEl = document.getElementById('student-admit-card-printable');
    if (!printEl) {
      window.print();
      return;
    }

    try {
      const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(el => el.outerHTML)
        .join('\n');

      let iframe = document.getElementById('student-hall-ticket-print-frame');
      if (iframe) iframe.remove();

      iframe = document.createElement('iframe');
      iframe.id = 'student-hall-ticket-print-frame';
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
            <title>${selectedExamType}_Admit_Card_${admitCard?.student?.rollNumber || 'HallTicket'}</title>
            ${styleLinks}
            <style>
              @page {
                size: A4 portrait;
                margin: 6mm 8mm;
              }
              *, *::before, *::after {
                box-sizing: border-box;
              }
              html, body {
                width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #FFFFFF !important;
                color: #000000 !important;
                font-family: "IBM Plex Serif", serif;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .printable-document {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
              }
            </style>
          </head>
          <body>
            <div class="printable-document p-0 bg-white text-black font-serif">
              ${printEl.innerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          iframe.remove();
        }, 1500);
      }, 350);
    } catch (err) {
      console.warn('Iframe print fallback to window.print:', err);
      window.print();
    }
  };

  // Direct standalone HTML download
  const handleDownloadHtml = () => {
    const printEl = document.getElementById('student-admit-card-printable');
    if (!printEl) return;

    const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => el.outerHTML)
      .join('\n');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${selectedExamType}_Hall_Ticket_${admitCard?.student?.rollNumber || 'AdmitCard'}.html</title>
    ${styleLinks}
    <style>
      @page { size: A4 portrait; margin: 6mm 8mm; }
      body { margin: 0; padding: 24px; font-family: "IBM Plex Serif", serif; background: #fff; color: #000; }
      .container { max-width: 820px; margin: 0 auto; }
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
    link.download = `${selectedExamType}_Hall_Ticket_${admitCard?.student?.rollNumber || 'AdmitCard'}.html`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Admit card file downloaded');
  };

  const selectedTermName = terms.find(t => t.id === selectedTermId)?.name || 'Current Term';

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-900 font-sans flex items-center gap-2">
            <span>Examination Hall Ticket</span>
          </h1>
          <p className="text-sm text-text-500 mt-1">
            Official Admit Card for institute examinations. Filter by Semester & Exam Series to view and download.
          </p>
        </div>

        {admitCard && (
          <div className="flex items-center gap-2.5">
            <Button
              variant="primary"
              onClick={handlePrint}
              className="flex items-center gap-1.5 font-semibold text-xs shadow-sm bg-brass-500 hover:bg-brass-600"
            >
              <Printer size={15} />
              <span>Print / Save as PDF</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadHtml}
              className="flex items-center gap-1.5 text-xs text-text-700 hover:text-text-900 border-border"
            >
              <Download size={14} />
              <span>Download HTML</span>
            </Button>
          </div>
        )}
      </div>

      {/* 2. Filter Selector Bar */}
      <div className="bg-surface-0 border border-border rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-900">
            <Calendar size={16} className="text-brass-600" />
            <span>Select Examination Session</span>
          </div>
          <span className="text-xs text-text-400 font-mono">
            Candidate PRN: {user?.instituteId || 'Student'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Academic Semester / Term Dropdown */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-600 mb-1.5">
              Academic Term / Semester
            </label>
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              disabled={loading}
              className="w-full text-sm rounded-lg border border-border bg-surface-50 px-3 py-2 text-text-900 focus:outline-none focus:border-brass-500 font-medium"
            >
              {terms.map(term => (
                <option key={term.id} value={term.id}>
                  {term.name} {term.isCurrent ? '★ (Current Semester)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Type / Series Dropdown */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-600 mb-1.5">
              Examination Series / Type
            </label>
            <select
              value={selectedExamType}
              onChange={(e) => setSelectedExamType(e.target.value)}
              className="w-full text-sm rounded-lg border border-border bg-surface-50 px-3 py-2 text-text-900 focus:outline-none focus:border-brass-500 font-medium"
            >
              <option value="MIDTERM">MIDTERM (Mid-Semester Examination)</option>
              <option value="FINAL">FINAL (End-Semester Examination)</option>
              <option value="INTERNAL">INTERNAL (Continuous Evaluation / CIE)</option>
              <option value="MAKEUP">MAKEUP (Backlog / Remedial Examination)</option>
            </select>
          </div>
        </div>

        {/* Selected Scope Banner */}
        <div className="p-3 bg-surface-50 border border-border rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-text-700">
            <Info size={14} className="text-brass-600 shrink-0" />
            <span>
              Viewing <strong className="text-text-900 uppercase font-mono">{selectedExamType}</strong> hall ticket for <strong className="text-text-900">{selectedTermName}</strong>.
            </span>
          </div>
          <span className="text-[11px] font-mono text-text-500 bg-surface-100 px-2 py-0.5 rounded border border-border">
            Strict Series Isolation: Only {selectedExamType} subjects appear
          </span>
        </div>
      </div>

      {/* 3. Main Content: Admit Card Display or Empty State */}
      {fetchingCard ? (
        <div className="bg-surface-0 border border-border rounded-xl p-12 text-center shadow-xs space-y-3">
          <div className="w-10 h-10 border-3 border-brass-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-text-700">Loading your {selectedExamType} admit card...</p>
          <p className="text-xs text-text-400">Verifying enrolled courses and seat assignment</p>
        </div>
      ) : admitCard ? (
        <div className="space-y-4">
          
          {/* Quick Info Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-surface-0 border border-border rounded-xl p-3 sm:p-4 shadow-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-semibold text-text-500">Assigned Seat Number</span>
              <div className="font-mono font-bold text-base text-brass-700">{admitCard.seatNumber}</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-semibold text-text-500">Examination Series</span>
              <div className="font-mono font-bold text-sm text-text-900 uppercase">{admitCard.examType || selectedExamType}</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-semibold text-text-500">Scheduled Courses</span>
              <div className="font-sans font-bold text-sm text-text-900">
                {admitCard.allExams?.length || 0} Subject Exam{admitCard.allExams?.length > 1 ? 's' : ''}
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-semibold text-text-500">Examination Venue</span>
              <div className="font-sans text-xs text-text-800 truncate" title={admitCard.examCenter}>
                {admitCard.examCenter || 'Main Campus Hall'}
              </div>
            </div>
          </div>

          {/* Printable Document Box: Exact A4 Proportions */}
          <div className="bg-surface-0 border border-border rounded-xl shadow-md p-3 sm:p-6 overflow-x-auto">
            <div 
              id="student-admit-card-printable" 
              className="printable-document max-w-[800px] mx-auto p-4 sm:p-5 bg-white text-black font-serif border-2 border-black"
            >
              <div className="border border-black p-3 sm:p-4 space-y-3.5">
                
                {/* 1. Institutional Header */}
                <div className="text-center border-b border-black pb-2.5 space-y-0.5">
                  <div className="text-[9px] uppercase tracking-wider font-mono text-gray-700 font-bold">
                    Autonomous Institute • Affiliated to Shivaji University
                  </div>
                  <h1 className="text-base sm:text-lg font-bold uppercase tracking-tight text-black font-serif leading-tight">
                    KOLHAPUR INSTITUTE OF TECHNOLOGY'S COLLEGE OF ENGINEERING (AUTONOMOUS)
                  </h1>
                  <h2 className="text-[11px] font-semibold tracking-wide text-black uppercase">
                    OFFICE OF THE CONTROLLER OF EXAMINATIONS
                  </h2>
                  <div className="pt-1">
                    <span className="inline-block px-3 py-0.5 border border-black font-mono font-bold text-xs tracking-wider uppercase bg-gray-100">
                      {admitCard.examType || selectedExamType} EXAMINATION HALL TICKET / ADMIT CARD
                    </span>
                  </div>
                  <div className="text-[10px] font-mono font-medium text-gray-800 pt-0.5">
                    ACADEMIC TERM: {admitCard.academicTerm?.name?.toUpperCase() || selectedTermName.toUpperCase()}
                  </div>
                </div>

                {/* 2. Candidate & Seat Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 border border-black p-2.5 bg-gray-50/50">
                  <div className="md:col-span-2 space-y-1 text-xs">
                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-sans font-semibold text-gray-700 text-[11px]">Candidate Name:</span>
                      <span className="col-span-2 font-serif font-bold text-xs sm:text-sm text-black uppercase">
                        {admitCard.student?.name}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-sans font-semibold text-gray-700 text-[11px]">Permanent PRN / ID:</span>
                      <span className="col-span-2 font-mono font-bold text-xs text-black">
                        {admitCard.student?.instituteId}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-sans font-semibold text-gray-700 text-[11px]">Roll No & Division:</span>
                      <span className="col-span-2 font-mono text-xs text-black">
                        {admitCard.student?.rollNumber} • Div: {admitCard.student?.division?.name || 'A'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-sans font-semibold text-gray-700 text-[11px]">Department / Program:</span>
                      <span className="col-span-2 font-serif text-[11px] text-black">
                        {admitCard.student?.department?.name || 'Engineering'} ({admitCard.student?.department?.code})
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-sans font-semibold text-gray-700 text-[11px]">Attempt Scope:</span>
                      <span className="col-span-2 font-mono font-bold text-[11px] text-black uppercase">
                        {admitCard.allExams?.some(e => e.attemptNumber > 1) 
                          ? 'REGULAR & BACKLOG RE-ATTEMPT (RULE 18)' 
                          : 'REGULAR ENROLLED (ATTEMPT #1)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <span className="font-sans font-semibold text-gray-700 text-[11px]">Examination Center:</span>
                      <span className="col-span-2 font-serif text-[11px] text-black font-medium">
                        {admitCard.examCenter || 'Main Campus Examination Hall'}
                      </span>
                    </div>
                  </div>

                  {/* Seat Box & QR Code */}
                  <div className="flex flex-col items-center justify-between border-t md:border-t-0 md:border-l border-black pt-2 md:pt-0 md:pl-2.5 space-y-1.5">
                    <div className="w-full text-center p-1.5 border border-black bg-white">
                      <div className="text-[9px] font-sans font-semibold uppercase text-gray-600">Assigned Seat Number</div>
                      <div className="text-xl sm:text-2xl font-mono font-bold tracking-wider text-black">
                        {admitCard.seatNumber}
                      </div>
                    </div>

                    <div className="w-16 h-16 border border-dashed border-black flex flex-col items-center justify-center text-center p-1 bg-white">
                      <QrCode size={28} className="text-black" />
                      <span className="text-[7px] font-mono leading-none mt-0.5">VERIFIED</span>
                    </div>
                  </div>
                </div>

                {/* 3. Examination Timetable Table (Strictly only selected exam type) */}
                <div className="space-y-1">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-black flex items-center justify-between">
                    <span>Scheduled Course Examinations ({admitCard.allExams?.length || 1} Subject{admitCard.allExams?.length > 1 ? 's' : ''})</span>
                    <span className="text-[9px] font-sans font-normal text-gray-600">Valid exclusively for {admitCard.examType || selectedExamType}</span>
                  </div>
                  <table className="w-full border-collapse border border-black text-[11px]">
                    <thead>
                      <tr className="bg-gray-100 border-b border-black font-sans">
                        <th className="border border-black px-2 py-1 text-center font-semibold w-20">Course Code</th>
                        <th className="border border-black px-2 py-1 text-left font-semibold">Course Title</th>
                        <th className="border border-black px-2 py-1 text-center font-semibold w-24">Exam Type</th>
                        <th className="border border-black px-2 py-1 text-center font-semibold w-24">Date</th>
                        <th className="border border-black px-2 py-1 text-center font-semibold w-36">Session / Time</th>
                        <th className="border border-black px-2 py-1 text-center font-semibold w-28">Invigilator Sign</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admitCard.allExams && admitCard.allExams.length > 0 ? (
                        admitCard.allExams.map((ex, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="border border-black px-2 py-1 font-mono font-bold text-center">
                              {ex.subject?.code || ex.subjectCode}
                            </td>
                            <td className="border border-black px-2 py-1 font-serif">
                              {ex.subject?.name || ex.subjectName}
                              {ex.attemptNumber > 1 && (
                                <span className="ml-1.5 text-[9px] font-mono font-bold text-gray-700 uppercase bg-gray-200 px-1 py-0.2 rounded">
                                  Backlog (Att. #{ex.attemptNumber})
                                </span>
                              )}
                            </td>
                            <td className="border border-black px-2 py-1 font-mono text-center uppercase text-[10px]">
                              {ex.examType?.replace('_', ' ')}
                            </td>
                            <td className="border border-black px-2 py-1 font-mono text-center font-medium">
                              {ex.examDate 
                                ? new Date(ex.examDate).toLocaleDateString('en-GB') 
                                : 'DD/MM/YYYY'}
                            </td>
                            <td className="border border-black px-2 py-1 font-mono text-center text-[10px]">
                              {ex.startTime || (ex.examDate ? new Date(ex.examDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM')} ({ex.durationMinutes || 180} min)
                            </td>
                            <td className="border border-black px-2 py-1 text-center text-gray-400 font-serif italic text-xs">
                              ___________
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="border border-black px-2 py-2 text-center text-gray-500 italic">
                            No scheduled examinations found for this admit card.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 4. Compact Instructions */}
                <div className="border border-black p-2 bg-gray-50/30 text-[10px] space-y-0.5 leading-tight">
                  <div className="font-sans font-bold uppercase tracking-wide text-black text-[10px]">
                    Instructions for Candidate:
                  </div>
                  <ol className="list-decimal pl-4 space-y-0.5 font-serif text-gray-800 text-[9.5px]">
                    <li>Candidate must occupy their assigned seat at least 20 minutes before the scheduled exam start time.</li>
                    <li>College Photo ID Card and this printed Hall Ticket are mandatory for entry into the examination hall.</li>
                    <li>Electronic devices including smartwatches, mobile phones, and programmable calculators are strictly prohibited.</li>
                    <li>This hall ticket is valid for all enrolled subjects listed in the timetable above during this examination series.</li>
                  </ol>
                </div>

                {/* 5. Triple Signature Row */}
                <div className="pt-4 grid grid-cols-3 gap-6 text-center text-[11px]">
                  <div className="space-y-0.5">
                    <div className="border-t border-black pt-1 font-serif">
                      Candidate's Signature
                    </div>
                    <div className="text-[9px] font-sans text-gray-600">(Sign in supervisor's presence)</div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="border-t border-black pt-1 font-serif">
                      Junior Supervisor's Signature
                    </div>
                    <div className="text-[9px] font-sans text-gray-600">(Verified candidate identity)</div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="border-t border-black pt-1 font-serif font-bold">
                      Controller of Examinations
                    </div>
                    <div className="text-[9px] font-mono text-gray-600">KIT Autonomous Kolhapur</div>
                  </div>
                </div>

                {/* 6. Footer verification line */}
                <div className="border-t border-black/30 pt-1.5 flex items-center justify-between text-[8.5px] font-mono text-gray-600">
                  <span>REF: NEXUS-HT-{admitCard.student?.instituteId}-{admitCard.seatNumber}</span>
                  <span>ISSUED: {new Date(admitCard.generatedAt || Date.now()).toLocaleString()}</span>
                  <span>PAGE 1 OF 1 (A4)</span>
                </div>

              </div>
            </div>
          </div>

        </div>
      ) : (
        /* Empty State */
        <div className="bg-surface-0 border border-border rounded-xl p-10 text-center shadow-xs space-y-4">
          <div className="w-14 h-14 bg-surface-100 rounded-full flex items-center justify-center mx-auto text-text-400">
            <FileText size={28} />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-semibold text-text-900 font-sans">
              No Hall Ticket Issued Yet
            </h3>
            <p className="text-xs text-text-500">
              {errorMsg || `There is currently no ${selectedExamType} hall ticket generated for ${selectedTermName}.`}
            </p>
          </div>
          <div className="p-3 bg-surface-50 border border-border rounded-lg max-w-md mx-auto text-xs text-text-600 text-left space-y-1">
            <div className="font-semibold text-text-800 flex items-center gap-1.5">
              <Info size={14} className="text-brass-600" />
              <span>What to check:</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-text-500">
              <li>Ensure you have selected the correct Academic Term / Semester above.</li>
              <li>Try switching between <strong>MIDTERM</strong>, <strong>FINAL</strong>, or <strong>INTERNAL</strong>.</li>
              <li>Hall tickets become visible here once published by the Examination Staff.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
