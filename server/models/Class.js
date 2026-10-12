import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const Class = sequelize.define('Class', {
  ...uuidPk,
  name: { type: DataTypes.STRING, allowNull: false }, // e.g. "CSE Sem 3"
  departmentId: { type: DataTypes.UUID, allowNull: false },
  batchYear: { type: DataTypes.STRING, allowNull: false },
  semesterNumber: { type: DataTypes.INTEGER, allowNull: false },
  createdById: { type: DataTypes.UUID, allowNull: true }, // -> DepartmentAdmin
}, {
  tableName: 'classes',
  timestamps: true,
  indexes: [{ unique: true, fields: ['departmentId', 'batchYear', 'semesterNumber'] }],
});
  return Class;
};
