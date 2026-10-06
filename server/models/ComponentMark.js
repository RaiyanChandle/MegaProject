import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const ComponentMark = sequelize.define('ComponentMark', {
  ...uuidPk,
  componentId: { type: DataTypes.UUID, allowNull: false },
  enrollmentId: { type: DataTypes.UUID, allowNull: false },
  marksObtained: { type: DataTypes.FLOAT, allowNull: true },
  enteredById: { type: DataTypes.UUID, allowNull: true }, // -> Teacher
  enteredAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  // Provenance only — marksObtained above is authoritative regardless
  // of whether either of these is set.
  sourceOnlineTestId: { type: DataTypes.UUID, allowNull: true },
  sourceExamId: { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'component_marks',
  timestamps: true,
  indexes: [{ unique: true, fields: ['componentId', 'enrollmentId'] }],
});
  return ComponentMark;
};
