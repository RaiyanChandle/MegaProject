import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { toast } from '../../components/ui/Toast';
import { 
  FileText, 
  Printer, 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  GraduationCap,
  ShieldCheck,
  Download,
  User
} from 'lucide-react';

export default function StudentHallTicket() {
  const [groupedTickets, setGroupedTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTabId, setActiveTabId] = useState('');

  useEffect(() => {
    fetchMyTickets();
  }, []);

  const fetchMyTickets = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get('/hall-tickets/my-tickets');
      setGroupedTickets(data);
      if (data.length > 0) {
        setActiveTabId(data[0].id);
      }
    } catch (error) {
      toast.error('Failed to load examination hall tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const activeTicket = groupedTickets.find(t => t.id === activeTabId) || groupedTickets[0];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border print:hidden">
        <div>
          <h1 className="text-3xl font-semibold text-text-900 tracking-tight">Examination Hall Tickets</h1>
          <p className="text-sm text-text-500 mt-1">
            Download and print official admit cards for Mid-Semester (MSE) and End-Semester (ESE) examinations.
          </p>
        </div>

        {activeTicket && (
          <div className="flex items-center gap-2">
            <Button
              variant="accent"
              onClick={handlePrint}
              className="flex items-center gap-2 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print Hall Ticket</span>
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-text-500 text-sm bg-surface-0 border border-border rounded-md">
          Loading your examination hall tickets...
        </div>
      ) : groupedTickets.length === 0 ? (
        <div className="bg-surface-0 border border-border rounded-md p-8">
          <EmptyState
            icon={FileText}
            title="No Hall Tickets Issued"
            description="No hall tickets have been generated for you yet. The Exam Cell issues admit cards approximately 1-2 weeks prior to scheduled examination sessions."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Exam Session Tabs (Separate MSE vs ESE vs Backlog) */}
          <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto print:hidden">
            {groupedTickets.map((ticket) => {
              const isActive = ticket.id === activeTabId;
              const isMse = ticket.examType === 'MIDTERM';
              const isEse = ticket.examType === 'FINAL';

              return (
                <button
                  key={ticket.id}
                  onClick={() => setActiveTabId(ticket.id)}
                  className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors flex items-center gap-2 border-b-2 ${
                    isActive
                      ? 'border-ink-900 text-ink-900 bg-surface-0 shadow-xs'
                      : 'border-transparent text-text-500 hover:text-text-900 hover:bg-surface-50'
                  }`}
                >
                  <span>{ticket.title}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                    isMse 
                      ? 'bg-info/10 text-info border-info/20' 
                      : isEse 
                      ? 'bg-ink-100 text-ink-900 border-ink-200' 
                      : 'bg-warning/10 text-warning border-warning/20'
                  }`}>
                    {ticket.examType}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Official Hall Ticket Document */}
          {activeTicket && (
            <div className="space-y-4">
              <div 
                id="student-hall-ticket-doc"
                className="bg-white text-black p-8 rounded-md border-2 border-gray-900 space-y-6 shadow-sm print:m-0 print:border-none print:p-0 print:shadow-none"
                style={{ fontFamily: "'IBM Plex Serif', Georgia, serif" }}
              >
                {/* Institutional Header */}
                <div className="text-center border-b-2 border-gray-900 pb-4 space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight uppercase">
                    KIT's College of Engineering (Autonomous) Kolhapur
                  </h2>
                  <div className="text-xs uppercase tracking-wider text-gray-700 font-sans">
                    Office of the Controller of Examinations • Autonomous Institution
                  </div>
                  <div className="pt-1.5">
                    <span className="inline-block px-4 py-1.5 border-2 border-gray-900 text-xs font-bold uppercase tracking-widest bg-gray-50">
                      OFFICIAL ADMIT CARD / HALL TICKET — {activeTicket.title.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 font-mono pt-1">
                    Academic Term: {activeTicket.academicTermName} • Hall Ticket No: <strong className="text-gray-900 font-bold">{activeTicket.hallTicketNumber}</strong>
                  </div>
                </div>

                {/* Candidate Information & Photo Section */}
                <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-5 border border-gray-900 p-4 text-xs font-sans">
                  {/* Particulars Grid */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase font-bold">Candidate Name</span>
                      <strong className="text-gray-900 text-base font-serif block">{activeTicket.student?.name}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase font-bold">Institute ID / PRN</span>
                      <span className="font-mono font-bold text-sm text-gray-900">{activeTicket.student?.instituteId}</span>
                    </div>

                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase font-bold">Department / Branch</span>
                      <span className="text-gray-900 font-semibold">{activeTicket.student?.department?.name || 'Engineering'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase font-bold">Class & Semester</span>
                      <span className="text-gray-900 font-medium">
                        {activeTicket.student?.class?.name || 'Undergraduate'} • Sem {activeTicket.student?.class?.semesterNumber || 'N/A'}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase font-bold">Allocated Seat Number</span>
                      <span className="font-mono font-bold text-base text-gray-900 block">{activeTicket.seatNumber}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase font-bold">Examination Venue</span>
                      <span className="text-gray-900 font-semibold">{activeTicket.examCenter}</span>
                    </div>
                  </div>

                  {/* Passport Photo Box (For sticking student photograph) */}
                  <div className="w-32 h-40 border-2 border-dashed border-gray-800 rounded bg-gray-50 flex flex-col items-center justify-center p-2.5 text-center shrink-0 self-center sm:self-stretch">
                    <div className="w-9 h-9 rounded-full border border-dashed border-gray-400 flex items-center justify-center mb-1.5 text-gray-400">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <span className="text-[10px] font-sans font-bold text-gray-800 uppercase tracking-tight leading-tight">
                      Affix Student Photo
                    </span>
                    <span className="text-[8px] text-gray-500 mt-1 leading-tight">
                      Recent Passport Size<br />(Self-Attested)
                    </span>
                  </div>
                </div>

                {/* Timetable Schedule Grid */}
                <div className="border border-gray-900 overflow-hidden font-sans text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-900 text-gray-900 font-bold uppercase text-[10px]">
                        <th className="p-2.5 border-r border-gray-300">Course Code</th>
                        <th className="p-2.5 border-r border-gray-300">Course Title</th>
                        <th className="p-2.5 border-r border-gray-300">Scheduled Date & Time</th>
                        <th className="p-2.5 border-r border-gray-300 text-center">Max Marks</th>
                        <th className="p-2.5 text-center">Invigilator Sign</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeTicket.exams?.map((exam) => {
                        const d = exam.examDate ? new Date(exam.examDate) : null;
                        return (
                          <tr key={exam.examId} className="border-b border-gray-200">
                            <td className="p-2.5 font-mono font-bold border-r border-gray-200">
                              {exam.subjectCode}
                            </td>
                            <td className="p-2.5 font-serif font-semibold border-r border-gray-200">
                              {exam.subjectName}
                            </td>
                            <td className="p-2.5 font-mono border-r border-gray-200">
                              {d 
                                ? `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                                : 'To Be Notified'}
                            </td>
                            <td className="p-2.5 font-mono text-center border-r border-gray-200">
                              {exam.maxMarks}M
                            </td>
                            <td className="p-2.5 text-center text-gray-400 italic">
                              Signature
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Examination Regulations (Grayscale-safe) */}
                <div className="border border-gray-400 p-3 bg-gray-50 text-[10px] text-gray-700 font-sans space-y-1">
                  <strong className="block text-gray-900 uppercase font-bold">Important Instructions to Candidate:</strong>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>This Hall Ticket with affixed photograph along with College Photo Identity Card is mandatory for entry into the Examination Hall.</li>
                    <li>Candidates must occupy their allotted seats at least 15 minutes prior to the scheduled examination commencement.</li>
                    <li>Electronic devices including smartphones, smartwatches, and programmable calculators are strictly prohibited.</li>
                    <li>Any malpractice or violation of exam codes will lead to immediate cancellation of candidature.</li>
                  </ul>
                </div>

                {/* Signatures & Seal Footer */}
                <div className="pt-8 flex items-end justify-between text-xs font-sans">
                  <div className="text-center w-48 border-t border-gray-900 pt-1.5">
                    <span className="text-[11px] font-semibold text-gray-900 block">Candidate Signature</span>
                    <span className="text-[10px] text-gray-500">(To be signed before invigilator)</span>
                  </div>

                  <div className="text-center w-52 border-t border-gray-900 pt-1.5">
                    <span className="text-[11px] font-bold text-gray-900 block">Controller of Examinations</span>
                    <span className="text-[10px] text-gray-500 font-mono">KITCoEK Autonomous Cell</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
