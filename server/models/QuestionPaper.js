import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const QuestionPaper = sequelize.define('QuestionPaper', {
  ...uuidPk,
  examId: { type: DataTypes.UUID, allowNull: false },
  createdById: { type: DataTypes.UUID, allowNull: false }, // -> ExamStaff
  fileUrl: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM(...QUESTION_PAPER_STATUSES), allowNull: false, defaultValue: 'DRAFT' },
}, { tableName: 'question_papers', timestamps: true });
  return QuestionPaper;
};
