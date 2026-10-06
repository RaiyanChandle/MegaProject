import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const Submission = sequelize.define('Submission', {
  ...uuidPk,
  assignmentId: { type: DataTypes.UUID, allowNull: false },
  enrollmentId: { type: DataTypes.UUID, allowNull: false },
  studentId: { type: DataTypes.UUID, allowNull: false },
  fileUrl: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM(...SUBMISSION_STATUSES), allowNull: false, defaultValue: 'UPLOAD' },
  submittedAt: { type: DataTypes.DATE, allowNull: true },
  acceptedAt: { type: DataTypes.DATE, allowNull: true },
  marksAwarded: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'submissions',
  timestamps: true,
  indexes: [{ unique: true, fields: ['assignmentId', 'enrollmentId'] }],
});
  return Submission;
};
