import ComingSoon from '../common/ComingSoon';
import { DollarSign } from 'lucide-react';

export default function StudentFees() {
  return (
    <ComingSoon
      title="Student Fees & Online Payments"
      module="Finance & Academic Accounts"
      phase="Phase 13 (Fees & Receipts)"
      icon={DollarSign}
      description="The Student Fee Portal provides complete visibility into semester tuition structures, per-subject backlog fee assessments, online payment gateway integration, and instant receipt generation."
      features={[
        'Full semester tuition & institutional dues ledger',
        'Per-subject backlog fee calculation (Rule 25: never full semester by default)',
        'Integrated online gateway payment (Razorpay / UPI / NetBanking)',
        'Webhook-verified transaction receipts with unique receipt numbers',
        'Downloadable official tax and payment receipts (Plex Serif format)',
        'Fee clearance status synchronization with exam hall ticket generation'
      ]}
    />
  );
}
