import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const Enrollment = sequelize.define('Enrollment', {
  ...uuidPk,
  studentId: { type: DataTypes.UUID, allowNull: false },
  subjectId: { type: DataTypes.UUID, allowNull: false },
  classId: { type: DataTypes.UUID, allowNull: false },
  academicTermId: { type: DataTypes.UUID, allowNull: false },
  attemptNumber: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }, // 1 = first attempt, 2+ = backlog re-attempt
  status: { type: DataTypes.ENUM(...ENROLLMENT_STATUSES), allowNull: false, defaultValue: 'ENROLLED' },
}, {
  tableName: 'enrollments',
  timestamps: true,
  indexes: [{ unique: true, name: 'enroll_student_sub_term_attempt_idx', fields: ['studentId', 'subjectId', 'academicTermId', 'attemptNumber'] }],
});
  return Enrollment;
};
