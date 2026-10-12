import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const TestQuestion = sequelize.define('TestQuestion', {
  ...uuidPk,
  testId: { type: DataTypes.UUID, allowNull: false },
  questionText: { type: DataTypes.TEXT, allowNull: false },
  marks: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1 },
}, { tableName: 'test_questions', timestamps: true });
  return TestQuestion;
};
