import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS, EXAM_RESULT_STATUSES } from './constants.js';

export default (sequelize) => {
  const ExamResult = sequelize.define('ExamResult', {
  ...uuidPk,
  examId: { type: DataTypes.UUID, allowNull: false },
  enrollmentId: { type: DataTypes.UUID, allowNull: false },
  marksObtained: { type: DataTypes.FLOAT, allowNull: true },
  isPass: { type: DataTypes.BOOLEAN, allowNull: true },
  status: { type: DataTypes.ENUM(...EXAM_RESULT_STATUSES), allowNull: false, defaultValue: 'DRAFT' },
  enteredById: { type: DataTypes.UUID, allowNull: true }, // -> Teacher who evaluated and entered
  enteredAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  verifiedById: { type: DataTypes.UUID, allowNull: true }, // -> ExamStaff who verified
  verifiedAt: { type: DataTypes.DATE, allowNull: true },
  rejectionReason: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'exam_results',
  timestamps: true,
  indexes: [{ unique: true, fields: ['examId', 'enrollmentId'] }],
});
  return ExamResult;
};
