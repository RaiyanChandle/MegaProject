import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const Teacher = sequelize.define('Teacher', {
  ...uuidPk,
  instituteId: { type: DataTypes.STRING, unique: true, allowNull: false }, // "FCKIT0001"
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  departmentId: { type: DataTypes.UUID, allowNull: false },
  createdById: { type: DataTypes.UUID, allowNull: true }, // -> DepartmentAdmin
}, { tableName: 'teachers', timestamps: true });
  return Teacher;
};
