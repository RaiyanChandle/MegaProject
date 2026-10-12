import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const FeeStructure = sequelize.define('FeeStructure', {
  ...uuidPk,
  departmentId: { type: DataTypes.UUID, allowNull: false },
  batchYear: { type: DataTypes.STRING, allowNull: false },
  semesterNumber: { type: DataTypes.INTEGER, allowNull: false },
  feeType: { type: DataTypes.ENUM(...FEE_TYPES), allowNull: false, defaultValue: 'FULL_SEMESTER' },
  amount: { type: DataTypes.FLOAT, allowNull: false },
  dueDate: { type: DataTypes.DATE, allowNull: true },
  academicTermId: { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'fee_structures', timestamps: true });
  return FeeStructure;
};
