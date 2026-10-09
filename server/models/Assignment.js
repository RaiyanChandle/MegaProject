import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const Assignment = sequelize.define('Assignment', {
  ...uuidPk,
  teacherId: { type: DataTypes.UUID, allowNull: false },
  subjectId: { type: DataTypes.UUID, allowNull: false },
  divisionId: { type: DataTypes.UUID, allowNull: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  marks: { type: DataTypes.INTEGER, allowNull: false },
  deadline: { type: DataTypes.DATE, allowNull: false },
  pdfUrl: { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'assignments', timestamps: true });
  return Assignment;
};
