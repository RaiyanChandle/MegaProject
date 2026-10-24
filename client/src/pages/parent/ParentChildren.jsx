import ComingSoon from '../common/ComingSoon';
import { Users } from 'lucide-react';

export default function ParentChildren() {
  return (
    <ComingSoon
      title="Registered Wards & Guardian Management"
      module="Guardian Identity & Profiles"
      phase="Phase 6 (People & Allocation)"
      icon={Users}
      description="The Ward Management portal allows parents with multiple enrolled students to view all linked children, switch between academic views, and manage emergency contact verification."
      features={[
        'Multi-child linking under a single verified parent phone number',
        'Quick-switch academic toggle for parents with 2+ enrolled wards',
        'Verified enrollment information (Roll number, Division, Batch, Department)',
        'Direct links to each child’s attendance records, marks cards, and notices',
        'Guardian relationship details and emergency contact updates'
      ]}
    />
  );
}
