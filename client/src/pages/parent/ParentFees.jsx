import ComingSoon from '../common/ComingSoon';
import { DollarSign } from 'lucide-react';

export default function ParentFees() {
  return (
    <ComingSoon
      title="Student Fees & Guardian Payments"
      module="Parent Financial Portal"
      phase="Phase 13 (Fees & Receipts)"
      icon={DollarSign}
      description="The Parent Fee Portal enables guardians to review their child's academic fee structures, pay semester and backlog dues directly, and retrieve official receipts for tax or records."
      features={[
        'Itemized semester fee dues and payment deadline alerts',
        'Direct online payment gateway on behalf of enrolled student',
        'Payment history ledger with gateway reference tracking',
        'Real-time clearance verification upon bank callback',
        'Certified fee receipts for income tax and reimbursement purposes'
      ]}
    />
  );
}
