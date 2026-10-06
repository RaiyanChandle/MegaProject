import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const FeePayment = sequelize.define('FeePayment', {
  ...uuidPk,
  studentId: { type: DataTypes.UUID, allowNull: false },
  feeStructureId: { type: DataTypes.UUID, allowNull: false },
  // Set only for PER_SUBJECT fees (backlog students) — null for FULL_SEMESTER.
  enrollmentId: { type: DataTypes.UUID, allowNull: true },
  amountPaid: { type: DataTypes.FLOAT, allowNull: false },
  paymentMethod: { type: DataTypes.STRING, allowNull: false },
  transactionRef: { type: DataTypes.STRING, allowNull: true },
  // Never mark SUCCESS optimistically on redirect — only on gateway webhook/callback.
  status: { type: DataTypes.ENUM(...PAYMENT_STATUSES), allowNull: false, defaultValue: 'PENDING' },
  paidAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  receiptNumber: { type: DataTypes.STRING, allowNull: true, unique: true },
}, { tableName: 'fee_payments', timestamps: true });
  return FeePayment;
};
