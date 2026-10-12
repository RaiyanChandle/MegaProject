import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const TestAnswer = sequelize.define('TestAnswer', {
  ...uuidPk,
  attemptId: { type: DataTypes.UUID, allowNull: false },
  questionId: { type: DataTypes.UUID, allowNull: false },
  selectedOptionId: { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'test_answers',
  timestamps: true,
  indexes: [{ unique: true, fields: ['attemptId', 'questionId'] }],
});
  return TestAnswer;
};
