import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const Note = sequelize.define('Note', {
  ...uuidPk,
  teacherId: { type: DataTypes.UUID, allowNull: false },
  subjectId: { type: DataTypes.UUID, allowNull: false },
  divisionId: { type: DataTypes.UUID, allowNull: true },
  topic: { type: DataTypes.STRING, allowNull: false },
  pdfUrl: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'notes', timestamps: true });
  return Note;
};
