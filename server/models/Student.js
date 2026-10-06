import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const Student = sequelize.define('Student', {
  ...uuidPk,
  instituteId: { type: DataTypes.STRING, unique: true, allowNull: false }, // "STKIT0001" — institute-wide, never reused
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  // Class-level roll number (e.g. 1-60 within a division) — unique only
  // within a division, NOT globally. See indexes below.
  rollNumber: { type: DataTypes.STRING, allowNull: false },
  batchYear: { type: DataTypes.STRING, allowNull: false }, // e.g. "2024-28" — key for curriculum versioning
  departmentId: { type: DataTypes.UUID, allowNull: false },
  divisionId: { type: DataTypes.UUID, allowNull: true },
  createdById: { type: DataTypes.UUID, allowNull: true }, // -> DepartmentAdmin
}, {
  tableName: 'students',
  timestamps: true,
  indexes: [{ unique: true, fields: ['divisionId', 'rollNumber'] }],
});
  return Student;
};
