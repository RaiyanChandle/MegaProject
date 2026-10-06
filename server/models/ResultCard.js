import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const ResultCard = sequelize.define('ResultCard', {
  ...uuidPk,
  studentId: { type: DataTypes.UUID, allowNull: false },
  academicTermId: { type: DataTypes.UUID, allowNull: false },
  totalMarks: { type: DataTypes.FLOAT, allowNull: true },
  percentage: { type: DataTypes.FLOAT, allowNull: true },
  sgpa: { type: DataTypes.FLOAT, allowNull: true },
  processedById: { type: DataTypes.UUID, allowNull: true }, // -> ExamStaff
  processedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'result_cards',
  timestamps: true,
  indexes: [{ unique: true, fields: ['studentId', 'academicTermId'] }],
});
  return ResultCard;
};
