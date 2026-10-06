import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const Exam = sequelize.define('Exam', {
  ...uuidPk,
  subjectId: { type: DataTypes.UUID, allowNull: false },
  classId: { type: DataTypes.UUID, allowNull: false },
  academicTermId: { type: DataTypes.UUID, allowNull: false },
  examType: { type: DataTypes.ENUM(...EXAM_TYPES), allowNull: false, defaultValue: 'FINAL' }, // MAKEUP covers backlog re-attempts
  examDate: { type: DataTypes.DATE, allowNull: true },
  maxMarks: { type: DataTypes.FLOAT, allowNull: false },
  passingMarks: { type: DataTypes.FLOAT, allowNull: false },
  scheduledById: { type: DataTypes.UUID, allowNull: true }, // -> ExamStaff
}, { tableName: 'exams', timestamps: true });
  return Exam;
};
