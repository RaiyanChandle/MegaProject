import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const AcademicTerm = sequelize.define('AcademicTerm', {
  ...uuidPk,
  name: { type: DataTypes.STRING, unique: true, allowNull: false }, // "2026-ODD"
  startDate: { type: DataTypes.DATE, allowNull: false },
  endDate: { type: DataTypes.DATE, allowNull: false },
  isCurrent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'academic_terms', timestamps: true });
  return AcademicTerm;
};
