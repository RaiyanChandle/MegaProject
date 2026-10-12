import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const ElectiveOption = sequelize.define('ElectiveOption', {
  ...uuidPk,
  slotId: { type: DataTypes.UUID, allowNull: false },
  subjectId: { type: DataTypes.UUID, allowNull: false },
  offeredByDepartmentId: { type: DataTypes.UUID, allowNull: false },
  maxCapacity: { type: DataTypes.INTEGER, allowNull: true }, // null = unlimited
}, {
  tableName: 'elective_options',
  timestamps: true,
  indexes: [{ unique: true, fields: ['slotId', 'subjectId'] }],
});
  return ElectiveOption;
};
