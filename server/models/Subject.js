import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const Subject = sequelize.define('Subject', {
  ...uuidPk,
  name: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING, unique: true, allowNull: false },
  credits: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 3 },
  subjectType: { type: DataTypes.ENUM(...SUBJECT_TYPES), allowNull: false, defaultValue: 'CORE' },
  classId: { type: DataTypes.UUID, allowNull: false },
  departmentId: { type: DataTypes.UUID, allowNull: false },
  createdById: { type: DataTypes.UUID, allowNull: true }, // -> DepartmentAdmin
}, { tableName: 'subjects', timestamps: true });
  return Subject;
};
