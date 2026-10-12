import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const ExamStaff = sequelize.define('ExamStaff', {
  ...uuidPk,
  instituteId: { type: DataTypes.STRING, unique: true, allowNull: false }, // "EXKIT0001"
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  createdById: { type: DataTypes.UUID, allowNull: false }, // -> SuperAdmin
}, { tableName: 'exam_staff', timestamps: true });
  return ExamStaff;
};
