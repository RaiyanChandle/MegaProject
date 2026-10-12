import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const AssessmentComponent = sequelize.define('AssessmentComponent', {
  ...uuidPk,
  subjectId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false }, // "IA-1", "Mid Sem", "Lab Internal", etc.
  maxMarks: { type: DataTypes.FLOAT, allowNull: false },
  category: { type: DataTypes.ENUM(...COMPONENT_CATEGORIES), allowNull: false },
  // Informational default only — teacher isn't locked into this method.
  entryMethod: { type: DataTypes.ENUM(...MARK_ENTRY_METHODS), allowNull: false, defaultValue: 'MANUAL' },
  sequenceOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  createdById: { type: DataTypes.UUID, allowNull: true }, // -> DepartmentAdmin
}, {
  tableName: 'assessment_components',
  timestamps: true,
  indexes: [{ unique: true, fields: ['subjectId', 'name'] }],
  // NOTE: validate in application code that a subject's component
  // maxMarks sum to its intended total (100, 50, etc.) — not enforced
  // at the DB level since totals vary by subject/department policy.
});
  return AssessmentComponent;
};
