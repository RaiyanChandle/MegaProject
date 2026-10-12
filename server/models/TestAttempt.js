import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const TestAttempt = sequelize.define('TestAttempt', {
  ...uuidPk,
  testId: { type: DataTypes.UUID, allowNull: false },
  studentId: { type: DataTypes.UUID, allowNull: false },
  startedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  submittedAt: { type: DataTypes.DATE, allowNull: true },
  score: { type: DataTypes.FLOAT, allowNull: true },
}, {
  tableName: 'test_attempts',
  timestamps: true,
  indexes: [{ unique: true, fields: ['testId', 'studentId'] }],
});
  return TestAttempt;
};
