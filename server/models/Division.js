import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const Division = sequelize.define('Division', {
  ...uuidPk,
  name: { type: DataTypes.STRING, allowNull: false },
  classId: { type: DataTypes.UUID, allowNull: false },
  createdById: { type: DataTypes.UUID, allowNull: true }, // -> DepartmentAdmin
}, {
  tableName: 'divisions',
  timestamps: true,
  indexes: [{ unique: true, fields: ['classId', 'name'] }],
});
  return Division;
};
