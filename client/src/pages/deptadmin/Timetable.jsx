import ComingSoon from '../common/ComingSoon';
import { Calendar } from 'lucide-react';

export default function DeptAdminTimetable() {
  return (
    <ComingSoon
      title="Department Timetable & Class Schedules"
      module="Academic Scheduling & Operations"
      phase="Phase 16 (Live Classes & Timetable)"
      icon={Calendar}
      description="The academic timetable generator and classroom scheduler allows department administrators to allocate lecture hours, assign lab batches, prevent teacher-slot clashes, and distribute division schedules."
      features={[
        'Automated division-wise weekly timetable builder',
        'Teacher-slot conflict detection and workload balancing',
        'Lab batch subdivision scheduling (Batch A1, A2, etc.)',
        'Classroom and seminar hall resource allocation',
        'Exportable & printable weekly schedules in PDF / Excel',
        'Holiday and academic term calendar synchronisation'
      ]}
    />
  );
}
