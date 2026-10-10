import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import StatusBadge from '../../components/ui/StatusBadge';
import { toast } from '../../components/ui/Toast';
import { 
  FileCheck, 
  Award, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  BookOpen,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function StudentMarks() {
  const [marksData, setMarksData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSubjectId, setExpandedSubjectId] = useState(null);

  useEffect(() => {
    fetchMarks();
  }, []);

  const fetchMarks = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get('/marks/my-marks');
      setMarksData(data);
      if (data.subjects?.length > 0) {
        setExpandedSubjectId(data.subjects[0].subjectId);
      }
    } catch (error) {
      toast.error('Failed to load marks and subject results');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (subId) => {
    setExpandedSubjectId(prev => prev === subId ? null : subId);
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-text-500">
        <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2"></div>
        <div>Loading marks and results...</div>
      </div>
    );
  }

  const subjects = marksData?.subjects || [];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text-900 flex items-center gap-2">
            <Award className="text-ink-700" size={24} />
            My Marks & Subject Results
          </h2>
          <p className="text-sm text-text-500 mt-1">
            Component-wise internal assessment breakdown and overall subject evaluations.
          </p>
        </div>

        {marksData?.academicTerm && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-0 border border-border rounded-lg text-xs font-mono text-text-700">
            <Calendar size={14} className="text-ink-600" />
            <span>Academic Term: <strong>{marksData.academicTerm}</strong></span>
          </div>
        )}
      </div>

      {subjects.length === 0 ? (
        <div className="bg-surface-0 border border-border rounded-xl p-12 text-center text-text-500 italic">
          No subject marks found for the current academic term.
        </div>
      ) : (
        <div className="space-y-4">
          {subjects.map(sub => {
            const isExpanded = expandedSubjectId === sub.subjectId;
            const res = sub.subjectResult;

            return (
              <div 
                key={sub.enrollmentId} 
                className="bg-surface-0 border border-border rounded-xl shadow-2xs overflow-hidden transition-all"
              >
                {/* SUBJECT CARD HEADER */}
                <div 
                  onClick={() => toggleExpand(sub.subjectId)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-surface-50/60 transition-colors select-none"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-ink-50 text-ink-700 flex items-center justify-center font-semibold font-mono text-xs shrink-0 mt-0.5">
                      {sub.subjectCode}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-text-900 text-base">{sub.subjectName}</h3>
                        <StatusBadge status={sub.subjectType} />
                        <span className="text-xs text-text-500 font-mono">({sub.credits} Credits)</span>
                      </div>
                      <div className="text-xs text-text-500 mt-1 flex items-center gap-3">
                        <span>Attempt: #{sub.attemptNumber}</span>
                        <span>•</span>
                        <span>Enrollment: <strong className="text-text-700">{sub.enrollmentStatus}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* RESULT STATUS SUMMARY */}
                  <div className="flex items-center gap-4 shrink-0">
                    {res ? (
                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <div className="text-base font-semibold font-mono text-text-900">
                            {res.totalMarksObtained} <span className="text-xs text-text-400 font-normal">/ {res.totalMaxMarks}</span>
                          </div>
                          <div className="text-xs text-text-500 font-mono">
                            {res.percentage}%
                          </div>
                        </div>

                        <div>
                          {res.isPass === true ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={13} /> Passed
                            </span>
                          ) : res.isPass === false ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle size={13} /> Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock size={13} /> In Progress
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-text-400 italic">Pending Grading</span>
                    )}

                    <div className="text-text-400">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* COMPONENT BREAKDOWN TABLE (EXPANDED) */}
                {isExpanded && (
                  <div className="border-t border-border bg-surface-50/50 p-5">
                    <h4 className="text-xs uppercase font-semibold tracking-wider text-text-500 mb-3">
                      Assessment Components Breakdown
                    </h4>

                    {sub.components.length === 0 ? (
                      <div className="text-sm text-text-500 italic py-3">
                        No assessment components defined for this subject yet.
                      </div>
                    ) : (
                      <div className="bg-surface-0 border border-border rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="border-b border-border text-xs uppercase tracking-wider text-text-500 bg-surface-50">
                              <th className="py-2.5 px-4">Component</th>
                              <th className="py-2.5 px-3">Category</th>
                              <th className="py-2.5 px-3 text-right">Max Marks</th>
                              <th className="py-2.5 px-3 text-right">Marks Obtained</th>
                              <th className="py-2.5 px-4 text-right">Score %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {sub.components.map(comp => (
                              <tr key={comp.id} className="hover:bg-surface-50/70 transition-colors">
                                <td className="py-2.5 px-4 font-medium text-text-900">
                                  {comp.name}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`px-2 py-0.5 rounded-full text-2xs font-medium ${comp.category === 'EXTERNAL' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {comp.category}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-text-600">
                                  {comp.maxMarks}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-semibold text-text-900">
                                  {comp.marksObtained !== null && comp.marksObtained !== undefined ? comp.marksObtained : '—'}
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono text-xs">
                                  {comp.percentage !== null && comp.percentage !== undefined ? (
                                    <span className={comp.percentage >= 40 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                                      {comp.percentage}%
                                    </span>
                                  ) : (
                                    <span className="text-text-400">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
