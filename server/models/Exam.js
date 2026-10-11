import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const Exam = sequelize.define('Exam', {
  ...uuidPk,
  subjectId: { type: DataTypes.UUID, allowNull: false },
  classId: { type: DataTypes.UUID, allowNull: false },
  academicTermId: { type: DataTypes.UUID, allowNull: false },
  // T11.1 Decision 3: optional FK linking this exam to the AssessmentComponent
  // it maps to (e.g. a FINAL exam → "End Sem" component). When ExamResult marks
  // are entered, they auto-sync into ComponentMark for this component.
  componentId: { type: DataTypes.UUID, allowNull: true },
  examType: { type: DataTypes.ENUM(...EXAM_TYPES), allowNull: false, defaultValue: 'FINAL' }, // MAKEUP covers backlog re-attempts
  examDate: { type: DataTypes.DATE, allowNull: true },
  maxMarks: { type: DataTypes.FLOAT, allowNull: false },
  passingMarks: { type: DataTypes.FLOAT, allowNull: false },
  scheduledById: { type: DataTypes.UUID, allowNull: true }, // -> ExamStaff
}, { tableName: 'exams', timestamps: true });
  return Exam;
};

