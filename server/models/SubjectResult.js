import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const SubjectResult = sequelize.define('SubjectResult', {
  ...uuidPk,
  enrollmentId: { type: DataTypes.UUID, allowNull: false, unique: true },
  totalMarksObtained: { type: DataTypes.FLOAT, allowNull: true },
  totalMaxMarks: { type: DataTypes.FLOAT, allowNull: true },
  isPass: { type: DataTypes.BOOLEAN, allowNull: true },
  computedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'subject_results', timestamps: true });
  return SubjectResult;
};
