import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const HallTicket = sequelize.define('HallTicket', {
  ...uuidPk,
  enrollmentId: { type: DataTypes.UUID, allowNull: false },
  examId: { type: DataTypes.UUID, allowNull: false },
  studentId: { type: DataTypes.UUID, allowNull: false },
  seatNumber: { type: DataTypes.STRING, allowNull: true },
  examCenter: { type: DataTypes.STRING, allowNull: true },
  generatedById: { type: DataTypes.UUID, allowNull: true }, // -> ExamStaff
  generatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'hall_tickets', timestamps: true });
  return HallTicket;
};
